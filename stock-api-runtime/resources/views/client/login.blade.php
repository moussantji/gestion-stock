@extends('layouts.site')

@section('title', __('site.client_login_title') . ' — StockFlow')

@section('content')

<div class="page-narrow" style="padding-top:56px; padding-bottom:70px;">
    <div class="eyebrow" style="text-align:center; margin-bottom:10px;">StockFlow</div>
    <h1 style="text-align:center; font-size:30px; font-weight:800; margin-bottom:8px;">@lang('site.client_login_title')</h1>
    <p style="text-align:center; color:var(--muted); font-size:14.5px; margin-bottom:26px;">@lang('site.client_login_sub')</p>

    <div class="card">
        <form method="POST" action="{{ route('client.login.post') }}">
            @csrf

            <div class="field">
                <label for="email">@lang('site.client_email') *</label>
                <input class="input" type="email" id="email" name="email" value="{{ old('email') }}" placeholder="vous@exemple.com" required autofocus>
                @error('email') <div class="error-text">{{ $message }}</div> @enderror
            </div>

            <div class="field">
                <label for="password">@lang('site.client_password') *</label>
                <input class="input" type="password" id="password" name="password" placeholder="••••••••" required>
                @error('password') <div class="error-text">{{ $message }}</div> @enderror
            </div>

            <label style="display:flex; align-items:center; gap:8px; color:var(--muted); font-size:13.5px; margin-bottom:18px; cursor:pointer;">
                <input type="checkbox" name="remember" value="1"> @lang('site.client_remember')
            </label>

            <button type="submit" class="btn btn-primary" style="width:100%; padding:15px;">
                @lang('site.client_login_btn')
            </button>
        </form>

        {{-- 🇬 v2.14 : connexion Google (visible uniquement si GOOGLE_CLIENT_ID configuré) --}}
        @if(config('google.client_id'))
            <div style="display:flex; align-items:center; gap:12px; margin:18px 0 14px;">
                <div style="flex:1; height:1px; background:var(--border);"></div>
                <span style="color:var(--muted); font-size:12px;">@lang('site.client_or')</span>
                <div style="flex:1; height:1px; background:var(--border);"></div>
            </div>
            <div style="display:flex; justify-content:center;">
                <script src="https://accounts.google.com/gsi/client" async defer></script>
                <div id="g_id_onload"
                     data-client_id="{{ config('google.client_id') }}"
                     data-login_uri="{{ route('client.login.google') }}"
                     data-auto_prompt="false">
                </div>
                <div class="g_id_signin"
                     data-type="standard"
                     data-size="large"
                     data-theme="filled_black"
                     data-text="continue_with"
                     data-shape="rectangular"
                     data-logo_alignment="left"
                     data-width="300">
                </div>
            </div>
        @endif
    </div>

    <div class="card" style="margin-top:18px; text-align:center;">
        <strong style="font-size:15px;">@lang('site.client_no_account')</strong>
        <p style="color:var(--muted); font-size:13.5px; margin:8px 0 14px;">@lang('site.client_no_account_hint')</p>
        <a href="{{ route('home') }}#tarifs" class="btn btn-ghost btn-sm">⚡ @lang('site.nav_pricing')</a>
    </div>

    <p style="text-align:center; color:var(--muted); font-size:13px; margin-top:18px;">
        🔑 @lang('site.client_forgot')
    </p>
</div>

@endsection
