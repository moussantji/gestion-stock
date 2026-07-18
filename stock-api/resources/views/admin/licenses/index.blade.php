@extends('layouts.admin')

@section('title', 'Abonnements — StockFlow Admin')

@section('content')

<h1 class="page-title">👤 Abonnements</h1>
<p class="page-sub">Tous les abonnements des comptes clients — v2.14 : plus de clé, tout passe par le compte (email + mot de passe).</p>

<form method="GET" class="filters">
    <input class="input" name="q" value="{{ request('q') }}" placeholder="🔍 Client, email, formule…">
    <select class="input" name="status">
        <option value="">Tous les statuts</option>
        <option value="active" {{ request('status') === 'active' ? 'selected' : '' }}>✅ Actifs</option>
        <option value="expired" {{ request('status') === 'expired' ? 'selected' : '' }}>⌛ Expirés</option>
        <option value="revoked" {{ request('status') === 'revoked' ? 'selected' : '' }}>🚫 Révoqués</option>
    </select>
    <button class="btn btn-ghost">Filtrer</button>
</form>

<div class="card">
    <div class="table-wrap">
        <table>
            <thead>
            <tr><th>État</th><th>Titulaire</th><th>Formule</th><th>Commande</th><th>Expire</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
            @forelse($licenses as $license)
                @php $ss = $license->subscriptionState(); @endphp
                <tr>
                    {{-- 👤 v2.14 : état abonnement (la clé reste interne, jamais affichée) --}}
                    <td>
                        {{ ['active' => '🟢', 'expiring' => '🟠', 'grace' => '🟠', 'expired' => '🔴', 'revoked' => '🚫'][$ss['code']] }}
                        {{ ['active' => 'Actif', 'expiring' => 'Expire bientôt', 'grace' => 'Grâce', 'expired' => 'Expiré', 'revoked' => 'Révoqué'][$ss['code']] }}
                        @if($ss['code'] === 'grace')
                            <div class="muted" style="font-size:11px;">encore {{ $ss['grace_left'] }} j de grâce</div>
                        @elseif(in_array($ss['code'], ['active', 'expiring']) && $ss['days_left'] !== null)
                            <div class="muted" style="font-size:11px;">J-{{ $ss['days_left'] }}</div>
                        @endif
                    </td>
                    <td>
                        <strong>{{ $license->buyer_name }}</strong>
                        <div class="muted" style="font-size:12px;">{{ $license->buyer_email }}</div>
                    </td>
                    <td>{{ $license->plan_name }}</td>
                    <td class="mono muted">{{ $license->order?->reference }}</td>
                    <td>{{ $license->expires_at->format('d/m/Y') }}
                        <div class="muted" style="font-size:11.5px;">{{ $license->expires_at->diffForHumans() }}</div>
                    </td>
                    <td>
                        <span class="badge {{ $license->effective_status }}">
                            {{ ['active' => '✅ Active', 'expired' => '⌛ Expirée', 'revoked' => '🚫 Révoquée'][$license->effective_status] }}
                        </span>
                    </td>
                    <td>
                        <form method="POST" action="{{ route('admin.licenses.toggle', $license) }}">
                            @csrf
                            @if($license->status === 'active')
                                <button class="btn btn-danger btn-xs" onclick="return confirm('Révoquer cet abonnement ?')">Révoquer</button>
                            @else
                                <button class="btn btn-success btn-xs">Réactiver</button>
                            @endif
                        </form>
                    </td>
                </tr>
            @empty
                <tr><td colspan="7" class="muted" style="text-align:center; padding:30px;">Aucun abonnement.</td></tr>
            @endforelse
            </tbody>
        </table>
    </div>
    {{ $licenses->links() }}
</div>

@endsection
