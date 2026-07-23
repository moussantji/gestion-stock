@extends('layouts.admin')
@section('title', 'Fournisseurs — ' . config('shop.name', 'StockFlow'))
@section('content')
<div class="page-heading"><div><div class="eyebrow">APPROVISIONNEMENT</div><h1 class="page-title">Fournisseurs</h1><p class="page-sub">Gérez vos partenaires et vos sources d’approvisionnement.</p></div><a class="btn btn-primary" href="{{ route('admin.suppliers.create') }}">+ Nouveau fournisseur</a></div>
<form method="GET" class="filters"><input class="input" type="search" name="q" value="{{ request('q') }}" placeholder="Nom ou téléphone…"><button class="btn btn-ghost">Rechercher</button></form>
<div class="card"><div class="card-title">{{ $suppliers->total() }} fournisseur(s)</div><div class="table-wrap"><table><thead><tr><th>Nom</th><th>Contact</th><th>Adresse</th><th>Produits liés</th><th></th></tr></thead><tbody>@forelse($suppliers as $supplier)<tr><td><strong>{{ $supplier->name }}</strong></td><td>{{ $supplier->phone ?? $supplier->email ?? '—' }}</td><td>{{ $supplier->address ?? '—' }}</td><td>{{ $supplier->products_count }}</td><td><a class="btn btn-ghost btn-xs" href="{{ route('admin.suppliers.edit', $supplier) }}">Modifier</a></td></tr>@empty<tr><td colspan="5" class="table-empty">Aucun fournisseur.</td></tr>@endforelse</tbody></table></div>{{ $suppliers->links() }}</div>
@endsection
