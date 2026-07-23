@extends('layouts.admin')

@section('title', 'Boutique — StockFlow Admin')

@section('content')

<h1 class="page-title">🏪 Ma boutique</h1>
<p class="page-sub">L'identité de ta boutique, affichée en tête des reçus PDF (ventes & licences).</p>

@if(session('success'))
    <div class="flash flash-success">✅ {{ session('success') }}</div>
@endif

<div class="card">
    <div class="card-title">🖼 Logo de la boutique</div>

    <div class="form-grid" style="align-items:center;">
        <div class="field">
            <label>Logo actuel</label>
            @if($logoUrl)
                <div style="background:#0B0F1A;border-radius:12px;padding:18px;display:inline-block;">
                    <img src="{{ $logoUrl }}" alt="Logo" style="max-height:72px;max-width:220px;display:block;">
                </div>
            @else
                <div class="muted" style="padding:14px 0;">Aucun logo pour l'instant — tes reçus affichent le nom de la boutique.</div>
            @endif
        </div>
        <div class="field">
            <form method="POST" action="{{ route('admin.settings.logo') }}" enctype="multipart/form-data">
                @csrf
                <label>Nouveau logo (PNG, JPG, WebP · max 2 Mo)</label>
                <input class="input" type="file" name="logo" accept="image/png,image/jpeg,image/webp" required>
                @error('logo') <div class="error-msg">{{ $message }}</div> @enderror
                <div style="margin-top:12px;display:flex;gap:10px;">
                    <button class="btn btn-primary" type="submit">📷 Envoyer le logo</button>
                    @if($logoUrl)
                        <button class="btn btn-danger" type="submit" form="delete-logo"
                                onclick="return confirm('Supprimer le logo ?')">🗑 Supprimer</button>
                    @endif
                </div>
            </form>
            @if($logoUrl)
                <form id="delete-logo" method="POST" action="{{ route('admin.settings.logo.delete') }}">
                    @csrf
                    @method('DELETE')
                </form>
            @endif
        </div>
    </div>
    <p class="muted" style="margin-top:6px;">💡 Conseil : un logo carré ou horizontal sur fond transparent rendra le mieux sur le bandeau sombre des reçus.</p>
</div>

<div class="card">
    <div class="card-title">📇 Informations affichées sur les reçus</div>
    <table class="table">
        <tr><th>Nom</th><td>{{ $shop['name'] }}</td></tr>
        <tr><th>Téléphone</th><td>{{ $shop['phone'] }}</td></tr>
        <tr><th>Email</th><td>{{ $shop['email'] }}</td></tr>
        <tr><th>Adresse</th><td>{{ $shop['address'] }}</td></tr>
        <tr><th>Slogan</th><td>{{ $shop['slogan'] }}</td></tr>
    </table>
    <p class="muted" style="margin-top:10px;">✏️ Ces infos se modifient dans le fichier <code>.env</code> du serveur :
        <code>SHOP_NAME</code>, <code>SHOP_PHONE</code>, <code>SHOP_EMAIL</code>, <code>SHOP_ADDRESS</code>, <code>SHOP_SLOGAN</code> — puis <code>php artisan config:clear</code>.</p>
</div>

@endsection
