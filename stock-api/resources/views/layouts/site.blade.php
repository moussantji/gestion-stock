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
            <span class="bn-icon">🏠</span>
            <span class="bn-label">@lang('site.nav_home')</span>
        </a>
        <a href="{{ route('home') }}#fonctionnalites" class="bottom-nav-item">
            <span class="bn-icon">✨</span>
            <span class="bn-label">@lang('site.nav_features')</span>
        </a>
        <a href="{{ route('home') }}#tarifs" class="bottom-nav-item bottom-nav-cta">
            <span class="bn-icon bn-cta-icon">⚡</span>
            <span class="bn-label">@lang('site.nav_pricing')</span>
        </a>
        <a href="{{ route('home') }}#faq" class="bottom-nav-item">
            <span class="bn-icon">💬</span>
            <span class="bn-label">FAQ</span>
        </a>
        <a href="{{ route('client.login') }}" class="bottom-nav-item {{ request()->routeIs('client.*') ? 'active' : '' }}">
            <span class="bn-icon">👤</span>
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
