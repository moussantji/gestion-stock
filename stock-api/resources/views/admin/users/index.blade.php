@extends('layouts.admin')

@section('title', 'Utilisateurs — StockFlow Admin')

@section('content')

<h1 class="page-title">👥 Utilisateurs de l'app</h1>
<p class="page-sub">Comptes du <strong>personnel</strong> (admin, gestionnaire, employé) ayant accès à la caisse.</p>

<div class="flash" style="background: rgba(56,189,248,0.1); color:#38bdf8; border:1px solid rgba(56,189,248,0.3);">
    ℹ️ Les <strong>comptes clients</strong> (abonnés du portail <code>/compte</code>) ne se créent pas ici : ils sont générés automatiquement en <strong>validant une commande</strong> dans <a href="{{ route('admin.orders.index') }}" style="color:inherit; text-decoration:underline;">Commandes</a> (le mot de passe s'affiche une seule fois).
</div>

{{-- Création rapide --}}
<div class="card">
    <div class="card-title">＋ Créer un utilisateur</div>
    <form method="POST" action="{{ route('admin.users.store') }}">
        @csrf
        <div class="form-grid">
            <div class="field">
                <label>Nom *</label>
                <input class="input" name="name" value="{{ old('name') }}" required>
                @error('name') <div class="error-msg">{{ $message }}</div> @enderror
            </div>
            <div class="field">
                <label>Email *</label>
                <input class="input" type="email" name="email" value="{{ old('email') }}" required>
                @error('email') <div class="error-msg">{{ $message }}</div> @enderror
            </div>
            <div class="field">
                <label>Mot de passe (min. 8) *</label>
                <input class="input" type="text" name="password" required>
                @error('password') <div class="error-msg">{{ $message }}</div> @enderror
            </div>
            <div class="field">
                <label>Rôle *</label>
                <select class="input" name="role">
                    <option value="employee">Employé</option>
                    <option value="manager">Gestionnaire</option>
                    <option value="admin">Administrateur</option>
                </select>
            </div>
        </div>
        <button class="btn btn-primary">Créer le compte</button>
    </form>
</div>

{{-- Liste --}}
<form method="GET" class="filters">
    <select class="input" name="role" onchange="this.form.submit()">
        <option value="">Tous les rôles</option>
        <option value="admin" {{ request('role') === 'admin' ? 'selected' : '' }}>Administrateurs</option>
        <option value="manager" {{ request('role') === 'manager' ? 'selected' : '' }}>Gestionnaires</option>
        <option value="employee" {{ request('role') === 'employee' ? 'selected' : '' }}>Employés</option>
    </select>
</form>

<div class="card">
    <div class="table-wrap">
        <table>
            <thead>
            <tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Mouvements</th><th>Créé le</th><th></th></tr>
            </thead>
            <tbody>
            @forelse($users as $user)
                <tr>
                    <td><strong>{{ $user->name }}</strong> {{ $user->id === auth()->id() ? '(moi)' : '' }}</td>
                    <td class="muted">{{ $user->email }}</td>
                    <td>
                        <span class="badge {{ $user->role }}">
                            {{ ['admin' => 'Admin', 'manager' => 'Gestionnaire', 'employee' => 'Employé'][$user->role] }}
                        </span>
                    </td>
                    <td>{{ $user->movements_count }}</td>
                    <td class="muted">{{ $user->created_at->format('d/m/Y') }}</td>
                    <td>
                        @if($user->id !== auth()->id())
                            <form method="POST" action="{{ route('admin.users.destroy', $user) }}"
                                  onsubmit="return confirm('Supprimer ce compte ?')">
                                @csrf @method('DELETE')
                                <button class="btn btn-danger btn-xs">🗑</button>
                            </form>
                        @endif
                    </td>
                </tr>
            @empty
                <tr><td colspan="6" class="muted" style="text-align:center; padding:30px;">Aucun utilisateur.</td></tr>
            @endforelse
            </tbody>
        </table>
    </div>
    {{ $users->links() }}
</div>

@endsection
