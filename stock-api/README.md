# StockFlow — Backend **Laravel 13** · **PHP 8.3+** (API + Site de vente + Admin web)

> ⬆️ **v2.15 : passage à Laravel 13** (dernière version, sortie le 17/03/2026 — supportée jusqu'en 2028). Code du kit **100 % compatible, 0 ligne à modifier** (audit complet plus bas). Installation déjà en 11/12 ? → section **« ⬆️ Mettre à jour (11/12 → 13) »**.

Un seul projet Laravel = **3 surfaces** :

| Surface | URL | Description |
|---|---|---|
| 🌐 Site public | `/` | Landing premium dark, vente d'abonnements + **portail client `/compte`** |
| ⚡ Panneau admin | `/admin` | Dashboard, formules, commandes, licences, utilisateurs |
| 📡 API REST | `/api` | Consommée par l'app mobile (auth Sanctum) |

## Installation (nouvelle machine)

> Prérequis : **PHP 8.3 ou +** (`php -v`) — exigé par Laravel 13.

```bash
composer create-project laravel/laravel stock-api   # installe la dernière version = Laravel 13.x
cd stock-api
php artisan install:api          # installe Sanctum ^4 (compatible 11/12/13) + crée routes/api.php

# PDF premium (reçus de commande + reçus de vente boutique) — v3.1+ compatible Laravel 13
composer require barryvdh/laravel-dompdf

# Copier les fichiers de CE dossier par-dessus le projet
```

## ⬆️ Mettre à jour une installation existante (Laravel 11/12 → 13)

Laravel 13 exige **PHP 8.3+** (8.4/8.5 OK). Tes **données et ton `.env` ne changent pas** ; le code du kit est déjà compatible (**0 ligne à modifier** — audit ci-dessous).

### 1. Vérifie PHP

```bash
php -v    # doit afficher >= 8.3 — sinon mets PHP à jour d'abord
```

### 2. Édite `composer.json` (à la racine du projet, PAS dans le kit)

| Dépendance | Avant | Après |
|---|---|---|
| `laravel/framework` | `^11.0` (ou `^12.0`) | **`^13.0`** |
| `laravel/tinker` | `^2.9` | **`^3.0`** |
| `phpunit/phpunit` (dev) | `^11.x` | **`^12.0`** |
| `nunomaduro/collision` (dev) | `^8.x` | **`^8.8`** |
| `laravel/sanctum` | `^4.0` | **inchangé** ✅ (la v4 supporte 11/12/13) |
| `barryvdh/laravel-dompdf` | `^3.0` | **inchangé** ✅ (mais fais `composer update` : il faut ≥ **v3.1.2** qui déclare `^13`) |

### 3. Mets à jour

```bash
composer update --with-all-dependencies
php artisan config:clear && php artisan route:clear && php artisan view:clear
php artisan queue:restart   # seulement si tu utilises les files d'attente
```

> 💡 Tout le monde sera **déconnecté une fois** (le préfixe des cookies de session change en v13 — comportement normal du framework). Les tokens mobiles/PC Sanctum, eux, restent valides.

### Audit de compatibilité du kit (déjà fait pour toi ✅)

Chaque point cassant du guide officiel 11→12→13 a été vérifié ligne par ligne dans les fichiers du kit :

| Point du guide officiel | Résultat dans StockFlow |
|---|---|
| CSRF renommé `VerifyCsrfToken` → `PreventRequestForgery` | ✅ le kit n'y touche jamais directement (`@csrf` Blade inchangé) |
| Carbon 3 : `diffInDays()` retourne un float | ✅ déjà casté `(int)` là où on s'en sert |
| Règle `image` exclut le SVG par défaut (v12) | ✅ nos règles imposent déjà `mimes:png,jpg,jpeg,webp` |
| `upsert()` MySQL valide `uniqueBy` non vide | ✅ aucun `upsert()` (lock + update/insert à la place) |
| Cache : `serializable_classes => false` par défaut | ✅ on ne met que des **tableaux** en cache (codes Google) |
| Préfixes cache/cookies v13 (tirets) | ✅ impact = reconnexion site une fois, rien d'autre |
| `casts()` en méthode, scheduling via `routes/console.php`, Sanctum 4, `bootstrap/app.php` | ✅ déjà au format moderne 11+, inchangé en 13 |
| Contrats customs / morph pivot / `Js::from` / helpers `array_first` / pagination `pagination::` | ✅ absents du kit |

➡️ **Conclusion : l'upgrade = composer + vidages de cache, rien d'autre.** Les apps mobile & PC ne voient aucune différence.

### `.env`

```env
APP_NAME=StockFlow
APP_URL=http://192.168.1.50:8000   # ⚠️ IP de ta machine : indispensable pour afficher les photos dans l'app mobile !

DB_CONNECTION=mysql
DB_DATABASE=stock_manager
DB_USERNAME=root
DB_PASSWORD=
```

```sql
CREATE DATABASE stock_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Middlewares — `bootstrap/app.php`

```php
->withMiddleware(function (Illuminate\Foundation\Configuration\Middleware $middleware) {
    $middleware->alias([
        'role' => \App\Http\Middleware\EnsureRole::class,
    ]);

    // Langue du site (FR/EN) lue depuis la session
    $middleware->web(append: [
        \App\Http\Middleware\SetLocale::class,
    ]);
})
```

### 📧 Emails (livraison de licence + confirmation de commande)

```env
# Option A — développement SANS smtp : les emails sont écrits dans storage/logs/laravel.log
MAIL_MAILER=log

# Option B — vrai SMTP (Mailtrap pour tester, Brevo/Gmail/etc. en prod)
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=xxxx
MAIL_PASSWORD=xxxx
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="no-reply@stockflow.app"
MAIL_FROM_NAME="StockFlow"
```

Emails envoyés automatiquement :
- **À la commande** → récap + instructions de paiement (celles de l'admin) + **reçu PDF en pièce jointe**
- **À la validation** (web admin *ou* app mobile) → 👤 **compte client créé ou prolongé** (identifiants dans l'email, design premium sombre + **reçu PDF joint**) — le mot de passe s'affiche aussi **1×** côté vendeur pour le partage WhatsApp
- **Rappel d'expiration** → J-7, J-3 et J-1 avant la fin d'une licence (voir ⏰ ci-dessous)

Un échec d'envoi ne bloque jamais la validation (erreur logguée via `report()`).

### 📄 Reçus PDF premium (dompdf)

Deux templates sombres élégants (`resources/views/pdf/`) :

| Reçu | Accès | Contenu |
|---|---|---|
| **Reçu de commande** (A4) | `/commande/{reference}/recu` (bouton sur la page de confirmation + panneau admin + joint aux emails) | Nom du client, formule, montant, statut de l'abonnement |
| **Reçu de vente boutique** (A5) | `GET /api/receipts/{id}/pdf` (partagé depuis l'app mobile) | Infos de TA boutique (`config/shop.php`), articles, total, client, vendeur |

Personnalise l'en-tête des reçus de vente dans le `.env` :

```env
SHOP_NAME="Ma Boutique"
SHOP_PHONE="+223 70 00 00 00"
SHOP_EMAIL="contact@maboutique.ml"
SHOP_ADDRESS="Bamako, Mali"
SHOP_SLOGAN="Merci de votre confiance !"
```

> ⚠️ Les PDF apparaissent seulement si `barryvdh/laravel-dompdf` est installé — sinon l'envoi d'email continue sans pièce jointe (fallback `class_exists`).

### 🏪 Logo de la boutique sur les reçus

Le logo est affiché en tête des **2 reçus PDF** (vente boutique + commande de licence) :

- **Upload admin web** : menu **🏪 Boutique** (ou `DELETE /admin/settings/logo` pour retirer)
- **Upload depuis l'app** : onglet Admin → section **Boutique** → 📷 Changer le logo
- **Manuel** : dépose simplement `shop-logo.png` (ou jpg/webp) dans `public/images/`

`App\Support\ShopInfo` détecte le fichier, l'encode en **base64 data-URI** (méthode la plus fiable pour dompdf) et le supprime/remplace proprement. Sans logo, les reçus affichent simplement le nom de la boutique.

### 🔔 Notifications push DISTANTES (Expo Push)

L'app envoie son `ExponentPushToken[…]` à la connexion (`POST /api/push-tokens`, table `push_tokens`) et le supprime à la déconnexion. Le serveur pousse ensuite **sans SDK** via `App\Services\PushService` (POST HTTPS sur `exp.host`, chunks de 99, best-effort) :

| Événement | Destinataires | Contenu |
|---|---|---|
| 🛒 Nouvelle commande sur le site | Tous les **admins** connectés sur mobile | Référence · client · montant |
| ⏰ `licenses:remind` (si rappels envoyés) | Tous les **admins** | Récap « 2 à J-7 · 1 à J-3 » |

> ⚠️ Côté app : le token distant exige un **development build / APK** (`eas init` fournit le `projectId`) — dans Expo Go, l'enregistrement échoue silencieusement et les **notifications locales** (v4) prennent le relais.

### ⏰ Rappels d'expiration de licence (J-7 / J-3 / J-1)

Commande planifiée `licenses:remind` (déjà enregistrée dans `routes/console.php`, tous les jours à 09:00) :
- envoie un **email** premium au client dont la licence expire dans 7, 3 ou 1 jour(s)
- l'admin voit aussi ces licences dans l'**app mobile** (onglet Admin → « Licences expirant bientôt ») avec **notifications push locales**

1. **En local** : `php artisan schedule:work` (terminal dédié)
2. **En production (cron serveur)** :
   ```cron
   * * * * * cd /chemin/vers/stock-api && php artisan schedule:run >> /dev/null 2>&1
   ```
3. **Test manuel** : `php artisan licenses:remind`

### 💳 Moyens de paiement personnalisables

Menu **Admin → Paiements** : édite les instructions, le numéro marchand, l'icône et la visibilité de chaque méthode (Orange Money, Wave, Moov Money, Virement — seedées par défaut). Elles s'affichent sur la page de confirmation **et** dans les emails.

### 🌍 Langues du site (FR/EN)

- Bouton **FR / EN** dans la navbar du site → route `/lang/{locale}`
- Traductions : `lang/fr/site.php` et `lang/en/site.php` (ajoute une langue en copiant le fichier + en l'ajoutant dans `SetLocale::LOCALES`)
- Le panneau admin reste en français (usage interne)

### Lancer

```bash
php artisan migrate --seed
php artisan storage:link              # ← rend visibles les photos produits (storage/app/public → public/storage)
php artisan serve --host=0.0.0.0 --port=8000
```

## Comptes de démo (mot de passe : `password`)

- `admin@stock.com` (admin) · `manageur@stock.com` (manager) · `employe@stock.com` (employé)
- 3 formules de licence : Starter 25 000 F · Business 59 000 F · Enterprise 149 000 F

## Fonctionnement du flux de vente

```
Client              Site                  Admin (web ou mobile)        Compte client
  │── choisit une formule ───────────────►│                              │
  │── remplit /acheter/{plan} ───────────►│                              │
  │   (commande "pending", réf. CMD-…)    │                              │
  │── paie (Orange Money/Wave/…)          │                              │
  │                              ◄────────│ valide le paiement           │
  │                                       │──► crée ou PROLONGE le compte│
  │◄── reçoit ses identifiants (email/WhatsApp)                          │
  └── se connecte sur /compte (portail) + apps mobile/PC (même email)
```

## Routes principales

### Site public (web)
| URL | Description |
|---|---|
| GET `/` | Landing (formules chargées depuis la BDD) |
| GET/POST `/acheter/{plan:slug}` | Commande |
| GET `/commande/{reference}` | Confirmation + instructions de paiement |
| GET `/commande/{reference}/recu` | 📄 **Reçu PDF premium** de la commande (client, formule, statut) |
| GET/POST `/compte/connexion` | 👤 **Connexion du portail client** (+ 🇬 bouton Google si `GOOGLE_CLIENT_ID`) |
| GET `/compte` | Tableau de bord client : badge d'abonnement, reçus, renouvellement |
| POST `/compte/deconnexion` | Déconnexion du portail |
| GET/POST `/auth/google/app` | 🇬 Page Google **pour les apps** → code 5 min à usage unique |
| GET `/verifier-licence` | *(historique — redirige vers `/compte/connexion`)* |
| GET `/lang/{locale}` | Changement de langue (fr/en) |

### Admin web (session, rôle admin)
| URL | Description |
|---|---|
| `/admin` | Dashboard : revenus, commandes, licences, stock |
| `/admin/plans` | CRUD formules |
| `/admin/orders` · `/admin/orders/{id}` | Liste, détail, **valider** (→ licence), annuler |
| `/admin/licenses` | Liste, révoquer/réactiver |
| `/admin/users` | Comptes de l'app mobile |
| `/admin/settings` | 🏪 Boutique : **logo** (upload/suppression) + infos reçus |

### API mobile (token Sanctum)
Voir la liste dans le tableau ci-dessous — le tout est protégé par rôles.

| Groupe | Routes |
|---|---|
| Auth | `POST /login`, `GET /me`, `PUT /password`, `POST /logout` |
| Produits | CRUD `/products` (+ `image` en multipart), `/products/low-stock`, `/products/barcode/{code}` |
| Mouvements | `GET/POST /movements` (idempotent via `client_uuid`), `DELETE` (admin/manager) |
| **Ventes + reçus** | `GET/POST /receipts` (numéro `R-2026-XXXXXX`, idempotent, décrémente le stock en transaction), `GET /receipts/{id}`, `GET /receipts/{id}/pdf` 📄 |
| **📊 Stats ventes** | `GET /stats/sales?period=7d\|30d\|90d\|all` (admin/manager) — totaux + classements **par produit, vendeur ET catégorie** · `GET /stats/product-movements?product_id=&period=` (historique drill-down : in/out/vendu + 50 derniers mouvements) |
| **📦 Bons de commande** | `GET/POST /purchase-orders` (+`/generate` anti-doublon) · **`PUT /{id}/items/{item}` (quantité éditable en brouillon)** · `/{id}/send` · `/{id}/receive` (entrées de stock en transaction) · `/{id}/pdf` · `DELETE` (annulation) — admin/manager |
| **🖨 Ticket 80mm** | `GET /receipts/{id}/ticket` — version noir & blanc monospace pour **imprimante thermique** (papier 80mm) |
| **🏪 Boutique** | `GET /shop` (infos + logo_url) · `POST /admin/shop-logo` (admin, multipart) |
| **🔔 Push** | `POST /push-tokens` (login) · `DELETE /push-tokens` (logout) |
| Dashboard | `GET /dashboard` |
| Exports CSV | `/export/products`, `/export/movements` (admin/manager) |
| Utilisateurs | CRUD `/users` (admin) |
| **Admin mobile** | `/admin/overview` (+ licences expirant sous 7 j), `/admin/orders` (+validate/cancel), `/admin/licenses` (+toggle) — rôle admin |

### Console

| Commande | Description |
|---|---|
| `php artisan licenses:remind` | Envoie les emails de rappel d'expiration (J-7/J-3/J-1) **+ push récap admin** — planifiée quotidiennement à 09:00 |
| `php artisan stock:auto-purchase-orders` | 📦 Génère les bons de commande fournisseurs depuis le stock bas (1 par fournisseur, anti-doublon) **+ push admin** — planifiée quotidiennement à **08:00** |

### 📦 Bons de commande fournisseurs — cycle complet

```
Stock bas (quantity ≤ seuil)  ──►  Génération auto (cron 08:00) ou manuelle
                                    (POST /api/purchase-orders/generate)
                                    • 1 bon PAR FOURNISSEUR, qté suggérée = 2× seuil − stock
                                    • anti-doublon : un produit déjà dans un bon ouvert est ignoré
Brouillon (draft) ── (/send) ──► Envoyé au fournisseur (sent) ── (/receive) ──► Réceptionné
                                    ▲ partage WhatsApp…                  └─► ✅ entrées de stock créées
                                    via le PDF A4 (📄 /{id}/pdf)              automatiquement (transaction,
                                                                              motif « Achat fournisseur »,
                                                                              référence = n° du bon)
Un brouillon/envoyé peut être annulé (DELETE) — jamais un bon réceptionné.
```

## Photos de produits (storage)

- Upload : champ `image` (multipart) sur `POST /api/products` ou `POST /api/products/{id}` avec `_method=PUT`
- Stockées dans `storage/app/public/products/`
- Servies via `asset('storage/...')` → `image_url` dans le JSON (utilise `APP_URL`)
- `php artisan storage:link` obligatoire
- L'ancienne photo est supprimée quand on la remplace

---

## 💳 v8 — Crédit client, export Excel & inventaires

### Nouvelles routes API
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/api/receipts/credits` | auth | Reçus non soldés + `outstanding_total` (⚠️ avant `/receipts/{receipt}`) |
| POST | `/api/receipts/{receipt}/payments` | auth | Versement `{amount, note?}` — plafonné au reste |
| GET | `/api/stats/export.xlsx?period=` | admin,manager | Classeur Excel 4 onglets (XlsxWriter maison, zéro dépendance) |
| GET/POST | `/api/inventories` | admin,manager | Liste / démarrage (snapshot de tout le stock, 1 seul « en cours ») |
| GET | `/api/inventories/{inventory}` | admin,manager | Lignes triées (écarts d'abord) + résumé |
| POST | `/api/inventories/{inventory}/count` | admin,manager | Comptage `{barcode|product_id, quantity, mode:set|increment}` |
| POST | `/api/inventories/{inventory}/finish` | admin,manager | Validation → mouvements « Inventaire » + alignement stock |
| DELETE | `/api/inventories/{inventory}` | admin,manager | Suppression (en cours uniquement) |

### Notes
- `POST /api/receipts` accepte désormais `amount_paid` (défaut = total → rétrocompatible) ; chaque versement crée une ligne `receipt_payments`.
- Migrations : `2025_06_01_000001_add_payment_to_receipts.php`, `2025_06_01_000002_create_inventories_tables.php` → `php artisan migrate`.
- `App\Support\XlsxWriter` : écrit un `.xlsx` (ZIP de XML) via `ZipArchive` natif — aucun package à installer. 503 propre si l'extension `zip` est absente.
- Les PDFs de vente (A5 + ticket 80mm) affichent le badge Payé / Partiel / Crédit et les lignes Payé / Reste.

---

## 👥 v9 — CRM, marges, caisse, avoirs & digest push

### Nouvelles routes API
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET/POST | `/api/customers` | auth | Liste (`?q=` recherche nom/tél) / création fiche client |
| GET/PUT | `/api/customers/{customer}` | auth | Fiche complète (totaux + crédits + historique) / édition |
| DELETE | `/api/customers/{customer}` | admin,manager | Refusée si des reçus sont liés |
| GET | `/api/stats/margins?period=` | admin,manager | 💰 Marge par produit + totaux (CA / coût / marge / taux) |
| POST | `/api/receipts/{receipt}/refund` | admin,manager | ↩️ Avoir : restock + exclusion stats/crédits |
| GET | `/api/cash-ops/summary` | admin,manager | 💵 Solde + chiffres du jour |
| GET/POST/DELETE | `/api/cash-ops[/{id}]` | admin,manager | Opérations manuelles (in/out) |

### Notes
- `POST /api/receipts` accepte `customer_id` → nom/téléphone snapshotés depuis la fiche si absents.
- Reçus `status: completed | refunded` — les requêtes de stats, crédits, marges et caisse **excluent les avoirs** (7 filtres).
- Marge : coût = prix d'achat **actuel** du produit (pas de snapshot historique par ligne).
- Commande `stock:low-stock-digest` planifiée à **07:30** (admins + managers) — nécessite le cron `schedule:run` et des tokens Expo enregistrés.
- Migrations v9 : `2025_07_01_000001…000003` → `php artisan migrate`.

---

## ↩️ v10 — Avoir partiel, étiquettes, rappel crédit, Z & segments

### Nouvelles routes / changements
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/api/receipts/{receipt}/refund` | admin,manager | Corps optionnel `items: [{receipt_item_id, quantity}]` → avoir partiel cumulable (sinon = total) |
| GET | `/api/products-labels.pdf?ids=&per_row=&copies=` | auth | 🏷️ Planche A4 d'étiquettes (Code128 maison) |
| POST | `/api/customers/notify-segment` | admin,manager | 👥 Push staff pour un segment (loyal/credit/inactive) |
| GET | `/api/customers?segment=` | auth | Filtre segments (loyal ≥5 achats, credit solde>0, inactive ≥60 j) |
| POST | `/api/cash-ops/close` | admin,manager | 🔒 Z du jour (422 si déjà clôturée) |
| GET | `/api/cash-ops/closings` | admin,manager | Historique des Z (30) |
| - | `POST /api/cash-ops` | - | accepte désormais `category` |

### Notes
- **Stats = NETTES des avoirs partiels** (lignes recalculées `quantity − refunded_qty` × prix).
- Commande `credits:remind` → 10:00 quotidien (cron existant).
- Migrations v10 : `2025_08_01_000001`, `2025_08_01_000002` → `php artisan migrate`.

---

## 🔁 v11 — Z PDF, remboursement tracé, seuils, trésorerie & abonnements

### Nouvelles routes / changements
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/api/cash-closings/{cashClosing}/pdf` | admin,manager | 📄 Reçu PDF A5 du Z (synthèse, sorties par catégorie, opérations) |
| GET | `/api/cash-ops/chart?days=30` | admin,manager | 📊 Solde de caisse quotidien cumulé (7–90 j) pour la courbe |
| GET | `/api/settings` · PUT `/api/settings` | admin,manager | 🎯 Seuils `segment_loyal_min` (1–100) · `segment_inactive_days` (7–365) · `credit_reminder_days` (1–90) |
| - | `GET /api/shop` | auth | expose désormais `thresholds` (lecture staff pour l'affichage des segments) |
| POST | `POST /api/receipts/{receipt}/refund` | admin,manager | accepte désormais `refund_cash: true` → ↩️💵 crée la `cash_operation` (out, catégorie `refund`, liée au reçu) |
| apiResource | `/api/recurring-sales` | admin,manager | 🔁 index/store/update/destroy (update : fréquence, échéance, pause/reprise) |
| POST | `/api/recurring-sales/{recurringSale}/run` | admin,manager | ⚡ Génère la vente immédiatement (idempotent par échéance) |

### Commandes planifiées
- `stock:process-recurring-sales` → **06:30** quotidien : génère les ventes à crédit des abonnements échus (mouvements `Abonnement`, `receipts.source = 'recurring'`, `client_uuid = rec-{id}-{date}` anti-doublon) + push récap (échecs stock signalés sans bloquer les autres).
- `credits:remind` → seuil lu dans les réglages (`--days=` force une valeur).

### Notes
- **Correctif v10** : `CashOperation::$fillable` ne contenait pas `category` → les catégories de dépenses étaient silencieusement ignorées au `create()` (mass-assignment). Corrigé (+ `receipt_id`).
- Table `settings` (clé/valeur) + helper `App\Support\Setting` (cache, repli sur défauts si table absente).
- Le remboursement espèces utilise la catégorie `refund` (non saisissable à la main dans l'app).
- Migrations v11 : `2025_09_01_000001` → `000004` → `php artisan migrate`. Zéro nouvelle dépendance Composer.

## 🏬 v12 — Réception partielle PO, prévisions, fidélité, prix gros/détail & multi-boutiques

### Nouvelles routes / changements
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/api/products/restock-forecast?days=30&lead=14` | admin,manager | 📈 Prévision de rupture : vélocité de vente (vendus/jour sur la fenêtre), `days_left`, `suggested_order` (couvre `lead` jours) |
| GET | `/api/shops` | auth | 🏬 Liste des boutiques (sélecteurs) avec `users_count` |
| POST/PUT/DELETE | `/api/shops[/{shop}]` | admin | 🏬 CRUD boutiques (`is_active` en édition ; suppression → rattachements repassent à `null`) |
| - | `GET /api/shop` | auth | expose désormais `loyalty` (règle points) et `my_shop` (boutique de l'utilisateur) |
| POST | `/api/purchase-orders/{purchaseOrder}/receive` | admin,manager | 🧾 accepte désormais `items: [{item_id, received_qty}]` → réception **partielle** (cumul `received_qty`, statut `partial` tant que tout n'est pas rentré) |
| POST | `/api/receipts` | staff+ | 🎁 accepte `points_redeem` (plafonné au solde client ET au total, arrondi au multiple de `loyalty_point_value`) ; 👥 prix par défaut = `wholesale_price` si le client est en tier `wholesale` |
| POST | `/api/receipts/{receipt}/payments` | admin,manager | 🎁 les versements crédit gagnent aussi des points fidélité |
| - | `GET /api/customers/{customer}` | staff+ | expose `loyalty_history` (20 dernières transactions) + `loyalty_config` |
| apiResource | `/api/users` | admin | accepte `shop_id` (rattachement boutique) |

### 🎁 Fidélité — règles
- Réglages : `loyalty_earn_per` (FCFA **payés** pour 1 point, défaut 1000) et `loyalty_point_value` (remise en FCFA par point, défaut 10).
- Les points se gagnent sur l'argent **réellement encaissé** (paiement initial + versements crédit), jamais sur le crédit non payé.
- Journal `loyalty_transactions` (`earn` / `redeem` / `adjust`) + solde `customers.loyalty_points`.
- `receipts.points_discount` / `points_redeemed` : le « reste à payer » est **net** de la remise points (reçus PDF A5 + ticket 80 mm affichent la remise et le NET).

### 🏬 Multi-boutiques — périmètre v12 (honnête)
- `shops` + `shop_id` (nullable, `nullOnDelete`) sur users, customers, receipts, stock_movements, cash_operations, cash_closings, purchase_orders, inventories, recurring_sales.
- `App\Support\ShopScope` : un utilisateur rattaché voit les lignes de **sa boutique + les lignes historiques sans boutique** ; l'admin voit tout (`?shop_id=` sur la caisse).
- Z de caisse : unicité `(closing_date, shop_id)` — un Z par boutique et par jour.
- ⚠️ **Limite assumée** : le stock produit reste **global** (commun à toutes les boutiques) en v12 — les quantités par boutique et les transferts inter-boutiques arriveront en v13 (double synchronisation trop risquée sans tests runtime).

### Migrations v12 (`php artisan migrate`)
`2025_10_01_000001_multi_shop` → `000005_cash_closing_unique_per_shop`. Zéro nouvelle dépendance Composer.

## 🔁 v13 — Stock par boutique & transferts inter-boutiques

### Modèle de stock (⚠️ à comprendre avant de tester)
- `products.quantity` reste le **TOTAL GLOBAL** (siège + boutiques) → alertes, prévisions, stats, catalogue : **inchangés**.
- Nouvelle table `product_shop_stocks` (bucket par boutique). **Siège = global − Σ(buckets)**.
- **Sans aucun bucket, le comportement est 100 % identique à la v12** (installation mono-boutique : rien ne change).
- Dès qu'un transfert crée un bucket sur un produit, ce produit passe en « multi-stock » : la vente/sortie consomme **l'emplacement** de l'opération (boutique du user, sinon siège) avec vérif de niveau **par emplacement** + message guidé (« pensez à un transfert »).
- `App\Support\ShopStock` : `level() / hqLevel() / addDelta() / assertAvailable() / setLevel() / breakdown()` — utilisé aux 6 sites de mutation : vente, avoir, mouvement manuel, réception PO, inventaire (snapshot + validation), abonnement.

### Nouvelles routes / changements
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/api/transfers` | admin,manager | 🔁 Historique paginé des transferts (route, lignes, auteur) |
| POST | `/api/transfers` | admin,manager | 🔁 `{from_shop_id?, to_shop_id?, note?, items:[{product_id, quantity}]}` — null = siège ; exécution immédiate transactionnelle |
| GET | `/api/transfers/{stockTransfer}` | admin,manager | Détail avec lignes + produits |
| - | `GET /api/products[…]` | staff+ | chaque produit expose `shop_stock` (stock à MON emplacement ; null = mono-stock) ; `show` expose aussi `stocks` (détail siège/boutiques) |
| - | `GET /api/movements?type=` | staff+ | accepte `transfer_in` / `transfer_out` (paire de mouvements créée par transfert, hors stats entrées/sorties métier) |

### Transfert — ce qui se passe côté serveur
1. Verrou produit (`lockForUpdate`) → vérif niveau à la **source** → décrément source → incrément destination (+ global inchangé au total : sort d'un côté, rentre de l'autre).
2. 1 ligne `stock_transfer_items` + **2 mouvements** `transfer_out` (source) / `transfer_in` (destination), référence `TR-2026-XXXXXX`.
3. Anti-erreurs : source ≠ destination requis, doublons produit fusionnés, 422 avec niveau dispo si stock source insuffisant.

### Notes
- Inventaire démarré depuis une boutique compte **le bucket de cette boutique** ; depuis le siège = le siège.
- Mouvements manuels in/out d'un vendeur rattaché : appliqués à **sa boutique**.
- Prix-sécurité côté app : `NewSaleScreen` plafonne les quantités à `shop_stock ?? quantity`.
- Migration v13 : `2025_10_02_000001_shop_stock_and_transfers` → `php artisan migrate`. Zéro nouvelle dépendance.

## 🚚 v14 — Transferts « en transit » + réception à valider & alertes par emplacement

### Cycle de vie d'un transfert (rupture avec v13 : l'exécution n'est plus immédiate)
1. `POST /api/transfers` → statut **`in_transit`** : le stock quitte la source (**bucket − ET global −** — il est sur la route).
2. `POST /api/transfers/{id}/receive` → statut **`received`** : le stock entre à la destination (bucket +, global +).
3. `POST /api/transfers/{id}/cancel` → statut **`cancelled`** : le stock est rendu à la source (crash, changement d'avis…).

**Pendant le transit le stock n'est vendable nulle part** — le siège (= global − Σ boutiques) ne peut pas vendre ce qui est sur le camion. Les mouvements `transfer_out` (envoi) et `transfer_in` (réception/annulation) sont tracés à chaque étape avec la référence `TR-…`.

### Permissions fines (au-delà du middleware admin/manager)
| Action | Admin | Manager |
|---|---|---|
| Créer un transfert | ✓ | ✓ |
| **Valider la réception** | ✓ | seulement si **sa boutique = destination** (siège ⇔ manager siège) |
| **Annuler** | ✓ | seulement si **sa boutique = source** |

### Nouvelles routes / changements
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/api/transfers/{stockTransfer}/receive` | admin/manager (destination) | 🚚 Valide l'arrivée : stock entre à destination, `received_at` + `received_by` |
| POST | `/api/transfers/{stockTransfer}/cancel` | admin/manager (source) | ↩️ Annule un transit : stock retourné à la source |
| GET | `/api/stock-alerts[?shop_id=]` | staff | 📍 Alertes sous-seuil de MON emplacement (bucket boutique / siège) — seuil produit global. `?shop_id=` : admin, ou manager sur SA boutique |
| - | `GET /api/transfers` | admin/manager | expose `status`, `sent_at`, `received_at`, `received_by` (+ relation `receiver`) |

### Notes
- Migration `2025_10_03_000001_transfer_status` : ajoute `status/sent_at/received_at/received_by` et **marque les transferts v13 comme `received`** (ils étaient instantanés) → aucune donnée à reprendre.
- Alertes par emplacement : seuls les produits avec `alert_threshold > 0` sont surveillés ; tri ruptures d'abord puis ratio niveau/seuil ; la réponse expose `quantity` = niveau **à l'emplacement** + `global_quantity` pour info.
- Zéro nouvelle dépendance.
