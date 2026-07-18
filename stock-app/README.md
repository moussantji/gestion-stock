# StockFlow — App mobile (React Native / Expo)

App de gestion de stock connectée à l'API Laravel — thème sombre premium, mode hors ligne, photos produits, **ventes avec reçus PDF**, section admin, **100 % FR/EN**.

## Installation

```bash
npx create-expo-app@latest stock-app --template blank
cd stock-app

npx expo install \
  @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs \
  react-native-screens react-native-safe-area-context \
  axios expo-secure-store expo-camera expo-file-system expo-sharing \
  react-native-svg react-native-chart-kit \
  @react-native-async-storage/async-storage @react-native-community/netinfo \
  expo-image-picker expo-notifications expo-file-system/legacy expo-constants

# Pour les push DISTANTES (hors Expo Go) : projectId Expo dans app.json
npx eas init
```

> 💡 `expo-file-system/legacy` est requis par l'app (`import ... from 'expo-file-system/legacy'`) : compatible Expo Go / SDK 53+.

Copier `App.js` + `src/` de ce dossier dans le projet, configurer `src/config.js`, puis :

```bash
npx expo start    # → QR code → Expo Go
```

> ⚠️ Pour voir les **photos des produits**, `APP_URL` du `.env` Laravel doit être l'IP de ton PC (la même que dans `src/config.js`), et `php artisan storage:link` doit avoir été exécuté.

## Fonctionnalités

