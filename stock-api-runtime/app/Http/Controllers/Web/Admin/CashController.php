<?php
namespace App\Http\Controllers\Web\Admin;
use App\Http\Controllers\Controller;
use App\Models\CashClosing;
use App\Models\CashOperation;
use App\Models\Receipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class CashController extends Controller
{
 public function index(){ $ops=CashOperation::with('user:id,name')->latest()->paginate(25); $in=CashOperation::in()->sum('amount'); $out=CashOperation::out()->sum('amount'); $closings=CashClosing::with('user:id,name')->latest()->limit(12)->get(); return view('admin.cash.index',compact('ops','in','out','closings')); }
 public function create(){return view('admin.cash.form');}
 public function store(Request $request){$data=$request->validate(['type'=>['required','in:in,out'],'amount'=>['required','integer','min:1'],'category'=>['nullable','string','max:100'],'reason'=>['required','string','max:255']]); CashOperation::create([...$data,'user_id'=>$request->user()->id]); return redirect()->route('admin.cash.index')->with('success','Opération de caisse enregistrée.');}
 public function close(Request $request){$date=now()->toDateString(); abort_if(CashClosing::whereDate('closing_date',$date)->exists(),409,'La journée est déjà clôturée.'); $in=CashOperation::in()->whereDate('created_at',$date)->sum('amount'); $out=CashOperation::out()->whereDate('created_at',$date)->sum('amount'); $sales=Receipt::where('status',Receipt::STATUS_COMPLETED)->whereDate('created_at',$date)->sum('amount_paid'); CashClosing::create(['closing_date'=>$date,'total_in'=>$in,'total_out'=>$out,'sales_collected'=>$sales,'balance'=>$in+$sales-$out,'notes'=>$request->input('notes'),'user_id'=>$request->user()->id]); return back()->with('success','Journée clôturée. Le Z de caisse a été enregistré.'); }
}
