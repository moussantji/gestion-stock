@extends('layouts.admin')
@section('title', 'Mouvements — ' . config('shop.name', 'StockFlow'))
@section('content')
<div class="page-heading"><div><div class="eyebrow">STOCK</div><h1 class="page-title">Mouvements</h1><p class="page-sub">Historique des entrées, sorties et ajustements.</p></div><a class="btn btn-primary" href="{{ route('admin.movements.create') }}">+ Nouveau mouvement</a></div>
<form method="GET" class="filters">
<select class="input" name="type"><option value="">Tous les types</option><option value="in" @selected(request('type') === 'in')>Entrées</option><option value="out" @selected(request('type') === 'out')>Sorties</option><option value="transfer_in" @selected(request('type') === 'transfer_in')>Transferts entrants</option><option value="transfer_out" @selected(request('type') === 'transfer_out')>Transferts sortants</option></select>
<select class="input" name="product_id"><option value="">Tous les produits</option>@foreach($products as $product)<option value="{{ $product->id }}" @selected(request('product_id') == $product->id)>{{ $product->name }}</option>@endforeach</select>
<button class="btn btn-ghost" type="submit">Filtrer</button>
</form>
<div class="card"><div class="card-title"><span>{{ $movements->total() }} mouvement(s)</span><span class="muted">Page {{ $movements->currentPage() }} / {{ $movements->lastPage() }}</span></div>
<div class="table-wrap"><table><thead><tr><th>Date</th><th>Produit</th><th>Type</th><th>Quantité</th><th>Motif</th><th>Utilisateur</th></tr></thead><tbody>
@forelse($movements as $movement)
<tr><td class="muted">{{ $movement->created_at->format('d/m/Y H:i') }}</td><td><strong>{{ $movement->product?->name ?? 'Produit supprimé' }}</strong><div class="muted" style="font-size:11px;">{{ $movement->product?->sku }}</div></td><td>@if($movement->type === 'in')<span class="badge active">Entrée</span>@elseif($movement->type === 'out')<span class="badge revoked">Sortie</span>@else<span class="badge">{{ str_replace('_', ' ', ucfirst($movement->type)) }}</span>@endif</td><td class="amount-cell">{{ $movement->type === 'in' || $movement->type === 'transfer_in' ? '+' : '-' }}{{ $movement->quantity }}</td><td>{{ $movement->reason ?? '—' }}</td><td>{{ $movement->user?->name ?? '—' }}</td></tr>
@empty<tr><td colspan="6" class="table-empty">Aucun mouvement trouvé.</td></tr>@endforelse
</tbody></table></div>{{ $movements->links() }}</div>
@endsection