| Fonctionnalité | Détail |
|---|---|
| 🔐 Auth | Token Sanctum, session persistée (SecureStore) |
| 🎨 Thème | Sombre premium violet/cyan assorti au site |
| 📦 Produits | Recherche, filtres, **photos** (caméra/galerie à la création), scan code-barres |
| 🧾 **Ventes + reçus PDF** | Écran **Nouvelle vente** (panier multi-articles, nom/téléphone du client) → reçu premium A5 avec le nom de TA boutique, **partageable** (WhatsApp…) — le stock se décrémente automatiquement |
| 🔔 **Rappels licence** (admin) | Notifications locales J-3/J-1 pour les licences qui expirent (planifiées depuis l'onglet Admin) |
| 📲 **Push distantes** | Token Expo enregistré à la connexion → l'API notifie les admins : **🛒 nouvelle commande** & **⌛ récap expirations**. *Nécessite un **dev build / APK** + `eas init` (silencieux dans Expo Go)* |
| 📊 **Stats des ventes** | Écran dédié (admin/manager) : CA, reçus, articles, panier moyen, **BarChart top 5**, classement 🥇🥈🥉 **par produit ET par vendeur** (onglets) avec part du CA — périodes 7j/30j/90j/tout |
| 🖨 **Ticket 80mm + impression Bluetooth** | Feuille d'actions sur chaque reçu : **A5 premium · ticket 80mm PDF · 🔵 impression directe ESC/POS** (sans partage) — réglages dans Profil → 🖨 Imprimante Bluetooth |
| 🏷 **Stats + drill-down** | 3 onglets (produits/vendeurs/**catégories**) + **touche un produit → bottom sheet historique** (in/out/vendu + CA + 50 derniers mouvements de la période) |
| 📦 **Bons de commande** | Écran dédié (accès Alertes, admin/manager) : **génération 1-clic** depuis le stock bas, expansion des articles, **✏️ quantités ajustables (−/+)** en brouillon, **✉️ envoyé → ✅ réceptionné** (= stock réassorti auto), partage du PDF A4 au fournisseur |
| 🏪 **Logo boutique** | Upload depuis Admin → **🏪 Boutique** → affiché en tête des reçus PDF |
| 📡 **Mode hors ligne** | Liste produits en cache (AsyncStorage), mouvements mis en file d'attente avec `client_uuid`, **synchronisation automatique** au retour réseau + bouton « Sync ↻ » sur le bandeau |
| 🔄 Mouvements | Entrées/sorties + annulation (admin/manager), onglet **Reçus** dans l'écran Mouvements |
| ⚠️ Alertes | Jauges de stock bas + réassort rapide + accès aux **bons de commande** (admin/manager) |
| ⚡ **Admin mobile** (rôle admin) | Revenus, validation des commandes, **génération + partage des clés de licence**, révocation, **licences expirant bientôt** + rappels push |
| 📄 Exports CSV | Produits & mouvements (manager+), partagés depuis le téléphone |
| 👥 Rôles | admin / manager / employee (l'UI s'adapte) |
| 🌍 **100 % bilingue FR/EN** | Sélecteur dans **Profil → Paramètres → Langue** (persisté). **Tous** les écrans sont traduits (navigation, ventes, reçus, alertes, admin, scanner…) — 248 clés par langue dans `src/i18n/translations.js` |
| 🧭 Tab bar premium | Barre du bas **flottante** (arrondie, ombre, icônes) |

## 🖨 Impression Bluetooth directe (ESC/POS)

L'app peut imprimer un reçu **directement** sur une imprimante thermique 80mm, sans passer par le partage PDF.

### ⚠️ Prérequis : un development build (pas Expo Go)

Bluetooth classique = code natif → incompatible Expo Go. Le module est chargé **dynamiquement** (`require` en try/catch) : sans dev build, l'app fonctionne normalement et le bouton « 🔵 Imprimer » affiche une explication.

```bash
# 1. Installe la librairie native
npm install react-native-thermal-receipt-printer

# 2. Génère les projets natifs + build dev
npx expo prebuild
npx eas build --profile development --platform android   # APK dev client

# 3. Lance sur l'APK
npx expo start --dev-client
```

### Configuration

1. **Appaire** l'imprimante dans les réglages Bluetooth du téléphone
2. App → **Profil → 🖨 Imprimante Bluetooth** → « Lister les imprimantes appairées » → touche la tienne → **page de test**
3. Sur n'importe quel reçu (après une vente ou dans Mouvements → 🧾 Reçus) : **🔵 Imprimer (Bluetooth)**

### Détails techniques

- Colonnes alignées via `printColumn` (fonte A, 42 colonnes/80mm), `printerInit`, avance papier pour la découpe
- **Accents supprimés** (`NFD` + strip U+0300–U+036F) : les imprimantes thermiques basiques gèrent mal l'UTF-8 (« Café » → « Cafe »)
- Le reçu complet (articles) est récupéré à la volée (`GET /receipts/{id}`) + infos boutique (`GET /shop`)

## Ventes avec reçu — comment ça marche

```
🛒 « Nouvelle vente » (bouton ⚡ du Dashboard ou 🧾 dans Mouvements)
   → panier multi-articles (steppers +/−), nom/téléphone du client (optionnel)
   → POST /api/receipts (client_uuid → jamais de doublon)
   → le serveur crée le reçu R-2026-XXXXXX + les sorties de stock (transaction)
🧾 Partage du PDF premium (nom de TA boutique, vendeur, client, articles, total)
   → téléchargé via expo-file-system puis partagé via expo-sharing (WhatsApp…)
```

L'en-tête du reçu (nom de boutique, téléphone, slogan…) se configure côté Laravel : variables `SHOP_*` du `.env`.

## Mode hors ligne — comment ça marche

```
📵 Achat/vente sans réseau
   → mouvement stocké localement (AsyncStorage), uuid unique
📶 Réseau retrouvé (NetInfo)
   → sync automatique de la file vers POST /api/movements
✅ Succès → retiré de la file
⚠️ Échec métier (stock insuffisant, produit supprimé) → conservé avec l'erreur
🔁 client_uuid → le serveur ne crée JAMAIS de doublon, même en renvoyant
```

## Structure `src/`

```
config.js            IP de l'API
theme/colors.js      Palette sombre + thème navigation
api/client.js        Axios + token + extraction des erreurs Laravel
i18n/translations.js 248 clés FR + 248 EN (LOCALES)
utils/format.js      FCFA, dates FR
utils/offlineQueue.js File d'attente + cache produits + uuid
utils/notifications.js Rappels locaux + enregistrement du token push distant (registerPushToken)
context/AuthContext.js   Session
context/NetworkContext.js Online/offline + sync + compteur en attente
context/LocaleContext.js Langue FR/EN (t(), persistance AsyncStorage)
utils/thermalPrinter.js Impression ESC/POS Bluetooth (require dynamique, strip accents)
components/          OfflineBanner, ProductCard (photo), ReceiptActionsSheet 🧾, StatCard, Field…
screens/             18 écrans — 100 % traduits (dont PrinterSettingsScreen 🖨, StatsScreen 📊, PurchaseOrdersScreen 📦…)
```

---

## 💳 v8 — Crédit client, ticket en image, inventaire & export Excel

### Installation supplémentaire (une seule !)
```bash
npx expo install react-native-view-shot
```
(`react-native-view-shot` est inclus dans Expo Go → capture image immédiate, sans dev build.)

### Nouveautés
- **💳 Crédit client** — dans *Nouvelle vente* : onglet « 💵 Comptant / 💳 Crédit » + montant payé + aperçu du reste. Dans *Mouvements* : filtre **💳 Crédits** (encours total + tap → versement « tout solder » possible). Badge crédit sur les reçus.
- **📱 Ticket en image** — 4ᵉ action de la feuille reçu : capture PNG d'un ticket blanc (`components/ReceiptImage.js` monté hors-champ dans `ReceiptActionsSheet`) → partage WhatsApp…
- **🔄 Inventaire** — *Profil → Inventaires* : création (snapshot), comptage par scan continu (+1/scan, feedback vert/rouge) ou steppers, barre de progression, écart total en direct, validation (admin/manager).
- **📊 Export Excel** — bouton dans *Stats* : télécharge `stats-ventes-{periode}.xlsx` (période courante) puis partage.
- Le ticket Bluetooth affiche désormais **Payé / RESTE** pour les ventes à crédit.

### Structure (mise à jour)
```
components/ReceiptImage.js  Ticket blanc capturé en PNG (100% vues locales)
screens/                    20 écrans — 100 % traduits (dont InventoriesScreen, InventoryCountScreen)
```

---

## 👥 v9 — CRM, marges, caisse, avoirs & digest push

- **👥 Clients** — *Profil → Clients* : liste + recherche, badge crédit par client, fiche détaillée (totaux, crédits avec versement direct, historique d'achats). Dans *Nouvelle vente* : bouton « Lier à une fiche client ».
- **💰 Marges** — 4ᵉ onglet dans *Stats* : tuiles CA / coût / marge / taux + classement par marge (barres vertes/rouges).
- **💵 Caisse** — *Profil → Caisse* (admin/manager) : solde global, tuiles du jour, opérations in/out avec motif, suppression par appui long.
- **↩️ Avoir** — feuille d'actions du reçu : bouton rouge « Émettre un avoir » (admin/manager, une seule fois) → restock auto + badge grisé dans les listes.
- **🔔 Digest push** — récap stock bas à 07:30 (rien à faire côté app).
- Composant partagé `components/PaymentSheet.js` (versement crédit) utilisé par Mouvements **et** fiche client.

### Structure (mise à jour)
```
screens/                    23 écrans — 100 % traduits (dont CustomersScreen, CustomerDetailScreen, CashScreen)
components/PaymentSheet.js  Versement sur un crédit (partagé)
```

---

## ↩️ v10 — Avoir partiel, étiquettes, segments, Z de caisse

- **↩️ Avoir partiel** — feuille reçu → « Avoir partiel… » : steppers par article (max = retournable), cumulatif, badge « déjà retourné » via stats.
- **🏷️ Étiquette PDF** — fiche produit → partager l'étiquette code-barres (A4).
- **💵 Caisse** — catégories dans la modale opération, tag sur les lignes, bouton **🔒 Clôturer la journée**, onglet Clôtures (historique Z).
- **👥 Segments** — chips Tous/⭐/💳/😴 en haut de la liste clients + bouton 📣 notifier le staff ; fiche client → bouton WhatsApp.
- **📅 Rappel crédit** — push automatique 10:00, rien à faire.

---

## 🔁 v11 — Z PDF, remboursement espèces, seuils, trésorerie & abonnements

- **📄 Z de caisse PDF** — onglet Clôtures → bouton 📄 sur chaque Z : reçu A5 partagé (print/Archives/WhatsApp compta).
- **↩️💵 Rembourser en espèces** — interrupteur dans la feuille reçu (avoir total **et** partiel) : la sortie de caisse liée apparaît en catégorie « Remboursement » + confirmation.
- **🎯 Réglages boutique** — menu Profil → 🎯 (admin/gérant) : 3 seuils éditables avec bornes affichées ; l'écran Clients affiche le seuil réel sous les chips segments.
- **📊 Trésorerie** — carte courbe 30 j dans l'écran Caisse (`components/CashBalanceChart.js` — segments inclinés en vues pures, marche dans Expo Go).
- **🔁 Abonnements** — menu Profil → 🔁 : liste (statut, prochaine échéance, total), création guidée (client → fréquence → articles avec prix modifiables), ⚡ générer maintenant, ⏸/▶, 🗑. Vente toujours **à crédit** → relance auto par les rappels existants.
- **Correctif v10** : les **chips segments n'étaient pas rendus** (JSX manquant — `switchSegment`/`notifySegment` définis mais jamais appelés) : restaurés + seuils dynamiques.
- Zéro nouvelle dépendance npm. Écrans : **25** → **27** (`RecurringSalesScreen`, `ShopSettingsScreen` + composant `CashBalanceChart`).

## 🏬 v12 — Réception partielle, prévisions 📈, fidélité 🎁, gros/détail 👥, boutiques 🏬

### Nouveautés
| Écran/composant | Détail |
|---|---|
| 🧾 **Bons de commande** | Réception **partielle** : modale par ligne avec steppers (max = restant), bouton « Tout le restant » ; badge statut **Partiel** ; progression `reçues/commandées` sur chaque ligne ✓ |
| 📈 **Alertes → Prévisions** | 2ᵉ onglet : rupture estimée en jours (vélocité de vente sur 30 j), badge rouge ≤ délai réassort, qté **suggérée à commander** |
| 🎁 **Fidélité en caisse** | Solde de points du client + interrupteur « utiliser les points » → remise + **NET à payer** ; message « +N 🎁 » après la vente ; journal des points sur la fiche client |
| 👥 **Prix gros/détail** | Champ « Prix de gros » sur le produit + tier **Détail/Gros** sur le client (badge 🏷) → en caisse, le prix s'adapte **automatiquement** au client choisi |
| 🏬 **Boutiques (admin)** | Profil → 🏬 Boutiques : CRUD (nom, tél, adresse, actif) + nb de membres ; rattachement d'un user à une boutique à sa création ; ℹ️ stock commun à toutes les boutiques en v12 |
| 🎯 **Réglages boutique** | 2 nouveaux seuils : points gagnés (FCFA/point) & valeur d'un point |

### Mise à jour côté app
- Aucune nouvelle dépendance npm. Juste recopier les fichiers modifiés/nouveaux (`ShopsScreen.js` + écrans mis à jour).
- i18n : 594 clés × FR/EN.

## 🔁 v13 — Stock par boutique & transferts

### Nouveautés
| Écran/composant | Détail |
|---|---|
| 🔁 **Transferts** (nouvel écran, admin/manager) | Profil → Transferts : historique (réf `TR-…`, route 🏠/🏬, lignes) + création : pickers **Depuis/Vers**, produits avec steppers plafonnés au stock de la **source**, exécution immédiate |
| 🏬 **Fiche produit** | Carte « Stock par emplacement » (siège 🏠 + chaque boutique 🏬) dès que le produit a du stock en boutique |
| 📦 **Catalogue & caisse** | `shop_stock` affiché à la place du global quand tu es rattaché à une boutique (badge « boutique ») ; les quantités vendables sont plafonnées à TON stock |
| ⬆️ **Mouvement manuel** | Sortie vérifiée sur le stock de ton emplacement |
| 🔄 **Historique mouvements** | Nouveaux types 🔁 transfert (↗️ sortie / ↙️ entrée, bleu) — traçables avec référence `TR-…` |

### Notes
- Aucune nouvelle dépendance npm. i18n : 615 clés × FR/EN.
- Sans boutique/bucket : affichage strictement identique à la v12.

## 🚚 v14 — Transferts en transit + alertes par emplacement

### Nouveautés
| Écran | Détail |
|---|---|
| 🔁 **Transferts** | Badges de statut : 🚚 **En transit** / ✓ Réceptionné / ↩️ Annulé ; bouton **✓ Réceptionner** visible UNIQUEMENT à la destination (ou admin), **↩️ Annuler** à la source ; le stock n'est vendable nulle part pendant le trajet |
| 📍 **Alertes → Emplacement** | 3ᵉ onglet : produits sous leur seuil **dans ta boutique** (ou au siège) — les alertes globales restent dans l'onglet ⚠️ |

### Notes
- Aucune nouvelle dépendance npm. i18n : 628 clés × FR/EN.
- Refonte transparente : les transferts v13 passent automatiquement en « Réceptionné » à la migration.

## 🏷️ v15 — Rafale d'étiquettes Bluetooth & comparatif vendeurs enrichi

### Nouveautés
| Écran | Détail |
|---|---|
| 📦 **Produits** | Nouveau bouton **🏷️** (à côté du 📷) : **rafale d'étiquettes thermiques** — filtre/recherche ton rayon, confirme, les N étiquettes des produits listés sortent **à la file** (boutique, nom gras, prix gros, **vrai CODE128** via `printBarCode` quand la lib le permet — repli texte sinon). **Une seule connexion Bluetooth** pour toute la rafale ; garde-fous propres : pas de dev build → explication `pr_unavailable_msg`, pas d'imprimante → `pr_no_printer_msg`, spinner pendant l'envoi |
| 📊 **Stats → onglet Vendeurs** | Ligne meta enrichie : **⌀ panier moyen** par vendeur (`avg_basket` déjà fourni par l'API) en plus des reçus/articles/part |
| 📤 **Stats → onglet Vendeurs** | Bouton **« 📤 Partager le comparatif »** (≥ 2 vendeurs) : CSV « Excel » local (BOM + `;`, montants entiers) écrit via `expo-file-system` puis partagé via `expo-sharing` (WhatsApp, mail, Drive…) — mêmes conventions que les exports PC |

### Notes
- **Aucune nouvelle dépendance npm** (réutilise `react-native-thermal-receipt-printer` déjà requis pour le ticket, `expo-file-system/legacy` + `expo-sharing` déjà présents). i18n : **641 clés × FR/EN**.
- La rafale exige le **development build** (comme le ticket v5) ; en Expo Go, le bouton explique la marche à suivre au lieu de planter.
- Sans CODE128 sur l'imprimante (lib ancienne), l'étiquette imprime le code en texte.

## 🖨️ v16 — Z thermique Bluetooth, rafale avec quantités & comparatif boutiques

### Nouveautés
| Écran | Détail |
|---|---|
| 💵 **Caisse → Clôtures** | 🖨️ **Z thermique Bluetooth** : chaque clôture a son bouton **🖨** (à côté du 📄 PDF) — ticket 80 mm : en-tête boutique, caissier, **ventes encaissées / apports / dépenses**, **SOLDE CAISSE en gros caractères**, note et ligne de signature (même plan que le `buildZBytes` du PC). Juste après une nouvelle clôture, l'alerte propose **« 🖨 Imprimer le Z »** pour l'imprimer d'un geste. Mêmes gardes que le ticket : messages propres sans dev build / sans imprimante, **une seule connexion** |
| 📦 **Produits → 🏷️ rafale** | **Quantité par produit en saisie express** : la rafale ouvre une modale **×1 ×2 ×3 ×5 ×10** (×2 mis en avant, total affiché « produits × copies ») puis confirmation — `printProductLabels(products, shop, copies)` : **toujours UNE seule connexion Bluetooth**, borne 1..10, `copies = 1` par défaut = rétro-compatible avec la v15 |
| 📊 **Stats → onglet 🏬 Boutiques** | **Comparatif par boutique** (≥ 2 boutiques sur la période) : médailles 🥇🥈🥉, ventes, articles, **⌀ panier moyen**, CA, part + jauge ; bouton **📤 Partager le comparatif** (CSV `comparatif-boutiques-<période>.csv` via `expo-sharing`). L'onglet n'apparaît qu'à partir de 2 boutiques et **rebascule seul** sur Produits si la période redescend à 1 — clé serveur `by_shop` additive : vieux serveur = onglet simplement absent |

### Notes
- **1 seul fichier serveur modifié** : `app/Http/Controllers/Api/StatsController.php` (bloc `by_shop` additif, agrégé sur **toutes** les boutiques, reçus hors boutique regroupés sous « Siège », zéro migration). Sans cette recopie, tout fonctionne exactement comme en v15 (repli doux).
- **Aucune nouvelle dépendance npm** (`PickerModal` maison réutilisé pour la quantité, canal Bluetooth v15, `expo-sharing` v15). i18n : **651 clés × FR/EN** (+10).
- Le Z mobile réutilise la **clôture enregistrée** (`sales_collected` inclus dans le modèle) — possible aussi sur un Z ancien depuis la liste des 30 dernières clôtures.

## 📅 v17 — Stats à dates libres & rafale « ruptures »

### Nouveautés
| Écran | Détail |
|---|---|
| 📊 **Stats → filtre période** | Nouvelle puce **📅** après 7/30/90 j/tout : modale **Du / Au** (format `AAAA-MM-JJ` validé, alerte sinon) → **tout l'écran suit la plage** (totaux, classements, marges, comparatifs 🏬 & ⚖️) ; l'affichage compact `jj/mm–jj/mm` remplace la puce, **appui long** = retour aux puces. Le serveur permute seul les bornes inversées (plafond 370 j) |
| 📊 **Stats → exports CSV** | Les deux partages (`comparatif-vendeurs-…csv`, `comparatif-boutiques-…csv`) nomment le fichier **avec la plage** (`2026-07-01_2026-07-15`) quand les dates libres sont actives |
| 📦 **Produits → 🚨** | **Rafale « ruptures de stock »** : une requête `/products?out_of_stock=1&all=1` (route existante, **zéro backend**, plafond 500) → même modale quantité ×1…×10 → n'imprime **que le rayon à réassortir**. Aucune rupture → alerte 🎉. Liste d'impression factorisée (`burstList`) partagée avec la rafale classique |

### Notes
- **Serveur : toujours le même unique fichier** (`StatsController.php`) — il accepte désormais `?from=…&to=…` sur `/stats/sales`, `/stats/margins` et le drill-down produit (clé de réponse `to` additive, anciens clients : ignorée). Sans recopie : les dates libres retombent silencieusement sur `period=30d` et le 🚨 ruptures fonctionne déjà (route v1 existante).
- **Aucune nouvelle dépendance npm.** i18n : **660 clés × FR/EN** (+9).

## 📊 v18 — Croisement « qui vend où » dans les Stats

### Nouveautés
| Écran | Détail |
|---|---|
| 📊 **Stats → onglet Vendeurs** | Nouveau bloc **« 📊 Vendeurs × boutiques »** sous le comparatif vendeurs (clé serveur **`cross`**, v2.7) : pour chaque vendeur (🥇🥈🥉), son CA **détaillé par boutique** avec **barres proportionnelles** au meilleur croisement + nom de boutique (« Siège » pour le hors-boutique) + total à droite — la réponse terrain à « qui vend le mieux, **et où ?** ». Visible à partir de **2 vendeurs × 2 boutiques**, limité aux 8 premiers vendeurs |

### Notes
- **Serveur v2.7 requis** pour le bloc croisé : la clé `cross` arrive avec les **3 fichiers serveur v2.7** (`StatsController.php`, `AccountingExportController.php`, `weekly_recap.blade.php`) ; non recopiés ou mono-boutique → bloc simplement **absent**, zéro crash, zéro régression (repli `?? []`).
- **Aucune nouvelle dépendance npm.** i18n : **662 clés × FR/EN** (+2).

## 🧾 v19 — Objectifs vendeurs, chip prévisions & reçu WhatsApp

### Nouveautés
| Écran | Détail |
|---|---|
| 📊 **Stats → onglet Vendeurs** | Bloc **« 🏆 Objectifs du mois »** en tête (serveur v2.8, clé additive `seller_goals`) : pour chaque vendeur, sa barre de progression vers la cible mensuelle (réglée côté PC dans 🎯 Seuils) + % — à 100 % : barre verte et **🎉 Atteint !** Affiché seulement si une cible > 0 est configurée |
| 🏠 **Dashboard** | Chip **« ⏳ N épuisé(s) sous 7 j »** sous les cartes — prévisions de rupture **en surface** via la route existante `/products/restock-forecast` (non bloquant, repli silencieux) ; un tap ouvre les Alertes |
| 🧾 **Reçus (post-vente, historique, fiche client)** | Nouvelle action **« 🧾 Envoyer le reçu (WhatsApp) »** : le ticket en **texte mis en forme** (boutique en gras, articles alignés, TOTAL gras, bloc Payé/Reste en crédit, ✅/⚠️ final) via la fiche de partage système — **zéro dépendance** (`Share` natif), annulation silencieuse |

### Notes
- **Serveur v2.8** : 2 fichiers (`StatsController.php` + `Support/Setting.php` — réglage `seller_monthly_target`, 0 migration, cible 0 = objectifs masqués partout). Le chip prévisions et le reçu WhatsApp fonctionnent déjà sans recopie (routes v14).
- **Aucune nouvelle dépendance npm** (utilitaire texte maison + `Share` react-native). i18n : **672 clés × FR/EN** (+10).

## 📸🧮👥 v20 — Photos en caisse, multi-TVA & commissions

### Nouveautés
| Écran | Détail |
|---|---|
| 🛒 **Nouvelle vente** | Les **photos produits** arrivent là où on vend : vignette **34 px** dans les résultats de recherche, **30 px** sur chaque ligne du panier (placeholder 📦 si pas de photo — exactement comme avant). Les photos existaient déjà au catalogue et aux fiches ; seul l'écran de vente manquait à l'appel |
| 🛒 **Nouvelle vente (estimation)** | Si la **multi-TVA** est configurée (PC → 🎯 Seuils → carte 🧮) : estimation **« dont TVA n % »** du panier en direct sous le total — même résolution que le serveur (produit → catégorie → taux par défaut), prix TTC, arrondi entier. Vieux serveur ou TVA off : aucune ligne |
| 🧾 **Partage WhatsApp** | Le texte du reçu (v19) porte désormais la ventilation serveur : **« dont HT : 3 559 F » + « dont TVA 18 % : 641 F »** après le TOTAL (clé `tva` additive de `GET /receipts/{id}` ; param absent = texte **identique** à la v19) |
| 📊 **Stats → onglet Vendeurs** | Sous la barre objectifs de chaque vendeur : **💰 « com. 30 000 F »** — commission du mois = CA × taux `commission_pct` (réglé côté PC, clé additive du `/shop` ; 0 ou vieux serveur = masqué) |

### Notes
- **Serveur v2.9** : 8 fichiers — **1 NOUVEAU** `app/Support/Tva.php` (ventilation multi-TVA, 0 migration, 0 route) + `Support/Setting.php` (`commission_pct` 0-50, `tva_config` TEXTS) + `SettingController.php` (règle JSON explicite) + `ShopController.php` (payload additif) + `ReceiptController.php` (ventilation reçu/PDF/ticket) + `AccountingExportController.php` (bloc commissions émis **seulement si pct > 0** + 2 colonnes CSV) + 2 blades (`sale-receipt`, `sale-ticket`, blocs gardés).
- La multi-TVA est une **ventilation de présentation** sur prix TTC (pas un snapshot historique : les anciens reçus re-ventilent avec les taux actuels — assumé et documenté côté PC).
- **Aucune nouvelle dépendance npm** (`Image` natif + helpers maison). i18n : **676 clés × FR/EN** (+4).

## 🧾📦📈 v21 — Devis, étiquettes au stock & rentabilité

### Nouveautés
| Écran | Détail |
|---|---|
| 🛒 **Nouvelle vente → bouton 🧾** | **Devis / proforma 100 % locaux** : le panier devient un brouillon enregistré **sur le téléphone** (fichier JSON local via `expo-file-system/legacy`, cap 50, id `DEV-AAAAMMJJ-###`, validité 7 j, prix 0 nettoyés, quantité 0 → 1) — **0 serveur** : ni le stock ni la caisse ne sont touchés, rien à synchroniser. Modale liste des brouillons → **💬 partage** (texte 42 colonnes : `*DEVIS N°*` gras, articles alignés, TOTAL ESTIMÉ, « Valable jusqu'au … », « document non facturé ») via la fiche système · **↩️ recharger** dans le panier (confirmation si panier non vide, quantités plafonnées au stock actuel) · 🗑 suppression |
| 🏷️ **Produits → rafale étiquettes → « Au stock »** | Nouvelle option de quantité **« 📦 Au stock »** : exactement **1 étiquette par unité en stock** (`min(50, max(1, qte))` par produit, confirmation avec le total annoncé), **une seule connexion Bluetooth** — le réassort du rayon sans compter à la main |
| 📊 **Stats → onglet 💰 Marges** | Bloc **rentabilité 12 mois** (serveur v2.10, clé additive `by_month=1`) : **BarChart** marge en vert + ligne par mois (mois courts dans la langue active) + bouton **📤 CSV** (`rentabilite-12mois-…csv`, BOM / « ; ») partageable via `expo-sharing` — absent si vieux serveur ou < 2 mois de données, zéro erreur |

### Notes
- **Serveur v2.10** : 2 fichiers — `LabelController.php` (param additif `stock_qty=1` : copies = stock borné ≤ 50/produit, plafond planche 300 → 422 ; **sans le paramètre : comportement identique à la v2.9**) + `StatsController.php` (bloc additif `by_month` dans `/stats/margins` : 12 mois glissants, CA net des retours, coût `purchase_price`, même scope boutique — **0 requête** si la clé est absente). **0 migration, 0 route nouvelle.**
- Les **devis sont locaux par design** : un devis n'est pas une vente — pas de table serveur, pas de sync, ils ne quittent le poste que si tu les partages.
- **Aucune nouvelle dépendance npm** (`FileSystem` legacy déjà utilisé par les Stats, `Share` react-native natif). i18n : **699 clés × FR/EN** (+23).

## 🏷️📦🔔 v22 — Promos datées, comptage tournant & relance crédit

### Nouveautés
| Écran | Détail |
|---|---|
| 🏷️ **Catalogue & produits** | **Promos datées** (configurées côté PC, réglage `promo_config`) : quand une promo est active (aujourd'hui ∈ [début, fin]), la carte produit montre le **prix promo + l'ancien prix barré** + 🏷️. Hors période : retour **automatique** au prix normal (clés additives `promo_price`/`promo_until` — vieux serveur : prix normal, rien ne casse) |
| 🛒 **Nouvelle vente** | Le panier prend le **prix promo** à l'ajout (résultats : promo en gras + prix barré) — **jamais pour les clients de gros** : le prix de gros prime toujours. Choix/retrait de client recalcule correctement (`promo_price` transportée dans la ligne) |
| 📦 **Inventaires** | Carte **« Comptage du jour »** (seuil `cycle_count_daily` côté PC, 0 = carte masquée) : N produits à compter aujourd'hui — **rotation déterministe identique au PC**, couvre tout le catalogue → **✏️** crée l'inventaire (param additif `product_ids`) et ouvre **directement** l'écran de comptage |
| 🔔 **Fiche client** | Si reste à payer > 0 + téléphone : bouton **« 🔔 Relancer sur WhatsApp »** → wa.me avec le **message pré-rempli** (nom, montant formaté, boutique, +223 auto) — 1 tap pour envoyer |
| 🧾 **Reçu WhatsApp** | Les lignes au prix promo portent la mention **« 🏷️ PROMO »** (drapeau additif serveur — absent sinon) |

### Notes
- **Serveur v2.11** : 9 fichiers — **1 NOUVEAU** `app/Support/Promo.php` (patron identique à `Tva.php`, 0 migration, 0 route) + `Support/Setting.php` (`promo_config` TEXTS + `cycle_count_daily` 0-50) + `SettingController.php` (règle JSON explicite) + `ProductController.php` (clés additives) + `ReceiptController.php` (prix par défaut promo **détail** + drapeaux sur 4 surfaces) + `InventoryController.php` (`product_ids` additif) + `ShopController.php` (payload additif) + **2 blades** (badge PROMO gardé). `php artisan config:clear && php artisan view:clear` après recopie.
- La mention PROMO est une **présentation du moment** (comme la TVA) : le prix facturé est figé dans chaque ligne, le badge compare au promo actuellement actif.
- **Aucune nouvelle dépendance npm** (utilitaires maison + `Linking` natif). i18n : **707 clés × FR/EN** (+8).

## 📊🧾 v23 — Prévisions fournisseurs & avoirs sur les reçus

### Nouveautés
| Écran | Détail |
|---|---|
| 🛒 **Commandes** | Carte **« 🚛 Prévisions d'achat par fournisseur »** en tête de liste : le rythme de vente des 30 j (net des retours) regroupé **par fournisseur** — 🚛 Sotuba : Savon ×18 (3 j restants)… + badge **« N à commander »** pour **15 jours de couverture** (tri par total desc, repli « Sans fournisseur »). Clé additive `by_supplier=1` sur la route existante — vieux serveur : carte **masquée**, écran intact. Le fetch est silencieux : même hors ligne, la liste des bons s'affiche |
| 🧾 **Reçu WhatsApp** | En cas de retour partiel : ligne **« ↩ N retourné(s) »** sous l'article concerné + récap **« Avoir (retours) : − X F » / « TOTAL NET : Y F »** après le TOTAL — aligné sur le ticket thermique PC et le PDF 80 mm. Sans retour : **texte identique à la v22** |

### Notes
- **Serveur v2.12** : 2 fichiers — `ProductController.php` (param **additif** `by_supplier=1` dans `restockForecast` : 1 requête `with('supplier')` sur les seuls produits à commander, `suppliers:[{name, lines, total_qty}]` tri desc — **0 requête fournisseur** sans le paramètre) + `resources/views/pdf/sale-ticket.blade.php` (ligne ↩ gardée + Σ avoir en `@php` + bloc **AVOIR / TOTAL NET** gardés). **0 migration, 0 route nouvelle.** `php artisan config:clear && php artisan view:clear` après recopie.
- Le montant d'avoir = Σ (`refunded_qty` × prix ligne), déjà en base — aucune nouvelle colonne.
- **Aucune nouvelle dépendance npm**. i18n : **714 clés × FR/EN** (+7 : prévisions ×4, reçu ×3).

## 📥💳 v24 — Import CSV en masse & échéancier crédit

### Nouveautés
| Écran | Détail |
|---|---|
| 📦 **Produits → bouton 📥** | **Import CSV en masse** : colle ton tableau (Excel/bloc-notes — en-têtes `Nom;SKU;Prix achat;Prix vente;Quantité;…`, le fichier « Export produits » du serveur se réimporte tel quel) → **aperçu temps réel** (lignes valides / erreurs numérotées) → **Importer** → rapport `✅ N créé(s) · M mis à jour · E erreur(s)`. Rapprochement par **SKU** : trouvé = mise à jour des données commerciales (**quantité jamais touchée**), absent = création (stock initial + mouvement). Case « créer les catégories/fournisseurs inconnus » (défaut ON). Mobile = **collage uniquement** (aucune nouvelle dépendance de sélecteur de fichier) |
| 👥 **Fiche client → carte 💳 Échéancier** | **Dates de paiement planifiées** : raccourcis **+7/+15/+30 j** ou date AAAA-MM-JJ, suppression ✕. Sauvegarde via `payment_plan` **additif** (PUT partiel, le nom n'est plus exigé) — vieux serveur : **carte masquée**. Rappel auto **J−1** côté serveur (section email patron quotidien) + notif PC du matin (interrupteur OFF par défaut) |
| 👥 **Liste clients** | Badge coloré à côté du solde : **🟢 « 📅 dans N j » · 🟠 « aujourd'hui/demain » · 🔴 « N j de retard »** — client **soldé → badge masqué**. Clés additives `next_payment_date`/`days_until` : absentes = rien affiché |

### Notes
- **Serveur v2.13** : 8 fichiers — `routes/api.php` (**1 route** `POST /products/import`, placée avant apiResource) + `ProductController.php` (validation **ligne par ligne** = règles du formulaire unitaire, ≤ 300 lignes, une erreur n'empêche pas les autres, rapport par ligne fichier) + `Support/Setting.php` (`credit_schedule` JSON, **0 migration**) + `SettingController.php` (règle JSON explicite) + `CustomerController.php` (clés additives + `payment_plan` trié/dédoublonné/[] = effacer) + `CreditsRemindEmail.php` + `CreditReminderMail.php` + `emails/credit_reminder.blade.php` (section **📅 Rappels planifiés** : échéances demain ou dépassées, reste dû réel, envoyée même sans crédit ancien). `php artisan config:clear && php artisan route:clear && php artisan view:clear` après recopie.
- **Aucune nouvelle dépendance npm** (parseur maison partagé PC/mobile, `Modal`/`TextInput` natifs). i18n : **734 clés × FR/EN** (+20).

## 👤🇬 v25 — Compte client dans l'app & connexion Google

### Nouveautés
| Écran | Détail |
|---|---|
| 🔐 **Connexion** | Le **client** se connecte avec l'**email + mot de passe** reçus après l'achat (portail, email ou WhatsApp) : le serveur renvoie son **abonnement** et l'app bascule sur l'écran « 👤 Mon abonnement ». **Abonnement expiré → 403** avec message + lien du portail de renouvellement. Le **personnel** (admin / manager / employee) garde l'accès caisse habituel, sans abonnement |
| 👤 **Mon abonnement** (nouvel écran client) | Badge d'état **🟢 actif · 🟠 expire dans ≤ 7 j · 🟠 grâce (+3 j) · 🔴 bloqué · ⚫ révoqué**, plan + date de fin + **jours restants**, bannières grâce/blocage, bouton **« 🔄 Renouveler »** → portail `/compte` du site (navigateur), **actualisation** (à l'ouverture + tirer-pour-rafraîchir, via `GET /me`), **déconnexion** avec confirmation |
| 🔐 **Connexion → « 🔵 Continuer avec Google »** | Ouvre le **navigateur** sur `/auth/google/app` (page Google du site) → après validation Google, un **code `XXXX-XXXX`** s'affiche (valide **5 minutes**, **usage unique**) → colle-le dans le champ de l'app → session Sanctum identique (échange `POST /auth/google/exchange`, abonnement re-vérifié). **Sans `GOOGLE_CLIENT_ID` côté serveur, le bouton est masqué** |
| 🛠️ **Admin → onglet 👤 Abonnements** | Abonnements clients (plan mis en avant, **plus aucune clé de licence affichée**). **Valider une commande** = compte **créé** (mot de passe affiché **1×** → bouton **📤 Partager** : message WhatsApp avec portail + email + mot de passe + plan + fin) ou **prolongé** (renouvellement même email). Bouton **🔑↻** = **réinitialiser le mot de passe** client (nouveau mot de passe affiché 1× → partage). Conflit « email déjà pris par un compte personnel » signalé proprement |

### Notes
- **Serveur v2.14 requis** : `login` / `me` renvoient `subscription` pour les comptes clients (vieux serveur = connexion personnel normale, pas d'écran abonnement). Côté serveur : **14 fichiers nouveaux, ~15 modifiés, 3 supprimés** (portail `/compte`, mails compte client, vérificateur Google, clé de licence retirée de l'admin) — liste complète dans le README PC (v2.14). Après recopie : `php artisan config:clear && php artisan route:clear && php artisan view:clear` (`queue:restart` si files d'attente).
- **Optionnel** : `.env` → `GOOGLE_CLIENT_ID=` (Client ID **Web** Google Cloud, origine JavaScript autorisée = domaine du site). Sans lui : boutons Google masqués partout, tout le reste fonctionne.
- **Aucune nouvelle dépendance npm** (navigateur via `Linking` + champ code natif — délibérément **sans** schéma deep-link : le code universel marche aussi sur Expo Go). i18n : **770 clés × FR/EN** (+36).

## ⬆️ v2.15 (serveur) — Backend sous Laravel 13 — aucun changement côté app

Le serveur passe à **Laravel 13** (exige **PHP 8.3+**) : audit complet fait, **0 ligne de code modifiée**, l'API reste identique (Sanctum ^4 et dompdf ^3 supportent officiellement Laravel 13). **Côté app : rien à recopier.** Marche à suivre serveur : `stock-api/README.md` → « ⬆️ Mettre à jour une installation existante (Laravel 11/12 → 13) ».
