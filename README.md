# ◆ StockFlow — Plateforme complète de gestion de stock & vente de licences

Un projet, **trois surfaces**, un design sombre premium 🖤💜

```
stock-manager/
├── stock-api/    Laravel : API + site de vente de licences + panneau admin web + MySQL
├── stock-app/    React Native (Expo) : app mobile sombre, hors ligne, photos, ventes, admin
└── REVIEW.md     Audit du code : erreurs trouvées & améliorations (v2 → v5)
```

## ✨ Ce qui est inclus

| | |
|---|---|
| 🌐 **Site vitrine Laravel** | Landing sombre premium (visuels générés par IA), tarifs dynamiques depuis la BDD, checkout, vérification publique de licence |
| 💳 **Vente de licences** | 3 formules, paiement Mobile Money/virement, validation manuelle → clé `SF-XXXX-XXXX-XXXX` générée automatiquement |
| ⚡ **Admin web** `/admin` | Dashboard revenus/commandes/licences/stock, CRUD formules, validation & annulation, révocations, gestion des utilisateurs |
| 📱 **App mobile Expo** | Gestion de stock complète (produits, catégories, fournisseurs, entrées/sorties, alertes, dashboard, scan 📷) |
| 📡 **Mode hors ligne** | Cache produits + file d'attente des mouvements + sync auto (uuid anti-doublon côté serveur) |
| 📷 **Photos produits** | Prises par le client à la création (caméra/galerie) → Laravel Storage → affichées partout |
| ⚡ **Admin mobile** | Onglet Admin dans l'app : valider les paiements, partager les clés aux clients, révoquer, stats |
| 🎭 **Rôles** | admin / manager / employee — permissions API + UI adaptées |
| 📧 **Emails réels** | Clé de licence envoyée par email à la validation (design premium sombre), confirmation de commande avec instructions — SMTP ou log en dev |
| 💳 **Paiements configurables** | Orange Money · Wave · Moov · Virement — numéros & étapes éditables dans **Admin → Paiements** (site + emails synchronisés) |
| 🌍 **Multilingue FR/EN** | Bouton de langue sur le site (session) + réglage dans l'app (Profil → Paramètres) — **tous les écrans de l'app sont traduits** (594 clés/langue) |
| 🧭 **Navbars en bas** | Site : barre flottante glassmorphism style mobile · App : tab bar flottante arrondie premium |
| 📄 **Reçus PDF premium** | **Site** : reçu A4 de commande avec nom du client + clé de licence (page confirmation, admin, joint aux emails) · **App** : reçu de vente A5 au nom de TA boutique, partageable sur WhatsApp |
| 🧾 **Ventes en boutique** | Écran « Nouvelle vente » (panier multi-articles, client) → reçu numéroté `R-2026-XXXXXX` + décrément auto du stock (transaction, anti-doublon) |
| ⏰ **Rappels d'expiration** | Emails auto J-7/J-3/J-1 (cron `licenses:remind`) + notifications push locales dans l'app admin + section « Licences expirant bientôt » |
| 📊 **Stats de ventes par produit** | Écran dédié (admin/manager) : CA, reçus, articles vendus, panier moyen + **Top 5 en bar chart** + classement 🥇🥈🥉 avec part du CA par produit, filtre 7j/30j/90j/tout |
| 🏪 **Logo boutique sur les reçus** | Upload depuis l'**admin web (🏪 Boutique)** ou l'**app mobile (Admin → Boutique)** → affiché en tête des 2 reçus PDF (base64, fiable avec dompdf) |
| 🔔 **Push distantes Expo** | Token du téléphone enregistré à la connexion (`push_tokens`) → l'API envoie des push aux admins : **🛒 nouvelle commande** sur le site + **⌛ récap licences expirantes** + **📦 bons auto générés** (via l'API Expo, sans SDK) |
| 👥 **Stats par vendeur** | Onglet « Vendeurs » dans les stats : classement 🥇🥈🥉 par CA avec avatar initiales, nb de reçus/articles, panier moyen, part du CA |
| 🖨 **Ticket 80mm thermique** | Chaque reçu de vente existe aussi en **ticket 80mm noir & blanc** (papier personnalisé dompdf, monospace, optimisé imprimante thermique) — choix A5/ticket au partage |
| 📦 **Bons de commande fournisseurs** | Génération **automatique quotidienne (08:00)** + manuelle depuis le stock bas : 1 bon **par fournisseur**, anti-doublon, qté suggérée 2× seuil, **✏️ quantités ajustables par steppers en brouillon** ; cycle brouillon → envoyé → **réceptionné = entrées de stock auto** ; PDF A4 corporate + push admin |
| 🖨 **Impression Bluetooth directe** | Bouton « 🔵 Imprimer » sur tout reçu → **ESC/POS sans passer par le partage** (lib `react-native-thermal-receipt-printer`, écran dédié dans Profil : scan appairés + page test ; repli gracieux en Expo Go) |
| 🏷 **Stats par catégorie** | 3ᵉ onglet des stats : classement CA/qté par catégorie (avec gestion « Sans catégorie » et produits supprimés) |
| 🧾 **Drill-down produit** | Touche un produit dans les stats → **bottom sheet historique** : entrées/sorties/vendu de la période + CA + 50 derniers mouvements (ventes comprises, réf. reçu) |
| 🧾 **Réception fournisseur partielle** | Les bons de commande se réceptionnent **ligne par ligne, en plusieurs fois** (steppers, « Tout le restant ») — statut **Partiel** jusqu'à réception complète, stock mis à jour à chaque livraison |
| 📈 **Prévision de rupture** | Vélocité de vente réelle (vendus/jour) → **jours restants avant rupture** + quantité suggérée à commander (couvre le délai de réassort) — onglet 📈 dans Alertes |
| 🎁 **Points de fidélité** | Points gagnés sur l'argent **réellement payé** (1 pt / X FCFA réglable), remise en caisse par interrupteur (valeur du point réglable), **NET à payer** sur reçus A5/ticket 80mm, journal complet sur la fiche client |
| 👥 **Prix gros/détail** | Deux niveaux de prix par produit + tier **Détail/Gros** par client (badge 🏷) — en caisse, le bon prix s'applique **automatiquement** dès qu'on choisit le client |
| 🏬 **Multi-boutiques** | Boutiques illimitées (admin) : équipe rattachée, ventes/clients/caisse/mouvements/bons **taggés et filtrés par boutique**, Z de caisse **par boutique et par jour** |
| 📦 **Stock par boutique** | Chaque boutique a **son propre stock** (siège = global − boutiques) : ventes, sorties, réceptions, inventaires et abonnements consomment **l'emplacement** de l'opération avec vérif de niveau par emplacement ; **sans boutique, comportement inchangé** |
| 🔁 **Transferts inter-boutiques** | Siège ⇆ boutiques, multi-produits, réf `TR-2026-XXXXXX` · **cycle 🚚 en transit → ✓ réception à valider par la destination** (annulation possible : le stock retourne à la source) — pendant le trajet le stock n'est vendable nulle part ; l'app plafonne au stock de la source |
| 📍 **Alertes par emplacement** | En plus des alertes globales et des 📈 prévisions : un onglet dédié montre les produits sous leur seuil **dans ta boutique** (ou au siège) — chaque point de vente surveille SON rayon |
| 🖥 **App PC (Electron) — v1.1 parité mobile** | `stock-pc/` — **les 20 écrans du mobile** au PC : POS 2 colonnes avec **douchette code-barres** + fidélité/gros/crédit, **reçus & avoirs (total/partiel) + versements 💳**, transferts 🚚 avec **réception validée**, inventaires comptage→ajustement, fournisseurs & commandes avec **réception partielle**, stats + **marges** + **export Excel/CSV**, abonnements, utilisateurs/boutiques/catégories/seuils/logo, **étiquettes A4 🏷️** en un clic — même design sombre premium, FR/EN, installateur Win/Linux/Mac, **zéro dépendance de rendu** (vanilla) · **v1.2** : 🖨 impression ticket 80mm **sans boîte de dialogue** (ESC/POS réseau IP ou système silencieuse) + 📡 **mode hors ligne** (ventes en file `client_uuid`, sync auto **idempotente**, catalogue en cache) · **v1.3** : 📄 **rapport patron PDF A4** (généré localement, logo boutique), 🖨 **Z de caisse direct sur la thermique** (+ historique réimprimable), 🏬 **sélecteur de boutique au login** (poste rattaché via `X-Shop-Id`, ventes/Z taggées — patch ShopScope côté serveur, zéro migration) · **v1.4** : 🤖 **automatisations** locales au poste — 🖨 **ticket auto après chaque vente** (zéro bouton) + 📄 **rapport patron PDF auto à chaque clôture** (enregistré sans dialogue dans `Documents/StockFlow/Rapports`, 1 fichier/jour) — activables dans Réglages, OFF par défaut · 🐞 correctif window-attach (boutons thermiques désormais vraiment visibles en Electron) · **v1.5** : 🖨 **Z thermique auto à la clôture** (3ᵉ interrupteur) + ⚡ **badge du jour EN DIRECT** sur le dashboard (CA du jour rafraîchi 30 s, flash vert 🎉 à chaque vente, admin/manager) · **v1.6** : 🧾 **export comptable mensuel** (3 CSV ventes/caisse/Z pour le comptable, séparateur « ; » + BOM Excel, 1 route backend + relation `shop()` sur 2 modèles, zéro migration) + 🖼 **logo boutique sur le ticket & Z thermiques** (raster ESC/POS `GS v 0`, checkbox Réglages) + 📦 **chip alertes stock cliquable** sur le badge live · **v1.7** : 📄 **récap mensuel comptable en PDF** (route `/accounting/summary`, KPI mois + journal des Z jour par jour) + 🔔 **alertes stock en notification native Windows/macOS** (anti-spam, 4ᵉ interrupteur, fix `window.Api`) + 🔫 **douchette code-barres dans les inventaires** (scan → curseur direct dans le comptage) · **v1.8** : 🧾 **compteur de ventes live** sur le badge (+ 🐞 fix champ API réel `sales_collected_today` — le CA affichait 0 F !) + 📅 **récap comptable auto au changement de mois** (PDF du mois passé rangé sans dialogue, bascule d'année OK) + 🔊 **bip sonore au scan** (Web Audio 880→1320 Hz, 6ᵉ interrupteur) · **v1.9** : 📦 **pack du jour auto à la clôture** (PDF récap quotidien : CA, vendeurs, Z signé — 7ᵉ interrupteur, 1 fichier/jour) + 🏷️ **étiquette thermique individuelle** par produit (nom/prix + **vrai code-barres CODE128** ESC/POS) + 👥 **totaux par vendeur en direct** sur le badge (1 champ API `sales_by_user_today`, repli propre ancien serveur) · **v2.0** : 📤 **CSV des ventes du jour joint au pack** (`ventes-jour-…csv`, 1 reçu/ligne, montants entiers, BOM Excel, handler `sf:file-save`, plafond 1 000) + 📊 **comparatif « vs hier »** dans le badge live & le pack (`sales_yesterday`, 📈/📉/⚖️) + 🖼 **logo raster sur les étiquettes** + 🐞 version sidebar lue depuis `CONFIG.APP_VERSION` (plus de v… figée) · **v2.1** : 📧 **pack du jour par email au patron** (Mailable `DailyPackMail` + queue avec repli sync, réglage `boss_email`, PDF en base64 depuis le main) + 🧮 **bilan hebdo auto le lundi** (mode plage `from/to` de `/accounting/summary`, semaines ISO, 9ᵉ interrupteur) + 🔁 **versements crédit hors ligne** (file bidirectionnelle, route `by-uuid`, anti-double 120 s) — 7 fichiers serveur, 0 migration · **v2.2** : 🔔 **rappel email quotidien des crédits anciens** (commande planifiée `credits:remind-email` 10h05, même seuil `credit_reminder_days`, digest tableau + total, no-op sans `boss_email`, queue + repli sync, `withoutOverlapping`) + 📊 **comparatif multi-boutiques dans le pack jour** (section « ② bis » : CA + ventes par boutique, ligne TOTAL, affichée seulement si ≥ 2 boutiques, champ additif `sales_by_shop_today`, repli propre ancien serveur) + 🖨 **bilan hebdo imprimé auto sur la thermique le lundi** (10ᵉ interrupteur, ticket 80 mm : plage lun→dim, KPIs, journal des Z, solde gras, signature — fire & forget, jamais bloquant) — 5 fichiers serveur (3 nouveaux), 0 migration ; 🛡 QA : batteries de régression **pérennes dans le repo** (`tools/qa-*.js` : 59 contrôles historiques v1.0→v2.1 + 31 v2.2 + smoke 19/19 + cohérence i18n/routes) · **v2.3** : 📧 **bilan hebdo par email le lundi matin** (endpoint `email-weekly` : serveur recalcule les chiffres via `recapData()` factorisé + 🏆 meilleure journée, Mailable + vue maison, queue/repli, 11ᵉ interrupteur) + ⚖️ **comparatif vendeurs multi-postes dans les Stats** (médailles, ventes/articles/panier moyen/CA/part + barre, ≥ 2 vendeurs, zéro backend) + 🏷️ **étiquettes thermiques en rafale** (bouton « Rafale (N) » sur Produits = tout le rayon filtré, concaténé en UN envoi réseau, CODE128) — 4 fichiers serveur (2 nouveaux), 0 migration · ✨ **nouvelles icônes des 3 apps** (master `brand/`, dérivations PIL : PC 512+ico multi, site favicon/SVG/apple-touch/PWA maskable, mobile Expo 1024+adaptive+splash) · **v2.4** : 📸 **scan code-barres à la webcam du PC** (`scan.js` vanilla — `BarcodeDetector` natif Chromium via flag `enable-experimental-web-platform-features`, zéro dépendance, continu en caisse + single-shot inventaires, cooldown anti-doublon, bip v1.8 réutilisé, dégradé propre : douchette toujours reine) + 📊 **export Excel du comparatif vendeurs** (`comparatif-vendeurs-<période>.csv`, BOM/« ; »/entiers, dialogue ou téléchargement) + 📱 **mobile v15** : 🏷️ rafale d'étiquettes Bluetooth (une seule connexion, CODE128 `printBarCode` + repli texte, gardes propres sans dev build) + ⚖️ **⌀ panier moyen** vendeurs + 📤 **partage CSV du comparatif** (`expo-sharing`) — 0 nouvelle dépendance npm ; **v2.4 = 0 fichier serveur** 🎉 · **v2.5** : 🖨️ **Z thermique directement depuis le mobile** (bouton 🖨 sur chaque clôture + proposition juste après la clôture, ticket 80 mm : ventes/apports/dépenses, SOLDE en gros, signature — une seule connexion Bluetooth) + 🏷️ **rafale avec quantités en saisie express** (modale ×1 ×2 ×3 ×5 ×10 PC & mobile, borne 1..20/1..10, bouton annonce le total, `copies=1` par défaut = rétro-compatible) + 🏬 **comparatif par boutique dans les Stats** (bloc additif `by_shop` sur `/stats/sales` — toutes boutiques, « Siège » pour le hors-boutique, mêmes métriques que vendeurs ; carte 🥇🥈🥉 + 📤 CSV `comparatif-boutiques-…` sur PC, onglet 🏬 + partage sur mobile v16 ; ≥ 2 boutiques sinon masqué, vieux serveur = repli doux) — **1 seul fichier serveur** (`StatsController.php`), 0 migration, 0 nouvelle dépendance · **v2.6** : 📅 **stats à dates libres** (`?from=…&to=…` sur sales/margins/drill-down, bornes inversées permutées, plafond 370 j, repli silencieux 30 j, clé `to` additive — champs date PC + puce 📅 mobile v17, comparatifs vendeurs & boutiques + CSV suivent la plage) + ⚠️🏷️ **rafale « ruptures de stock »** (PC bouton ⚠️ + mobile 🚨 → `/products?out_of_stock=1&all=1` route existante, même saisie express de quantité, aucune rupture → toast 🎉) — toujours **1 seul fichier serveur** (`StatsController.php`), 0 migration · **v2.7** : 📊 **heatmap croisée « qui vend où »** (vendeurs × boutiques — clé additive `cross` sur `/stats/sales` : jointure users, groupBy vendeur×boutique, CA net des retours, NON bornée par `$applyShop` ; carte PC à intensité proportionnelle + TOTAL ligne/colonne, bloc mobile v18 dans l'onglet Vendeurs — ≥ 2 vendeurs × ≥ 2 boutiques sinon masqué, vieux serveur = repli doux) + 📦 **pack hebdo détaillé par boutique** (section « ① bis » dans le PDF **et** l'email du lundi via `recapData` factorisé : ventes/CA/part % par boutique, TOTAL 100 %, affichée si ≥ 2 boutiques) + 🔔 **« N ruptures » du matin** (12ᵉ interrupteur : au 1er démarrage du jour, une notification bureau groupée « N produit(s) en rupture », 1×/jour max, marqueur NON avancé sur panne réseau, OFF par défaut — `StockNotifier.fire()` exposée) — **3 fichiers serveur** (`StatsController.php`, `AccountingExportController.php`, `weekly_recap.blade.php`), 0 migration · **v2.8** : 🏆 **objectifs CA mensuels par vendeur** (cible unique dans 🎯 Seuils — table `settings` clé/valeur, 0 migration ; clé additive `seller_goals` = CA du mois calendaire par vendeur, CA net, même scope boutique ; carte de progression PC + mobile 🎉 **« Atteint ! »** à 100 %, cible 0 = masqué) + 📉 **prévisions de rupture en surface** (chip **« ⏳ N épuisé(s) sous 7 j »** sur le badge live PC toutes les 30 s + chip dashboard mobile, route `restock-forecast` v14 non bloquante ; la notif « ruptures du matin » v2.7 cite aussi les imminentes) + 🧾 **reçu en texte WhatsApp** (mobile : action dans la feuille du reçu — post-vente, historique, fiche client — texte aligné 42 colonnes, boutique/TOTAL en gras, bloc Payé/Reste crédit, fiche de partage système, zéro dépendance) — **2 fichiers serveur** (`StatsController.php`, `Support/Setting.php`), 0 migration · **v2.9** : 📸 **photos produit en caisse** (elles existaient déjà catalogue/fiches — le trou était la vente : vignettes 30/26 px PC, 34/30 px mobile v20, placeholder 📦 sinon, 0 serveur) + 🧮 **multi-TVA** (carte 🎯 dédiée — taux défaut + par catégorie, JSON `tva_config` en settings, 0 migration ; NOUVEAU `Support/Tva.php` : résolution produit→catégorie→défaut bornée 0-100, ventilation « dont HT / dont TVA n % » sur **ticket thermique byte-safe** (null = identique v2.8), PDF A5/ticket blades gardés, modal reçu PC, partage WhatsApp mobile, estimation panier PC+mobile, 2 colonnes CSV compta — **présentation, pas snapshot** : les vieux reçus re-ventilent aux taux actuels, limite assumée) + 👥 **commissions vendeurs** (seuil `commission_pct` 0-50, 0 = masqué ; bloc additif `commissions` de `recapData` requêté **seulement si > 0** ; 💰 « com. » sous les barres objectifs PC + mobile + encart **« ② bis »** des rapports PDF avec total) — **8 fichiers serveur dont 1 NOUVEAU** (`app/Support/Tva.php`), **0 migration, 0 route** — mobile v20 · **v2.10** : 🧾 **devis / proforma locaux** (bouton 🧾 en caisse → brouillons **sur le poste, 0 serveur** — un devis n'est pas une vente : PDF A5 maison avec zone signature, texte WhatsApp 42 col, ticket thermique « NON FACTURÉ » sans Payé/Reste, rechargement 1 clic gardé par confirmation + plafonné au stock, cap 50 — PC localStorage / mobile fichier JSON, zéro dépendance) + 📦 **étiquettes au stock réel** — après confrontation au code : rafale ×N / ruptures / A4 CODE128 / BT existaient déjà, le vrai trou était le **réassort** → **1 étiquette par unité en stock** (bornes ≤ 50/produit · ≤ 400/rafale · ≤ 300/planche ; puce « 📦 Au stock » rafale thermique PC + option picker BT mobile + case A4 → param additif `stock_qty=1`, sans lui strictement identique v2.9) + 📊 **rentabilité 12 mois** (clé additive `by_month` sur `/stats/margins`, **0 requête** si absente ; carte PC 24 barres CA/marge + 3 statCards + 📄 PDF patron `rentabilite-12mois-…pdf`, mobile BarChart vert + mois localisés + CSV) — **2 fichiers serveur** (`LabelController.php`, `StatsController.php`), **0 migration, 0 route nouvelle** — mobile v21 · **v2.11** : 🏷️ **prix promo datés** (réglage JSON `promo_config` + NOUVEAU `Support/Promo.php` — actif ∈ [début, fin] **bornes incluses**, **retour auto au prix normal** hors période, **jamais pour les clients de gros** ; prix barré + badge catalogue PC/mobile, caisse au prix promo, `*PROMO*` thermique, badge PDF blades gardés, mention reçu WhatsApp — présentation du moment, prix figé sur les lignes) + 📦 **inventaire tournant guidé** (seuil produits/jour, 0 = OFF ; carte « Comptage du jour » PC **et** mobile, **rotation déterministe identique des 2 côtés** couvrant le catalogue, ✏️ → param additif `product_ids` → comptage ouvert direct) + 🔔 **relance crédit WhatsApp** (fiche client : reste > 0 + tél → wa.me **message pré-rempli** nom/montant/boutique, +223 auto — **0 serveur** pour cette piste) — **9 fichiers serveur dont 1 NOUVEAU** (`app/Support/Promo.php`), **0 migration, 0 route nouvelle** — mobile v22 · **v2.12** : 📊 **prévisions d'achat par fournisseur** (clé additive `by_supplier=1` sur `/products/restock-forecast` — **0 requête fournisseur** sinon ; carte PC + mobile v23 dans 🛒 Commandes : 🚛 ×N par fournisseur pour **15 j de couverture**, tri par total, repli « Sans fournisseur », vieux serveur = carte masquée — complète la génération de bons par seuil bas qui existe déjà) + 🧾 **avoirs partiels sur TOUTES les surfaces de reçu** (en l'état : détail reçu PC + PDF A5 montraient déjà les retours — les vrais trous : **ticket 80 mm blade** gardé, **thermique PC** ESC `<- 1 retourne(s)` + HTML, **reçu WhatsApp** mobile — ligne ↩ N retourné(s) sous l'article + **Avoir (retours) − X F / TOTAL NET** après le TOTAL, montant = Σ `refunded_qty` × prix ligne déjà en base ; sans retour : **byte-identique**) — **2 fichiers serveur** (`ProductController.php`, `sale-ticket.blade.php`), **0 migration, 0 route nouvelle** — mobile v23 · **v2.13** : 📥 **import CSV produits en masse** (bouton 📥 Produits PC + mobile v24 — **le fichier « Export produits » se réimporte tel quel**, séparateur « ; »/« , » auto, guillemets, « 1 500 F »/« 1500 FCFA » normalisés, en-têtes FR/EN ; aperçu temps réel + erreurs par **n° de ligne**, une ligne invalide n'empêche jamais les autres ; rapprochement **SKU** : mise à jour commerciale — **quantité = créations seules**, absents créés + mouvement « Import CSV » ; catégories/fournisseurs par nom créés si demandé ; rapport `créés/maj/erreurs` — **1 route** `POST /products/import`, validation ligne par ligne, ≤ 300) + 💳 **échéancier de rappels crédit** (dates planifiées par client — réglage JSON `credit_schedule`, **0 migration**, param additif `payment_plan` sur `PUT /customers/{id}` enfin partiel ; carte échéancier PC + mobile avec **+7/+15/+30 j**, badges liste 🟢/🟠/🔴 — **soldé = masqué** ; **rappel auto à J−1** : section « 📅 Rappels planifiés » de l'email patron quotidien — envoyée même sans crédit ancien — + **13ᵉ interrupteur** « échéances crédit du matin » PC, OFF par défaut ; vieux serveur = carte & badges masqués) — **8 fichiers serveur**, **1 route nouvelle, 0 migration** — mobile v24 · **v2.14** : 👤 **comptes clients partout — fini les clés de licence** (achat site → compte créé à la validation, mot de passe envoyé email/WhatsApp **1×**, portail `/compte` : badge 🟢 actif / 🟠 J-7 / 🟠 grâce 3 j / 🔴 bloqué / ⚫ révoqué + renouvellement même email = **prolongation auto** + reçus ; l'email = **login de l'app mobile v25 ET du PC** — abonnement expiré → 403 + écran « 👤 Mon abonnement » dédié ; 🇬 **Se connecter avec Google** 0 dép. 0 migration : bouton GIS sur le portail + navigateur des apps → **code 5 min à usage unique** → session Sanctum, `GOOGLE_CLIENT_ID` requis sinon boutons masqués ; clé `License::$hidden` + admin web/API **zéro clé affichée**) — **≈30 fichiers serveur (14 nouveaux, 3 supprimés), 9 routes web/API, 0 migration** — mobile v25 |

## 🚀 Démarrage rapide

### 1️⃣ Backend  — _Laravel 13 · PHP 8.3+ (v2.15)_

```bash
composer create-project laravel/laravel stock-api && cd stock-api   # ← dernière version = Laravel 13.x
php artisan install:api
composer require barryvdh/laravel-dompdf     # ← reçus PDF premium (v3.1+ compatible 13)
# → copier les fichiers de stock-api/ par-dessus
# → .env : APP_URL=http://<IP-de-ton-PC>:8000 + base MySQL (voir stock-api/README.md)
# → bootstrap/app.php : alias middleware 'role' + SetLocale (voir stock-api/README.md)
# → déjà en Laravel 11/12 ? voir « ⬆️ Mettre à jour » dans stock-api/README.md (0 ligne de code à changer)
php artisan migrate --seed
php artisan storage:link
php artisan serve --host=0.0.0.0 --port=8000
php artisan schedule:work                    # ← rappels d'expiration + bons auto 08:00 (terminal séparé ; cron en prod)
```

- Site : `http://localhost:8000`
- Admin : `http://localhost:8000/admin` → `admin@stock.com` / `password`

### 2️⃣ Mobile

```bash
npx create-expo-app@latest stock-app --template blank && cd stock-app
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context axios expo-secure-store expo-camera expo-file-system expo-sharing react-native-svg react-native-chart-kit @react-native-async-storage/async-storage @react-native-community/netinfo expo-image-picker expo-notifications expo-file-system/legacy expo-constants
# → copier App.js + src/ | configurer src/config.js
npx eas init            # (optionnel) fournit le projectId nécessaire aux push DISTANTES
npx expo start
```

### 3️⃣ PC de caisse (optionnel)

```bash
cd stock-pc
npm install        # Electron (seule dépendance)
npm start          # configure l'URL de l'API dans ⚙️ Réglages si besoin
# installateur : npm i -D electron-builder && npm run pack:win (ou pack:linux / pack:mac)
```

## 🗄 Schéma de la base

```
users ──< stock_movements >── products >── categories / suppliers
(image, sku, barcode, seuil…)   (client_uuid → anti-doublon hors ligne)

plans ──< orders (statut pending/paid/cancelled)
              │
              └── 1:1 licenses (clé SF-…, expires_at, statut)

payment_methods (Orange Money, Wave… — instructions éditables par l'admin)

users ──< receipts ──< receipt_items >── products
           (n° R-2026-XXXXXX, client, total, client_uuid anti-doublon)

users ──< push_tokens (ExponentPushToken[…] par appareil)
shop-logo.{png,jpg…} → public/images/ (upload admin, affiché sur les reçus)

suppliers ──< purchase_orders ──< purchase_order_items >── products
                (BC-2026-XXX, draft→sent→received = entrées de stock auto)
```

## 📸 Aperçus générés par IA pour la landing

`stock-api/public/images/hero-dashboard.png` & `app-mockup.png` — style glassmorphism violet/cyan sur fond sombre.

### 💳 v8 — Crédit client, ticket en image, inventaire & export Excel

- **💳 Paiement partiel / crédit client** — la vente accepte un acompte : le reste devient un crédit suivi (versements multiples, encours total, badge sur les PDFs A5 + ticket 80mm + impression Bluetooth)
- **📱 Ticket partagé en image** — capture PNG du ticket blanc (`react-native-view-shot`, compatible Expo Go) envoyable sur WhatsApp & co
- **🔄 Inventaire physique avec scan & écarts** — snapshot du stock → comptage au code-barres en continu (+1 par scan) ou steppers → validation qui aligne le stock via des mouvements « Inventaire »
- **📊 Export Excel des stats** — vrai classeur `.xlsx` 4 onglets (Résumé / Produits / Vendeurs / Catégories) généré par `XlsxWriter` maison : **zéro dépendance Composer**

### 👥 v9 — CRM clients, marges, caisse, avoirs & digest push

- **👥 CRM clients** — fiches clients (nom, tél, adresse, notes), historique d'achats, **crédits regroupés par client**, vente liée à une fiche (snapshot nom/tél sur le reçu → le reçu survit à la suppression de la fiche)
- **💰 Rapport de marge** — bénéfice par produit (CA − qté × prix d'achat), taux de marge, tuiles globales + onglet **Marges** ajouté au classeur Excel
- **💵 Caisse** — dépenses / sorties / apports manuels, solde global, chiffres du jour, encaissé du jour côté ventes (admin/manager)
- **↩️ Avoir / annulation de vente** — restock automatique via mouvements « Avoir vente », badge AVOIR sur les PDFs, exclusion des stats, crédits et marges
- **🔔 Digest push quotidien 07:30** — récap stock bas/rupture envoyé aux admins + managers

### ↩️ v10 — Avoir partiel, étiquettes, rappel crédit, Z de caisse & segments

- **↩️ Avoir partiel par ligne** — choisir les quantités à retourner article par article (cumulable) ; toutes les stats deviennent **nettes des retours** (CA, vendeurs, marges, détail produit)
- **🏷️ Étiquettes code-barres PDF** — planche A4 à coller (code 128-B encodé maison, zéro dépendance), depuis la fiche produit ou en lot via `ids`
- **📅 Rappel crédit quotidien 10:00** — push « N crédits de +7 jours · encours X FCFA » aux admins/managers
- **💵 Z de caisse** — clôture journalière (1/jour) + historique, catégories de dépenses (transport, fournisseur, salaires, loyer, autre)
- **👥 Segments clients** — ⭐ fidèles (5+ achats) · 💳 à crédit · 😴 inactifs (60 j) + push de relance au staff + contact WhatsApp direct sur la fiche

### 🔁 v11 — Z PDF, remboursement tracé, seuils configurables, trésorerie & abonnements

- **📄 PDF du Z de caisse** — reçu A5 imprimable/archivable par clôture (synthèse, sorties par catégorie, détail des opérations), share depuis l'onglet Clôtures
- **↩️💵 Remboursement d'argent tracé** — interrupteur « Rembourser en espèces » sur tout avoir (total **ou** partiel) : sortie de caisse auto catégorie `refund`, liée au reçu, visible dans le PDF du Z
- **🎯 Seuils configurables** — écran Réglages boutique : ventes pour « fidèle », jours d'inactivité, ancienneté des crédits rappelés (appliqués immédiatement, visibles dans l'app)
- **📊 Graphique de trésorerie** — courbe du solde de caisse sur 30 jours dans l'écran Caisse (rendu 100 % vues, zéro dépendance)
- **🔁 Ventes récurrentes / abonnements** — client + articles + fréquence (hebdo/mensuelle) → vente générée **à crédit** à chaque échéance (cron 06:30 ou ⚡ manuel), push récap, pause/reprise — les crédits existants relancent le client automatiquement

---

📖 Détails : [stock-api/README.md](stock-api/README.md) · [stock-app/README.md](stock-app/README.md) · [REVIEW.md](REVIEW.md)
