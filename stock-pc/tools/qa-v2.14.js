// ============================================================
// 🧪 QA StockFlow v2.14 (PÉRENNE, dans le repo)
// 👤 COMPTES CLIENTS partout : plus de clé de licence — portail web
//    + login email/mot de passe dans les apps mobile & PC (abonnement
//    bloqué après grâce) + 🇬 « Continuer avec Google » (code 5 min).
// Lancement : node tools/qa-v2.14.js   (depuis stock-pc/)
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const API = path.join(ROOT, '..', 'stock-api');
const APP = path.join(ROOT, '..', 'stock-app');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readApi = (p) => fs.readFileSync(path.join(API, p), 'utf8');
const readApp = (p) => fs.readFileSync(path.join(APP, p), 'utf8');
const existsApi = (p) => fs.existsSync(path.join(API, p));
const existsApp = (p) => fs.existsSync(path.join(APP, p));
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const run = (src, name) => vm.runInThisContext(src, { filename: name });

let pass = 0, ko = 0;
const check = (name, ok) => { ok ? pass++ : ko++; console.log(`${ok ? '✅' : '❌'} ${name}`); };
const kms = (b) => { const set = new Set(); let m; const re = /(?:^|,)\s*\n?\s*([a-z0-9_]+):/gm; while ((m = re.exec(b))) set.add(m[1]); return set; };

