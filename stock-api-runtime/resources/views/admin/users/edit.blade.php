@extends('layouts.admin')
@section('title','Modifier utilisateur')
@section('content')
<div class="page-heading"><div><div class="eyebrow">ÉQUIPE</div><h1 class="page-title">Modifier l’utilisateur</h1><p class="page-sub">{{ $user->name }} · {{ $user->email }}</p></div><a class="btn btn-ghost" href="{{ route('admin.users.index') }}">← Utilisateurs</a></div>
@if($errors->any())<div class="flash error">{{ $errors->first() }}</div>@endif
<div class="card"><form method="POST" action="{{ route('admin.users.update', $user) }}">@csrf @method('PUT')<div class="form-grid"><div class="field"><label>Nom *</label><input class="input" name="name" value="{{ old('name',$user->name) }}" required></div><div class="field"><label>Email *</label><input class="input" type="email" name="email" value="{{ old('email',$user->email) }}" required></div><div class="field"><label>Nouveau mot de passe</label><input class="input" type="password" name="password" placeholder="Laisser vide pour conserver"></div><div class="field"><label>Rôle *</label><select class="input" name="role"><option value="employee" @selected($user->role==='employee')>Employé</option><option value="manager" @selected($user->role==='manager')>Manager</option><option value="admin" @selected($user->role==='admin')>Administrateur</option></select></div></div><button class="btn btn-primary">Enregistrer</button></form></div>
@endsection
