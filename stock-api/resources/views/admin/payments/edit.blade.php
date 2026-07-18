@extends('layouts.admin')

@section('title', 'Modifier ' . $method->name . ' — StockFlow Admin')

@section('content')

<h1 class="page-title">✏️ {{ $method->icon }} {{ $method->name }}</h1>
<p class="page-sub"><a href="{{ route('admin.payments.index') }}" style="color:var(--accent);">← Retour aux moyens de paiement</a></p>

<div class="card" style="max-width:680px;">
    <form method="POST" action="{{ route('admin.payments.update', $method) }}">
        @csrf
        @method('PUT')

        <div class="form-grid">
            <div class="field">
                <label>Nom *</label>
                <input class="input" name="name" value="{{ old('name', $method->name) }}" required>
                @error('name') <div class="error-msg">{{ $message }}</div> @enderror
            </div>
            <div class="field">
                <label>Icône (emoji)</label>
                <input class="input" name="icon" value="{{ old('icon', $method->icon) }}">
            </div>
        </div>

        <div class="field">
            <label>Numéro / compte marchand</label>
            <input class="input" name="account" value="{{ old('account', $method->account) }}"
                   placeholder="ex: +223 70 00 00 00 — affiché en gras aux clients">
            @error('account') <div class="error-msg">{{ $message }}</div> @enderror
        </div>

        <div class="field">
            <label>Instructions client (une étape par ligne)</label>
            <textarea class="input" name="instructions" rows="8">{{ old('instructions', $method->instructions) }}</textarea>
            <p class="muted" style="font-size:12px; margin-top:6px;">💡 Affichées étape par étape sur la page de confirmation et dans l'email de commande.</p>
        </div>

        <div class="form-grid">
            <div class="field">
                <label>Ordre d'affichage</label>
                <input class="input" type="number" min="0" name="sort_order" value="{{ old('sort_order', $method->sort_order) }}">
            </div>
            <div class="field">
                <label>&nbsp;</label>
                <label style="display:flex; align-items:center; gap:9px; margin-top:8px; color:var(--text); font-size:13.5px;">
                    <input type="checkbox" name="is_active" value="1" {{ old('is_active', $method->is_active) ? 'checked' : '' }}>
                    Visible sur le site
                </label>
            </div>
        </div>

        <button class="btn btn-primary" style="padding:12px 26px;">Enregistrer</button>
    </form>
</div>

@endsection
