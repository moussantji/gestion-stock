@extends('layouts.admin')

@section('title', 'Produits — ' . config('shop.name', config('app.name', 'StockFlow')))

@section('content')
<div class="page-heading">
    <div><div class="eyebrow">GESTION DU STOCK</div><h1 class="page-title">Produits</h1><p class="page-sub">Consultez votre catalogue et surveillez les niveaux de stock.</p></div>
    <a class="btn btn-primary" href="{{ route('admin.products.create') }}">+ Nouveau produit</a>
</div>

<form method="GET" class="filters">
    <input class="input" type="search" name="q" value="{{ request('q') }}" placeholder="Rechercher par nom, SKU ou code-barres…">
    <select class="input" name="stock" aria-label="Filtrer le stock">
        <option value="">Tous les stocks</option>
        <option value="low" @selected(request('stock') === 'low')>Stock bas</option>
        <option value="out" @selected(request('stock') === 'out')>Rupture</option>
    </select>
    <button class="btn btn-ghost" type="submit">Filtrer</button>
    @if(request()->hasAny(['q', 'stock']))<a class="btn btn-ghost" href="{{ route('admin.products.index') }}">Réinitialiser</a>@endif
</form>

<div class="card">
    <div class="card-title"><span>{{ $products->total() }} produit(s)</span><span class="muted">Page {{ $products->currentPage() }} / {{ $products->lastPage() }}</span></div>
    <div class="table-wrap">
        <table>
            <thead><tr><th>Produit</th><th>SKU</th><th>Catégorie</th><th>Prix vente</th><th>Stock</th><th>État</th><th></th></tr></thead>
            <tbody>
            @forelse($products as $product)
                <tr>
                    <td><a href="{{ route('admin.products.show', $product) }}"><strong>{{ $product->name }}</strong></a><div class="muted" style="font-size:11px;">{{ $product->supplier?->name ?? 'Sans fournisseur' }}</div></td>
                    <td class="mono">{{ $product->sku ?: '—' }}</td>
                    <td>{{ $product->category?->name ?? 'Sans catégorie' }}</td>
                    <td class="amount-cell">{{ number_format($product->sale_price, 0, ',', ' ') }} F</td>
                    <td><strong>{{ $product->quantity }}</strong><span class="muted"> / seuil {{ $product->alert_threshold }}</span></td>
                    <td>@if($product->quantity === 0)<span class="badge revoked">Rupture</span>@elseif($product->is_low_stock)<span class="badge pending">Stock bas</span>@else<span class="badge active">Disponible</span>@endif</td>
                    <td><a class="btn btn-ghost btn-xs" href="{{ route('admin.products.edit', $product) }}">Modifier</a></td>
                </tr>
            @empty
                <tr><td colspan="7" class="table-empty">Aucun produit ne correspond à votre recherche.</td></tr>
            @endforelse
            </tbody>
        </table>
    </div>
    {{ $products->links() }}
</div>
@endsection
