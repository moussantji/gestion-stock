@extends('layouts.admin')
@php($editing = $product->exists)
@section('title', ($editing ? 'Modifier le produit' : 'Nouveau produit') . ' — ' . config('shop.name', 'StockFlow'))
@section('content')
<div class="page-heading"><div><div class="eyebrow">CATALOGUE</div><h1 class="page-title">{{ $editing ? 'Modifier le produit' : 'Nouveau produit' }}</h1><p class="page-sub">{{ $editing ? 'Mettez à jour les informations commerciales.' : 'Ajoutez un produit et enregistrez son stock initial.' }}</p></div><a class="btn btn-ghost" href="{{ route('admin.products.index') }}">← Retour aux produits</a></div>
@if($errors->any())<div class="flash error"><ul style="margin-left:18px;">@foreach($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul></div>@endif
<div class="card">
<form method="POST" action="{{ $editing ? route('admin.products.update', $product) : route('admin.products.store') }}" enctype="multipart/form-data">
@csrf
@if($editing) @method('PUT') @endif
<div class="form-grid">
<div class="field"><label for="name">Nom du produit *</label><input class="input" id="name" name="name" value="{{ old('name', $product->name) }}" required></div>
<div class="field"><label for="sku">Référence SKU *</label><input class="input" id="sku" name="sku" value="{{ old('sku', $product->sku) }}" required></div>
<div class="field"><label for="barcode">Code-barres</label><input class="input" id="barcode" name="barcode" value="{{ old('barcode', $product->barcode) }}"></div>
<div class="field"><label for="image">Photo du produit</label><input class="input" id="image" type="file" name="image" accept="image/png,image/jpeg,image/webp"></div>
<div class="field"><label for="category_id">Catégorie</label><select class="input" id="category_id" name="category_id"><option value="">Sans catégorie</option>@foreach($categories as $category)<option value="{{ $category->id }}" @selected(old('category_id') == $category->id)>{{ $category->name }}</option>@endforeach</select></div>
<div class="field"><label for="supplier_id">Fournisseur</label><select class="input" id="supplier_id" name="supplier_id"><option value="">Sans fournisseur</option>@foreach($suppliers as $supplier)<option value="{{ $supplier->id }}" @selected(old('supplier_id') == $supplier->id)>{{ $supplier->name }}</option>@endforeach</select></div>
<div class="field"><label for="purchase_price">Prix d’achat (FCFA) *</label><input class="input" id="purchase_price" type="number" min="0" step="0.01" name="purchase_price" value="{{ old('purchase_price', $product->purchase_price ?? 0) }}" required></div>
<div class="field"><label for="sale_price">Prix de vente (FCFA) *</label><input class="input" id="sale_price" type="number" min="0" step="0.01" name="sale_price" value="{{ old('sale_price', $product->sale_price ?? 0) }}" required></div>
<div class="field"><label for="wholesale_price">Prix de gros (FCFA)</label><input class="input" id="wholesale_price" type="number" min="0" step="0.01" name="wholesale_price" value="{{ old('wholesale_price') }}"></div>
<div class="field"><label for="quantity">Stock initial *</label><input class="input" id="quantity" type="number" min="0" name="quantity" value="{{ old('quantity', 0) }}" required><small class="muted">Un mouvement « Stock initial » sera créé automatiquement.</small></div>
<div class="field"><label for="alert_threshold">Seuil d’alerte *</label><input class="input" id="alert_threshold" type="number" min="0" name="alert_threshold" value="{{ old('alert_threshold', 5) }}" required></div>
</div>
<div class="field"><label for="description">Description</label><textarea class="input" id="description" name="description" rows="4">{{ old('description') }}</textarea></div>
<button class="btn btn-primary" type="submit">Enregistrer le produit</button>
</form>
</div>
@endsection
