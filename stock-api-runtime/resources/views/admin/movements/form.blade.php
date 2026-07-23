@extends('layouts.admin')
@section('title', 'Nouveau mouvement — ' . config('shop.name', 'StockFlow'))
@section('content')
<div class="page-heading"><div><div class="eyebrow">STOCK</div><h1 class="page-title">Nouveau mouvement</h1><p class="page-sub">Une sortie ne peut jamais dépasser le stock disponible.</p></div><a class="btn btn-ghost" href="{{ route('admin.movements.index') }}">← Historique</a></div>
@if($errors->any())<div class="flash error"><ul style="margin-left:18px;">@foreach($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul></div>@endif
<div class="card"><form method="POST" action="{{ route('admin.movements.store') }}">@csrf
<div class="form-grid">
<div class="field"><label for="product_id">Produit *</label><select class="input" id="product_id" name="product_id" required><option value="">Sélectionner</option>@foreach($products as $product)<option value="{{ $product->id }}" @selected(old('product_id') == $product->id)>{{ $product->name }} — stock : {{ $product->quantity }}</option>@endforeach</select></div>
<div class="field"><label for="type">Type *</label><select class="input" id="type" name="type" required><option value="in" @selected(old('type') === 'in')>Entrée</option><option value="out" @selected(old('type') === 'out')>Sortie</option></select></div>
<div class="field"><label for="quantity">Quantité *</label><input class="input" id="quantity" type="number" min="1" name="quantity" value="{{ old('quantity', 1) }}" required></div>
<div class="field"><label for="unit_price">Prix unitaire</label><input class="input" id="unit_price" type="number" min="0" step="0.01" name="unit_price" value="{{ old('unit_price') }}"></div>
<div class="field"><label for="reason">Motif</label><input class="input" id="reason" name="reason" value="{{ old('reason') }}" placeholder="Réapprovisionnement, vente, casse…"></div>
<div class="field"><label for="reference">Référence</label><input class="input" id="reference" name="reference" value="{{ old('reference') }}"></div>
</div><button class="btn btn-primary" type="submit">Enregistrer le mouvement</button></form></div>
@endsection
