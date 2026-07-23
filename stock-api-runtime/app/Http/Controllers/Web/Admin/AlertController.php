<?php
namespace App\Http\Controllers\Web\Admin;
use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
class AlertController extends Controller
{
 public function index(Request $request){$products=Product::with(['category:id,name','supplier:id,name'])->when($request->get('kind')==='out',fn($q)=>$q->where('quantity',0))->when($request->get('kind')==='low',fn($q)=>$q->lowStock()->where('quantity','>',0))->when($request->filled('category_id'),fn($q)=>$q->where('category_id',$request->integer('category_id')))->when($request->filled('supplier_id'),fn($q)=>$q->where('supplier_id',$request->integer('supplier_id')))->orderBy('quantity')->paginate(25)->withQueryString();$categories=\App\Models\Category::orderBy('name')->get(['id','name']);$suppliers=\App\Models\Supplier::orderBy('name')->get(['id','name']);return view('admin.alerts.index',compact('products','categories','suppliers'));}
}
