@extends('layouts.admin')

@section('title', 'Paiements — StockFlow Admin')

@section('content')

<h1 class="page-title">💳 Moyens de paiement</h1>
<p class="page-sub">Ces instructions sont affichées aux clients sur le site et dans les emails.</p>

{{-- Ajout rapide --}}
<div class="card">
    <div class="card-title">＋ Ajouter un moyen de paiement</div>
    <form method="POST" action="{{ route('admin.payments.store') }}">
        @csrf
        <div class="form-grid">
            <div class="field">
                <label>Nom *</label>
                <input class="input" name="name" value="{{ old('name') }}" placeholder="ex: Orange Money" required>
                @error('name') <div class="error-msg">{{ $message }}</div> @enderror
            </div>
            <div class="field">
                <label>Icône (emoji)</label>
                <input class="input" name="icon" value="{{ old('icon', '💳') }}" placeholder="🟠">
            </div>
            <div class="field">
                <label>Numéro / compte marchand</label>
                <input class="input" name="account" value="{{ old('account') }}" placeholder="+223 70 00 00 00">
            </div>
            <div class="field">
                <label>Ordre d'affichage</label>
                <input class="input" type="number" min="0" name="sort_order" value="{{ old('sort_order', 0) }}">
            </div>
        </div>
        <div class="field">
            <label>Instructions (une étape par ligne)</label>
            <textarea class="input" name="instructions" rows="5" placeholder="Composez #144#&#10;Choisissez « Transfert d'argent »…">{{ old('instructions') }}</textarea>
        </div>
        <button class="btn btn-primary">Ajouter</button>
    </form>
</div>

{{-- Liste --}}
<div class="card">
    <div class="table-wrap">
        <table>
            <thead>
            <tr><th>Icône</th><th>Nom</th><th>Compte</th><th>Instructions</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
            @forelse($methods as $method)
                <tr>
                    <td style="font-size:20px;">{{ $method->icon }}</td>
                    <td><strong>{{ $method->name }}</strong><div class="muted" style="font-size:11.5px;">{{ $method->key }}</div></td>
                    <td>{{ $method->account ?? '—' }}</td>
                    <td class="muted" style="font-size:12px; max-width:280px;">{{ Str::limit($method->instructions, 90) }}</td>
                    <td>
                        @if($method->is_active)
                            <span class="badge active">Visible</span>
                        @else
                            <span class="badge cancelled">Masqué</span>
                        @endif
                    </td>
                    <td style="white-space:nowrap;">
                        <a class="btn btn-ghost btn-xs" href="{{ route('admin.payments.edit', $method) }}">✏️ Modifier</a>
                        <form method="POST" action="{{ route('admin.payments.toggle', $method) }}" style="display:inline;">
                            @csrf
                            <button class="btn {{ $method->is_active ? 'btn-danger' : 'btn-success' }} btn-xs">
                                {{ $method->is_active ? 'Masquer' : 'Activer' }}
                            </button>
                        </form>
                        <form method="POST" action="{{ route('admin.payments.destroy', $method) }}" style="display:inline;"
                              onsubmit="return confirm('Supprimer ce moyen de paiement ?')">
                            @csrf @method('DELETE')
                            <button class="btn btn-danger btn-xs">🗑</button>
                        </form>
                    </td>
                </tr>
            @empty
                <tr><td colspan="6" class="muted" style="text-align:center; padding:30px;">Aucun moyen de paiement. Lance <code>php artisan db:seed --class=PaymentMethodSeeder</code></td></tr>
            @endforelse
            </tbody>
        </table>
    </div>
</div>

@endsection
