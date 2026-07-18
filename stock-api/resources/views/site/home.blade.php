@extends('layouts.site')

@section('title', 'StockFlow — Gestion de stock nouvelle génération')

@section('content')

{{-- ================= HERO ================= --}}
<section class="hero container">
    <div class="badge reveal"><span class="dot"></span> @lang('site.hero_badge')</div>

    <h1 class="reveal">@lang('site.hero_title_a') <span class="gradient-text">@lang('site.hero_title_b')</span></h1>

    <p class="sub reveal">@lang('site.hero_subtitle')</p>

    <div class="hero-actions reveal">
        <a href="#tarifs" class="btn btn-primary">@lang('site.hero_cta_primary')</a>
        <a href="#fonctionnalites" class="btn btn-ghost">@lang('site.hero_cta_secondary')</a>
    </div>

    <div class="hero-visual reveal">
        <img src="{{ asset('images/hero-dashboard.png') }}" alt="Dashboard StockFlow">
    </div>

    <div class="hero-stats reveal">
        <div class="hero-stat"><strong class="gradient-text">{{ max($licensesCount, 120) }}+</strong><span>@lang('site.stat_licenses')</span></div>
        <div class="hero-stat"><strong class="gradient-text">99,9 %</strong><span>@lang('site.stat_uptime')</span></div>
        <div class="hero-stat"><strong class="gradient-text">100 %</strong><span>@lang('site.stat_offline')</span></div>
    </div>
</section>

{{-- ================= FONCTIONNALITÉS ================= --}}
<section id="fonctionnalites" class="section">
    <div class="container">
        <div class="section-head reveal">
            <div class="eyebrow">@lang('site.features_eyebrow')</div>
            <h2>@lang('site.features_title_a') <span class="gradient-text">@lang('site.features_title_b')</span></h2>
            <p>@lang('site.features_subtitle')</p>
        </div>

        <div class="features-grid">
            @foreach([
                ['📦', 'site.feat_1_t', 'site.feat_1_d'],
                ['🔄', 'site.feat_2_t', 'site.feat_2_d'],
                ['📡', 'site.feat_3_t', 'site.feat_3_d'],
                ['📷', 'site.feat_4_t', 'site.feat_4_d'],
                ['⚠️', 'site.feat_5_t', 'site.feat_5_d'],
                ['📊', 'site.feat_6_t', 'site.feat_6_d'],
            ] as [$icon, $titleKey, $descKey])
                <div class="feature-card reveal">
                    <div class="feature-icon">{{ $icon }}</div>
                    <h3>@lang($titleKey)</h3>
                    <p>@lang($descKey)</p>
                </div>
            @endforeach
        </div>
    </div>
</section>

{{-- ================= APP SHOWCASE ================= --}}
<section class="section">
    <div class="container showcase">
        <div class="reveal">
            <img src="{{ asset('images/app-mockup.png') }}" alt="Application mobile StockFlow">
        </div>
        <div class="reveal">
            <div class="eyebrow">@lang('site.showcase_eyebrow')</div>
            <h2 style="font-size: clamp(26px,4vw,40px); font-weight:800;">@lang('site.showcase_title_a') <span class="gradient-text">@lang('site.showcase_title_b')</span></h2>
            <div class="showcase-list">
                @foreach([
                    ['site.step_1_t', 'site.step_1_d'],
                    ['site.step_2_t', 'site.step_2_d'],
                    ['site.step_3_t', 'site.step_3_d'],
                ] as $i => [$stepT, $stepD])
                    <div class="showcase-item">
                        <div class="num">{{ $i + 1 }}</div>
                        <div>
                            <h4>@lang($stepT)</h4>
                            <p>@lang($stepD)</p>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
    </div>
</section>

{{-- ================= TARIFS ================= --}}
<section id="tarifs" class="section">
    <div class="container">
        <div class="section-head reveal">
            <div class="eyebrow">@lang('site.pricing_eyebrow')</div>
            <h2>@lang('site.pricing_title_a') <span class="gradient-text">@lang('site.pricing_title_b')</span></h2>
            <p>@lang('site.pricing_subtitle')</p>
        </div>

        <div class="pricing-grid">
            @foreach($plans as $plan)
                <div class="price-card reveal {{ $plan->slug === 'business' ? 'featured' : '' }}">
                    @if($plan->slug === 'business')
                        <div class="price-tag">@lang('site.popular')</div>
                    @endif
                    <div class="plan-name">{{ $plan->name }}</div>
                    <div class="plan-desc">{{ $plan->description }}</div>
                    <div class="plan-price">
                        {{ number_format($plan->price, 0, ',', ' ') }} FCFA
                        <small>@lang('site.per_days', ['days' => $plan->duration_days])</small>
                    </div>
                    <ul class="plan-features">
                        @foreach($plan->features ?? [] as $feature)
                            <li>{{ $feature }}</li>
                        @endforeach
                    </ul>
                    <a href="{{ route('checkout', $plan->slug) }}"
                       class="btn {{ $plan->slug === 'business' ? 'btn-primary' : 'btn-ghost' }}">
                        @lang('site.buy_plan', ['name' => $plan->name])
                    </a>
                </div>
            @endforeach
        </div>

        <p style="text-align:center; color:var(--muted); margin-top:34px; font-size:14px;" class="reveal">
            @lang('site.payment_note')
        </p>
    </div>
</section>

{{-- ================= FAQ ================= --}}
<section id="faq" class="section" style="padding-top: 40px;">
    <div class="container">
        <div class="section-head reveal">
            <div class="eyebrow">@lang('site.faq_eyebrow')</div>
            <h2>@lang('site.faq_title_a') <span class="gradient-text">@lang('site.faq_title_b')</span></h2>
        </div>
        <div class="faq-list">
            @foreach(range(1, 4) as $i)
                <details class="faq-item reveal">
                    <summary>@lang("site.faq_{$i}_q")</summary>
                    <p>@lang("site.faq_{$i}_a")</p>
                </details>
            @endforeach
        </div>
    </div>
</section>

{{-- ================= CTA ================= --}}
<div class="container">
    <div class="cta-final reveal">
        <h2>@lang('site.cta_title_a') <span class="gradient-text">@lang('site.cta_title_b')</span></h2>
        <p>@lang('site.cta_subtitle')</p>
        <a href="#tarifs" class="btn btn-primary">@lang('site.cta_button')</a>
    </div>
</div>

@endsection
