@extends('layouts.site')

@section('title', __('site.client_dash_title') . ' — StockFlow')

@section('content')

@php
    // Badge d'état d'abonnement (calculé par License::subscriptionState())
    $statusMap = [
        'active'   => ['label' => __('site.client_status_active'),   'color' => '#34d399'],
        'expiring' => ['label' => __('site.client_status_expiring'), 'color' => '#fbbf24'],
        'grace'    => ['label' => __('site.client_status_grace'),    'color' => '#fb923c'],
        'expired'  => ['label' => __('site.client_status_expired'),  'color' => '#f87171'],
        'revoked'  => ['label' => __('site.client_status_revoked'),  'color' => '#94a3b8'],
    ];
    $st = $state ? $statusMap[$state['code']] : null;
@endphp

<div class="container" style="max-width:820px; padding-top:44px; padding-bottom:80px;">

    {{-- ================= En-tête ================= --}}
    <div style="display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:26px;">
        <div>
            <h1 style="font-size:26px; font-weight:800; margin-bottom:2px;">@lang('site.client_hello', ['name' => $user->name])</h1>
            <div style="color:var(--muted); font-size:13.5px;">{{ $user->email }}</div>
        </div>
        <form method="POST" action="{{ route('client.logout') }}">
            @csrf
            <button type="submit" class="btn btn-ghost btn-sm">🚪 @lang('site.client_logout')</button>
        </form>
    </div>

    {{-- ================= Abonnement ================= --}}
    <div class="card" style="margin-bottom:22px;">
        <h2 style="font-size:18px; font-weight:800; margin-bottom:16px;">📦 @lang('site.client_sub_title')</h2>

        @if($current && $st)
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:14px;">
                <span style="display:inline-flex; align-items:center; gap:8px; padding:7px 15px; border-radius:999px; font-size:13.5px; font-weight:700; background:var(--surface); border:1px solid var(--border-strong); color:{{ $st['color'] }};">
                    {{ $st['label'] }}
                </span>
                @if($state['code'] === 'active' || $state['code'] === 'expiring')
                    <span style="color:var(--muted); font-size:13.5px;">⏳ @lang('site.client_days_left', ['count' => $state['days_left']])</span>
                @elseif($state['code'] === 'grace')
                    <span style="color:var(--warning); font-size:13.5px;">⚠️ @lang('site.client_grace_left', ['count' => $state['grace_left']])</span>
                @endif
            </div>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                <tr>
                    <td style="padding:9px 0; border-bottom:1px solid var(--border); color:var(--muted);">@lang('site.client_plan')</td>
                    <td align="right" style="padding:9px 0; border-bottom:1px solid var(--border); font-weight:700;">{{ $current->plan_name }}</td>
                </tr>
                <tr>
                    <td style="padding:9px 0; color:var(--muted);">
                        {{ in_array($state['code'], ['expired', 'grace']) ? __('site.client_expired_on') : __('site.client_until') }}
                    </td>
                    <td align="right" style="padding:9px 0; font-weight:800; color:{{ $st['color'] }};">{{ $current->expires_at->format('d/m/Y') }}</td>
                </tr>
            </table>

            @if($state['code'] === 'expired')
                <div class="alert-danger" style="margin-top:14px;">🔒 @lang('site.client_expired_hint')</div>
            @elseif($state['code'] === 'revoked')
                <div class="alert-danger" style="margin-top:14px;">@lang('site.client_revoked_hint')</div>
            @endif

            <p style="color:var(--muted); font-size:12.5px; margin-top:14px;">💡 @lang('site.client_renew_hint')</p>
        @else
            <div style="text-align:center; padding:16px 0 8px;">
                <div style="font-size:34px;">🌱</div>
                <p style="font-weight:700; margin:8px 0 4px;">@lang('site.client_no_sub')</p>
                <p style="color:var(--muted); font-size:13.5px;">@lang('site.client_no_sub_hint')</p>
            </div>
        @endif
    </div>

    {{-- ================= Formules (renouvellement / première commande) ================= --}}
    <div class="card" style="margin-bottom:22px;">
        <h2 style="font-size:18px; font-weight:800; margin-bottom:6px;">⚡ @lang('site.client_plans_title')</h2>
        @foreach($plans as $plan)
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:13px 0; border-bottom:1px solid var(--border); flex-wrap:wrap;">
                <div>
                    <strong style="font-size:15px;">{{ $plan->name }}</strong>
                    <span style="color:var(--muted); font-size:13px;">· {{ $plan->duration_days }} @lang('site.days')</span>
                    <div style="color:var(--accent); font-weight:800; font-size:14.5px;">{{ $plan->formatted_price }}</div>
                </div>
                {{-- Pré-remplissage du checkout avec email/nom du compte → prolongation auto (même email) --}}
                <a href="{{ route('checkout', ['plan' => $plan->slug, 'name' => $user->name, 'email' => $user->email]) }}" class="btn btn-primary btn-sm">
                    {{ $current ? __('site.client_renew') : __('site.client_order_now') }}
                </a>
            </div>
        @endforeach
    </div>

    {{-- ================= Commandes & reçus ================= --}}
    <div class="card">
        <h2 style="font-size:18px; font-weight:800; margin-bottom:6px;">🧾 @lang('site.client_orders_title')</h2>
        @forelse($orders as $order)
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 0; border-bottom:1px solid var(--border); flex-wrap:wrap;">
                <div>
                    <div style="font-weight:700; font-size:14px;">{{ $order->reference }}</div>
                    <div style="color:var(--muted); font-size:12.5px;">
                        {{ $order->created_at->format('d/m/Y') }} · {{ $order->plan_name }} · {{ number_format($order->amount, 0, ',', ' ') }} FCFA
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:12.5px;">
                        @if($order->status === \App\Models\Order::STATUS_PAID)
                            @lang('site.client_order_paid')
                        @elseif($order->status === \App\Models\Order::STATUS_CANCELLED)
                            @lang('site.client_order_cancelled')
                        @else
                            @lang('site.client_order_pending')
                        @endif
                    </span>
                    <a href="{{ route('order.receipt', $order->reference) }}" class="btn btn-ghost btn-sm" style="font-size:12.5px;">@lang('site.client_receipt')</a>
                </div>
            </div>
        @empty
            <p style="color:var(--muted); font-size:13.5px; text-align:center; padding:12px 0;">@lang('site.client_no_orders')</p>
        @endforelse
    </div>

</div>

@endsection
