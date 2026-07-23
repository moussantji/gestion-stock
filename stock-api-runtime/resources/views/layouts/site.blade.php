<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'StockFlow — Gestion de stock nouvelle génération')</title>
    <meta name="description" content="StockFlow : l'application de gestion de stock premium. Produits, mouvements, alertes, mode hors ligne. Achetez votre abonnement.">

    <link rel="icon" type="image/svg+xml" href="{{ asset('icon.svg') }}">
    <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('favicon-32.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}">
    <link rel="manifest" href="{{ asset('manifest.webmanifest') }}">
    <meta name="theme-color" content="#2563eb">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/site.css') }}">
    <link rel="stylesheet" href="{{ asset('css/site-mobile.css') }}">
    @php
        $themeRaw = \App\Support\Setting::getText('theme_config');
        $theme = json_decode($themeRaw, true) ?: [];
        $themeCustom = is_array($theme['custom'] ?? null) ? $theme['custom'] : [];
        $themePalettes = [
            'plumCoral' => ['primary' => '#E56B8C', 'primaryDark' => '#C94F73', 'accent' => '#FF9A8B', 'success' => '#64D6A0', 'danger' => '#FF6B6B', 'warning' => '#F6C85F'],
            'violetCyan' => ['primary' => '#7C5CFF', 'primaryDark' => '#6846F0', 'accent' => '#22D3EE', 'success' => '#34D399', 'danger' => '#F87171', 'warning' => '#FBBF24'],
            'indigoTurquoise' => ['primary' => '#6478FF', 'primaryDark' => '#4D5FDE', 'accent' => '#2DD4BF', 'success' => '#6EE7B7', 'danger' => '#FB7185', 'warning' => '#FACC15'],
        ];
        $themeColors = array_merge($themePalettes['plumCoral'], $themePalettes[$theme['paletteId'] ?? 'plumCoral'] ?? [], $themeCustom);
    @endphp
    <style>
        :root {
            @foreach($themeColors as $key => $value)
                @if(preg_match('/^#[0-9A-Fa-f]{6}$/', (string) $value))
                    --{{ $key === 'primaryDark' ? 'primary-2' : strtolower(preg_replace('/([a-z])([A-Z])/', '$1-$2', $key)) }}: {{ $value }};
                @endif
            @endforeach
        }
    </style>
</head>
<body>
    <div class="bg-orbs">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
    </div>
    <div class="bg-grid"></div>

    {{-- ============ TOP NAV (allégée) ============ --}}
    <nav class="nav">
        <div class="nav-inner">
            <a href="{{ route('home') }}" class="logo">
                <span class="logo-mark">◆</span> Stock<span class="gradient-text">Flow</span>
            </a>

            {{-- Bouton de langue FR / EN --}}
            <div class="lang-switch" role="group" aria-label="Langue / Language">
                <a href="{{ route('lang.switch', 'fr') }}"
                   class="lang-btn {{ app()->getLocale() === 'fr' ? 'active' : '' }}">🇫🇷 FR</a>
                <a href="{{ route('lang.switch', 'en') }}"
                   class="lang-btn {{ app()->getLocale() === 'en' ? 'active' : '' }}">🇬🇧 EN</a>
            </div>
        </div>
    </nav>

    @yield('content')

    <footer>
        <div class="container footer-inner">
            <div class="footer-col" style="max-width: 300px;">
                <a href="{{ route('home') }}" class="logo" style="margin-bottom: 14px;">
                    <span class="logo-mark">◆</span> Stock<span class="gradient-text">Flow</span>
                </a>
                <p style="color: var(--muted); font-size: 14px;">@lang('site.footer_tagline')</p>
            </div>
            <div class="footer-col">
                <h5>@lang('site.footer_product')</h5>
                <a href="{{ route('home') }}#fonctionnalites">@lang('site.nav_features')</a>
                <a href="{{ route('home') }}#tarifs">@lang('site.nav_pricing')</a>
                <a href="{{ route('client.login') }}">@lang('site.nav_check')</a>
            </div>
            <div class="footer-col">
                <h5>@lang('site.footer_support')</h5>
                <a href="{{ route('home') }}#faq">FAQ</a>
                <a href="mailto:support@stockflow.app">support@stockflow.app</a>
                <a href="tel:+22370000000">+223 70 00 00 00</a>
            </div>
        </div>
        <div class="footer-bottom">
            © {{ date('Y') }} StockFlow — @lang('site.footer_rights')
        </div>
    </footer>

    {{-- ============ BOTTOM NAV (flottante, style app mobile) ============ --}}
    <nav class="bottom-nav" aria-label="Navigation principale">
        <a href="{{ route('home') }}" class="bottom-nav-item {{ request()->routeIs('home') ? 'active' : '' }}">
            <span class="bn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg></span>
            <span class="bn-label">@lang('site.nav_home')</span>
        </a>
        <a href="{{ route('home') }}#fonctionnalites" class="bottom-nav-item">
            <span class="bn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2 2-6Z"/></svg></span>
            <span class="bn-label">@lang('site.nav_features')</span>
        </a>
        <a href="{{ route('home') }}#tarifs" class="bottom-nav-item bottom-nav-cta">
            <span class="bn-icon bn-cta-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/></svg></span>
            <span class="bn-label">@lang('site.nav_pricing')</span>
        </a>
        <a href="{{ route('home') }}#faq" class="bottom-nav-item">
            <span class="bn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 11.5a8 8 0 0 1-8 8 8.8 8.8 0 0 1-3.7-.8L4 20l1.3-3.7A8 8 0 1 1 20 11.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg></span>
            <span class="bn-label">FAQ</span>
        </a>
        <a href="{{ route('client.login') }}" class="bottom-nav-item {{ request()->routeIs('client.*') ? 'active' : '' }}">
            <span class="bn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></span>
            <span class="bn-label">@lang('site.nav_check')</span>
        </a>
    </nav>

    <script>
        // Reveal on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => e.isIntersecting && e.target.classList.add('visible'));
        }, { threshold: 0.12 });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

        // Effet spotlight sur les cartes
        document.querySelectorAll('.feature-card').forEach(card => {
            card.addEventListener('mousemove', e => {
                const r = card.getBoundingClientRect();
                card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                card.style.setProperty('--my', (e.clientY - r.top) + 'px');
            });
        });
    </script>
</body>
</html>
