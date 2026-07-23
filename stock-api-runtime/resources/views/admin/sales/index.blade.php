@extends('layouts.admin')
@section('title', 'Ventes — ' . config('shop.name', 'StockFlow'))
@section('content')
<div class="page-heading"><div><div class="eyebrow">VENTES</div><h1 class="page-title">Ventes et reçus</h1><p class="page-sub">Historique des ventes enregistrées dans l’entreprise.</p></div><a class="btn btn-primary" href="{{ route('admin.sales.create') }}">+ Nouvelle vente</a></div>
<form method="GET" class="filters"><input class="input" type="search" name="q" value="{{ request('q') }}" placeholder="Rechercher un reçu ou un client…"><button class="btn btn-ghost" type="submit">Rechercher</button></form>
<div class="card"><div class="card-title"><span>{{ $sales->total() }} vente(s)</span><span class="muted">Page {{ $sales->currentPage() }} / {{ $sales->lastPage() }}</span></div><div class="table-wrap"><table><thead><tr><th>Reçu</th><th>Client</th><th>Vendeur</th><th>Total</th><th>Payé</th><th>Reste</th><th>Date</th></tr></thead><tbody>
@forelse($sales as $sale)<tr><td class="mono"><a href="{{ route('admin.sales.show', $sale) }}">{{ $sale->number }}</a></td><td>{{ $sale->customer?->name ?? $sale->client_name ?? 'Client comptant' }}</td><td>{{ $sale->user?->name ?? '—' }}</td><td class="amount-cell">{{ number_format($sale->total, 0, ',', ' ') }} F</td><td>{{ number_format($sale->amount_paid, 0, ',', ' ') }} F</td><td class="{{ $sale->remaining > 0 ? 'danger-text' : 'muted' }}">{{ number_format($sale->remaining, 0, ',', ' ') }} F</td><td class="muted">{{ $sale->created_at->format('d/m/Y H:i') }}</td></tr>
@empty<tr><td colspan="7" class="table-empty">Aucune vente enregistrée.</td></tr>@endforelse
</tbody></table></div>{{ $sales->links() }}</div>
@endsection
