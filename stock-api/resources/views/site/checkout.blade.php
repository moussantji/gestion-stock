@extends('layouts.site')

@section('title', __('site.buy_plan', ['name' => $plan->name]) . ' — StockFlow')

@section('content')

<div class="page-narrow">
    <div class="eyebrow" style="text-align:center; margin-bottom:10px;">@lang('site.checkout_eyebrow')</div>
    <h1 style="text-align:center; font-size:32px; font-weight:800; margin-bottom:26px;">@lang('site.checkout_title') <span class="gradient-text">{{ $plan->name }}</span></h1>

    <div class="card">
        <div class="summary-box">
            <div>
                <strong style="font-size:17px;">{{ $plan->name }}</strong>
                <div style="color:var(--muted); font-size:13.5px;">{{ $plan->description }}</div>
                <div style="color:var(--muted); font-size:13px; margin-top:4px;">
                    {{ $plan->duration_days }} @lang('site.days') · {{ $plan->max_users }} @lang('site.users_max') · {{ number_format($plan->max_products, 0, ',', ' ') }} @lang('site.products_max')
                </div>
            </div>
            <div class="amount">{{ $plan->formatted_price }}</div>
        </div>

        <form method="POST" action="{{ route('purchase', $plan->slug) }}">
            @csrf

            <div class="field">
                <label for="buyer_name">@lang('site.field_name') *</label>
                <input class="input" type="text" id="buyer_name" name="buyer_name" value="{{ old('buyer_name', $prefillName ?? '') }}" placeholder="@lang('site.field_name_ph')" required>
                @error('buyer_name') <div class="error-text">{{ $message }}</div> @enderror
            </div>

            <div class="field">
                <label for="buyer_email">@lang('site.field_email') *</label>
                <input class="input" type="email" id="buyer_email" name="buyer_email" value="{{ old('buyer_email', $prefillEmail ?? '') }}" placeholder="@lang('site.field_email_ph')" required>
                @error('buyer_email') <div class="error-text">{{ $message }}</div> @enderror
            </div>

            <div class="field">
                <label for="buyer_phone">@lang('site.field_phone')</label>
                <input class="input" type="tel" id="buyer_phone" name="buyer_phone" value="{{ old('buyer_phone') }}" placeholder="@lang('site.field_phone_ph')">
                @error('buyer_phone') <div class="error-text">{{ $message }}</div> @enderror
            </div>

            <div class="field">
                <label for="payment_method">@lang('site.field_payment') *</label>
                <select class="input" id="payment_method" name="payment_method" required>
                    <option value="">@lang('site.choose')</option>
                    @foreach($paymentMethods as $method)
                        <option value="{{ $method->name }}" {{ old('payment_method') === $method->name ? 'selected' : '' }}>
                            {{ $method->icon }} {{ $method->name }}
                        </option>
                    @endforeach
                </select>
                @error('payment_method') <div class="error-text">{{ $message }}</div> @enderror
            </div>

            <div class="field">
                <label for="notes">@lang('site.field_notes')</label>
                <input class="input" type="text" id="notes" name="notes" value="{{ old('notes') }}" placeholder="@lang('site.field_notes_ph')">
                @error('notes') <div class="error-text">{{ $message }}</div> @enderror
            </div>

            <button type="submit" class="btn btn-primary" style="width:100%; padding:15px;">
                @lang('site.order_btn') — {{ $plan->formatted_price }}
            </button>
        </form>
    </div>

    <p style="text-align:center; color:var(--muted); font-size:13px; margin-top:18px;">
        @lang('site.secure_note')
    </p>
</div>

@endsection
