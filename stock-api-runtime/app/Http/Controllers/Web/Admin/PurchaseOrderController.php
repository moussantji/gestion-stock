<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    public function index() { $orders = PurchaseOrder::with(['supplier:id,name', 'user:id,name'])->withCount('items')->latest()->paginate(20); return view('admin.purchase-orders.index', compact('orders')); }
    public function show(PurchaseOrder $purchaseOrder) { $purchaseOrder->load(['supplier:id,name', 'items.product:id,name,sku']); return view('admin.purchase-orders.show', ['order' => $purchaseOrder]); }
    public function receive(Request $request, PurchaseOrder $purchaseOrder) {
        abort_unless($purchaseOrder->isOpen(), 409, 'Ce bon de commande est déjà clôturé.');
        $data = $request->validate(['received' => ['nullable','array'], 'received.*' => ['nullable','integer','min:0']]);
        DB::transaction(function () use ($purchaseOrder, $data) {
            foreach ($purchaseOrder->items as $item) {
                $remaining = $item->remaining_qty;
                $received = array_key_exists($item->id, $data['received'] ?? []) ? (int) $data['received'][$item->id] : $remaining;
                if ($received < 0 || $received > $remaining) throw \Illuminate\Validation\ValidationException::withMessages(['received' => 'Quantité réceptionnée invalide.']);
                if ($received <= 0) continue;
                $product = Product::lockForUpdate()->find($item->product_id);
                if (!$product) continue;
                $product->increment('quantity', $received);
                \App\Models\StockMovement::create(['product_id' => $product->id, 'user_id' => auth()->id(), 'type' => \App\Models\StockMovement::TYPE_IN, 'quantity' => $received, 'unit_price' => $item->unit_price, 'reason' => 'Réception bon de commande', 'reference' => $purchaseOrder->number]);
                $item->increment('received_qty', $received);
            }
            $openRemaining = $purchaseOrder->fresh()->items()->whereColumn('received_qty', '<', 'quantity')->exists();
            $purchaseOrder->update(['status' => $openRemaining ? PurchaseOrder::STATUS_PARTIAL : PurchaseOrder::STATUS_RECEIVED, 'received_at' => $openRemaining ? null : now()]);
        });
        return redirect()->route('admin.purchase-orders.show', $purchaseOrder)->with('success', 'Bon réceptionné et stock mis à jour.');
    }
    public function create() { return view('admin.purchase-orders.form', ['suppliers' => Supplier::orderBy('name')->get(['id','name']), 'products' => Product::where('quantity','>',0)->orWhere('quantity',0)->orderBy('name')->get(['id','name','purchase_price','quantity'])]); }
    public function store(Request $request) { $data = $request->validate(['supplier_id'=>['required','exists:suppliers,id'], 'product_id'=>['required','exists:products,id'], 'quantity'=>['required','integer','min:1'], 'unit_price'=>['required','numeric','min:0'], 'notes'=>['nullable','string','max:1000']]); DB::transaction(function () use ($data,$request) { $order=PurchaseOrder::create(['number'=>PurchaseOrder::generateNumber(),'supplier_id'=>$data['supplier_id'],'user_id'=>$request->user()->id,'status'=>PurchaseOrder::STATUS_DRAFT,'total_estimated'=>(int)($data['quantity']*$data['unit_price']),'notes'=>$data['notes']??null]); $p=Product::findOrFail($data['product_id']); $order->items()->create(['product_id'=>$p->id,'product_name'=>$p->name,'quantity'=>$data['quantity'],'unit_price'=>$data['unit_price'],'subtotal'=>$data['quantity']*$data['unit_price'],'received_qty'=>0]); }); return redirect()->route('admin.purchase-orders.index')->with('success','Bon de commande créé.'); }
}
