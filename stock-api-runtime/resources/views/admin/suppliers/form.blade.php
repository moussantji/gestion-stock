@extends('layouts.admin')
@php($editing = $supplier->exists)
@section('title', ($editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'))
@section('content')
<div class="page-heading"><div><div class="eyebrow">APPROVISIONNEMENT</div><h1 class="page-title">{{ $editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur' }}</h1><p class="page-sub">Conservez les coordonnées utiles à vos commandes.</p></div><a class="btn btn-ghost" href="{{ route('admin.suppliers.index') }}">← Fournisseurs</a></div>
@if($errors->any())<div class="flash error"><ul style="margin-left:18px;">@foreach($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul></div>@endif
<div class="card"><form method="POST" action="{{ $editing ? route('admin.suppliers.update', $supplier) : route('admin.suppliers.store') }}">@csrf @if($editing) @method('PUT') @endif<div class="form-grid"><div class="field"><label>Nom *</label><input class="input" name="name" value="{{ old('name', $supplier->name) }}" required></div><div class="field"><label>Téléphone</label><input class="input" name="phone" value="{{ old('phone', $supplier->phone) }}"></div><div class="field"><label>Email</label><input class="input" type="email" name="email" value="{{ old('email', $supplier->email) }}"></div><div class="field"><label>Adresse</label><input class="input" name="address" value="{{ old('address', $supplier->address) }}"></div></div><button class="btn btn-primary">{{ $editing ? 'Enregistrer' : 'Créer le fournisseur' }}</button></form></div>
@endsection
