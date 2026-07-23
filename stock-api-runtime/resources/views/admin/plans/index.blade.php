@extends('layouts.admin')

@section('title', 'Formules — StockFlow Admin')

@section('content')

<h1 class="page-title">💎 Formules</h1>
<p class="page-sub">Les licences vendues sur le site.</p>

<div class="card">
    <div class="card-title">
        {{ $plans->count() }} formule(s)
        <a class="btn btn-primary btn-xs" href="{{ route('admin.plans.create') }}">＋ Nouvelle formule</a>
    </div>

    <div class="table-wrap">
        <table>
            <thead>
            <tr><th>Nom</th><th>Prix</th><th>Durée</th><th>Limites</th><th>Commandes</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
            @foreach($plans as $plan)
                <tr>
                    <td>
                        <strong>{{ $plan->name }}</strong>
                        <div class="muted" style="font-size:12px;">/{{ $plan->slug }}</div>
                    </td>
                    <td>{{ $plan->formatted_price }}</td>
                    <td>{{ $plan->duration_days }} jours</td>
                    <td class="muted">{{ $plan->max_users }} util. · {{ number_format($plan->max_products, 0, ',', ' ') }} prod.</td>
                    <td>{{ $plan->orders_count }}</td>
                    <td>
                        @if($plan->is_active)
                            <span class="badge active">Active</span>
                        @else
                            <span class="badge cancelled">Masquée</span>
                        @endif
                    </td>
                    <td style="white-space:nowrap;">
                        <a class="btn btn-ghost btn-xs" href="{{ route('admin.plans.edit', $plan) }}">✏️ Modifier</a>
                        @if($plan->orders_count === 0)
                            <form method="POST" action="{{ route('admin.plans.destroy', $plan) }}" style="display:inline;"
                                  onsubmit="return confirm('Supprimer cette formule ?')">
                                @csrf @method('DELETE')
                                <button class="btn btn-danger btn-xs">🗑</button>
                            </form>
                        @endif
                    </td>
                </tr>
            @endforeach
            </tbody>
        </table>
    </div>
</div>

@endsection
