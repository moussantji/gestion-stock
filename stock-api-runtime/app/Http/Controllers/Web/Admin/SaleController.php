<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Receipt;
use App\Models\StockMovement;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaleController extends Controller
{
    public function create()
    {
        return view('admin.sales.form', ['products' => Product::where('quantity', '>', 0)->orderBy('name')->get(['id', 'name', 'sale_price', 'quantity']), 'customers' => Customer::orderBy('name')->get(['id', 'name', 'phone'])]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'items' => ['nullable', 'array', 'min:1'], 'items.*.product_id' => ['required', 'exists:products,id'], 'items.*.quantity' => ['required', 'integer', 'min:1'],
            'product_id' => ['nullable', 'exists:products,id'], 'quantity' => ['nullable', 'integer', 'min:1'],
            'customer_id' => ['nullable', 'exists:customers,id'], 'client_name' => ['nullable', 'string', 'max:255'], 'client_phone' => ['nullable', 'string', 'max:30'], 'amount_paid' => ['required', 'numeric', 'min:0'],
        ]);
        $items = $data['items'] ?? [];
        if (!$items && !empty($data['product_id'])) $items = [['product_id' => $data['product_id'], 'quantity' => $data['quantity'] ?? 1]];
        if (!$items) throw ValidationException::withMessages(['items' => 'Ajoutez au moins un article.']);

        $receipt = DB::transaction(function () use ($data, $items, $request) {
            $lines = []; $total = 0;
            foreach ($items as $line) {
                $product = Product::lockForUpdate()->findOrFail($line['product_id']); $qty = (int) $line['quantity'];
                if ($product->quantity < $qty) throw ValidationException::withMessages(['items' => "Stock insuffisant pour {$product->name}. Disponible : {$product->quantity}."]);
                $subtotal = (int) round($product->sale_price * $qty); $total += $subtotal; $lines[] = [$product, $qty, $subtotal];
            }
            if ((float) $data['amount_paid'] > $total) throw ValidationException::withMessages(['amount_paid' => 'Le montant payé ne peut pas dépasser le total.']);
            $receipt = Receipt::create(['number' => Receipt::generateNumber(), 'customer_id' => $data['customer_id'] ?? null, 'client_name' => $data['client_name'] ?? null, 'client_phone' => $data['client_phone'] ?? null, 'user_id' => $request->user()->id, 'total' => $total, 'amount_paid' => (int) $data['amount_paid'], 'status' => Receipt::STATUS_COMPLETED]);
            foreach ($lines as [$product, $qty, $subtotal]) {
                $receipt->items()->create(['product_id' => $product->id, 'product_name' => $product->name, 'quantity' => $qty, 'unit_price' => $product->sale_price, 'subtotal' => $subtotal]);
                $product->decrement('quantity', $qty);
                StockMovement::create(['product_id' => $product->id, 'user_id' => $request->user()->id, 'type' => StockMovement::TYPE_OUT, 'quantity' => $qty, 'unit_price' => $product->purchase_price, 'reason' => 'Vente', 'reference' => $receipt->number]);
            }
            return $receipt;
        });
        return redirect()->route('admin.sales.show', $receipt)->with('success', 'Vente enregistrée et stock décrémenté.');
    }

    public function show(Receipt $sale) { $sale->load(['items.product:id,name,sku', 'customer:id,name,phone', 'user:id,name']); return view('admin.sales.show', compact('sale')); }

    public function pdf(Receipt $sale)
    {
        abort_unless(class_exists(Pdf::class), 503, 'Dompdf non installé.');
        $sale->load(['items.product:id,name,sku', 'user:id,name']);
        return Pdf::loadView('pdf.sale-receipt', ['receipt' => $sale, 'shop' => config('shop')])->setPaper('a5')->stream("recu-{$sale->number}.pdf");
    }

    public function index(Request $request)
    {
        $sales = Receipt::with(['customer:id,name', 'user:id,name'])->where('status', Receipt::STATUS_COMPLETED)->when($request->filled('q'), function ($q) use ($request) { $term = $request->string('q')->toString(); $q->where(fn ($x) => $x->where('number', 'like', "%{$term}%")->orWhere('client_name', 'like', "%{$term}%")); })->latest()->paginate(25)->withQueryString();
        return view('admin.sales.index', compact('sales'));
    }
}