(async () => {
  /* ============ 🖥 SERVEUR — modèle comptes clients ============ */
  console.log('\n— 🖥 Serveur : modèle comptes clients —');

  const user = readApi('app/Models/User.php');
  check('User : ROLE_CLIENT + isClient() + clientLicenses() (lien email)',
    user.includes("public const ROLE_CLIENT = 'client';")
      && user.includes('function isClient(): bool')
      && user.includes("hasMany(License::class, 'buyer_email', 'email')"));
  check('User : ROLE_CLIENT HORS rôles staff (ROLES = admin/manager/employé)',
    /const ROLES = \[self::ROLE_ADMIN, self::ROLE_MANAGER, self::ROLE_EMPLOYEE\]/.test(user)
      && !/const ROLES = \[[^\]]*ROLE_CLIENT/.test(user));

  const lic = readApi('app/Models/License.php');
  check('License : subscriptionState() 5 codes + J-7 alerte / 3 j grâce',
    lic.includes('public const EXPIRING_SOON_DAYS = 7;')
      && lic.includes('public const GRACE_DAYS = 3;')
      && lic.includes("'code' => 'grace'") && lic.includes("'code' => 'expired'") && lic.includes("'code' => 'revoked'")
      && lic.includes("'expiring' : 'active'") || lic.includes("? 'expiring' : 'active'"));
  check("License : clé masquée en JSON ($hidden = ['key']) — supprimée partout",
    lic.includes("protected $hidden = ['key'];"));

  const svc = readApi('app/Services/LicenseService.php');
  check('LicenseService::fulfillOrder — renouvellement même email = prolongation (base max(now, fin))',
    svc.includes('public static function fulfillOrder(Order $order): array')
      && svc.includes("License::where('buyer_email', $order->buyer_email)")
      && svc.includes('$existing->expires_at->isPast() ? now() : $existing->expires_at')
      && svc.includes("'extended' => $extended"));
  check("LicenseService : compte créé role=client + conflit staff noté + mot de passe lisible xxxxx-xxxxx",
    svc.includes("'role' => User::ROLE_CLIENT")
      && svc.includes("$note = 'email_conflict';")
      && svc.includes("public static function generatePassword(): string")
      && svc.includes("$one(5) . '-' . $one(5)"));
  check('LicenseService : resetClientPassword() + clientSubscription() pour login/me des apps',
    svc.includes('public static function resetClientPassword(License $license): ?string')
      && svc.includes('public static function clientSubscription(string $email): ?array')
      && svc.includes("'state' => $license->subscriptionState()"));

  check('3 mailables compte + 3 blades email + ancien mail à clé SUPPRIMÉS',
    existsApi('app/Mail/ClientAccountDelivered.php')
      && existsApi('app/Mail/SubscriptionExtended.php')
      && existsApi('app/Mail/SubscriptionActive.php')
      && existsApi('resources/views/emails/clients/account_delivered.blade.php')
      && existsApi('resources/views/emails/clients/extended.blade.php')
      && existsApi('resources/views/emails/clients/active.blade.php')
      && !existsApi('app/Mail/LicenseDelivered.php')
      && !existsApi('resources/views/emails/licenses/delivered.blade.php'));
  const bladesClients = ['account_delivered', 'extended', 'active']
    .map((b) => readApi(`resources/views/emails/clients/${b}.blade.php`)).join('\n');
  check('blades email client : portail + mot de passe, JAMAIS de clé',
    bladesClients.includes("url('/compte')") && !bladesClients.includes('$license->key'));
  const licExp = readApi('resources/views/emails/licenses/expiring.blade.php');
  const licExpMail = readApi('app/Mail/LicenseExpiring.php');
  const remind = readApi('app/Console/Commands/SendLicenseReminders.php');
  check('rappel J-7/J-3/J-1 : plus de clé (email + portail), sujet « abonnement »',
    !licExp.includes('$license->key') && licExp.includes('buyer_email') && licExp.includes("url('/compte')")
      && licExpMail.includes('Votre abonnement StockFlow expire')
      && !remind.includes('{$license->key}'));

  /* ============ 🌐 SERVEUR — portail web + auth ============ */
  console.log('\n— 🌐 Serveur : portail client web —');

  const webRoutes = readApi('routes/web.php');
  check('routes web : /compte + connexion + Google portail + flow apps',
    webRoutes.includes("Route::get('/compte', [ClientPortalController::class, 'dashboard'])->name('client.dashboard')")
      && webRoutes.includes("'client.login.google'")
      && webRoutes.includes("'google.app'") && webRoutes.includes("'google.app.callback'"));

  const cauth = readApi('app/Http/Controllers/Web/ClientAuthController.php');
  check('ClientAuthController : garde isClient + loginGoogle (id_token → session)',
    cauth.includes('! $request->user()->isClient()') && cauth.includes('Auth::logout();')
      && cauth.includes('public function loginGoogle(Request $request)')
      && cauth.includes('GoogleTokenVerifier::verify'));

  const cportal = readApi('app/Http/Controllers/Web/ClientPortalController.php');
  check('ClientPortalController : garde redirect + état abonnement + plans renouvellement',
    cportal.includes("return redirect()->route('client.login');")
      && cportal.includes('subscriptionState()')
      && cportal.includes('Plan::active()->get()'));

  const dash = readApi('resources/views/client/dashboard.blade.php');
  const loginB = readApi('resources/views/client/login.blade.php');
  check('blade dashboard : badge 5 états + renouvellement pré-rempli + reçus',
    dash.includes("'expiring'") && dash.includes("'grace'") && dash.includes('client_status_expired')
      && dash.includes("route('checkout', ['plan' => $plan->slug, 'name' => $user->name, 'email' => $user->email])")
      && dash.includes("route('order.receipt', $order->reference)"));
  check('blade login : formulaire + bouton Google masqué sans GOOGLE_CLIENT_ID',
    loginB.includes("route('client.login.post')") && loginB.includes("config('google.client_id')")
      && loginB.includes('accounts.google.com/gsi/client') && loginB.includes("route('client.login.google')"));

  const gapp = readApi('resources/views/google/app.blade.php');
  const gcode = readApi('resources/views/google/code.blade.php');
  const gctrl = readApi('app/Http/Controllers/Web/GoogleAuthController.php');
  check('Google apps : page GIS + callback → code XXXX-XXXX 5 min (cache fichier, 0 migration)',
    gapp.includes('data-client_id') && gapp.includes('accounts.google.com/gsi/client') && gapp.includes('GOOGLE_CLIENT_ID est absent')
      && gcode.includes('Valide 5 minutes, utilisable une seule fois.')
      && gctrl.includes("Cache::put(\"gcode:{$code}\"", ) && gctrl.includes('now()->addMinutes(5)')
      && gctrl.includes("$one(4) . '-' . $one(4)")
      && gctrl.includes("public function appCallback(Request $request)"));

  const verifier = readApi('app/Services/GoogleTokenVerifier.php');
  check('GoogleTokenVerifier : tokeninfo + contrôle audience + email vérifié (0 dépendance)',
    verifier.includes('oauth2.googleapis.com/tokeninfo')
      && verifier.includes("($payload['aud'] ?? null) !== $clientId")
      && verifier.includes('email_verified')
      && existsApi('config/google.php') && readApi('config/google.php').includes("env('GOOGLE_CLIENT_ID')"));

  const apiRoutes = readApi('routes/api.php');
  check('routes api : /auth/google/exchange + /licenses/{license}/password-reset',
    apiRoutes.includes("'/auth/google/exchange'")
      && apiRoutes.includes("'/licenses/{license}/password-reset'"));

  const authApi = readApi('app/Http/Controllers/Api/AuthController.php');
  check('login API : compte client → abonnement joint + 403 expired (après grâce)',
    authApi.includes("$user->isClient() ? LicenseService::clientSubscription($user->email) : null")
      && authApi.includes("'code' => 'subscription_expired'")
      && authApi.includes('], 403);'));
  check('me() renvoie le subscription client · exchange code à usage unique (Cache::pull)',
    authApi.includes("'subscription' => $user->isClient() ? LicenseService::clientSubscription($user->email) : null,")
      && authApi.includes('public function exchangeGoogleCode(Request $request)')
      && authApi.includes('Cache::pull("gcode:{$code}")'));

  /* ============ 🖥 SERVEUR — admin : la clé a disparu ============ */
  console.log('\n— 🖥 Serveur : admin web/API sans clé —');

  const adminApi = readApi('app/Http/Controllers/Api/AdminController.php');
  check('API admin : validateOrder → fulfillOrder + payload subscription (mot de passe 1×)',
    adminApi.includes('LicenseService::fulfillOrder($order)')
      && adminApi.includes("'password_plain' => $result['password']")
      && adminApi.includes("'account_created' => $result['password'] !== null"));
  check('API admin : resetLicensePassword + projections orders sans colonne key',
    adminApi.includes('public function resetLicensePassword(License $license)')
      && adminApi.includes("license:id,order_id,expires_at,status,plan_name")
      && !adminApi.includes('license:id,order_id,key'));

  const ordShow = readApi('resources/views/admin/orders/show.blade.php');
  const licIdx = readApi('resources/views/admin/licenses/index.blade.php');
  const ordIdx = readApi('resources/views/admin/orders/index.blade.php');
  const adminLayout = readApi('resources/views/layouts/admin.blade.php');
  const siteLayout = readApi('resources/views/layouts/site.blade.php');
  check('admin web : plus AUCUNE clé affichée (orders show/index, licences index)',
    !ordShow.includes('key-chip') && !ordShow.includes('$order->license->key')
      && !licIdx.includes('{{ $license->key }}')
      && !ordIdx.includes('license?->key'));
  check('admin : flash mot de passe 1× + nav « 👤 Abonnements » + état abonnement sur cartes',
    adminLayout.includes("session('subscription_password')")
      && adminLayout.includes('👤 Abonnements')
      && licIdx.includes('subscriptionState()') && ordShow.includes('subscriptionState()'));

  const home = readApi('app/Http/Controllers/Web/HomeController.php');
  check('/verifier-licence → redirection portail + checkout pré-rempli (renouvellement 1 clic)',
    home.includes("return redirect()->route('client.login');")
      && home.includes("$request->query('email', '')")
      && readApi('resources/views/site/checkout.blade.php').includes("$prefillEmail ?? ''"));

  const siteFr = readApi('lang/fr/site.php');
  const siteEn = readApi('lang/en/site.php');
  const frClient = [...siteFr.matchAll(/'(client_\w+)' =>/g)].map((m) => m[1]);
  const enClient = [...siteEn.matchAll(/'(client_\w+)' =>/g)].map((m) => m[1]);
  check('lang site : nav « Mon compte » + parité client_* FR/EN (' + frClient.length + ' clés) + 0 « clé de licence » + vieilles clés check_* supprimées',
    siteFr.includes("'nav_check' => 'Mon compte'") && siteEn.includes("'nav_check' => 'My account'")
      && frClient.length >= 25 && frClient.length === enClient.length
      && frClient.every((k) => enClient.includes(k))
      && !siteFr.includes('clé de licence') && !/license key/i.test(siteEn)
      && !siteFr.includes('check_title') && !siteEn.includes('check_title')
      && !existsApi('resources/views/site/license-check.blade.php'));
  check('layout site : nav + bas → /compte (fini la page de vérification)',
    !siteLayout.includes("route('license.check')") && siteLayout.includes("route('client.login')"));

  const pdf = readApi('resources/views/pdf/order-receipt.blade.php');
  check('reçu PDF : abonnement à la place de la clé',
    !pdf.includes('$order->license->key') && pdf.includes('Votre abonnement StockFlow'));

  /* ============ 📱 MOBILE v25 — compte client + Google ============ */
  console.log('\n— 📱 Mobile v25 : compte client dans l\'app —');

  const adminScr = readApp('src/screens/AdminScreen.js');
  check('AdminScreen : shareAccount (portail + mot de passe), JAMAIS de clé',
    adminScr.includes('shareAccount') && adminScr.includes("`${SERVER_URL}/compte`")
      && !adminScr.includes('shareLicense') && !adminScr.includes('license.key') && !adminScr.includes('l.key'));
  check('AdminScreen : onglet 👤 Abonnements + reset mot de passe + validation = compte créé/prolongé',
    adminScr.includes("label: '👤 Abonnements'")
      && adminScr.includes('/admin/licenses/${license.id}/password-reset')
      && adminScr.includes("sub?.account_created && sub?.password_plain")
      && adminScr.includes("sub?.note === 'email_conflict'"));

  const authCtx = readApp('src/context/AuthContext.js');
  check('AuthContext : subscription persisté + loginWithGoogleCode + refreshMe',
    authCtx.includes("SecureStore.getItemAsync('subscription')")
      && authCtx.includes('loginWithGoogleCode')
      && authCtx.includes("api.post('/auth/google/exchange'")
      && authCtx.includes('refreshMe'));

  const nav = readApp('src/navigation/AppNavigator.js');
  check('AppNavigator : compte client → ClientAccountScreen (pas les écrans stock)',
    nav.includes("import ClientAccountScreen from '../screens/ClientAccountScreen';")
      && nav.includes("user.role === 'client'")
      && nav.includes('name="ClientHome"'));
  check('ClientAccountScreen : 5 états + portail + déconnexion',
    existsApp('src/screens/ClientAccountScreen.js')
      && readApp('src/screens/ClientAccountScreen.js').includes('cl_status_')
      && readApp('src/screens/ClientAccountScreen.js').includes('Linking.openURL(`${SERVER_URL}/compte`)')
      && readApp('src/screens/ClientAccountScreen.js').includes('refreshMe'));

  const loginScr = readApp('src/screens/LoginScreen.js');
  check('LoginScreen : bouton Google → navigateur /auth/google/app → code → session',
    loginScr.includes('lg_google') && loginScr.includes('Linking.openURL(`${SERVER_URL}/auth/google/app`)')
      && loginScr.includes('loginWithGoogleCode') && loginScr.includes('lg_code_btn'));

  const trRaw = readApp('src/i18n/translations.js');
  const frK = kms((trRaw.match(/export const fr = \{([\s\S]*?)\n\};?/) ?? [])[1] ?? '');
  const enK = kms((trRaw.match(/export const en = \{([\s\S]*?)\n\};?/) ?? [])[1] ?? '');
  const VM25 = ['ac_share_msg', 'ac_account_ready', 'ac_extended', 'ac_reset_title', 'ac_reset_done',
    'lg_google', 'lg_code_label', 'lg_code_btn', 'cl_title', 'cl_blocked', 'cl_grace_left',
    'cl_status_active', 'cl_status_expiring', 'cl_status_grace', 'cl_status_expired', 'cl_status_revoked'];
  check('traductions mobile : 770 FR = 770 EN, parité + clés v25 ×2',
    frK.size === 770 && enK.size === 770
      && ![...frK].some((k) => !enK.has(k)) && ![...enK].some((k) => !frK.has(k))
      && VM25.every((k) => frK.has(k) && enK.has(k)));

  /* ============ 🖥 PC v2.14 — compte client + Google ============ */
  console.log('\n— 🖥 PC v2.14 : compte client dans l\'app —');

  check('config : version StockFlow PC v2.14',
    /APP_VERSION: 'StockFlow PC v2\.14'/.test(read('src/js/config.js')));

  const apiJs = read('src/js/api.js');
  check('api.js : subscription persisté (LS_SUB) + siteUrl() + nettoyage logout',
    apiJs.includes("const LS_SUB = 'sfpc.subscription';")
      && apiJs.includes('function saveSession(tok, user, subscription = null)')
      && apiJs.includes('function siteUrl()')
      && apiJs.includes('localStorage.removeItem(LS_SUB);')
      && apiJs.includes('subscription, saveSubscription'));

  const loginPc = read('src/js/screens/login.js');
  check('login PC : bouton Google (navigateur système) + code → /auth/google/exchange',
    loginPc.includes('/auth/google/exchange')
      && loginPc.includes('window.open(`${Api.siteUrl()}/auth/google/app`')
      && loginPc.includes('Api.saveSession(res.token, res.user, res.subscription ?? null);'));

  check('clientaccount.js : 5 états + refresh /me + portail + déconnexion',
    exists('src/js/screens/clientaccount.js')
      && read('src/js/screens/clientaccount.js').includes('cl_status_')
      && read('src/js/screens/clientaccount.js').includes("await Api.get('/me')")
      && read('src/js/screens/clientaccount.js').includes('Api.saveSubscription')
      && read('src/js/screens/clientaccount.js').includes("window.open(`${Api.siteUrl()}/compte`"));

  const appJs = read('src/js/app.js');
  check('app.js : compte client routé vers clientaccount (render + route), index.html chargé',
    (appJs.match(/role === 'client'/g) ?? []).length >= 2
      && appJs.includes('Screens.clientaccount(document.getElementById')
      && read('src/index.html').includes('<script src="js/screens/clientaccount.js"></script>'));

  const i18nPc = read('src/js/i18n.js');
  const pcFr = kms((i18nPc.match(/const fr = \{([\s\S]*?)\n  \};?/) ?? [])[1] ?? '');
  const pcEn = kms((i18nPc.match(/const en = \{([\s\S]*?)\n  \};?/) ?? [])[1] ?? '');
  const VPC = ['lg_google', 'lg_code_label', 'lg_code_btn', 'cl_title', 'cl_blocked', 'cl_grace_left',
    'cl_status_active', 'cl_status_expiring', 'cl_status_grace', 'cl_status_expired', 'cl_status_revoked', 'cl_renew'];
  check('i18n PC : 796 FR = 796 EN, parité + clés v2.14 ×2',
    pcFr.size === 796 && pcEn.size === 796
      && ![...pcFr].some((k) => !pcEn.has(k)) && ![...pcEn].some((k) => !pcFr.has(k))
      && VPC.every((k) => pcFr.has(k) && pcEn.has(k)));

  /* ============ 🔡 Syntaxe quotes/blocs blades livrés ============ */
  console.log('\n— 🔡 Garde-fou lexer naïf (blades + PHP v2.14) —');
  // Port fidèle du lexer /tmp/verify_php.py : états squote/dquote/commentaires, pile de blocs
  function lexOk(src) {
    let i = 0; const n = src.length;
    let state = 'code'; const stack = [];
    const pairs = { ')': '(', ']': '[', '}': '{' };
    while (i < n) {
      const ch = src[i], nxt = src[i + 1] ?? '';
      if (state === 'code') {
        if (ch === '/' && nxt === '/') { state = 'line_comment'; i += 2; continue; }
        if (ch === '#') { state = 'line_comment'; i += 1; continue; }
        if (ch === '/' && nxt === '*') { state = 'block_comment'; i += 2; continue; }
        if (ch === "'") { state = 'squote'; i += 1; continue; }
        if (ch === '"') { state = 'dquote'; i += 1; continue; }
        if (ch === '(' || ch === '[' || ch === '{') { stack.push(ch); }
        else if (ch === ')' || ch === ']' || ch === '}') {
          if (!stack.length || pairs[ch] !== stack.pop()) return false;
        }
      } else if (state === 'squote') {
        if (ch === '\\') { i += 2; continue; }
        if (ch === "'") state = 'code';
      } else if (state === 'dquote') {
        if (ch === '\\') { i += 2; continue; }
        if (ch === '"') state = 'code';
      } else if (state === 'line_comment') {
        if (ch === '\n') state = 'code';
      } else if (state === 'block_comment') {
        if (ch === '*' && nxt === '/') { state = 'code'; i += 2; continue; }
      }
      i += 1;
    }
    return state === 'code' && stack.length === 0;
  }
  const TOUCHED = [
    'app/Models/User.php', 'app/Models/License.php', 'app/Services/LicenseService.php',
    'app/Services/GoogleTokenVerifier.php', 'app/Http/Controllers/Api/AuthController.php',
    'app/Http/Controllers/Api/AdminController.php', 'app/Http/Controllers/Web/ClientAuthController.php',
    'app/Http/Controllers/Web/ClientPortalController.php', 'app/Http/Controllers/Web/GoogleAuthController.php',
    'app/Http/Controllers/Web/HomeController.php', 'app/Http/Controllers/Web/Admin/OrderController.php',
    'routes/web.php', 'routes/api.php', 'config/google.php', 'lang/fr/site.php', 'lang/en/site.php',
    'resources/views/client/login.blade.php', 'resources/views/client/dashboard.blade.php',
    'resources/views/google/app.blade.php', 'resources/views/google/code.blade.php',
    'resources/views/emails/clients/account_delivered.blade.php',
    'resources/views/emails/clients/extended.blade.php',
    'resources/views/emails/clients/active.blade.php',
    'resources/views/emails/licenses/expiring.blade.php',
    'resources/views/layouts/admin.blade.php', 'resources/views/layouts/site.blade.php',
    'resources/views/admin/licenses/index.blade.php', 'resources/views/admin/orders/show.blade.php',
    'resources/views/admin/orders/index.blade.php', 'resources/views/admin/dashboard.blade.php',
    'resources/views/site/checkout.blade.php', 'resources/views/site/confirmation.blade.php',
    'resources/views/pdf/order-receipt.blade.php',
  ];
  let lexKo = [];
  TOUCHED.forEach((f) => { if (existsApi(f) && !lexOk(readApi(f))) lexKo.push(f); });
  check('lexer naïf (quotes + blocs) OK sur les ' + TOUCHED.length + ' fichiers serveur v2.14',
    lexKo.length === 0 || (console.log('   ↳ KO:', lexKo), false));

  console.log(`\nRÉSULTAT v2.14 : ${pass} OK / ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
