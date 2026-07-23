@extends('layouts.admin')

@section('title', ($plan ? 'Modifier' : 'Nouvelle') . ' formule — StockFlow Admin')

@section('content')

<h1 class="page-title">{{ $plan ? '✏️ Modifier' : '＋ Nouvelle' }} formule</h1>
<p class="page-sub"><a href="{{ route('admin.plans.index') }}" style="color:var(--accent);">← Retour aux formules</a></p>

<div class="card" style="max-width:720px;">
    <form method="POST" action="{{ $plan ? route('admin.plans.update', $plan) : route('admin.plans.store') }}">
        @csrf
        @if($plan) @method('PUT') @endif

        <div class="form-grid">
            <div class="field">
                <label>Nom *</label>
                <input class="input" name="name" value="{{ old('name', $plan?->name) }}" placeholder="ex: Business" required>
                @error('name') <div class="error-msg">{{ $message }}</div> @enderror
            </div>
            <div class="field">
                <label>Slug (URL)</label>
                <input class="input" name="slug" value="{{ old('slug', $plan?->slug) }}" placeholder="auto si vide">
                @error('slug') <div class="error-msg">{{ $message }}</div> @enderror
            </div>
            <div class="field">
                <label>Prix (FCFA) *</label>
                <input class="input" type="number" min="0" name="price" value="{{ old('price', $plan?->price) }}" required>
                @error('price') <div class="error-msg">{{ $message }}</div> @enderror
            </div>
            <div class="field">
                <label>Durée (jours) *</label>
                <input class="input" type="number" min="1" name="duration_days" value="{{ old('duration_days', $plan?->duration_days ?? 30) }}" required>
                @error('duration_days') <div class="error-msg">{{ $message }}</div> @enderror
            </div>
            <div class="field">
                <label>Utilisateurs max *</label>
                <input class="input" type="number" min="1" name="max_users" value="{{ old('max_users', $plan?->max_users ?? 1) }}" required>
            </div>
            <div class="field">
                <label>Produits max *</label>
                <input class="input" type="number" min="1" name="max_products" value="{{ old('max_products', $plan?->max_products ?? 100) }}" required>
            </div>
            <div class="field">
                <label>Ordre d'affichage</label>
                <input class="input" type="number" min="0" name="sort_order" value="{{ old('sort_order', $plan?->sort_order ?? 0) }}">
            </div>
            <div class="field">
                <label>&nbsp;</label>
                <label style="display:flex; align-items:center; gap:9px; margin-top:8px; color:var(--text); font-size:13.5px;">
                    <input type="checkbox" name="is_active" value="1" {{ old('is_active', $plan?->is_active ?? true) ? 'checked' : '' }}>
                    Formule visible sur le site
                </label>
            </div>
        </div>

        <div class="field">
            <label>Description courte</label>
            <input class="input" name="description" value="{{ old('description', $plan?->description) }}" placeholder="ex: Pour les commerces en croissance.">
        </div>

        <div class="field">
            <label>Avantages (un par ligne)</label>
            <textarea class="input" name="features" rows="7" placeholder="Mode hors ligne + synchronisation&#10;Scan code-barres&#10;Support prioritaire">{{ old('features', $plan ? implode("\n", $plan->features ?? []) : '') }}</textarea>
        </div>

        <button class="btn btn-primary" style="padding:12px 26px;">{{ $plan ? 'Enregistrer' : 'Créer la formule' }}</button>
    </form>
</div>

@endsection
