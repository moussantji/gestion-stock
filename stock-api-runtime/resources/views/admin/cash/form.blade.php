@extends('layouts.admin')
@section('title','Nouvelle opération de caisse')
@section('content')
<div class="page-heading"><div><div class="eyebrow">TRÉSORERIE</div><h1 class="page-title">Nouvelle opération</h1><p class="page-sub">Enregistrez une entrée ou une sortie manuelle.</p></div><a class="btn btn-ghost" href="{{ route('admin.cash.index') }}">← Caisse</a></div>
@if($errors->any())<div class="flash error">{{ $errors->first() }}</div>@endif
<div class="card"><form method="POST" action="{{ route('admin.cash.store') }}">@csrf<div class="form-grid"><div class="field"><label>Type *</label><select class="input" name="type"><option value="in">Entrée</option><option value="out">Sortie</option></select></div><div class="field"><label>Montant (FCFA) *</label><input class="input" type="number" min="1" name="amount" required></div><div class="field"><label>Catégorie</label><input class="input" name="category" placeholder="Transport, achat, dépôt…"></div><div class="field"><label>Motif *</label><input class="input" name="reason" required></div></div><button class="btn btn-primary">Enregistrer</button></form></div>
@endsection
