@extends('layouts.site')

@section('title', __('site.confirm_title') . ' — StockFlow')

@section('content')

<div class="page-narrow">
    <div class="big-check" aria-label="Confirmation" role="img"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></div>
    <h1 style="text-align:center; font-size:30px; font-weight:800; margin-bottom:8px;">@lang('site.confirm_title')</h1>
    <p style="text-align:center; color:var(--muted); margin-bottom:30px;">@lang('site.confirm_thanks', ['name' => $order->buyer_name])</p>

    <div class="card">
        <div class="summary-box">
            <div>
                <div style="color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.08em;">@lang('site.reference')</div>
                <strong style="font-size:16px;">{{ $order->reference }}</strong>
                <div style="color:var(--muted); font-size:13.5px; margin-top:3px;">@lang('site.plan') {{ $order->plan_name }}</div>
            </div>
            <div class="amount">{{ $order->formatted_amount }}</div>
        </div>

        <h3 style="font-size:16px; font-weight:700;">@lang('site.payment_steps_title', ['method' => $order->payment_method])</h3>

        @if($method)
            <div class="method-pill">{{ $method->icon }} {{ $method->name }}</div>

            @if($method->account)
                <span class="method-account">📱 {{ $method->account }}</span>
            @endif

            <ol class="payment-steps">
                @foreach($method->steps() as $step)
                    <li>{{ $step }}</li>
                @endforeach
                <li>@lang('site.final_step')</li>
            </ol>
        @else
            <ol class="payment-steps">
                <li>@lang('site.final_step')</li>
            </ol>
        @endif

        <p style="color:var(--muted); font-size:13.5px;">
            @lang('site.email_note', ['email' => $order->buyer_email])
            <a href="{{ route('license.check') }}" style="color:var(--accent);">@lang('site.verify_page')</a>.
        </p>
    </div>

    <div style="text-align:center; margin-top:26px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <a href="{{ route('order.receipt', $order->reference) }}" class="btn btn-primary"><svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a2 2 0 0 1 2 2v14H4V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h6M8 16h4"/></svg> Télécharger le reçu (PDF)</a>
        <a href="{{ route('home') }}" class="btn btn-ghost">@lang('site.back_home')</a>
    </div>
</div>

@endsection
