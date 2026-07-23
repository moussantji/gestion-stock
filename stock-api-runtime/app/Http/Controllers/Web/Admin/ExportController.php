<?php
namespace App\Http\Controllers\Web\Admin;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Receipt;
use App\Models\StockMovement;
use Illuminate\Http\Request;
class ExportController extends Controller
{
 private function csv(string $name,array $header,\Closure $rows){return response()->streamDownload(function()use($header,$rows){$out=fopen('php://output','w');fputcsv($out,$header,';');$rows($out);fclose($out);},$name,['Content-Type'=>'text/csv; charset=UTF-8']);}
 public function products(){return $this->csv('produits.csv',['Nom','SKU','Catégorie','Stock','Seuil','Prix achat','Prix vente'],function($out){Product::with('category')->orderBy('name')->chunk(200,function($items)use($out){foreach($items as $p)fputcsv($out,[$p->name,$p->sku,$p->category?->name,$p->quantity,$p->alert_threshold,$p->purchase_price,$p->sale_price],';');});});}
 public function movements(){return $this->csv('mouvements.csv',['Date','Produit','Type','Quantité','Motif','Utilisateur'],function($out){StockMovement::with(['product','user'])->latest()->chunk(200,function($items)use($out){foreach($items as $m)fputcsv($out,[$m->created_at,$m->product?->name,$m->type,$m->quantity,$m->reason,$m->user?->name],';');});});}
 public function sales(){return $this->csv('ventes.csv',['Reçu','Date','Client','Total','Payé','Reste'],function($out){Receipt::where('status',Receipt::STATUS_COMPLETED)->latest()->chunk(200,function($items)use($out){foreach($items as $r)fputcsv($out,[$r->number,$r->created_at,$r->client_name,$r->total,$r->amount_paid,$r->remaining],';');});});}
}
