@extends('layouts.admin')
@section('title', 'Nouvel inventaire')
@section('content')
<div class="page-heading"><div><div class="eyebrow">CONTRÔLE DU STOCK</div><h1 class="page-title">Nouvel inventaire</h1><p class="page-sub">Créez une session pour comparer le stock théorique au stock physique.</p></div><a class="btn btn-ghost" href="{{ route('admin.inventories.index') }}">← Inventaires</a></div>
@if($errors->any())<div class="flash error">{{ $errors->first() }}</div>@endif
<div class="card"><form method="POST" action="{{ route('admin.inventories.store') }}">@csrf<div class="field"><label for="name">Nom de l’inventaire *</label><input class="input" id="name" name="name" placeholder="Inventaire rayon boissons — juillet 2026" required></div><button class="btn btn-primary">Créer la session</button></form></div>
@endsection
