<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function index() { $inventories=Inventory::with(['user:id,name'])->withCount('items')->latest()->paginate(20); return view('admin.inventories.index',compact('inventories')); }
    public function create() { return view('admin.inventories.form'); }
    public function store(Request $request) { $data=$request->validate(['name'=>['required','string','max:255']]); $inventory=DB::transaction(function() use($data,$request){ $i=Inventory::create(['reference'=>Inventory::generateReference(),'name'=>$data['name'],'status'=>Inventory::STATUS_IN_PROGRESS,'user_id'=>$request->user()->id]); foreach(Product::orderBy('id')->get(['id','quantity']) as $p) $i->items()->create(['product_id'=>$p->id,'expected_quantity'=>$p->quantity]); return $i; }); return redirect()->route('admin.inventories.show',$inventory)->with('success',"Inventaire {$inventory->reference} créé."); }
    public function show(Inventory $inventory) { $inventory->load(['items.product:id,name,sku','user:id,name']); return view('admin.inventories.show',compact('inventory')); }
    public function update(Request $request, Inventory $inventory) { abort_unless($inventory->isOpen(), 409); $data=$request->validate(['counts'=>['nullable','array'],'counts.*'=>['nullable','integer','min:0']]); DB::transaction(function() use($data,$inventory){ foreach($data['counts']??[] as $id=>$count) $inventory->items()->whereKey($id)->update(['counted_quantity'=>$count]); $inventory->load('items'); if($inventory->items->whereNull('counted_quantity')->isEmpty()) { foreach($inventory->items as $item) { $difference=(int)$item->counted_quantity-(int)$item->expected_quantity; if($difference===0) continue; $product=Product::lockForUpdate()->find($item->product_id); if(!$product) continue; $product->increment('quantity',$difference); \App\Models\StockMovement::create(['product_id'=>$product->id,'user_id'=>auth()->id(),'type'=>$difference>0 ? \App\Models\StockMovement::TYPE_IN : \App\Models\StockMovement::TYPE_OUT,'quantity'=>abs($difference),'unit_price'=>$product->purchase_price,'reason'=>'Ajustement inventaire','reference'=>$inventory->reference]); } $inventory->update(['status'=>Inventory::STATUS_VALIDATED,'validated_at'=>now()]); } }); return back()->with('success','Comptage enregistré. Les écarts complets ont été appliqués au stock.'); }
}
