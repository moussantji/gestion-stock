# 🖥 StockFlow PC — App de bureau (Electron) · **v2.14 — Comptes clients 👤 (fini les clés) & connexion Google 🇬**

La version **caisse/bureau** de StockFlow : **les 20 écrans du mobile**, transposés au PC avec le même design sombre premium (sidebar = tab bar du téléphone, cartes, badges, graphes SVG), branchée sur **le même backend Laravel** que le site et l'app mobile. Mêmes identifiants, mêmes rôles, mêmes données.

> **v1.1** ajoute les 11 modules qui manquaient à la v1.0 : le PC fait désormais **tout ce que fait le mobile.**

```
🧭 VENDRE          📦 STOCK            🛒 ACHATS         💰 PILOTAGE        ⚙️ CONFIG
🏠 Accueil          📦 Produits+🏷️      🚛 Fournisseurs   💵 Caisse           🏷️ Catégories
🧾 Nouvelle vente   🔄 Mouvements       🛒 Commandes      📊 Statistiques     🧑‍🤝‍🧑 Utilisateurs
📜 Reçus & avoirs   🚚 Transferts                                            🏬 Boutiques
👥 Clients          📋 Inventaires                                           🎯 Seuils & fidélité
🔁 Abonnements      🔔 Alertes                                               ⚙️ Réglages
```

## ✨ Nouveautés v1.1 (les 11 modules de la parité)

| Module | Ce que fait le PC |
|---|---|
| 📜 **Reçus & avoirs** | Historique paginé, détail reçu (lignes, client, vendeur), **ticket 80mm & PDF A5**, ↩️ **avoir total ou partiel** (choix des articles, `refund_cash` → sortie caisse tracée), 💳 **versements** sur crédit, onglet **Crédits** avec encours total |
| 🚚 **Transferts** | Envoi siège ⇆ boutiques (multi-lignes, plafond = stock source), badge **En transit 🚚 / Reçu ✓ / Annulé ↩️**, **réception validée** par la destination, **annulation** par la source — mêmes permissions v14 que le mobile (admin, ou manager de l'emplacement) |
| 🚛 **Fournisseurs** | Carnet d'adresses CRUD, compteur de produits, suppression protégée (admin/manager, 0 produit) |
| 🛒 **Commandes** | ✨ Génération auto depuis les prévisions de rupture, brouillon avec **quantités modifiables**, ✉️ envoi, 📥 **réception partielle** ligne par ligne (« Tout remplir »), 📄 PDF du bon, annulation |
| 📋 **Inventaires** | Création → comptage (édition ligne par ligne **ou recherche produit**) → ✅ clôture = **ajustement automatique du stock** (résumé `Δ` affiché), lecture seule une fois validé |
| 📊 **Statistiques** | Périodes 7/30/90 j + tout · CA, reçus, articles, panier moyen · **top produits / vendeurs / catégories** (barres) · 💰 **marges** (CA, coût, marge, taux + détail produit) · in/out/vendus par produit · **exports 📊 Excel + CSV** |
| 🔁 **Abonnements** | Ventes récurrentes hebdo/mensuelles, création avec panier & total en direct, ▶️ lancement immédiat, ⏸ pause/reprise, suppression |
| 🧑‍🤝‍🧑 **Utilisateurs** | Comptes admin/gestionnaire/employé + 🏬 boutique de rattachement (admin) |
| 🏬 **Boutiques** | CRUD points de vente = emplacements de stock, activation/désactivation (admin) |
| 🏷️ **Catégories** | CRUD + compteur de produits, suppression protégée |
| 🎯 **Seuils & fidélité** | Les 5 réglages boutique (segments, rappel crédit, 🎁 points) avec bornes min–max + **upload du logo** boutique (admin) |
| 🏷️ **Étiquettes A4** | *(bonus, intégré à Produits)* sélection multi (max 60), exemplaires × par ligne → planche PDF prête à coller — encore plus simple qu'au mobile grâce à l'impression PC |

## 🆕 v1.3 — 📄 Rapport patron PDF · 🖨 Z thermique · 🏬 Point de vente au login

### 📄 Rapport d'activité « patron » (vrai PDF A4)

Bouton **📄 Rapport patron** dans *Statistiques* : récupère les données de la période choisie (7/30/90 j ou tout) et génère un **vrai fichier PDF A4** léger et imprimable, enregistré via la boîte d'enregistrement native (Electron `printToPDF` — **zéro changement backend**, le logo de la boutique apparaît même en en-tête) :

- Bandeau dégradé + logo + point de vente + généré par qui/quand
- ① Synthèse (CA, reçus, articles, panier moyen, coût, marge, taux)
- ② Top 10 produits (avec barres) · ③ Vendeurs · ④ Catégories · ⑤ Marges par produit
- Pied de page indicatif (marges = prix d'achat actuels)

### 🖨 Z de caisse directement sur la thermique

- Après chaque clôture, une fenêtre propose **🖨 Z thermique** *et* 📄 PDF A5
- La nouvelle section **🔒 Historique des Z** (30 derniers, avec montants) permet de **réimprimer n'importe quel Z** en thermique ou PDF
- Ticket Z 80 mm : en-tête boutique (double taille), date, point de vente, caissier, ventes encaissées, apports, dépenses, **solde cumulé en gras**, note éventuelle, ligne de **signature**, coupe partielle

### 🏬 Sélecteur de boutique au login (tablette de caisse)

Un poste PC peut désormais être **rattaché à une boutique** dès le login (admin/gestionnaire non déjà rattaché) : écran de choix entre 🏠 Siège et les boutiques actives, avec case **« Mémoriser sur ce poste »**.

- Le choix est envoyé via l'en-tête **`X-Shop-Id`** sur chaque requête → listes filtrées ET **créations taggées à la boutique** (ventes, mouvements, Z de caisse, réceptions…)
- Les employés rattachés gardent leur boutique habituelle (rien ne change pour eux)
- ⚠️ **Backend : recopier `stock-api/app/Support/ShopScope.php`** (aucune migration, aucune autre modif — le patron côté serveur accepte le header pour `admin`/`manager`, tout le reste est strictement identique à v14)
- Modifiable ensuite dans ⚙️ Réglages → Session (« Changer de point de vente »)

> 💡 Cas d'usage : la boutique Kalaban a une tablette en caisse — l'admin se connecte avec SON compte, choisit « Kalaban », et toutes les ventes/Z de ce poste sont comptabilisées boutique Kalaban.

## 🆕 v1.4 — 🤖 Automatisations : ticket auto & rapport patron auto

Deux interrupteurs dans **⚙️ Réglages → 🤖 Automatisations** (OFF par défaut, préférences locales au poste, **zéro changement backend**) :

### 🖨 Ticket auto après chaque vente
- Dès qu'une vente **en ligne** est validée, le ticket 80 mm s'imprime **tout seul** — aucun bouton, aucune boîte de dialogue
- Utilise le canal configuré (réseau ESC/POS ou système silencieuse) ; si l'imprimante n'est pas configurée, un toast l'explique ; si l'impression échoue, **la vente n'est jamais bloquée** (toast d'erreur simple)
- Les ventes faites **hors ligne** (en file d'attente) ne sont pas imprimées — elles le seront manuellement depuis 📜 Reçus après synchronisation
- Le bouton 🖨 manuel reste disponible à tout moment (reçu, historique)

### 📄 Rapport patron PDF auto à la clôture
- À chaque **Z de caisse**, le rapport patron des 30 derniers jours est généré et enregistré **sans aucune boîte de dialogue** → `Documents/StockFlow/Rapports/rapport-stockflow-AAAA-MM-JJ.pdf`
- 1 fichier par jour, **remplacé silencieusement** si tu re-clôtures le même jour ; le toast confirme avec le chemin complet
- La fenêtre d'actions du Z (🖨 thermique / 📄 PDF) s'affiche comme avant — le rapport auto tourne en arrière-plan

### 🐞 Correctif de fond inclus (v1.2/v1.3)
Les modules déclarés en `const` ne sont **pas** des propriétés de `window` (règle ES2015) : en vrai Electron, `window.Thermal` valait `undefined` → **les boutons thermiques ne s'affichaient jamais** (les tests headless ne le voyaient pas). v1.4 attache explicitement `window.Thermal / OfflineSales / StatReport / Auto` — le 🖨 des reçus, le Z thermique, le chip hors ligne et les automatisations fonctionnent désormais réellement.

## 🆕 v1.5 — 🖨 Z thermique auto à la clôture & ⚡ badge du jour EN DIRECT

### 🖨 Z de caisse auto (3ᵉ interrupteur 🤖)
Le troisième toggle des **⚙️ Réglages → Automatisations** : à chaque **clôture**, le Z s'imprime **tout seul** sur la thermique configurée — le patron part avec le papier en main, sans toucher la fenêtre d'actions (qui reste dispo pour une réimpression). Comme les autres automatisations : jamais bloquant, toasts explicites, OFF par défaut.

### ⚡ Badge du jour EN DIRECT (dashboard)
Pour **admin/gestionnaire**, une carte dégradée en haut du tableau de bord affiche le **CA encaissé du jour** (`/cash-ops/summary`), rafraîchi **toutes les 30 s** automatiquement :

- Point 🟢 pulsant « EN DIRECT » + heure de dernière actualisation
- **Flash vert + « +X F 🎉 »** pendant 6 s quand une nouvelle vente tombe — la caisse qui vit sous les yeux
- Repli silencieux : employé (route 403) ou réseau coupé → pas de casse, juste pas de badge
- Timer auto-nettoyant : il s'arrête dès qu'on quitte le dashboard (`isConnected`), zéro fuite

## 🆕 v1.6 — 🧾 Export comptable mensuel · 🖼 logo thermique · 📦 alertes live

### 🧾 Export comptable mensuel (pour le comptable)
Nouvelle carte dans **Statistiques** : choisis le mois → télécharge les **3 CSV du mois** (séparateur « ; » + BOM, Excel les ouvre parfaitement) :

| Fichier | Contenu |
|---|---|
| `ventes-AAAA-MM.csv` | 1 ligne par reçu : date, n°, client, vendeur, **boutique**, nb articles, total, remise points, payé, reste, statut (Soldé/Avoir) |
| `caisse-AAAA-MM.csv` | Opérations hors ventes : date, entrée/sortie, catégorie, montant, motif, utilisateur, boutique |
| `z-caisse-AAAA-MM.csv` | Clôtures : date, ventes encaissées, apports, dépenses, solde cumulé, caissier, boutique, notes |

Bouton **📦 Tout exporter** = les 3 d'un coup. Filtrés par `ShopScope` : un poste rattaché à une boutique n'exporte que SA boutique. ⚠️ **Backend : 4 fichiers à recopier** (1 nouveau contrôleur + relation `shop()` ajoutée dans 2 modèles + 1 route — aucune migration, lecture seule).

### 🖼 Logo boutique sur le ticket thermique (ESC/POS raster)
Le logo uploadé (🎯 Seuils & fidélité) s'imprime désormais **en tête du ticket ET du Z**, en noir & blanc, centré, réduit à 240 points de large :

- Mode **réseau** : image rasterisée en bitmap `GS v 0` (canvas du renderer → data URL → RGBA → bits MSB-first)
- Mode **système** : `<img>` en tête du HTML 80 mm
- **Jamais bloquant** : logo absent, téléchargement impossible, image illisible → ticket texte classique (zéro régression)
- Checkbox 🖼 dans Réglages → Impression thermique pour le désactiver

### 📦 Alertes stock sur le badge EN DIRECT
Le badge du dashboard affiche maintenant un **chip 📦 « X en alerte »** (stock bas + ruptures, rafraîchi avec le CA), **cliquable** → ouvre directement l'écran Alertes. Masqué quand tout va bien.

## 🆕 v1.7 — 📄 Récap mensuel PDF · 🔔 notifications bureau · 🔫 scan douchette inventaires

### 📄 Récap mensuel comptable en PDF
En complément des 3 CSV (v1.6), un bouton **📄 Récap PDF** dans la carte *Export comptable* génère un **A4 synthétique du mois** (données = nouvelle route `GET /accounting/summary`) :

- Bandeau boutique + mois en toutes lettres (« Juillet 2026 »)
- KPI : CA du mois, reçus, encaissé, **reste à encaisser**, apports, dépenses, **solde fin de mois**, nb de clôtures, remises points, avoirs, opérations de caisse
- **Journal des clôtures (Z)** tableau jour par jour + ligne TOTAL
- Enregistré via la boîte native (`recapitulatif-AAAA-MM.pdf`) — le comptable garde l'essentiel sur une page

### 🔔 Alertes stock en notification bureau
4ᵉ interrupteur des **⚙️ Réglages → Automatisations** : quand des produits passent en alerte (bas/rupture), le poste affiche une **notification native Windows/macOS** (cliquable → écran Alertes). Anti-spam intégré : notifie **uniquement quand le compteur augmente** (niveau mémorisé, badge alertes désormais rafraîchi toutes les 45 s en même temps). Bouton 🔔 *Tester* inclus. 🐞 Au passage : `window.Api` est désormais attaché (même famille de bug que v1.4 — le notifier aurait été muet sinon).

### 🔫 Scan douchette dans les inventaires
Dans un inventaire en cours, la **douchette code-barres fonctionne comme en caisse** : scan (Entrée) → correspondance exacte code-barres/SKU (ou produit unique trouvé) → la ligne de comptage s'ouvre **avec le curseur déjà dans la quantité** — tu scannes, tu tapes le compté, tu valides. Enchaîne les allées sans toucher la souris.

## 🆕 v1.8 — 🧾 compteur live (avec fix !) · 📅 récap auto du 1er · 🔊 bip de scan

### 🧾 Nombre de ventes dans le badge EN DIRECT
Le badge du dashboard affiche maintenant **🧾 N vente(s) aujourd'hui** sous le CA (nouveau champ `sales_count_today`, hors avoirs, filtré boutique). 🐞 **Fix de fond au passage** : le CA live lisait `sales_today` alors que l'API renvoie `sales_collected_today` — le badge affichait **0 F** sur un vrai serveur depuis la v1.5 (et la carte « ventes du jour » de l'écran Caisse aussi). Lecture désormais tolérante aux deux clés (`sales_collected_today` d'abord) → montants réels immédiats.

### 📅 Récap comptable auto le 1er du mois
5ᵉ interrupteur 🤖 : au changement de mois (le 1er, **ou le premier démarrage qui suit** — PC éteint ? pas grave), le **récap PDF du mois écoulé** est enregistré tout seul dans `Documents/StockFlow/Rapports/recapitulatif-AAAA-MM.pdf`, sans aucune boîte de dialogue. Anti-doublon (mois marqué), bascule d'année gérée (déc → janv exporte décembre), panne API → réessaie au cycle suivant.

### 🔊 Bip sonore au scan réussi
6ᵉ interrupteur 🤖 : le petit **bip de caisse** (880 Hz → 1320 Hz, Web Audio — zéro ressource, marche hors ligne) quand la douchette trouve le produit — sur l'écran vente **et** dans les inventaires. Vendeur rassuré sans regarder l'écran.

## 🆕 v2.14 — 👤 COMPTES CLIENTS partout : fini les clés de licence (portail + apps + Google)

Révolution commerciale : **la clé de licence SF-XXXX disparaît du produit** — le client achète sur le site, reçoit **email + mot de passe** et suit tout depuis **son compte**. Le même identifiant ouvre **l'app mobile ET l'app PC** pour « profiter de sa licence », et un bouton **« Continuer avec Google »** coiffe le tout.

### 🌐 Le portail client sur ton site (`/compte`)
- **Création automatique à la validation du paiement** (admin web ou mobile) : compte `role=client` (**0 migration**, lien par email), mot de passe lisible `xxxxx-xxxxx` envoyé **par email** et affiché **1 seule fois** pour le partage WhatsApp.
- **Renouvellement même email = prolongation automatique** (base = max(maintenant, fin actuelle)) — jamais de 2ᵉ mot de passe, email « 🔁 prolongé » envoyé.
- **Tableau de bord client** : badge d'état vivant — 🟢 **Actif J-x** · 🟠 **Expire bientôt** (≤ 7 j) · 🟠 **Grâce** (3 j) · 🔴 **Expiré — bloqué** · ⚫ **Révoqué** — + formules (bouton 🔄 pré-rempli : commande en 2 clics) + commandes & reçus PDF.
- `/verifier-licence` (l'ancienne page de clé) **redirige vers la connexion** ; emails (livraison, rappel J-7/J-3/J-1, reçu PDF) reformulés **sans clé** ; admin web : colonnes et chips **état abonnement** à la place de la clé (révoquées = statut seul).

### 📱🖥 L'email = login de l'app mobile ET du PC
- `POST /api/login` : un client reçoit son **abonnement** dans la réponse ; **expiré après grâce → 403 « Renouvelez sur /compte »** ; avertissements grâce/J-7 affichés dans l'app.
- **Mobile v25** : compte client → écran **« 👤 Mon abonnement »** dédié (badge d'état, renouvellement → portail, déconnexion), hors des écrans de caisse. **PC v2.14** : même écran dédié au démarrage.
- **Admin mobile** : onglet **👤 Abonnements** (plus de clé affichée), validation de commande = **compte créé / prolongé** avec partage WhatsApp des identifiants, bouton **🔑↻ régénère le mot de passe** d'un client (nouveau partageable + email auto).

### 🇬 « Continuer avec Google » — 0 dépendance, 0 migration
- **Portail** : bouton GIS officiel sur `/compte/connexion` (visible **seulement si `GOOGLE_CLIENT_ID`** est configuré — nouveau `config/google.php`).
- **Apps mobile/PC** : bouton → **navigateur système** (`/auth/google/app`) → choix du compte Google officiel → **code `XXXX-XXXX` affiché (5 min, usage unique, cache fichier — 0 migration)** → collé dans l'app → `POST /api/auth/google/exchange` → session Sanctum. Vérification du jeton par `GoogleTokenVerifier` (`tokeninfo` Google + audience + email vérifié) — **aucune librairie ajoutée**.
- Sécurité cohérente : Google n'ouvre que les comptes **clients existants**, avec le **même blocage** abonnement expiré.

> ⚠️ **À configurer pour Google** : crée un *Client ID Web* (console Google Cloud, origine = ton domaine) → `GOOGLE_CLIENT_ID=…` dans le `.env`. Sans lui, les boutons Google se masquent et email/mot de passe suffit.
> 🔒 Limite assumée : les comptes **staff** de la boutique (créés par le client) conservent l'accès opérationnel ; c'est le compte **propriétaire** (payeur) qui est verrouillé en cas d'impayé.

## 🆕 v2.15 — ⬆️ serveur sous **Laravel 13** (apps inchangées)

> **Côté PC & mobile : rien à faire, rien à recopier.** Cette version touche uniquement le **serveur**.

Le backend passe de Laravel 11 (fin de support mars 2026) à **Laravel 13** (dernière version, supportée jusqu'en 2028, exige **PHP 8.3+**). L'audit complet du code est fait : **0 ligne à modifier** — chaque point cassant du guide officiel a été vérifié (CSRF renommé, Carbon 3, règle `image`, cache, préfixes cookies… voir le tableau dans `stock-api/README.md`).

**Sur le serveur :** édite `composer.json` (`laravel/framework` → `^13.0`, `tinker` → `^3.0`, `phpunit` → `^12.0` — **Sanctum ^4 et dompdf ^3 inchangés**, juste `composer update --with-all-dependencies`), puis `php artisan config:clear && route:clear && view:clear` (+ `queue:restart` si files d'attente). Effet visible : les sessions du site sont relâchées **une fois** (reconnexion), les tokens des apps restent valides.

📋 Marche à suivre détaillée : **`stock-api/README.md` → « ⬆️ Mettre à jour une installation existante »**.

## 🆕 v2.13 — 📥 import CSV produits en masse · 💳 échéancier de rappels crédit

### 📥 Import CSV en masse : ta liste Excel → tout le catalogue en 1 clic
Créer 200 produits à la main, personne ne le fait — du coup le catalogue reste vide et StockFlow ne sert pas. Nouveau bouton **« 📥 Importer »** sur l'écran Produits (PC **et** mobile) :

1. **Choisis le fichier** (PC) ou **colle le tableau** (PC & mobile — directement depuis Excel/Notes) ;
2. l'**aperçu temps réel** montre les lignes valides et les erreurs (numéros de lignes = lignes du fichier) ;
3. **Importer** → le serveur crée/met à jour et répond un **rapport précis** : `✅ 43 créé(s) · 12 mis à jour · 2 erreur(s)` — chaque erreur avec sa ligne et sa cause.

Ce qu'il faut savoir :
- **Format** : le **fichier « Export produits » de StockFlow se réimporte tel quel** (séparateur « ; », BOM Excel, colonnes ID/Valeur stock ignorées) ; CSV Excel « ; » ou « , », champs « entre guillemets », montants « 1 500 F » / « 1500 FCFA » — tout passe. En-têtes FR ou EN (Nom/name, SKU, Prix achat, Prix vente, Quantité, Seuil alerte, Catégorie, Fournisseur, Prix gros, Code-barres). Il faut au minimum **Nom** et **SKU**.
- **Rapprochement par SKU** (insensible à la casse) : trouvé → **mise à jour** (nom, prix, catégorie, fournisseur, code-barres, seuil) ; absent → **création** (avec mouvement de stock initial « Import CSV »).
- ⚠️ **La quantité n'est appliquée qu'aux créations** — jamais aux mises à jour : ton stock réel ne bouge que par mouvements (cohérence d'historique).
- Catégories/fournisseurs **par nom** : inconnus → **créés si la case est cochée** (défaut), sinon ligne signalée en erreur. Une ligne invalide **n'empêche jamais** les autres.
- Serveur : **1 route nouvelle** `POST /products/import` (validation ligne par ligne = mêmes règles que le formulaire, ≤ 300 lignes), **0 migration**. Mobile : collage uniquement (pas de sélecteur de fichier sans nouvelle dépendance — choix assumé).

### 💳 Échéancier de rappels crédit : « Awa paiera le 25 » — l'app s'en souvient à ta place
La relance crédit (v2.11) partait quand *toi* tu y pensais. Désormais chaque client a ses **dates de paiement planifiées** :

- **Fiche client** (PC & mobile) : carte **« 💳 Échéancier »** — ajoute des dates (sélecteur de date PC, raccourcis **+7/+15/+30 j** ou AAAA-MM-JJ mobile), retire-les en 1 clic (✕). Réglage **`credit_schedule`** (JSON clé/valeur, **0 migration, 0 route nouvelle** — paramètre **additif** `payment_plan` sur le `PUT /customers/{id}` existant, envoi sans le nom possible).
- **Liste des clients** : badge coloré à côté du solde — 🟢 **« 📅 dans 15 j »**, 🟠 **« aujourd'hui »/« demain »**, 🔴 **« 3 j de retard »**. Client soldé → badge masqué (on ne relance pas qui ne doit plus).
- **Rappel automatique à J−1** : ① l'**email patron quotidien** (v2.2) gagne une section **« 📅 Rappels planifiés »** — échéances **demain** ou **dépassées** avec le reste dû (retards d'abord ; envoyée même sans crédit ancien ; un client soldé entre-temps n'y figure pas) ; ② **13ᵉ interrupteur** « Échéances crédit du matin » (Réglages, **OFF par défaut**) : notification native au 1er démarrage si des échéances arrivent (≤ demain), 1×/jour, marqueur non avancé sur panne réseau.
- **Clés additives** sur `GET /customers` (`payment_dates`, `next_payment_date`, `days_until`) : vieux serveur → badges et carte **masqués**, écrans intacts.

**8 fichiers serveur** (`routes/api.php` **[1 route]**, `ProductController.php`, `Setting.php`, `SettingController.php`, `CustomerController.php`, `CreditsRemindEmail.php`, `CreditReminderMail.php`, `emails/credit_reminder.blade.php`) · **0 migration** · mobile v24 (`csvImport.js`, `ProductsScreen`, `CustomerDetailScreen`, `CustomersScreen`, traductions 734).

## 🆕 v2.12 — 📊 prévisions d'achat par fournisseur · 🧾 avoirs sur les reçus

### 📊 Prévisions d'achat par fournisseur : « commande X paquets chez Y pour 15 j de stock »
L'écran **Prévisions** (v2.8) répondait déjà à « quoi racheter » ; il ne disait pas **chez qui**. Nouvelle carte **« 🚛 Prévisions d'achat par fournisseur »** en tête de l'écran **Commandes** (PC **et** mobile) : le rythme de vente des 30 derniers jours (net des retours) est regroupé **par fournisseur** — 🚛 Sotuba : Savon ×18 (3 j restants), Riz ×7 (11 j)… avec le **total à commander** pour couvrir **15 jours de stock**. Seuls les articles à commander (`suggested_order > 0`) apparaissent, fournisseurs triés par quantité totale décroissante, repli **« Sans fournisseur »** pour le catalogue non rattaché. Côté serveur : **paramètre additif `by_supplier=1`** sur la route **existante** `GET /products/restock-forecast` (**0 migration, 0 route**) — sans le paramètre, **0 requête fournisseur**, réponse identique à avant. Clé `suppliers` additive : vieux serveur → carte simplement **masquée**. La génération de bons par **seuil bas** (v1.x) reste disponible ; ceci la complète par le **rythme réel** de vente.

### 🧾 Avoirs partiels sur TOUTES les surfaces de reçu : « ↩ N retourné(s) » + TOTAL NET
Quand on rembourse 1 article sur 3, le client doit le **voir** sur son reçu. En l'état : le détail reçu PC (👁) et le PDF A5 montraient déjà les retours — les **vrais trous** étaient le **ticket 80 mm** (blade serveur), le **ticket thermique PC** (ESC/POS + HTML) et le **reçu WhatsApp mobile**. Désormais chaque surface affiche, **seulement s'il y a un retour** :

| Ligne | Rendu |
|---|---|
| Sous l'article concerné | `↩ N retourné(s) remboursé(s)` (rouge sur imprimé, `<- N retourne(s)` en ESC/POS ASCII) |
| Récap après le TOTAL | **Avoir (retours) : − X F** puis **TOTAL NET : Y F** (rouge sur imprimé) |

Montant d'avoir = Σ (`refunded_qty` × prix ligne) — déjà stocké en base (`receipt_items.refunded_qty`, **0 migration**). Sans aucun retour : **byte-identique à avant**, gardé `@if` côté blade, ternaire côté JS. Le ticket thermique reste en ASCII (accents simplifiés) comme toujours ; le PDF 80 mm garde tous les accents.

**2 fichiers serveur** (`ProductController.php`, `sale-ticket.blade.php`) · **0 migration, 0 route nouvelle** · mobile v23 (`receiptText.js`, `PurchaseOrdersScreen.js`, traductions 714).

## 🆕 v2.11 — 🏷️ prix promo datés · 📦 inventaire tournant · 🔔 relance crédit WhatsApp

### 🏷️ Prix promo datés : prix barré partout, retour auto au prix normal
Le marchand veut « −200 F sur le savon jusqu'à fin juillet » — sans y repenser le 1er août. Nouvelle carte **« 🏷️ Promos datées »** dans 🎯 Seuils : produit (datalist catalogue) + prix promo + dates début/fin, stocké en JSON dans le réglage texte **`promo_config`** (**0 migration, 0 route** — nouveau `Support/Promo.php`, même patron que `Tva.php`). Une promo est **active quand aujourd'hui ∈ [début, fin]** — hors période, le prix normal revient **tout seul, partout**. Règle d'or : **jamais pour les clients de gros** (le prix de gros prime toujours).

| Surface | Rendu quand la promo est active |
|---|---|
| 🖥 Produits PC & catalogue mobile | prix promo + **ancien prix barré** + badge 🏷️ (clés additives `promo_price`/`promo_until` — vieux serveur : prix normal, rien ne casse) |
| 🛒 Caisse PC & vente mobile | la ligne du panier prend le **prix promo** (détail) ; choisir/retirer un client recalcule correctement |
| 🖨 Ticket thermique PC | `*PROMO*` sur la ligne (ESC/POS) · `[PROMO]` en HTML 80 mm |
| 🧾 PDF serveur (reçu A5 + ticket, blades gardés) | badge orange **PROMO** |
| 👁 Détail reçu PC & 🧾 partage WhatsApp mobile | mention 🏷️ PROMO sur la ligne |

⚠️ **Limite assumée** (comme la TVA v2.9) : la mention PROMO est une **présentation du moment** — le prix facturé est figé dans chaque ligne, le badge compare au promo *actuellement* actif ; un vieux reçu consulté après la fin de la promo n'affiche plus le badge.

### 📦 Inventaire tournant guidé : N produits à compter chaque jour
Le grand inventaire annuel, tout le monde le repousse. Nouveau seuil **« 📦 Inventaire tournant (produits/jour) »** (réglage numérique, 0 migration, **0 = désactivé**) : dès qu'il est > 0, l'écran Inventaires (PC **et** mobile) affiche la carte **« Comptage du jour »**. La **rotation déterministe** (identique sur tous les appareils : tri par id, `start = (jour × N) mod total`) couvre tout le catalogue en ⌈total/N⌉ jours, puis reboucle. Clic **✏️ « Créer l'inventaire du jour »** → inventaire créé **avec ces seuls produits** (paramètre **additif** `product_ids` sur la route existante — absent = tout le catalogue, exactement comme avant) → l'écran de **comptage s'ouvre directement**.

### 🔔 Relance crédit WhatsApp : « il vous reste X F » envoyé en 1 tap
La fiche client avait déjà un bouton WhatsApp générique. Désormais, si le client a **un reste à payer > 0 ET un téléphone** : bouton **« 🔔 Relancer sur WhatsApp »** → wa.me avec le **message pré-rempli** (nom, reste à payer formaté, boutique) — tu n'as plus qu'à envoyer. Numéro **normalisé Mali** (8 chiffres → préfixe 223, `00223` géré). PC : ouverture système via `shell.openExternal` (déjà en place). **0 fichier serveur** pour cette piste.

## 🆕 v2.10 — 🧾 devis / proforma locaux · 📦 étiquettes au stock réel · 📊 rentabilité 12 mois

### 🧾 Devis / proforma : du panier au devis en 1 clic — 100 % local, 0 serveur
Le client hésite et demande « c'est combien pour tout ça ? » : avant, rien à lui remettre sans valider la vente. Désormais, bouton **« 🧾 Devis »** à côté de **Valider** en caisse : le panier devient un **brouillon enregistré sur le poste** — jamais sur le serveur, car un devis n'est **pas une vente** : il ne touche ni le stock ni la caisse, et il n'y a rien à synchroniser (règle zéro régression respectée). Cap 50 brouillons, id `DEV-AAAAMMJJ-###`, validité **+7 jours**, prix à 0 nettoyés, quantités 0 → 1. Trois surfaces au choix depuis la modale, et **rechargement en 1 clic** (panier non vide → confirmation, quantités plafonnées au stock actuel, client restauré, articles disparus signalés) :

| Surface | Rendu |
|---|---|
| 📄 **PDF A5 maison** | `devis-DEV-….pdf` — bandeau violet, tableau articles, **TOTAL ESTIMÉ**, mention « document non facturé », zone de signature |
| 💬 **Texte WhatsApp** | 42 colonnes alignées, `*DEVIS N°*` en gras, validité comprise — collé tel quel dans la discussion client |
| 🖨 **Ticket 80 mm** | en-tête `*** DEVIS — NON FACTURE ***`, **sans** lignes Payé/Reste — zéro confusion avec une vraie vente |

Mobile v21 : même flux dans **Nouvelle vente** (🧾 au panier → modale liste → **💬 partage** système), brouillons dans un fichier JSON local — **aucune nouvelle dépendance** (`expo-file-system/legacy` déjà utilisée, `Share` natif).

### 📦 Étiquettes « au stock réel » : 1 étiquette par unité posée en rayon
Transparence d'abord : l'impression d'étiquettes **existait déjà de bout en bout** — rafale thermique ×N (v2.5), rafale « ruptures » (v2.6), planche A4 **CODE128 serveur scannable** (v1.9+), BT mobile (v2.4). Le trou métier restant c'était le **réassort** : tu remplis un rayon, tu veux **exactement 1 étiquette par article posé** = le stock actuel, sans compter à la main. Désormais :

- **PC → Produits → Rafale → puce « 📦 Au stock »** : `min(50, max(1, stock))` par produit, plafond **400** étiquettes/rafale, **un seul envoi** à la thermique.
- **Mobile v21** : option **« Au stock »** dans le picker de quantité (confirmation avec le total, une connexion Bluetooth).
- **Planche A4** : case **« copies = stock actuel »** (désactive le champ copies) → paramètre **additif** `stock_qty=1` sur la route existante `/products-labels.pdf` ; serveur : copies par produit = `min(50, max(1, quantité))`, plafond planche **300** (422 au-delà — affine la sélection). **Sans le paramètre ni la puce : comportement strictement identique à la v2.9.**

### 📊 Rentabilité 12 mois : la marge nette du patron, mois par mois
L'onglet 💰 Marges donnait la marge d'**une** période ; le patron veut la **tendance**. Clé **additive** `by_month=1` sur `/stats/margins` : même scope boutique, **12 mois glissants**, CA net des retours, coût `purchase_price`, marge + taux — et **0 requête** si la clé est absente (vieux clients intacts). Surfaces : **PC** → carte **« 📈 Rentabilité sur 12 mois »** dans l'onglet Marges (dès 2 mois de données) : 3 statCards (marge totale, taux moyen, meilleur mois) + **24 barres** CA (lavande) / marge (vert) avec mois courts localisés FR/EN, bouton **📄 PDF** patron (`rentabilite-12mois-….pdf`, KPIs + tableau + TOTAL). **Mobile v21** : BarChart marge en vert + lignes par mois + **CSV** partageable (BOM / « ; »).

## 🆕 v2.9 — 📸 photos en caisse · 🧮 multi-TVA · 👥 commissions vendeurs

### 📸 Les photos produits arrivent là où on vend (caisse PC + vente mobile)
Transparence d'abord : les photos **existaient déjà de bout en bout** — upload depuis la fiche produit (PC & mobile), stockage serveur (`image_path` + `asset('storage/…')`), vignettes au catalogue PC et dans les fiches/stats mobile. Le trou était **à la caisse**, là où ça vend : ni l'écran vente PC ni la vente mobile n'en affichaient. La v2.9 bouche le trou, **sans toucher le serveur** : carte produit de la caisse = **vignette 30 px** (placeholder 📦 si pas de photo), ligne panier = **26 px** ; mobile v20 : **34 px** dans les résultats, **30 px** au panier (l'`image_url` et la `category_id` voyagent désormais avec la ligne panier). Viser juste, vendre vite, zéro régression (pas de photo → 📦 exactement comme avant).

### 🧮 Multi-TVA : taux par catégorie, ventilation « dont TVA » partout — 0 migration
Mali & CEDEAO : certains produits sont taxés, d'autres non — le ticket doit le montrer. Nouveau réglage dans **🎯 Seuils → carte « 🧮 Multi-TVA »** : **case d'activation + taux par défaut + un taux par catégorie** (les exceptions au niveau produit, si présentes, sont **préservées** à la sauvegarde). La config vit dans le réglage texte **`tva_config`** (JSON dans la table `settings` existante — **0 migration, 0 route**). Nouveau support serveur **`Support/Tva.php`** : résolution **produit → catégorie → défaut** (bornée 0-100), ventilation de **présentation** sur les prix TTC (base = TTC ÷ (1+taux), arrondi entier, triée par taux croissant). Elle apparaît partout, toujours **additive** :

| Surface | Rendu |
|---|---|
| 🖨 Ticket thermique PC (ESC/POS **et** HTML 80 mm) | « dont HT » + « dont TVA n % » après le TOTAL — **byte-identique** à la v2.8 si TVA désactivée/vieux serveur |
| 🧾 Reçu PDF A5 + ticket PDF serveur (blades gardés `@if`) | mêmes lignes, bloc absent sinon |
| 🖥 Caisse PC & vente mobile | estimation « dont TVA n % » du panier en direct (même formule que le serveur) |
| 👁 Détail reçu PC & 🧾 partage WhatsApp mobile | ventilation du reçu servie par `GET /receipts/{id}` (clé `tva` additive) |
| 📤 Export comptable mensuel | 2 colonnes « dont HT (F) » / « dont TVA (F) » **uniquement si activée** |

⚠️ **Limite assumée** : c'est une **ventilation de présentation**, pas un snapshot historique — les anciens reçus re-ventilent avec les taux **actuels** (prix au moment de la vente conservés, eux). Documenté, pas de surprise.

### 👥 Commissions vendeurs automatiques (% du CA — 0 migration)
Le patron paie les commissions à la louche ? Nouveau seuil **« 👥 Commission vendeurs (% du CA) »** (0-50, réglage numérique existant — **0 migration**, 0 = tout est masqué). Dès qu'il est > 0, le serveur calcule (requête émise **seulement dans ce cas**) un bloc **`commissions`** additif dans `recapData()` : CA du mois/période par vendeur (périmètre boutique habituel) × le taux, arrondi entier, total en pied. Surfaces : **PC** → 💰 « com. 30 000 F » sous chaque vendeur de la carte **Objectifs** (v2.8) + encart **« ② bis — 👥 Commissions (5 %) »** dans les rapports hebdo/mensuel PDF ; **mobile v20** → même 💰 sous la barre objectifs de l'onglet Vendeurs. Remets 0 (ou vieux serveur) → plus trace.

## 🆕 v2.8 — 🏆 objectifs vendeurs · 📉 prévisions en surface · 🧾 reçu WhatsApp

### 🏆 Objectifs CA mensuels par vendeur (carte de progression dans les Stats)
Le patron fixe une cible unique : **🎯 Seuils → « Objectif CA mensuel par vendeur »** (0 = masqué, plafond 100 M — le réglage vit dans la table `settings` clé/valeur existante, **0 migration**). Le serveur renvoie alors une clé additive **`seller_goals`** sur `/stats/sales` : CA du **mois calendaire en cours** par vendeur (net des retours, même périmètre boutique `$applyShop` que le reste de l'écran, indépendant de la période choisie). **PC** : carte **« 🏆 Objectifs vendeurs du mois »** au-dessus du comparatif — barre de progression par vendeur, % arrondi, et à 100 % la barre passe au vert avec le badge **🎉 « Atteint ! »**. **Mobile v19** : même bloc en tête de l'onglet Vendeurs. Cible à 0 ou vieux serveur → carte simplement absente.

### 📉 Prévisions de rupture EN SURFACE (badge live + notif du matin)
L'onglet Prévisions (v14) savait déjà calculer « épuisé dans ~N j » ; la v2.8 **remonte l'info là où on la regarde** : le badge ⚡ EN DIRECT du dashboard gagne un chip **« ⏳ N épuisé(s) sous 7 j »** (cliquable → Alertes), rafraîchi toutes les 30 s comme le reste du badge, via la route existante `/products/restock-forecast` (**0 changement serveur**, appel non bloquant). Et la **notification du matin** (v2.7) s'enrichit : *« ⚠️ N rupture(s) ce matin — et M épuisé(s) sous 7 j à anticiper »*. **Mobile v19** : le même chip ⏳ sous les cartes du dashboard (fixe au focus, repli silencieux).

### 🧾 Le reçu part en texte WhatsApp (mobile)
Après la vente (ou depuis n'importe quel reçu de l'historique/client), nouvelle action **« 🧾 Envoyer le reçu (WhatsApp) »** dans la feuille d'actions : le ticket en **texte mis en forme** (boutique en gras `*MAJUSCULES*`, lignes articles alignées 42 colonnes, TOTAL en gras, bloc Payé/Reste en crédit, ✅/⚠️ final) part via la **fiche de partage système** — zéro dépendance (`Share` de react-native), annulation par l'utilisateur silencieuse. L'imprimante Bluetooth partage la feuille mais reste l'option papier.

## 🆕 v2.7 — 📊 heatmap vendeurs × boutiques · 📦 pack hebdo détaillé par boutique · 🔔 « N ruptures » du matin

### 📊 Qui vend quoi, et où — la heatmap croisée vendeurs × boutiques
Au-delà des deux comparatifs (vendeurs d'un côté, boutiques de l'autre), la question du patron c'est **le croisement** : *Awa cartonne au Siège mais pas à Sotuba ? Modibo est-il meilleur en boutique ?* Nouvelle carte **« 📊 Vendeurs × boutiques »** dans les Stats (sous le comparatif boutiques) : un tableau croisé, une ligne par vendeur (🥇🥈🥉), une colonne par boutique (🏬, max 6 affichées) — **plus la case est foncée, plus le CA croisé est élevé** (dégradé violet, alpha proportionnel au max), case vide = « · », ligne et colonne **TOTAL**. Le serveur renvoie une nouvelle clé **`cross`** dans `/stats/sales` : agrégation **toutes boutiques** (non bornée par `$applyShop`, comme `by_shop`), CA **net** ((quantité − retours) × prix), pivoté par vendeur et trié par total — **additive** : anciens clients l'ignorent, serveur non recopié → la carte ne s'affiche simplement pas (il faut ≥ 2 vendeurs **et** ≥ 2 boutiques). Elle suit la période, y compris les **dates libres** v2.6. **Mobile v18** : le même croisement dans *Stats → onglet Vendeurs* (barres proportionnelles par boutique sous chaque vendeur).

### 📦 Le pack hebdo se détaille par boutique
Le bilan PDF/email du lundi (v2.1/v2.3) donnait les chiffres **toutes boutiques confondues**. Il gagne une section **« ① bis — Comparatif boutiques »** (comme la « ② bis » du pack jour v2.2) : chaque point de vente avec son nombre de ventes, son CA et sa **part en %**, plus la ligne **TOTAL 100 %** — visible uniquement s'il y a **au moins 2 boutiques** sur la semaine. Le serveur factorise ça dans `recapData` (reçus COMPLETED de la semaine, LEFT JOIN boutiques, « Siège » pour les ventes hors boutique, clé `by_shop` **additive**) : le **PDF local** (bouton Bilan hebdo / bilan auto du lundi) et l'**email du lundi** en profitent tous les deux d'un coup. Vieux serveur → section absente, PDF/email strictement identiques à la v2.6.

### 🔔 « N ruptures » chaque matin à l'ouverture
12ᵉ interrupteur 🤖 *« 🔔 Ruptures du matin »* : au **premier démarrage du jour**, l'app interroge `/products?out_of_stock=1` (route existante, **0 changement**) et envoie **une seule notification bureau groupée** : *« ⚠️ N rupture(s) de stock ce matin — ouvre Alertes pour voir le rayon à réassortir »* (un clic ouvre l'écran Alertes, comme toutes les notifications StockFlow). **1×/jour max** (jour marqué, anti-spam), **0 rupture → silence total**, panne réseau → **le marqueur n'est pas avancé** (retentative au prochain démarrage), interrupteur **OFF par défaut** (rétro-compat : rien ne change si tu ne l'actives pas). `StockNotifier.fire()` est désormais exposée pour l'occasion.

## 🆕 v2.6 — 📅 dates libres dans les Stats · ⚠️🏷️ rafale « ruptures de stock »

### 📅 Toutes les stats (et les 2 comparatifs) à dates libres
Finies les seules puces 7/30/90 j : deux champs **date** + bouton **📅 Appliquer** viennent s'ajouter dans la barre de période — *Du 2026-07-01 au 2026-07-15* → **tous les chiffres suivent** : totaux, top produits/vendeurs/catégories, marges, **⚖️ Comparatif vendeurs** et **🏬 Comparatif boutiques**, exports CSV nommés `comparatif-…-2026-07-01_2026-07-15-….csv`. Une puce de plage active (✕) permet de revenir d'un geste aux 30 j. Le serveur accepte `?from=AAAA-MM-JJ&to=AAAA-MM-JJ` (prioritaire sur `period`) : bornes **inversées permutées**, plage **plafonnée à 370 j**, `to` absent → aujourd'hui, `from` absent → 30 j glissants, dates illisibles → **repli silencieux** sur la période standard. Réponse enrichie d'une clé `to` **additive** (anciens clients : ignorée). **Mobile v17** : puce **📅** dans les stats (affichage compact jj/mm), modale deux dates format `AAAA-MM-JJ` avec validation, appui long = retour aux puces. **1 seul fichier serveur** (`StatsController.php`), 0 migration — borne basse historique inchangée quand from/to sont absents.

### ⚠️🏷️ Rafale « ruptures de stock » — réassortir le rayon, pas l'imprimer en entier
La rafale classique imprime le rayon **affiché** ; quand le réassort arrive, on ne veut que les **produits à 0**. Nouveau bouton **⚠️ Ruptures** (à côté de 🏷️ Rafale, visible si la thermique est configurée) : une requête `/products?out_of_stock=1&all=1` (**zéro changement backend**, la route existait — plafond 500), puis **la même saisie express de quantité** (×1…×10, total annoncé) et UN seul envoi. Aucune rupture → toast 🎉, rien ne s'imprime. **Mobile v17** : bouton **🚨** à côté du 🏷️ dans la barre de recherche (spinner de chargement dédié), liste factorisée `burstList` partagée avec la rafale classique — le code d'impression reste unique.

## 🆕 v2.5 — 🖨️ Z thermique depuis le mobile · 🏷️ rafale avec quantités · 🏬 comparatif boutiques

### 🖨️ Le Z de caisse s'imprime directement depuis le téléphone
Le canal Bluetooth du ticket (v2.4/mobile v15) accueille le **Z** : dans *Caisse → Clôtures*, chaque Z a désormais son bouton **🖨** à côté du 📄 PDF — le ticket 80 mm sort sur l'imprimante Bluetooth **sans passer par un PC** : en-tête boutique, caissier, ventes encaissées / apports / dépenses du jour, **SOLDE CAISSE en gros caractères**, note, ligne de signature (même plan que le `buildZBytes` PC v1.3). Bonus de terrain : juste après la clôture, l'app **propose l'impression immédiate** (« 🖨 Imprimer le Z » dans la confirmation). Gardes identiques au ticket : pas de dev build / pas d'imprimante → messages clairs, spinner par ligne, **une seule connexion** Bluetooth.

### 🏷️ Rafale avec quantités (PC + mobile) — tout un rayon, en vrais exemplaires
La rafale v2.3/v2.4 imprimait **1 étiquette par produit** ; en réel, on veut souvent **2 ou 3 exemplaires** (devanture + rayon + réserve). C'est maintenant en **saisie express** : **PC** → la rafale ouvre une modale « Étiquettes par produit » (stepper − n ＋, raccourcis **×1 ×2 ×3 ×5 ×10**, plafond 20, le bouton annonce le total **produits × copies**) ; **mobile** → modale quantité (×2 mis en avant) puis confirmation avec le total. Côté moteur : `buildLabelsBytes/buildLabelsHtml/printLabels(products, …, copies)` côté PC, `printProductLabels(products, shop, copies)` côté mobile — **toujours UN seul envoi réseau / UNE seule connexion Bluetooth**, init+coupe conservés par étiquette, **rétro-compatible** (`copies = 1` par défaut = comportement v2.3/v2.4 inchangé).

### 🏬 Comparatif par boutique dans les Stats (PC + mobile, serveur additif)
Si tu as **au moins 2 boutiques** : l'endpoint `/stats/sales` renvoie un nouveau bloc **`by_shop`** (agrégation sur **toutes** les boutiques — comme la « ② bis » du pack jour v2.2 — avec `receipts_count / items / revenue / avg_basket / share`, les reçus sans boutique regroupés sous **« Siège »**, clé **additif & optionnel** : les anciens clients l'ignorent, et un **serveur non recopié** = la carte ne s'affiche simplement pas). **PC** : carte **« 🏬 Comparatif boutiques »** sous le comparatif vendeurs (🥇🥈🥉, ventes, articles, panier moyen, CA, part + barre) **+ bouton 📤 Exporter (Excel)** (`comparatif-boutiques-<période>-<date>.csv`, BOM/`;`/entiers). **Mobile v16** : nouvel onglet **🏬 Boutiques** dans les Stats (même contenu + partage CSV via `expo-sharing`), qui n'apparaît qu'à partir de 2 boutiques et **rebascule seul** sur Produits si la période redescend à 1. **1 seul fichier serveur modifié** (`StatsController.php`), 0 migration.

## 🆕 v2.4 — 📸 scan webcam · 📊 export du comparatif vendeurs · 📱 mobile au niveau (rafale + comparatif)

### 📸 La webcam du PC devient une douchette code-barres
Nouveau bouton **📸** dans la Caisse (et dans les Inventaires) : la caméra s'ouvre, vise le code-barres — **détection automatique** (EAN-13, EAN-8, UPC, **CODE128**, Code 39, ITF, QR) avec le même **bip** que la douchette (v1.8) et exactement la même logique d'ajout/ouverture. En caisse, la caméra **reste ouverte** pour enchaîner les articles (anti-doublon 1,2 s par code) ; en inventaire, elle se ferme au premier code et le curseur atterrit dans le comptage. **Zéro dépendance** : `BarcodeDetector` est natif dans Chromium — le main active juste `enable-experimental-web-platform-features` — et tout est dégradé proprement : pas de caméra, permission refusée, ou navigateur sans détecteur → toast clair, **la douchette USB reste reine**.

### 📊 Le comparatif vendeurs s'exporte en « Excel »
Sur la carte **⚖️ Comparatif vendeurs** (v2.3), un bouton **📤 Exporter (Excel)** : `comparatif-vendeurs-<période>-<date>.csv` — rang, vendeur, ventes, articles, panier moyen, CA, **part %** ; montants **entiers**, séparateur `;` + **BOM UTF-8** (conventions maison v1.6/v2.0, ouverture directe propre dans Excel FR), « ; » dans les noms protégé par guillemets. Electron : dialogue « Enregistrer sous » (`sf:file-save`, `auto:false`) ; navigateur : téléchargement direct. Le comptable a le classement, le patron l'affiche au mur. 🏆

### 📱 Le mobile suit : rafale, comparatif enrichi, partage CSV
**stock-app v15** — bouton **🏷️** sur Produits : **rafale d'étiquettes Bluetooth** (même philosophie que la v2.3 PC : tout le rayon listé, **une seule connexion Bluetooth**, CODE128 via `printBarCode` avec repli texte, garde-fous propres sans dev build / sans imprimante). Onglet **Vendeurs** des stats : **⌀ panier moyen** dans la meta + bouton **📤 Partager le comparatif** (CSV local → `expo-sharing` : WhatsApp, mail…). **Aucune nouvelle dépendance npm**, i18n mobile **641 clés × FR/EN**.

## 🆕 v2.3 — 📧 bilan hebdo par email · ⚖️ comparatif vendeurs · 🏷️ rafale d'étiquettes — ✨ + nouvelles icônes des 3 apps

### 📧 Le bilan du lundi arrive aussi par email (le patron le lit au café ☕)
11ᵉ interrupteur 🤖 : quand le **bilan hebdo auto** se déclenche au premier démarrage de la semaine, le PDF part **aussi par email** au patron (adresse `boss_email` v2.1). Nouvel endpoint `POST /accounting/email-weekly` : le serveur **recalcule les chiffres clés** de la semaine (mêmes agrégats que le récap — calcul désormais factorisé dans `recapData()`, zéro duplication) et envoie un mail sombre maison avec CA encaissé, nb ventes, panier moyen, apports/dépenses, nb de Z, solde fin de semaine, **🏆 meilleure journée**, remises/avoirs éventuels + le PDF `bilan-hebdo-…pdf` en pièce jointe. File + repli synchrone, 422 dédiée si adresse absente, **fire & forget** côté PC : ni l'impression thermique ni l'archivage ne dépendent de l'email.

### ⚖️ Comparatif vendeurs multi-postes dans les Stats
Sous les trois classements, la nouvelle carte **« ⚖️ Comparatif vendeurs (tous postes) »** aligne tout le monde sur la période choisie : 🥇🥈🥉, ventes, articles vendus, panier moyen, CA, **part en %** + barre — tous postes confondus (le PC du siège et la tablette en boutique sont dans le même tableau). **Zéro backend** : `/stats/sales` renvoyait déjà ces chiffres ; la carte n'apparaît que s'il y a **au moins 2 vendeurs**, et les clés absentes (vieux serveur) s'affichent « — » sans casser.

### 🏷️ Les étiquettes sortent en rafale (tout un rayon d'un coup)
Sur **Produits**, un bouton **« 🏷️ Rafale (N) »** apparaît quand la thermique est configurée : filtre ta catégorie (= ton rayon), clique, confirme — **les N étiquettes des produits listés sortent à la file** (nom, prix, vrai CODE128 quand le produit a un code-barres, logo si coché). Réseau : les étiquettes sont **concaténées en un seul envoi** (pas N impressions) ; système : un seul document multi-pages. Le bouton par ligne (v1.9) reste disponible.

### ✨ Bonus : les 3 apps ont une vraie icône
Nouveau logo StockFlow (boîte + flèche de flux, dégradé violet maison) décliné partout : **PC** (`electron/icon.png` + `icon.ico` Windows multi-tailles), **site + admin** (`icon.svg` vectoriel refait, favicons, `apple-touch-icon` arrondie, PWA 192/512/**maskable**, `theme_color` harmonisé) et **mobile** (`assets/` Expo : icon 1024, adaptive-icon Android, splash, favicon web). Master dans `brand/` + script de dérivation — **zéro dépendance ajoutée aux apps**.

## 🆕 v2.2 — 🔔 rappel crédits par email · 📊 comparatif boutiques · 🖨 bilan hebdo sur la thermique

### 🔔 Rappel quotidien des crédits anciens… par email
Le push mobile a son jumeau **email** : chaque matin à **10h05**, la nouvelle commande planifiée `credits:remind-email` envoie au patron (`boss_email`, réglage v2.1) un **digest des crédits trop vieux** — même seuil boutique `credit_reminder_days` (défaut 7 j, le même que le push 10h00), même périmètre. Tableau client / N° de reçu / date / **âge en jours** / reste à payer / boutique (15 lignes max, les plus anciens d'abord) + **total de l'encours**, dans le gabarit email sombre maison. Pas d'adresse renseignée → la commande ne fait **rien** (no-op propre). Envoi en **file** avec repli synchrone automatique, `withoutOverlapping` contre les doubles envois. Toujours **zéro migration** : le planificateur existant (`schedule:run`) prend la ligne en charge tout seul.

### 📊 Comparatif multi-boutiques dans le pack jour
Le siège voit enfin **qui vend quoi, boutique par boutique** : le pack du jour (v1.9) gagne une section **« ② bis — Comparatif boutiques (jour) »** — chaque point de vente actif du jour avec son nombre de ventes et son CA, ligne **TOTAL** en pied. Données : nouveau champ **additif** `sales_by_shop_today` de `/cash-ops/summary` (groupé `shop_id`, top 10, vente sans boutique → magasin de l'utilisateur, repli « Siège »). **Une seule boutique active, ou ancien serveur sans la clé → la section n'apparaît tout simplement pas** : aucun bruit pour les mono-boutiques, aucune casse pour les vieux backends.

### 🖨 Le bilan du lundi s'imprime tout seul sur la thermique
10ᵉ interrupteur 🤖 : quand le **bilan hebdo auto** (v2.1) se déclenche au premier démarrage de la semaine, une **version papier 80 mm sort dans la foulée** sur la thermique configurée — titre « BILAN HEBDO », plage lun→dim, KPIs (CA encaissé, nb ventes, panier moyen, apports/dépenses, remises points, avoirs), **journal des Z** jour par jour avec caissier, solde de caisse final en gras, zone signature. Canal réseau = ESC/POS binaire (logo honoré), canal système = HTML 72 mm. Impression **fire & forget** après l'enregistrement du PDF : une panne d'imprimante n'empêche **jamais** le bilan d'être archivé.

## 🆕 v2.1 — 📧 pack par email au patron · 🧮 bilan hebdo auto · 🔁 versements hors ligne

### 📧 Le pack du jour envoyé au patron (endpoint Laravel + queue)
8ᵉ interrupteur 🤖 : après chaque clôture, le pack (PDF récap + CSV des ventes) **part tout seul par email** à l'adresse du patron — renseignée une fois dans 🎯 *Seuils & fidélité* (nouveau champ texte `boss_email`, vidage = arrêt des envois). Le PDF voyage en base64 depuis le main Electron (`data64`, sans relecture disque) ; côté serveur, `POST /accounting/email-pack` (admin/manager) valide le PDF (`%PDF`, taille plafonnée), construit le Mailable `DailyPackMail` (2 pièces jointes, gabarit sombre maison) et le **met en file** — pilote `sync` = envoi immédiat, `database/redis` = vrai asynchrone, **repli synchrone automatique** si la file est mal configurée. Adresse absente → 422 explicite, toast clair, clôture jamais impactée.

### 🧮 Bilan hebdo auto le lundi
9ᵉ interrupteur 🤖 : au **premier démarrage de la semaine** (ou le lundi en cours de journée), le **bilan PDF de la semaine écoulée** (lundi → dimanche) se range dans `Documents/StockFlow/Rapports/bilan-hebdo-…pdf` — mêmes agrégats que le récap mensuel (KPIs + journal des Z), grâce au nouveau **mode plage `from/to`** de `/accounting/summary` (additif, `month` inchangé). Semaines ISO calculées en local (bascule d'année testée : semaine 52 → semaine 1), anti-doublon par marqueur, réessai en cas de panne.

### 🔁 Versements crédit hors ligne (file bidirectionnelle)
Le crédit ne s'arrête plus non plus : réseau coupé, le **versement** d'un client passe en file (`kind:'payment'`, même magasin que les ventes) avec 📡 toast dédié — et si le réseau meurt **pendant** l'envoi, bascule automatique en file au lieu d'une erreur. À la synchro : ventes d'abord (carte `client_uuid → id serveur` de la session), puis versements — résolus par id connu, par la carte de session, ou par la nouvelle route **`/receipts/by-uuid/{uuid}/payments`** (vente synchronisée depuis un autre poste). Anti-double envoi côté serveur : même montant + même caissier < 2 min → `duplicate:true`, la file se vide proprement. Orphelins (ni id ni uuid) → erreur visible dans Réglages, jamais perdu silencieusement.

## 🆕 v2.0 — 📤 CSV du pack jour · 📊 comparatif vs hier · 🖼 logo sur étiquette

### 📤 Export CSV des ventes du jour, joint au pack
Quand le **pack jour auto** est actif (7ᵉ interrupteur 🤖), la clôture enregistre désormais **deux fichiers** dans `Documents/StockFlow/Rapports` : le PDF récapitulatif **et** `ventes-jour-AAAA-MM-JJ.csv` — un reçu par ligne (N°, heure, vendeur, client, total, payé, reste, ligne **TOTAL**), montants **entiers** prêts à sommer, séparateur `;` + **BOM UTF-8** (mêmes conventions Excel FR que les exports v1.6), re-tirage automatique des pages si plus de 250 ventes (plafond 1 000). Le comptable a tout, chaque soir, sans lever le petit doigt. Le CSV est un bonus jamais bloquant : en cas de panne, le PDF reste enregistré et un toast dédié signale le CSV.

### 📊 Comparatif « vs hier » dans le badge EN DIRECT
Sous le CA du jour : **📈 +25 % vs hier** (vert), **📉 −20 % vs hier** (rouge) ou ⚖️ journée stable — calculé sur le nouvel encaissé d'hier `sales_yesterday` (même périmètre boutique, hors avoirs). La même ligne apparaît dans le **pack du jour**. Hier sans vente ou ancien serveur → ligne simplement masquée.

### 🖼 Logo boutique sur l'étiquette thermique
Les étiquettes produit (v1.9) héritent du **logo raster ESC/POS** du ticket/Z : même checkbox Réglages, même collecte jamais bloquante. Une étiquette « marque » pro pour le rayon.

### 🐞 Fix bonus : version du sidebar
La clé i18n `version` affichait **v1.8** en permanence — le t('version') lit désormais `CONFIG.APP_VERSION` directement : plus jamais de version figée dans le menu.

## 🆕 v1.9 — 📦 pack jour auto · 🏷️ étiquette thermique · 👥 vendeurs en direct

### 📦 Pack du jour auto à la clôture
7ᵉ interrupteur 🤖 : quand tu clôtures la caisse, un **PDF récapitulatif du jour** (`pack-jour-AAAA-MM-JJ.pdf`, 1 fichier/jour) s'enregistre tout seul dans `Documents/StockFlow/Rapports` — CA encaissé, nombre de ventes, panier moyen, **totaux par vendeur**, apports/dépenses, bloc **Z signé** avec la note du jour. Zéro boîte de dialogue, jamais bloquant (panne disque → toast, la clôture est déjà enregistrée). Le dossier du patron est complet : rapport 30 j + Z thermique + pack du jour.

### 🏷️ Étiquette thermique individuelle
Sur **Produits**, chaque ligne gagne un bouton **🏷️** (visible uniquement si la thermique est configurée) : nom produit en gras (2 lignes max, accents translittérés), **prix en gros**, boutique en tête — et **vrai code-barres CODE128 scannable** en ESC/POS (commande `GS k 73`, sous-jeu B) si le produit a un code-barres. Canal réseau = binaire direct ; canal système = mini-étiquette HTML 60 mm. Colle-la sur le bocal, l'étagère, le sac.

### 👥 Totaux par vendeur dans le badge EN DIRECT
Le badge ⚡ du dashboard affiche désormais **qui a vendu quoi aujourd'hui** : jusqu'à 3 lignes « 👤 Awa · 5 vente(s) · 90 000 F » sous le compteur (nouveau champ API `sales_by_user_today`, top 5 serveur, filtré boutique, hors avoirs). Ancien serveur sans la clé → la zone reste masquée, rien ne casse.

## 🆕 v1.2 — 🖨 Impression thermique directe & 📡 mode hors ligne

### 🖨 Ticket 80 mm sans boîte de dialogue

Deux canaux configurables dans **⚙️ Réglages → Impression thermique** (bouton *Tester l'impression* inclus) :

| Canal | Pour quelle imprimante | Comment ça marche |
|---|---|---|
| 🌐 **Réseau ESC/POS (IP:9100)** | Imprimante thermique **Ethernet/Wi-Fi** | Envoi brut du ticket en ESC/POS via socket réseau du processus principal — **aucun pilote à installer** |
| 🖨 **Système (silencieuse)** | Imprimante thermique **USB installée** sous Windows/Linux | `webContents.print({silent:true, deviceName})` sur une page 80 mm générée — nécessite le pilote OS |

- Boutons **🖨 Ticket thermique** apparaissent automatiquement après une vente et dans le détail d'un reçu (sinon → PDF navigateur classique).
- Commandes ESC/POS standard (`ESC @`, gras, double taille, **avance + coupe partielle**) — tickets construits en **ASCII translittéré** (É→E, émojis supprimés) : c'est le prix de la compatibilité maximale avec les clones ESC/POS bas de gamme. Le PDF A5, lui, garde tous ses accents.

### 📡 La caisse ne s'arrête plus jamais

- **Catalogue en cache** : produits + clients sont mémorisés à chaque passage sur l'écran Vente → sans réseau, la caisse continue de vendre (badge 📡 orange en haut, avertissement que prix/stock peuvent être datés).
- **File d'attente** : chaque vente validée hors ligne part en file locale avec un **`client_uuid` unique** ; dès que le serveur revient (événement `online` + boucle 45 s), elle est envoyée **en arrière-plan** — la sync est **idempotente** : le backend renvoie `{duplicate:true}` en double envoi, donc zéro doublon possible même en cas de double-clic.
- **Suivi** : carte *Mode hors ligne* dans Réglages = ventes en file (heure, client, total), erreurs métier éventuelles (ex. stock revenu insuffisant entre-temps), boutons **↻ Synchroniser** / 🗑 vider.
- **Ce qui est volontairement exclu du hors ligne** : tout sauf les ventes (mouvements, transferts, réceptions, paiements…). Règle simple : si le réseau est coupé, on ne fait que vendre — le reste attend le retour du serveur.

## 🖥 Les 20 écrans et leurs rôles

| Écran | Employé | Gestionnaire | Admin |
|---|:-:|:-:|:-:|
| 🏠 Accueil · 🧾 Vente · 📜 Reçus · 👥 Clients | ✅ | ✅ | ✅ |
| 📦 Produits · 🔄 Mouvements · 🔔 Alertes | ✅ | ✅ | ✅ |
| 🚛 Fournisseurs · 🏷️ Catégories (édition) | ✅ | ✅ | ✅ |
| 🔁 Abonnements · 🚚 Transferts · 📋 Inventaires | — | ✅ | ✅ |
| 🛒 Commandes · 💵 Caisse · 📊 Stats · 🎯 Seuils | — | ✅ | ✅ |
| 🧑‍🤝‍🧑 Utilisateurs · 🏬 Boutiques | — | — | ✅ |
| ↩️ Avoirs · suppressions protégées | — | ✅ | ✅ |
| ⚙️ Réglages (langue, URL API) | ✅ | ✅ | ✅ |

*Les boutons non autorisés sont masqués ET l'API refuse de toute façon (middleware `role:`) — double protection.*

## 🚀 Démarrage

```bash
# 1. Le backend Laravel doit tourner (le même que l'app mobile), idéalement v14+
cd ../stock-api && php artisan serve --host=0.0.0.0 --port=8000

# 2. L'app PC
cd stock-pc
npm install        # installe Electron (seule dépendance, dev)
npm start          # lance la fenêtre 1280×800
```

- Par défaut l'API pointe sur `http://127.0.0.1:8000/api` — modifiable dans **⚙️ Réglages** (avec bouton *Tester la connexion*).
- Identifiants démo : `admin@stockflow.app` / `password`.

## ⌨️ Raccourcis & usage boutique

| Action | Détail |
|---|---|
| 🔫 **Douchette code-barres** | Branche-la en USB : elle tape le code + **Entrée** → le produit s'ajoute au panier, au transfert ou au comptage d'inventaire. Aucun pilote. |
| `Ctrl+N` | Nouvelle vente (depuis n'importe quel écran) |
| `Ctrl+P` | Imprimer (reçu du jour, étiquettes, listes…) via l'imprimante Windows |
| 🔔 **Badge alertes** | La sidebar affiche le nombre d'alertes stock en direct, comme le mobile |
| 🇫🇷🇬🇧 | Bascule FR/EN instantanée depuis la barre du haut |

## 📦 Construire l'installateur

```bash
npm i -D electron-builder   # une fois
npm run pack:win            # → dist/ → .exe NSIS
npm run pack:linux          # → AppImage
npm run pack:mac            # → .dmg
```

## 🏗 Architecture (38 fichiers JS applicatifs + 2 scripts Electron + 16 outils QA, zéro dépendance de rendu)

```
stock-pc/
├─ package.json                # Electron seul + scripts pack:*
├─ electron/
│  ├─ icon.png + icon.ico      # ✨ v2.3 : nouvelle identité (brand/)
│  ├─ main.js                  # fenêtre, menu FR, ESC/POS, silencieuse, PDF auto (v1.4) + data64 (v2.1 📧), sf:file-save (v2.0)
│  ├─ preload.js               # contextBridge → window.sfpc { print, onAction, thermal, pdf, file 📤, isElectron }
│  └─ icon.png
├─ tools/                      # 🧪 batteries QA HEADLESS, pérennes (zéro dépendance) :
│  ├─ qa-smoke.js              #    19 écrans montés avec API factice (v1.4)
│  ├─ qa-head.js               #    cohérence : i18n FR=EN + couverture d'usage + routes↔écrans↔index.html
│  ├─ qa-regression.js         #    🛡 v2.2 : 59 contrôles historiques v1.0→v2.1 (thermal, offline, autos, API…)
│  ├─ qa-v2.2.js              #    31 contrôles des nouveautés v2.2
│  ├─ qa-v2.3.js              #    29 contrôles des nouveautés v2.3
│  ├─ qa-v2.4.js              #    24 contrôles des nouveautés v2.4 (webcam/mockée, export CSV, mobile statique)
│  ├─ qa-v2.5.js              #    29 contrôles des nouveautés v2.5 (rafale ×N, comparatif boutiques+CSV, Z mobile)
│  ├─ qa-v2.6.js              #    29 contrôles des nouveautés v2.6 (dates libres PC+serveur, rafale ruptures)
│  ├─ qa-v2.7.js              #    28 contrôles des nouveautés v2.7 (heatmap croisée, pack hebdo boutiques, ruptures matin)
│  ├─ qa-v2.8.js              #    26 contrôles des nouveautés v2.8 (objectifs, prévisions surface, reçu WhatsApp)
│  ├─ qa-v2.9.js              #    36 contrôles des nouveautés v2.9 (vignettes caisse, multi-TVA, commissions)
│  ├─ qa-v2.10.js             #    39 contrôles des nouveautés v2.10 (devis locaux, étiquettes au stock, rentabilité)
│  ├─ qa-v2.11.js             #    41 contrôles des nouveautés v2.11 (promos datées, comptage tournant, relance crédit)
│  ├─ qa-v2.12.js             #    19 contrôles des nouveautés v2.12 (prévisions fournisseurs, avoirs reçus)
│  ├─ qa-v2.13.js             #    42 contrôles des nouveautés v2.13 (import CSV, échéancier crédit)
│  └─ qa-v2.14.js             #    42 contrôles des nouveautés v2.14 (comptes clients, portail, Google SSO)
└─ src/
   ├─ index.html               # CSP stricte (script-src 'self')
   ├─ css/app.css              # design system repris du mobile (#7C5CFF…) + media print
   └─ js/
      ├─ config.js             # DEFAULT_API_URL + APP_VERSION (v2.2)
      ├─ i18n.js               # FR/EN — 796 clés, changement à chaud
      ├─ format.js             # FCFA entiers, dates FR/EN, esc()
      ├─ api.js                # fetch + Sanctum, 401→login, download(), événements réseau v1.2 · 👤 v2.14 abonnement client persisté + siteUrl()
      ├─ ui.js                 # h(), modal, toast, confirm, statCard, lineChart SVG, gauge
      ├─ promo.js               # 🏷️📦🔔 v2.11 : prix effectif promo, rotation du comptage tournant, liens wa.me
      ├─ csvimport.js           # 📥 v2.13 : parseur CSV produits (BOM, « ; »/« , » auto, guillemets, « 1 500 F »)
      ├─ thermal.js            # 🖨 v1.2 : tickets/Z · 🏷️ v1.9 étiquettes CODE128 (+🖼 v2.0) · 🖨 v2.2 hebdo 80mm · 🏷️ v2.3 rafale · 🧾 v2.10 ticket devis « NON FACTURÉ » · ↩ v2.12 avoirs (ligne + TOTAL NET)
      ├─ offline.js            # 📡 v1.2 file de ventes · 🔁 v2.1 : versements crédit en file (2 passes, by-uuid)
      ├─ report.js             # 📄 v1.3→v1.9 · 📤 v2.0 CSV · 🧮 v2.1 bilan hebdo · 📊 v2.2 comparatif boutiques (pack) · 📈 v2.10 rentabilité
      ├─ quotes.js               # 🧾 v2.10 : devis/proforma locaux (brouillons LS cap 50, PDF A5, texte WhatsApp 42 col)
      ├─ automation.js           # 🤖 v1.4→v2.3 : 11 interrupteurs auto (… hebdo, hebdo-thermique, hebdo-email)
      ├─ notifier.js             # 🔔 v1.7 : notifications bureau anti-spam (compteur d'alertes ↑)
      ├─ beep.js                 # 🔊 v1.8 : bip POS au scan (Web Audio, 2 tonalités)
      ├─ scan.js                 # 📸 v2.4 : scan webcam BarcodeDetector (zéro dep, dégradé propre)
      ├─ app.js                # shell sidebar + routeur + gardes + badge alertes + chip hors ligne · 👤 v2.14 : garde rôle client
      └─ screens/              # 22 écrans (login… shopsettings, shoppick v1.3, clientaccount 👤 v2.14)
```

## ✅ Vérifications réalisées (v1.1)

- **Syntaxe** : esbuild sur les **32 fichiers JS → 32/32 OK**
- **i18n** : 464 clés FR = 464 EN (parité exacte) · **430 clés réellement utilisées, 0 manquante**
- **Câblage** : chaque route du routeur a son écran, chaque écran est déclaré dans `index.html`, aucun écran orphelin
- **Smoke test headless** (DOM + fetch simulés) : les **11 nouveaux écrans + Produits + Réglages montent sans erreur** avec des données réalistes
- **v1.2 — tests unitaires headless** : ticket ESC/POS **9/9** ; file hors ligne (sync, doublon `{duplicate:true}`, réseau coupé, 422 conservée, reprise) **7/7**
- **v1.3 — tests unitaires headless** : ticket Z thermique (montants, signature, coupe, HTML) **9/9** ; rapport patron (sections, montants, marges, point de vente) **9/9** ; sélecteur boutique (`needsShopPick`, header `X-Shop-Id` effectif, options rendues) **5/5**
- **v1.4 — tests unitaires headless : 32/32** ✅ : automatisations (statuts `off/no-receipt/no-printer/printed/failed/unavailable/saved`, zéro blocage de la vente ou de la clôture en cas de panne), nom de fichier du jour, `auto:true` côté main, régression rapport manuel (`auto:false` + nom avec période), smoke settings/sale/cash — **+ régression window-attach** : `window.Thermal/OfflineSales/StatReport/Auto` vérifiés présents
- **v1.5 — tests unitaires headless : 22/22** ✅ : prefs `zticket`, Z auto (payload ESC/POS réel « Z DE CAISSE » + coupe, panne non bloquante), badge live (montant, refresh, 403 silencieux, employé sans badge, timer auto-nettoyant + `unref`, flash delta), 3 toggles dans Réglages
- **v1.6 — tests unitaires headless : 20/20** ✅ : raster ESC/POS (en-tête GS v 0, noir/blanc/alpha/padding 8, réduction 480→240, insertion dans buildBytes **sans toucher au flux legacy**), chip alertes (compteur, clic → Alertes, masqué à 0), export comptable (route+contrôleur+BOM/« ; »/ShopScope/mois courant)
- **v1.7 — tests unitaires headless : 25/25** ✅ : notifier (seed anti-spam, ↑→notified, =→same, ↓→silent, denied, test), récap mensuel (label mois, KPI reste = total−payé−points, journal Z + TOTAL, nom PDF), scan inventaires (exact→focus comptage, inconnu→toast), backend summary (route+ShopScope+jours)
- **v1.8 — tests unitaires headless : 22/22** ✅ : badge (champ réel `sales_collected_today` lu, fallback legacy, compteur), récap auto (seed/same/saved/bascule d'année/panne non avancée), bip (2 tonalités 880→1320 Hz, sans AudioContext silencieux), 6 toggles
- **v1.9 — tests unitaires headless : 36/36** ✅ : vendeurs badge (rendu, top 3, clé absente = masqué, format FCFA), étiquette (wrap 2×20 + « … », binaire ESC/POS octet par octet, GS k CODE128 + {B, sans code-barres = sans GS k, code invalide ignoré, XSS échappé, printLabel net/off), pack jour (HTML Z+vendeurs+TOTAL, nom fichier `pack-jour-<date>`, statuts off/no-closing/unavailable/saved/failed jamais bloquant), backend `sales_by_user_today` (agrégat groupé, ShopScope, import User) — **+ régression attrapée par la couverture i18n** : la clé `ap_beep_sub` effacée par mégarde lors de l'insertion des 14 nouvelles clés a été détectée et restaurée (607 = 607, 0 manquante)
- **v2.0 — tests unitaires headless : 29/29** ✅ : comparatif (+25 %/−20 %/⚖️/clé absente/hier=0, badge **et** pack), CSV (BOM, « ; », filtre jour, entêtes localisées, entiers, TOTAL, quoting « Kofi; A », vendeurs/heures, pages multiples), sf:file-save (preload↔main, auto→Rapports, panne CSV non bloquante, ancien main sans handler = PDF seul), logo étiquette (insertion octets après init, absent sans logo, HTML withLogo, printLabel jamais bloqué) · **regain de robustesse QA** : un ancien test confondait le 📈 du titre « graphe 7 jours » avec le comparatif — assertions re-ciblées sur les marqueurs propres à chaque bloc
- **v2.1 — tests unitaires headless : 41/41** ✅ : email (Mailable+vue, %PDF, 422 boss_email, queue/repli sync, chaîne afterClosePack avec data64+CSV mémoire), hebdo (weekKeyOf ISO ven/lun/dim + bascule d'année, seed/same/saved/failed non-avancé, plage from/to backend, bilan semaine passée, récap mensuel inchangé), versements hors ligne (2 passes, map session, by-uuid, duplicate:true, orphelin signalé, réseau re-tombé conservé), réglages (9 toggles, champ email pré-rempli)
- **v2.2 — tests unitaires headless : 31/31** ✅ (`tools/qa-v2.2.js`) : rappel crédits email (commande, seuil existant, no-op sans adresse, queue/repli, planification 10h05), comparatif boutiques (agrégat serveur groupé, section affichée **uniquement si ≥ 2 boutiques**, clé absente → masquée), bilan hebdo thermique (octets ESC/POS vérifiés un à un — init, GS v 0 logo, plage, KPIs, journal Z, solde gras, coupe — HTML 72mm, `printWeekly` off/net avec plage from/to, toggle 10 : off/no-printer/printed/failed, enchaînement PDF→impression fire & forget), réglages ≥ 10 toggles, surveillance `ap_beep_sub`
- **v2.2 — 🛡 régression consolidée : 59/59** ✅ (`tools/qa-regression.js`, **nouveau, dans le repo**) : les batteries historiques v1.0→v2.1 (autrefois dans /tmp, perdues aux purges) sont désormais **pérennes** — ticket/Z/étiquette ESC/POS octet par octet, raster logo, file hors ligne + versements 2 passes, 8 automatisations, pack/CSV/hebdo, X-Shop-Id, 422/401, contrats main/preload/routes
- **v2.4 — tests unitaires headless : 24/24** ✅ (`tools/qa-v2.4.js`) : webcam (sans API/sans détecteur/permission refusée → toasts clairs, détection continu + cooldown, bip réutilisé, single-shot qui stope la piste vidéo, flag Chromium + script chargé), câblage vente/inventaires, export comparatif (bouton, dialogue auto:false, BOM/« ; »/quoting, nom daté), mobile statique (rafale = UNE connexion BT, CODE128 73 + repli, gardes EMPTY/NO_PRINTER, bouton 🏷️, ⌀ panier moyen, CSV + Sharing, traductions 641=641)
- **v2.3 — tests unitaires headless : 29/29** ✅ (`tools/qa-v2.3.js`) : email hebdo (Mailable+blade+recap factorisé, validations, meilleure journée, queue/repli, route), toggle 11 (off/no-data/sent/failed, chaîne bilan→email fire & forget), comparatif vendeurs (≥ 2 → carte, médailles, chiffres par poste, repli « — »), rafale (concat 3× init/coupe, 2 CODE128, sauts de page HTML, UN socket net / UN printSilent, liste vide, bouton branché) · **🐞 bug attrapé** : `esc` perdu dans le refactor de l'étiquette HTML — restauré avant livraison (les étiquettes auraient planté !)
- **v2.5 — tests unitaires headless : 29/29** ✅ (`tools/qa-v2.5.js`) : rafale ×N (2× les octets, sauts de page, bornes 1..20, UN socket), modale quantité, carte comparatif boutiques (≥ 2, CSV `comparatif-boutiques-30d-…csv` ligne « 1;Siège;7;18;50000;350000;70 » exacte, **zéro-régression sans `by_shop`** prouvée), serveur (clé additive, agrégation toutes boutiques SANS `$applyShop`, « Siège », miroir vendeurs), mobile (printZTicket plan PC + gardes, modale ×N, onglet 🏬 + partage)
- **v2.6 — tests unitaires headless : 29/29** ✅ (`tools/qa-v2.6.js`) : serveur (period from/to, inversion, 370 j, repli, **14 bornes hautes injectées**, clé `to` additive), PC stats (démarrage `period=30d` inchangé, `from=…&to=…` sans `period`, marges synchronisées, puce ✕, **CSV datés `2026-07-01_2026-07-15`**, garde dates vides), rafale ruptures (`out_of_stock=1&all=1`, toast 🎉 à vide, bouton thermique-configurée, moteur ×N inchangé, CODE128 conservé), mobile (statsParams/periodKey, puce 📅, validation `AAAA-MM-JJ`, burstList factorisée, 🚨 + `all=1`)
- **v2.11 — tests unitaires headless : 41/41** ✅ (`tools/qa-v2.11.js`) : serveur statique (`Promo.php` : config saine dates strictes écartées, bornes lexicales **incluses**, matchesLine/flagReceiptItems additifs ; `Setting` promo_config TEXTS + cycle_count_daily défaut 0 / LIMITS 0→50 ; `SettingController` règle JSON **explicite** ; `ProductController` appendPromo 2 branches, clés null hors promo ; `ReceiptController` prix par défaut promo **détail, jamais à la place du gros** + drapeaux promos sur **4 surfaces** ; `InventoryController` product_ids additif ≤ 100 → whereIn, absent = catalogue entier ; `ShopController` payload additif ; blades PROMO gardés ×2) · promo.js **module réel exécuté** (promoActive null/0/valeur, effectivePrice promo/normal/**gros intact**, cycleList règle start=(jour×n)%total **par propriétés** — déterminisme strict, tranches disjointes, rebouclement, bornes — waPhoneIntl 223/00223, waLink encodage) · écrans **réels montés** (Produits : 700 F + **800 F barré** + badge ; Seuils : carte 🏷️ + champ tournant + datalist 4 options + **sauvegarde simulée** → PUT promo_config JSON valide promo@700 conservée ; Inventaires : carte n=3 → **clic ✏️ → POST product_ids exact**, carte **masquée à 0**) · thermal **module réel** (ligne « 2x Savon Dettol \*PROMO\* » + « [PROMO] » HTML, ligne sans drapeau intacte) · mobile (utils promo.js **exécuté miroir** — effectivePrice identique, **cycleList identique au PC à date égale**, wa miroirs ; ProductCard barré ; panier 3 sites effectivePrice ; résultat barré détail-only ; relance gardée solde > 0 + tél ; POST product_ids + navigation comptage directe ; reçu WhatsApp suffixe 🏷️) · i18n 746 = 746 + mobile 707 = 707 + version v2.11
- **Syntaxe & i18n (v2.11)** : esbuild **51/51 OK** (36 applicatifs + 2 electron + 13 outils) + **54/54 mobile** (JSX) · **746 = 746** (711 utilisées, 0 manquante) · mobile **707 = 707** · smoke 19/19 · régression 59/59 + v2.2→v2.10 (31+29+24+29+29+28+26+36+39 — **pérennisation** : promo.js ajouté au socle de qa-smoke/qa-v2.9/qa-v2.10, v2.10 totaux ≥ + version regex) · lexer PHP **7/7** fichiers modifiés ✅ · **leçons QA** : ① les écrans lancent `load()` en fire & forget → `sleep(60)` après chaque montage headless ; ② tout module du socle = index.html **ET** chargeurs des batteries ; ③ les codes `ord()` seuls font foi sur les ancrages à caractères échappés — jamais l'affichage terminal JSON-échappé
- **v2.12 — tests unitaires headless : 19/19** ✅ (`tools/qa-v2.12.js`) : serveur statique (`restockForecast` : `by_supplier` demandé **explicitement** → 0 requête sinon, seules lignes `suggested_order > 0`, total par fournisseur, tri desc, repli « Sans fournisseur », clé `suppliers` additive ; blade ticket 80 mm : ligne ↩ gardée + `@php` Σ avoir + bloc AVOIR/TOTAL NET gardés) · thermal PC **module réel exécuté** (ESC : ligne `  <- 1 retourne(s)` sous le seul article retourné + récap « Avoir − 800 F » / « TOTAL NET 5 900 FCFA », TOTAL brut conservé ; HTML : `<tr>` rouge ↩ + lignes Avoir/NET ; **sans retour : byte-identique**, `refunded_qty: 0` = clé absente) · écran Commandes **réel monté** (fetch `days=30 & lead=15 & by_supplier=1` sur la route existante, carte 🚛 Sotuba « Savon ×18 (3 j) » + badge « 25 à commander », carte avant le retour « liste vide », **vieux serveur → carte masquée, écran intact**) · mobile (`receiptText.js` **réel exécuté** : ligne « ↩ 1 retourné(s) » + Avoir − 800 F + TOTAL NET 5 900 F — **🐞 bug attrapé** : le récap était niché dans `if (remaining > 0)`, invisible sur une vente totalement payée → sorti du garde, comme le thermique ; sans retour : texte identique v22 · `PurchaseOrdersScreen` : fetch silencieux + carte JSX `fCard` câblée) · i18n **750 = 750** + mobile **714 = 714** · version v2.12 / v23
- **Syntaxe & i18n (v2.12)** : esbuild **52/52 OK** (36 applicatifs + 2 electron + 14 outils) + **54/54 mobile** (JSX) · **750 = 750** (715 utilisées, 0 manquante) · mobile **714 = 714** · smoke 19/19 · régression 59/59 + v2.2→v2.11 (31+29+24+29+29+28+26+36+39+41 — v2.11 pérennisée : totaux ≥ + version regex) · lexer PHP `ProductController` ✅ + blocs `@php` du blade extraits et validés · **leçons QA** : ① `lr()`/`col()` **paddent** à 42 colonnes → les assertions normalisent aussi les espaces multiples (`sq()`), pas seulement U+202F ; ② le suffixe réel est « F » + « CFA » concaténé = **« 5 900 FCFA »**, jamais « CFA » seul ; ③ ancres de patch **100 % ASCII** (les classes de caractères contenant U+202F littéral se corrompent → `count=0` muet) ; ④ `rfind('});\n')` sur un fichier `rstrip()` sans `\n` final tombe mi-fichier → corruption (attrapée par esbuild, réparée) — toujours ancrer sur un marqueur unique vérifié
- **v2.13 — tests unitaires headless : 42/42** ✅ (`tools/qa-v2.13.js`) : serveur statique (route import **avant** apiResource ; validation **ligne par ligne** = règles StoreProductRequest, ≤ 300, `continue` sur erreur ; rapprochement SKU `mb_strtolower`, **une requête** whereIn + keyBy ; quantité **jamais** en update + mouvement « Import CSV » création ; catégories/fournisseurs par nom créés **seulement** si `create_missing` ; rapport `{created, updated, errors}` ligne fichier réelle +2 ; `credit_schedule` TEXTS + règle JSON **explicite** ; clés additives index clients + `planFor` normalisé/signé ; `PUT` partiel `payment_plan` (`name` sometimes, ≤ 12 dates Y-m-d) ; rappel email J−1 : `plannedRows` demain+retards soldes SUM groupés, **pas** de retour prématuré, Mailable `planned = []`, blade gardée ×2) · **csvimport.js réel exécuté** (`num()` « 1 500 F »/« 1500 FCFA »/« 1.500,50 », **re-import du fichier Export produits** BOM+\\r\\n toutes colonnes mappées + ID/Valeur stock ignorés, virgule anglaise + guillemets, erreurs par ligne + duplicate exclu, headers fatale) · écrans **réels montés** (Produits : bouton 📥 → modale → collage → aperçu 3 lignes → **POST exact** `{rows×3, create_missing:1}` → rapport 2 créés/1 maj/1 erreur + rechargement catalogue ; Clients : badges retard/demain/futur + **soldé masqué**, détail carte chips + ajout → **PUT payment_plan trié sans name** + rafraîchissement réponse ; **vieux serveur : badges & carte masqués, écrans intacts**) · maybeDailyCreditDue **réel** (off/same/sent 2 échéances ≤ demain/none vieux serveur/failed marqueur NON avancé + câblage toggle+boot) · mobile (csvImport **exécuté miroir identique PC** ; ProductsScreen 📥 modale POST slice(0,300) ; CustomerDetail gardée `undefined` + PUT + raccourcis +7/+15/+30 ; CustomersScreen badge couleurs soldé-masqué) · i18n **776 = 776** + mobile **734 = 734** · version v2.13

- **v2.14 — tests unitaires headless : 42/42** ✅ (`tools/qa-v2.14.js`) : serveur comptes clients (ROLE_CLIENT hors ROLES staff · `subscriptionState()` 5 codes + J-7/grâce 3 j · clé **masquée JSON** `$hidden` · fulfillOrder : prolongation base `max(now, fin)`, compte role=client, `email_conflict`, `resetClientPassword`, `clientSubscription`) · **mails** 3 nouveaux + ancien mail à clé **supprimé** + rappel sans clé · **portail** routes /compte + gardes `isClient()` + redirect + dashboard 5 états + checkout pré-rempli · **Google** page GIS + callback code `XXXX-XXXX` **5 min usage unique cache** + verifier tokeninfo+aud · login API 403 `subscription_expired` + `me()` subscription + `exchange` (Cache::pull) · admin web **zéro clé affichée** + flash mot de passe 1× + API fulfillment (password_plain) + projection sans `key` · /verifier-licence → redirect + lang « Mon compte » parité **client_\*** FR/EN + **check_\* morts supprimés** · PDF reçu abonnement · mobile v25 (shareAccount portail, password-reset, onglet 👤, AuthContext subscription+Google code, garde ClientHome, ClientAccountScreen 5 états, LoginScreen code) **770 = 770** · PC (config v2.14, LS_SUB + siteUrl, login Google→exchange, clientaccount refresh /me, routeur client ×2) **796 = 796** · lexer naïf porté en JS **33 fichiers** ✅
- **Syntaxe & i18n (v2.14)** : esbuild **56/56 OK** (38 applicatifs + 2 electron + 16 outils) + **56/56 mobile** (JSX) · **796 = 796** (756 utilisées, 0 manquante) · mobile **770 = 770** · smoke **20/20** · régression 59/59 + v2.2→v2.13 (31+29+24+29+29+28+26+36+39+41+19+42 — **v2.13 pérennisée** : totaux ≥ + version regex) · lexer PHP **~130/139** repo (9 KO = blades hérités jamais retouchés : apostrophes FR + hex CSS, hors périmètre) · **leçons QA** : ④ les apos. FR des blades font échouer un lexer naïf — batteries **portées du même lexer d'états** (squote/dquote/commentaires/#), jamais un comptage brut ; ⑤ écrire `\\App\\` via l'éditeur → **double backslash réel** (parse error) — vérifier les octets `ord()`/repr, pas l'affichage terminal ; ⑥ esbuild apps = `--external:axios` (RN) / outils+electron = `--platform=node`
- **Syntaxe & i18n (v2.13)** : esbuild **54/54 OK** (37 applicatifs + 2 electron + 15 outils) + **55/55 mobile** (JSX) · **776 = 776** (741 utilisées, 0 manquante) · mobile **734 = 734** · smoke 19/19 · régression 59/59 + v2.2→v2.12 (31+29+24+29+29+28+26+36+39+41+19 — **v2.12 pérennisée** : totaux ≥ + version regex) · lexer PHP **7/7** fichiers modifiés ✅ · **leçons QA** : ① les backslashes sont **doublés à l'affichage** des sorties terminal — ne débugger les classes de caractères qu'en `ord()`/comptages Python, jamais à l'œil (fausse alerte « \\u0300 doublé ») ; ② la sortie « sent » d'une automation se teste contre le **scénario complet** des mocks (2 clients éligibles → « 2 échéance(s) », pas 1) ; ③ `vm` : les `const` top-level restent des bindings lexicaux globaux — batteries en identifiants nus
- **v2.10 — tests unitaires headless : 39/39** ✅ (`tools/qa-v2.10.js`) : serveur statique (`LabelController` : param **additif** `stock_qty` booléen — sélect +`quantity`, copies `min(50, max(1, qte))`, plafond planche 422 > 300, rétro-compat copies 1..5 / ids ≤ 60 conservées ; `StatsController` : bloc `by_month` additif — même `$applyShop`, `DATE_FORMAT %Y-%m` as ym, 12 mois glissants, CA net des retours, `orderBy ym`, **absent = 0 requête**) · module devis **réel exécuté** (save : prix 0 nettoyés / qty 0→1 / id `DEV-AAAAMMJJ-###` / cap 50 ; texte 42 col : `*DEVIS N°*` + TOTAL ESTIMÉ gras + « Valable jusqu'au … » +7 j + « non facturé ») · tickets devis **module réel** (octets « *** DEVIS — NON FACTURE *** », **aucune** ligne Payé/Reste, HTML A5 bandeau #7C5CFF + zone signature, nom `devis-DEV-….pdf`) · caisse (bouton 🧾 à côté de Valider, liste en modale, rechargement gardé par `UI.confirm` si panier non vide, qty plafonnée `effQty`, articles manquants → toast) · étiquettes au stock (puce 📦 expansion Σ bornée ≤ 50/produit ≤ 400/rafale, case A4 `stockChk` → `&stock_qty=1` + champ copies désactivé) · rentabilité (`monthShort` FR/EN via Intl selon `I18n.getLang()`, carte réelle **24 barres** rendue au DOM mocké lavande/vert + légende, `saveProfit` → `rentabilite-12mois-….pdf`, **régression vieux serveur sans `by_month`** prouvée) · mobile (module devis exécuté avec **stub FileSystem**, texte miroir PC, option « Au stock » du picker, BarChart vert marge, CSV BOM « ; ») · i18n 728 = 728 + versions v2.10 PC / v21 mobile
- **Syntaxe & i18n (v2.10)** : esbuild **49/49 OK** (35 applicatifs + 2 electron + 12 outils) + **53/53 mobile** (JSX) · **728 = 728** (693 utilisées, 0 manquante) · mobile **699 = 699** · smoke 19/19 · régression 59/59 + v2.2→v2.9 (31+29+24+29+29+28+26+36 — qa-v2.9 pérennisée : totaux ≥, version regex) · PHP lexer 2/2 fichiers modifiés ✅ · **leçons QA** : ① `norm()` en **échappements explicites** `/[ \xa0\u202f]/g` — le littéral U+202F est corrompu par l'outillage ; ② insérer du JSX en sibling d'un ternaire existant = wrapper `<>…</>`, sinon « Expected ")" but found "}" » (StatsScreen)
- **v2.9 — tests unitaires headless : 36/36** ✅ (`tools/qa-v2.9.js`) : serveur statique (`Tva.php` : config JSON + bornes 0-100, résolution produit→catégorie→défaut, formule d'arrondi identique aux clients, tri croissant, vide si désactivée/hors taxe ; `Setting` commission_pct 0→50 + tva_config TEXTS ; `SettingController` : règle JSON **explicite** — sinon la clé serait silencieusement ignorée ; `/shop` additif ; reçus ×3 ventilés ; blades gardés ; CSV + bloc commissions **seulement si pct > 0**), ticket thermique **module réel** (tva null = **byte-identique** v2.8, lignes « dont HT 3 559 FCFA »/« dont TVA 18% 641 FCFA », HTML gardé, `printById` câblé), caisse PC **écran réel** (catalogue mocké, recherche « Savon » → clic → panier : vignettes 30/26 px + estimation « dont TVA 18 % · 122 F », **Riz 0 % → aucune ligne**), modal reçu **écran réel** (« dont HT / dont TVA 18 % » entre TOTAL et Payé), rapport **module réel** (encart « ② bis Commissions (5 %) » + 30 000 F ; absent sans clé), objectifs **écran réel** (💰 « com. 30 000 F » sous Awa ; 0 → carte intacte sans 💰), réglages **écran réel + sauvegarde simulée** (carte Multi-TVA + 2 catégories, PUT /settings avec `enabled:true` ET exceptions produit `{"5":10}` **préservées**), reçu WhatsApp mobile **utilitaire réel exécuté** (avec tva : lignes après TOTAL ; sans : **texte identique v19**), mobile statique (vignettes, tvaLines miroir, 💰 com_month, feuille d'actions câblée)
- **Syntaxe & i18n (v2.9)** : esbuild **47/47 OK** (34 applicatifs + 2 electron + 11 outils) + **52/52 mobile** (JSX) · **692 = 692** (657 utilisées, 0 manquante) · mobile **676 = 676** · smoke 19/19 · régression 59/59 + v2.2→v2.8 (31+29+24+29+29+28+26 — qa-v2.7 pérennisée : borne by_shop déplacée au marqueur commissions, qa-v2.8 pérennisée : totaux i18n ≥) · PHP lexer **119/119** ✅ · **leçon QA** : les montants `Intl fr-FR` groupent en **espace fine U+202F** — les batteries normalisent avant assertion (le 🧾 et le 🖨 le montrent)
- **v2.8 — tests unitaires headless : 26/26** ✅ (`tools/qa-v2.8.js`) : serveur statique (`seller_goals` : réglage lu avec défaut 0 → **requête SQL non émise**, mois calendaire, CA net, `$applyShop`, % arrondi, limite 20, clé additive ; `Setting` : DEFAULTS + LIMITS 0→100 M), carte objectifs **écran réel** (affichée à cible 500 000, 🎉 « Atteint ! » à 120 %, 50 % visible, **absente à cible 0**), chip badge **écran réel** (`restock-forecast` appelé non bloquant, « ⏳ … sous 7 j » avec 2/3 produits ≤ 7 j, clic → Alertes), notif du matin **module réel** (sent + titre « 3 » inchangé, corps enrichi « 2 sous 7 j », anti-spam `same` conservé), reçu WhatsApp **utilitaire réel exécuté** (gras boutique, colonnes 42, TOTAL gras, bloc crédit Payé/Reste ⚠️/✅, partage fiche système, annulation silencieuse), mobile statique (objectifs ≥ 1 & cible > 0, barre min 4 %, chip dashboard → Alerts)
- **Syntaxe & i18n (v2.8)** : esbuild **46/46 OK** (34 applicatifs + 2 electron + 10 outils) + **51/51 mobile** (JSX) · **682 = 682** (647 utilisées, 0 manquante) · mobile **672 = 672** · smoke 19/19 · régression 59/59 + v2.2→v2.7 (31+29+24+29+29+28, qa-v2.5 bornée sur v2.7/v2.8) · PHP lexer **128/128** ✅ · **leçon QA** : les montants `Intl fr-FR` utilisent l'**espace fine U+202F** — les batteries normalisent avant assertion
- **v2.7 — tests unitaires headless : 28/28** ✅ (`tools/qa-v2.7.js`) : serveur statique (matrice cross : jointure users, groupBy 3 colonnes, CA net retours déduits, NON bornée par `$applyShop`, pivot trié par total, clé additive ; `recapData` + `by_shop` COMPLETED/LEFT JOIN/« Siège »/part % ; blade email : section ≥ 2 boutiques, gabarits équilibrés), heatmap PC **écran réel** (carte affichée, case max alpha 0.75 vérifiée, case vide « · », ligne TOTAL 280/160/440 000, **zéro-régression sans cross/by_shop**), pack hebdo PC **module réel** (« ① bis » + Sotuba + TOTAL 100 % + 66.7 % ; absent sans `by_shop`), ruptures du matin **module réel** (OFF par défaut, `off`/0 réseau, `sent`+compteur « 3 », anti-spam `same`, panne → `failed` + marqueur NON avancé, `none` jour marqué, lendemain « 5 », câblage boot 10 s + toggle 12 + `fire` dans le return map), mobile statique (cross `?? []`, gardien ≥ 2 × ≥ 2, shopNameOf « Siège », slice 8)
- **Syntaxe & i18n (v2.7)** : esbuild **45/45 OK** (34 applicatifs + 2 electron + 9 outils) + **50/50 mobile** (JSX) · **675 = 675** (640 utilisées, 0 manquante) · mobile **662 = 662** · smoke 19/19 · régression 59/59 + v2.2 31/31 + v2.3 29/29 + v2.4 24/24 + v2.5 29/29 + v2.6 29/29 (3 checks v2.6 pérennisés : totaux i18n, version, bornes $to) · PHP lexer **128/128** ✅ + blades équilibrés ✅ · **🐞 1 bug attrapé par la batterie** avant livraison : les 4 clés EN `ap_outstock*` étaient empilées dans le bloc FR (doublons silencieux) — déplacées dans le bloc EN
- **Syntaxe & i18n (v2.6)** : esbuild **44/44 OK** (36 applicatifs + 7 outils) + **50/50 mobile** (JSX) · **668 = 668** · mobile **660 = 660** · smoke 19/19 · régression 59/59 + v2.2 31/31 + v2.3 29/29 + v2.4 24/24 + v2.5 29/29 (4 checks pérennisés : burstList + totaux i18n) · PHP lexer **128/128** ✅
- **Syntaxe & i18n (v2.5)** : esbuild **43/43 OK** (36 applicatifs + 7 outils) + **50/50 fichiers mobile** (loader JSX) · **660 clés FR = 660 EN** — 625 utilisées, 0 manquante · mobile **651 = 651** · smoke **19/19** · régression 59/59 + v2.2 31/31 + v2.3 29/29 + v2.4 24/24 (3 checks pérennisés pour la modale quantité & le nouveau total i18n) · PHP serveur : **1 seul fichier modifié** (StatsController, lexer ✅) + Blade 30/30
- **Syntaxe & i18n (v2.4)** : esbuild **42/42 OK** (37 applicatifs + 5 outils) + **50/50 fichiers mobile** (loader JSX) · **654 clés FR = 654 EN** — 619 utilisées, 0 manquante · smoke **19/19** · régression 59/59 + v2.2 31/31 + v2.3 29/29 · PHP serveur **inchangé** (130/130 ✅)
- **Syntaxe & i18n (v2.3)** : esbuild **40/40 OK** · **645 clés FR = 645 EN** — 612 utilisées, 0 manquante · lexer PHP **130/130 ✅** + Blade **30/30 ✅** · smoke **19/19** · régression 59/59 + v2.2 31/31 (version pérennisée)
- **Syntaxe & i18n (v2.2)** : esbuild **39/39 OK** (35 applicatifs + 4 outils QA) · **637 clés FR = 637 EN** — 604 utilisées, 0 manquante · lexer PHP maison (machine à états : chaînes, commentaires, échappements, U+2019) **129/129 ✅** + équilibre Blade **29/29 ✅** · smoke **19/19** · routes↔écrans↔index.html ✅
- **Syntaxe & i18n (v2.1)** : esbuild **36/36 OK** · **633 clés FR = 633 EN** — 0 manquante · tokenizer PHP ✅ (7 fichiers serveur + routes) · smoke **19/19** · batteries v1.1→v2.0 toutes vertes (qa10 pérennisé : version non épinglée)
- **Non-régression** : batteries v1.1 (smoke 11/11 écrans), v1.2 (offline 7/7) et v1.3 (Z/rapport/shoppick) toutes vertes
- **🎁 Bonus** : `node tools/qa-smoke.js` — smoke test headless inclus (zéro dépendance) qui monte **les 19 écrans applicatifs** avec une API factice et vérifie qu'aucun ne plante ; relance-le après chaque modif : `19/19 écrans rendus` aujourd'hui ✅

### ⚙️ Mise à jour v1.2 → v1.3

```bash
cd stock-pc && git pull (ou recopier les fichiers)  # → npm start, rien d'autre
# côté serveur : recopier UNIQUEMENT stock-api/app/Support/ShopScope.php (pas de migration)
```

### ⚙️ Mise à jour v2.0 → v2.1

```bash
cd stock-pc && git pull && npm start   # main.js renvoie désormais data64 en mode auto (email)
# côté SERVEUR : recopier 7 fichiers (2 NOUVEAUX) :
#   app/Support/Setting.php                                          (+ TEXTS/getText boss_email)
#   app/Http/Controllers/Api/SettingController.php                   (+ champ email patron)
#   app/Http/Controllers/Api/ReceiptController.php                   (+ addPaymentByUuid, anti-double)
#   app/Http/Controllers/Api/AccountingExportController.php          (+ emailPack, récap from/to)
#   app/Mail/DailyPackMail.php                                       (NOUVEAU)
#   resources/views/emails/daily_pack.blade.php                      (NOUVEAU)
#   routes/api.php                                                   (+2 routes)
#   → php artisan route:clear — toujours AUCUNE migration
# Mail : ton .env MAIL_* existant suffit ; QUEUE_CONNECTION=sync = envoi immédiat (repli auto si file HS)
# Puis : 🎯 Seuils → renseigne « Email du patron » + ⚙️ Réglages → active les 2 nouveaux toggles
```

### ⚙️ Mise à jour v2.1 → v2.2

```bash
cd stock-pc && git pull && npm start   # renderer seul : thermal/automation/report/i18n/config/screens
# côté SERVEUR : recopier 5 fichiers (3 NOUVEAUX) :
#   app/Console/Commands/CreditsRemindEmail.php                      (NOUVEAU — digest crédits 10h05)
#   app/Mail/CreditReminderMail.php                                  (NOUVEAU)
#   resources/views/emails/credit_reminder.blade.php                 (NOUVEAU)
#   routes/console.php                                               (+1 ligne planifiée, dailyAt 10:05)
#   app/Http/Controllers/Api/CashOperationController.php             (+ sales_by_shop_today)
#   → php artisan route:clear par sécurité — toujours AUCUNE migration
# Cron : RIEN à faire — ton entrée schedule:run existante exécute la nouvelle ligne tout seule.
# Test à la main : php artisan credits:remind-email   (no-op tant que boss_email est vide)
# Puis : ⚙️ Réglages → 🤖 Automatisations → active le 10ᵉ toggle « Bilan hebdo → thermique »
```

### ⚙️ Mise à jour v2.2 → v2.3

```bash
cd stock-pc && git pull && npm start   # renderer : automation, thermal, stats, products, settings, i18n, config
# + nouvelles icônes : electron/icon.png & icon.ico déjà en place → npm run pack:win… pour graver
# côté SERVEUR : recopier 4 fichiers (2 NOUVEAUX) :
#   app/Mail/WeeklyRecapMail.php                                   (NOUVEAU — bilan hebdo)
#   resources/views/emails/weekly_recap.blade.php                  (NOUVEAU)
#   app/Http/Controllers/Api/AccountingExportController.php        (recapData factorisé + emailWeekly)
#   routes/api.php                                                 (+1 route)
#   → php artisan route:clear && php artisan cache:clear — toujours AUCUNE migration
# Icônes site ✨ : recopier public/ (icon.svg, favicon*, icon-*, manifest) — layouts déjà branchés
# Icônes mobile 📱 : recopier stock-app/assets/ dans ton projet Expo + app.json (voir brand/README.md)
# Puis : ⚙️ Réglages → 🤖 Automatisations → active le 11ᵉ toggle « Bilan hebdo → email »
```

### ⚙️ Mise à jour v2.3 → v2.4

```bash
cd stock-pc && git pull && npm start   # renderer (scan, sale, inventories, stats, i18n, config) + main.js (flag caméra)
# côté SERVEUR : RIEN à recopier — 0 fichier, 0 route, 0 migration. 🎉
# Mobile 📱 : recopier stock-app/ (thermalPrinter, ProductsScreen, StatsScreen, translations)
#   dans ton projet Expo — la rafale Bluetooth exige le dev build (comme le ticket v5) ; aucune nouvelle dépendance npm
# Rien à activer : 📸 apparaît en Caisse & Inventaires ; 📤 Exporter dans Stats → carte comparatif ;
#   mobile : 🏷️ dans Produits + 📤 dans Stats → onglet Vendeurs
```

### ⚙️ Mise à jour v1.9 → v2.0

```bash
cd stock-pc && git pull && npm start   # le nouveau main.js embarque sf:file-save (CSV)
# côté SERVEUR : recopier 2 fichiers :
#   stock-api/app/Http/Controllers/Api/CashOperationController.php  (+ sales_yesterday)
#   stock-api/app/Http/Controllers/Api/ReceiptController.php      (+ customer eager-loadé, additif)
#   → php artisan route:clear par sécurité — toujours AUCUNE migration ni route nouvelle
```

### ⚙️ Mise à jour v1.8 → v1.9

```bash
cd stock-pc && git pull && npm start
# côté SERVEUR (vendeurs du badge + pack jour) : recopier
#   stock-api/app/Http/Controllers/Api/CashOperationController.php  (+ sales_by_user_today)
#   → rien d'autre, toujours aucune migration
# Réglages → 🤖 Automatisations → active « Pack jour PDF auto » si tu veux le récap quotidien à la clôture
```

### ⚙️ Mise à jour v1.7 → v1.8

```bash
cd stock-pc && git pull && npm start
# côté SERVEUR (compteur badge) : recopier
#   stock-api/app/Http/Controllers/Api/CashOperationController.php  (+ sales_count_today)
#   → rien d'autre, toujours aucune migration
```

### ⚙️ Mise à jour v1.6 → v1.7

```bash
cd stock-pc && git pull && npm start
# côté SERVEUR (récap PDF) : recopier DE NOUVEAU
#   stock-api/app/Http/Controllers/Api/AccountingExportController.php  (summary ajouté)
#   stock-api/routes/api.php                                          (1 route)
#   → php artisan route:clear (toujours aucune migration)
# Réglages → 🤖 Automatisations → active « Alertes stock en notification bureau » si tu veux les toasts Windows
```

### ⚙️ Mise à jour v1.5 → v1.6

```bash
cd stock-pc && git pull && npm start
# côté SERVEUR (exports comptables) : recopier
#   stock-api/app/Http/Controllers/Api/AccountingExportController.php  (nouveau)
#   stock-api/app/Models/CashOperation.php + CashClosing.php          (relation shop())
#   stock-api/routes/api.php                                          (1 route)
#   → php artisan route:clear && php artisan cache:clear (pas de migration)
# Réglages → Impression thermique → ☑ « Logo boutique sur le ticket » (activé par défaut)
```

### ⚙️ Mise à jour v1.4 → v1.5

```bash
cd stock-pc && git pull && npm start   # serveur : RIEN à faire
# Réglages → 🤖 Automatisations → active « Z thermique auto » si tu veux la clôture 100 % papier-signé
```

### ⚙️ Mise à jour v1.3 → v1.4

```bash
cd stock-pc && git pull (ou recopier les fichiers)  # → npm start, rien d'autre
# côté serveur : RIEN à faire (les automatisations sont 100 % locales au poste)
# puis : ⚙️ Réglages → 🤖 Automatisations → active les 2 interrupteurs voulus
```

55. **Objectifs vendeurs** 🏆 : recopie les 2 fichiers serveur (`StatsController.php`, `Support/Setting.php`, 0 migration) → 🎯 Seuils → renseigne « Objectif CA mensuel par vendeur » (ex. 500 000) → vends avec 2 comptes → 📊 Statistiques → carte **« 🏆 Objectifs vendeurs du mois »** : barres + % qui montent à chaque vente → dépasse la cible avec un compte → barre verte + **🎉 « Atteint ! »** → remets la cible à 0 : la carte disparaît proprement ✅
56. **Prévisions en surface** 📉 : mets un produit à stock faible avec quelques ventes récentes (ou baisse son stock vite) → dashboard : le chip **« ⏳ N épuisé(s) sous 7 j »** apparaît à côté du chip 📦 → clic → Alertes/Prévisions → toggle « Ruptures du matin » ON + redémarrage : la notification cite aussi la fourchette « et M épuisé(s) sous 7 j » ✅
57. **Reçu WhatsApp** 🧾📱 : fais une vente sur mobile → feuille d'actions → **« 🧾 Envoyer le reçu (WhatsApp) »** → choisis WhatsApp → le texte arrive chez le client : boutique en gras, articles alignés, TOTAL gras, **Payé / Reste à payer** si crédit → refais-le depuis l'historique (Reçus → reçu → mêmes actions) ✅
58. **Photos en caisse** 📸 : fiche produit (PC ou mobile) → ajoute une photo → caisse PC : tape le nom → la carte de résultat affiche la **vignette 30 px** → ajoute → ligne panier avec **vignette 26 px** ; mobile : pareil dans **Nouvelle vente** (34 px / 30 px) → produit sans photo : 📦 comme avant, rien ne casse ✅
59. **Multi-TVA** 🧮 : recopie les **8 fichiers serveur** (dont le NOUVEAU `app/Support/Tva.php` — 0 migration, 0 route) → `php artisan config:clear && php artisan view:clear` → 🎯 Seuils → carte **« 🧮 Multi-TVA »** → active + taux par défaut 0 + **18 %** sur une catégorie → 💾 → caisse : vends un article de cette catégorie (ex. 800 F) → estimation **« dont TVA 18 % · 122 F »** sous le total → valide → ticket thermique ET PDF : lignes **« dont HT / dont TVA 18 % »** après le TOTAL → 📜 Reçus → 👁 : mêmes lignes dans le détail → mobile : partage WhatsApp ventilé + estimation panier → export comptable du mois : colonnes **« dont HT (F) » / « dont TVA (F) »** en plus → décoche la case : tout redevient exactement comme avant ✅
60. **Commissions vendeurs** 👥 : 🎯 Seuils → **« Commission vendeurs (% du CA) »** = 5 → 💾 → vends avec 2 comptes → 📊 Statistiques (PC & mobile) : sous chaque vendeur de la carte Objectifs, **💰 « com. 30 000 F »** (CA du mois × 5 %) → Rapports → rapport du mois : encart **« ② bis — 👥 Commissions (5 %) »** avec le total → remets 0 : 💰 et l'encart disparaissent proprement ✅
61. **Devis / proforma** 🧾 : en caisse, monte un panier (2 articles + un client) → clique **« 🧾 Devis »** → **➕ Enregistrer** → la modale liste le brouillon `DEV-…` → teste les 3 surfaces : 📄 **PDF A5** (`devis-DEV-….pdf`, bandeau violet + zone signature + « non facturé »), 💬 **texte WhatsApp** (42 col, prêt à coller), 🖨 **ticket 80 mm** (« *** DEVIS — NON FACTURE *** », sans Payé/Reste) → laisse un panier non vide → **↩️ recharger** le devis → confirmation demandée → panier remplacé, quantités plafonnées au stock, client restauré → valide ensuite la vente : le devis n'a **jamais** touché ni le stock ni la caisse ✅
62. **Étiquettes au stock réel** 📦 : recopie `LabelController.php` (0 migration, 0 route — paramètre additif `stock_qty`) → Produits → **Rafale** → puce **« 📦 Au stock »** : le total annoncé = Σ des stocks bornés (≤ 50/produit, ≤ 400/rafale) → **un seul envoi** thermique avec exactement 1 étiquette par unité → mobile : même option dans le picker de quantité (une connexion BT) → planche A4 : coche **« copies = stock actuel »** → le PDF sert N étiquettes par produit (plafond 300/planche) → sans la case ni la puce : comportement **strictement identique** à la v2.9 ✅
63. **Rentabilité 12 mois** 📊 : recopie `StatsController.php` (0 migration, 0 route — clé additive `by_month`) → **config:clear** par précaution → 📊 Statistiques → onglet **💰 Marges** → carte **« 📈 Rentabilité sur 12 mois »** : 3 chiffres (marge, taux moyen, meilleur mois) + **double barres** CA/marge mois par mois → bouton **📄 PDF** → `rentabilite-12mois-….pdf` pour le patron → mobile v21 : même bloc + graphe vert + **CSV** partageable → bascule EN : les mois suivent la langue → vieux serveur ou < 2 mois de ventes : carte simplement absente, zéro erreur ✅
64. **Prix promo datés** 🏷️ : recopie les **9 fichiers serveur** (dont le NOUVEAU `app/Support/Promo.php` — 0 migration, 0 route) → `php artisan config:clear && php artisan view:clear` → 🎯 Seuils → carte **« 🏷️ Promos datées »** → choisis un produit (datalist), prix promo, début aujourd'hui → fin du mois → 💾 → Produits : **prix barré + badge** ; caisse : la ligne prend le prix promo → vends → ticket `*PROMO*` + badge sur le PDF → mobile : prix barré au catalogue & à la vente → **remets la date de fin à hier** → 💾 → le prix normal est revenu partout, tout seul ✅
65. **Inventaire tournant** 📦 : 🎯 Seuils → **« Inventaire tournant (produits/jour) »** = 5 → 💾 → Inventaires (PC & mobile) : carte **« Comptage du jour »** avec les 5 produits du jour + stock attendu → **✏️** → inventaire créé avec ces 5 lignes **seulement** → l'écran de comptage s'ouvre directement → reviens demain : **5 autres produits** (la rotation couvre tout le catalogue) → remets 0 : la carte disparaît proprement ✅
66. **Relance crédit WhatsApp** 🔔 : client avec un crédit restant + un téléphone (ex. 70 44 33 22) → fiche client (PC ou mobile) → **« 🔔 Relancer sur WhatsApp »** → WhatsApp s'ouvre avec « Bonjour X, il vous reste 5 000 F à régler auprès de … » **déjà écrit** (+223 ajouté tout seul) → envoie ✅
67. **Prévisions d'achat par fournisseur** 📊 : recopie les **2 fichiers serveur** (`ProductController.php`, `sale-ticket.blade.php` — 0 migration, 0 route) → `php artisan config:clear && php artisan view:clear` → 🛒 **Commandes** → carte **« 🚛 Prévisions d'achat par fournisseur »** en haut : 🚛 chaque fournisseur avec ses articles ×N (jours restants) + badge **« N à commander »** pour 15 j de couverture — vérifie avec un produit qui se vend vite (stock presque vide) → mobile : même carte dans Commandes (v23) → **vieux serveur** (sans le fichier) : la carte est simplement **masquée**, l'écran reste intact ✅
68. **Avoirs sur les reçus** 🧾 : fais une vente de 2 articles (ex. 2× Savon 800 F + 1× Riz 5 100 F) → 📜 Reçus → **avoir partiel** sur 1 savon → 🖨 **ticket thermique** : ligne `  <- 1 retourne(s)` sous le savon + **« Avoir (retours) − 800 F » / « TOTAL NET 5 900 FCFA »** après le TOTAL → 📄 **ticket PDF 80 mm** : `↩ 1 retourné(s) remboursé(s)` en rouge + mêmes lignes Avoir / TOTAL NET → 📱 mobile : partage WhatsApp → « ↩ 1 retourné(s) » + TOTAL NET dans le texte → refais une vente **sans retour** : ticket et reçu **strictement identiques à avant** ✅
69. **Import CSV en masse** 📥 : recopie les **8 fichiers serveur** (1 route nouvelle, 0 migration) → `php artisan config:clear && php artisan route:clear && php artisan view:clear` → Produits → **« 📥 Importer »** → choisis **l'export produits StockFlow** (ou colle ce tableau : `Nom;SKU;Prix achat;Prix vente;Quantité` + 2 lignes, dont 1 avec un SKU déjà en boutique et 1 sans nom) → **aperçu** : 2 lignes valides + 1 erreur « nom requis » avec son n° de ligne → **Importer** → rapport `✅ 1 créé(s) · 1 mis à jour · 1 erreur(s)` → le nouveau produit est là, l'existant a ses nouveaux prix **mais son stock intact** (quantité = créations seules) → mobile : bouton 📥 en haut de Produits → colle le même tableau → importe → même rapport (mobile = collage uniquement) ✅
70. **Échéancier de rappels crédit** 💳 : client avec un crédit → fiche (PC ou mobile) → carte **« 💳 Échéancier »** → **+15 j** → la date apparaît en puce → liste Clients : badge **« 📅 dans 15 j »** à côté du solde → remets une date **passée** → badge rouge **« N j de retard »** → lance `php artisan credits:remind-email` (boss_email configuré) : l'email part même sans crédit ancien, avec la section **« 📅 Rappels planifiés »** (retards d'abord, J−1 ensuite — solde réel recalculé) → règle une date à **demain** : elle y sera demain matin → Réglages → active **« Échéances crédit du matin »** → relance le PC : notification native groupée → solde le crédit (versement) : badge et rappels **disparaissent** → vieux serveur : carte et badges simplement masqués ✅

71. **Achat → compte client (remplace la clé)** 👤 : recopie les **fichiers serveur** (listés dans le récap v2.14) + config/route/view clear → sur le **site**, achète une formule (checkout) → admin web (ou mobile) **valide le paiement** → le client reçoit un **email « 👤 Votre compte StockFlow »** (portail + email + mot de passe `xxxxx-xxxxx`) → le mot de passe s'affiche **1× en haut** du panneau admin — partage-le par WhatsApp → sur **`/compte`** le client se connecte : badge **🟢 Actif — N jour(s)**, formule, fin, commande + **reçu PDF** → `GET /verifier-licence` **redirige** vers la connexion ✅
72. **Renouvellement = prolongation + blocage après grâce** 🔁 : remets une commande **avec le même email** → valide → au portail la date de fin a **glissé** (prolongation, mot de passe **inchangé**, email « 🔁 prolongé ») → via tinker, règle `expires_at` à **dans 5 jours** : portail et app affichent **🟠 Expire bientôt J-5** → règle-la à **hier** : **🟠 Grâce (3 j)** — connexions encore OK → règle-la à **il y a 5 jours** : `/api/login` répond **403 « abonnement expiré »** (mobile/PC), le portail affiche **🔴 bloqué + CTA renouveler** → revalide : tout repart ✅
73. **Compte dans les apps + Google** 📱🖥🇬 : dans l'**app mobile**, connecte l'**email client + mot de passe** → l'écran **« 👤 Mon abonnement »** remplace la caisse (badge, renouvellement → portail, déconnexion) → même chose sur **PC** (écran dédié) → côté admin mobile, onglet **👤 Abonnements** → **🔑↻ Mot de passe** sur un client → nouveau mot de passe affiché + **« 📤 Partager au client »** → pour Google : `GOOGLE_CLIENT_ID` dans le `.env` (origine autorisée = ton domaine) → bouton **« Continuer avec Google »** visible sur `/compte/connexion` **et** dans les apps (navigateur → **code 5 min** → coller → connecté) → **sans** la variable : boutons masqués, email/mot de passe inchangé ✅

## ⚠️ Limites connues (transparence)

- **Pas de test GUI possible ici** : je ne peux pas lancer Electron dans ce bac à sable — le rendu visuel réel (fenêtrage, impression) doit être validé avec le scénario de test ci-dessous.
- Backend **v14+ recommandé** : Transferts/Alertes par emplacement utilisent les routes v13/v14 ; sur un backend plus ancien ces écrans afficheront une erreur propre (`404/403`), sans impacter le reste.
- **Impression thermique** : ✅ v1.2 — le canal réseau exige une imprimante **avec port Ethernet/Wi-Fi** ; en USB il faut le pilote OS installé (canal silencieux). Ticket en **ASCII** (accents simplifiés) par compatibilité ESC/POS ; le PDF garde tous les accents.
- **Mode hors ligne** : ✅ v1.2 pour **les ventes uniquement** — le catalogue/prix affichés datent de la dernière synchro, le stock vendu en double depuis deux postes ne sera bloqué qu'au moment de la synchronisation (l'erreur apparaît alors dans Réglages → Mode hors ligne).
- **Scan webcam (v2.4+)** : exige une webcam + Chromium compatible `BarcodeDetector` (flag activé au démarrage) ; en cas d'échec (permission refusée, pas de caméra, détecteur absent), toast clair et la **douchette USB reste le canal principal**.

## 🧪 Scénario de test conseillé (10 min)

1. `npm install && npm start` → login `admin@stockflow.app` / `password`
2. **Vente** : scanner/taper un produit → valider → télécharger le ticket 80mm
3. **Reçus** : ouvrir le reçu créé → 💳 versement partiel → ↩️ **avoir partiel** (1 article) → vérifier dans *Caisse* et *Produits* que le stock est revenu
4. **Transferts** : ＋ envoyer 2 produits du siège vers une boutique → badge 🚚 → ouvrir le détail → **✓ Réceptionner** → badge ✓ (vérifier les stocks par emplacement dans Produits/Alertes 📍)
5. **Commandes** : ✨ Générer les réassorts → ouvrir un brouillon, ajuster une quantité 💾 → ✉️ Envoyer → 📥 Réceptionner **partiellement** → statut 📥 Partielle → 📄 PDF
6. **Inventaires** : ＋ créer → compter 2 produits (un via la recherche) → ✅ Clôturer → noter le résumé `Δ` et vérifier les quantités
7. **Produits** : 🏷️ Étiquettes → cocher 5 produits, 2 exemplaires, 3 par ligne → PDF A4
8. **Stats** : basculer 7 j → vérifier cartes + barres → 📊 Export Excel
9. **Utilisateurs** : créer un employé rattaché à une boutique → se connecter avec → vérifier que Transferts/Stats/Caisse **n'apparaissent pas**
10. **Seuils** 🎯 : changer `credit_reminder_days` → Enregistrer → vérifier sur mobile que la valeur est prise en compte (même base !)
11. **Impression thermique** 🖨 : Réglages → choisir *Réseau* + l'IP de l'imprimante (ou *Système* + l'imprimante installée) → **Tester l'impression** → vendre → bouton **🖨 Ticket thermique** dans le reçu
12. **Mode hors ligne** 📡 : couper le réseau (débrancher) → vendre 2 produits → badge 📡 orange + toast *vente en file* → rebranchez → **compte à rebours 45 s max** → la vente apparaît dans Reçus (et dans *Caisse*) — vérifiez aussi la carte Mode hors ligne dans Réglages
13. **Point de vente** 🏬 : recopie `ShopScope.php` → déconnecte-toi → au login (admin) choisis une boutique → vends 1 produit → sur le mobile, le mouvement est taggé de cette boutique ✨
14. **Z thermique** 🖨 : Caisse → clôturer → fenêtre d'actions → **Z thermique** → vérifie aussi la 🔒 Historique des Z (réimpression)
15. **Rapport patron** 📄 : Statistiques → période 30 j → **Rapport patron** → enregistre le PDF → ouvre-le (logo, 5 sections, marges)
16. **Ticket auto** 🤖 : Réglages → Automatisations → active *Ticket auto* (imprimante configurée) → vends 1 produit → le ticket sort **tout seul**, sans toucher aucun bouton → désactive → revends → rien ne s'imprime ✅
17. **Rapport auto à la clôture** 🤖 : active *Rapport patron PDF auto* → Caisse → clôturer → pendant que la fenêtre du Z s'affiche, le toast confirme l'enregistrement → ouvre `Documents/StockFlow/Rapports/rapport-stockflow-<date>.pdf` → re-clôture (2ᵉ Z test) → même fichier, remplacé, pas de doublon de dialogue
18. **Z thermique auto** 🖨 : active *Z thermique auto* → clôture → le Z sort **tout seul** pendant que la fenêtre d'actions reste ouverte (réimpression manuelle toujours possible)
19. **Badge EN DIRECT** ⚡ : ouvre le dashboard sur un 2ᵉ poste (ou garde-le visible) → vends un produit sur la caisse → en 30 s max, le chiffre **flash en vert** avec « +X F 🎉 » — vérifie aussi qu'un compte employé ne voit pas le badge
20. **Export comptable** 🧾 : recopie les 4 fichiers serveur + `route:clear` → Statistiques → mois courant → **📦 Tout exporter** → ouvre `ventes-….csv` dans Excel : colonnes propres, accents OK (BOM), un reçu par ligne
21. **Logo thermique** 🖼 : upload un logo (🎯 Seuils) → Réglages → Impression thermique (logo coché) → vends → le ticket sort avec le **logo en tête**, même sur le Z
22. **Chip alertes** 📦 : mets un produit sous son seuil → badge live : chip rouge « 📦 1 en alerte » → clic → tu arrives sur Alertes
23. **Récap mensuel** 📄 : Statistiques → carte Export comptable → **Récap PDF** → ouvre `recapitulatif-….pdf` : KPI du mois + journal des Z jour par jour ✅
24. **Notification bureau** 🔔 : active le 4ᵉ toggle → baisse un stock sous son seuil (ou vends jusqu'à rupture) → en 45 s max, toast Windows « 📦 N produit(s) en alerte » → clic ouvre Alertes
25. **Scan inventaire** 🔫 : Inventaires → ✏️ sur un inventaire en cours → scanne un code-barres → la ligne s'ouvre, curseur dans la quantité → tape le compté → enchaîne
26. **Compteur badge** 🧾 : recopie `CashOperationController.php` → dashboard → le badge affiche « 🧾 N vente(s) aujourd'hui » **et le vrai CA du jour** (plus le 0 F !) — vends → +1 et le montant flash
27. **Récap auto 1er** 📅 : active le 5ᵉ toggle → astuce test : change la date du PC au 1er du mois suivant + redémarre l'app → `Documents/StockFlow/Rapports/recapitulatif-<mois passé>.pdf` apparaît sans dialogue
28. **Bip scan** 🔊 : active le 6ᵉ toggle → scanne en vente : bip-bip 💚
29. **Pack jour auto** 📦 : active le 7ᵉ toggle → Caisse → clôture → toast « Pack du jour enregistré » → ouvre `Documents/StockFlow/Rapports/pack-jour-<date>.pdf` : KPI du jour, **tableau des vendeurs**, bloc Z signé — re-clôture → même fichier remplacé, pas de doublon
30. **Étiquette thermique** 🏷️ : thermique configurée → Produits → bouton **🏷️** sur une ligne avec code-barres → étiquette : nom, prix en gros, **code-barres scannable** (teste-le avec la douchette !) → ligne sans code-barres → étiquette texte simple
31. **Vendeurs en direct** 👥 : recopie le contrôleur serveur → vends avec 2 comptes différents → badge dashboard : lignes « 👤 … · N vente(s) · montant » qui montent toutes seules au refresh 30 s
32. **CSV du pack** 📤 : 7ᵉ toggle ON → clôture → **2 toasts** (PDF ✅ + CSV 📤) → ouvre `Documents/StockFlow/Rapports/ventes-jour-<date>.csv` dans Excel : en-têtes FR, montants entiers, ligne TOTAL, accents parfaits (BOM)
33. **Comparatif vs hier** 📊 : recopie les 2 contrôleurs → dashboard : « 📈 +X % vs hier » en vert → refais une journée plus calme → « 📉 −X % » rouge → vérifie la même ligne dans le pack jour PDF
34. **Logo étiquette** 🖼 : logo boutique uploadé (🎯) + checkbox logo ON → 🏷️ sur un produit → l'étiquette sort **avec le logo en tête** → décoche la checkbox → étiquette texte simple (v1.9)
35. **Email pack** 📧 : recopie les 7 fichiers serveur + `route:clear` → 🎯 Seuils → saisis ton email → active le 8ᵉ toggle → clôture → **l'email arrive** avec `pack-jour-….pdf` + `ventes-jour-….csv` en pièces jointes (adresse vide → toast d'erreur explicite, clôture OK)
36. **Bilan hebdo** 🧮 : active le 9ᵉ toggle → astuce test : règle le PC sur un lundi + redémarre → `Documents/StockFlow/Rapports/bilan-hebdo-<lun>_au_<dim>.pdf` — semaine passée, KPIs + journal des Z ✅
37. **Versements hors ligne** 🔁 : crée un crédit (en ligne) → **débranche le réseau** → verse une partie (toast 📡 *en file*) → rebranche → sync auto 45 s → le reçu est mis à jour **sans doublon** (renvoie une 2ᵉ fois le même montant dans la foulée : 1 seule ligne serveur)
38. **Rappel crédits email** 💳📧 : recopie les 5 fichiers serveur → crée un crédit dont la date dépasse le seuil (astuce test : mets `credit_reminder_days` à 0/1 et antidate le reçu en base, ou crée-le hier avec seuil 1) → 🎯 Seuils → email patron renseigné → `php artisan credits:remind-email` → **l'email digest arrive** : tableau client/N°/âge/reste/boutique + total de l'encours → vide l'email → relance la commande : **rien ne part, aucune erreur** (no-op propre) → le lendemain 10h05, le cron fait le travail tout seul
39. **Comparatif boutiques** 📊 : recopie `CashOperationController.php` → vends le même jour depuis **2 boutiques** (2 postes, ou login boutique A puis B) → Caisse → clôture → ouvre `pack-jour-<date>.pdf` : la section **« ② bis — Comparatif boutiques (jour) »** liste les 2 boutiques avec ventes + CA et la ligne **TOTAL** → journée mono-boutique : la section **n'apparaît pas** ✅
40. **Bilan thermique du lundi** 🖨 : thermique configurée + toggles **9 et 10** actifs → astuce test : règle le PC sur un lundi + redémarre l'app → le PDF `bilan-hebdo-…` s'enregistre **et** le ticket 80 mm sort tout seul : « BILAN HEBDO », plage lun→dim, KPIs, journal des Z, solde en gras, signature → débranche la thermique et recommence (semaine suivante) : le PDF est archivé quand même, toast d'échec d'impression, **rien de bloquant** ✅
41. **Bilan hebdo par email** 📧🧮 : recopie les 4 fichiers serveur + `route:clear` → toggle **11** ON + email patron renseigné → PC réglé sur un lundi + redémarrage → **l'email arrive avec le PDF joint** : chiffres clés de la semaine + 🏆 meilleure journée → email vide → toast 422 explicite, bilan PDF/thermique **non impactés** ✅
42. **Comparatif vendeurs** ⚖️ : vends avec **2 comptes** différents (siège + tablette) → 📊 Statistiques → carte **« ⚖️ Comparatif vendeurs (tous postes) »** : 🥇🥈, ventes, articles, panier moyen, parts % → passe sur 7 j/90 j : le tableau suit la période → compte mono-vendeur : la carte est **cachée** ✅
43. **Rafale d'étiquettes** 🏷️ : thermique configurée → 📦 Produits → sélectionne une **catégorie** (= le rayon) → bouton **« 🏷️ Rafale (N) »** → confirme → les N étiquettes sortent **à la file** (CODE128 scannable quand le produit a un code, logo si coché) → retire le filtre thermique dans Réglages : le bouton disparaît ✅
44. **Scan webcam** 📸 : 🧾 Caisse → bouton **📸** → autorise la caméra → vise un code-barres → **bip + article ajouté**, la caméra reste ouverte : enchaîne 3 articles d'affilée (le même code n'est pas ajouté 2 fois en 1,2 s) → 📋 Inventaires → ouvre un comptage → 📸 → un seul code suffit : la ligne s'ouvre, curseur dans la quantité → refuse la permission : toast clair, la douchette USB marche toujours ✅
45. **Export comparatif** 📊 : 📊 Statistiques → carte « ⚖️ Comparatif vendeurs » (≥ 2 vendeurs sur la période) → **📤 Exporter (Excel)** → ouvre `comparatif-vendeurs-30d-….csv` dans Excel : rang, ventes, articles, panier moyen, CA, part — nom avec « ; » protégé ✅
46. **Mobile rafale & comparatif** 📱 : (dev build) 📦 Produits → 🏷️ → confirme → le rayon sort **à la file** sur la thermique Bluetooth ; 📊 Stats → onglet Vendeurs → **⌀ panier moyen** visible sous chaque nom → **📤 Partager le comparatif** → envoie le CSV sur WhatsApp au patron ✅
47. **Rafale ×N** 🏷️ : thermique configurée → 📦 Produits → sélectionne une catégorie → **« 🏷️ Rafale (N) »** → dans la modale, tape **×2** (le bouton annonce « Imprimer 2N étiquettes ») → valide → **2 étiquettes par produit** sortent à la file en UN seul envoi → ➖/➕ avec bornes 1…20 ✅
48. **Comparatif boutiques** 🏬 : recopie `app/Http/Controllers/Api/StatsController.php` (seul fichier serveur v2.5) → vends sur **2 boutiques** → 📊 Statistiques → carte **« 🏬 Comparatif boutiques »** : 🥇🥈, ventes, articles, panier moyen, parts → **📤 Exporter (Excel)** → ouvre `comparatif-boutiques-…csv` (ligne « Siège » pour les ventes hors boutique) → sans recopier le contrôleur (vieux serveur), la carte est simplement **absente** ✅
49. **Z depuis le mobile** 🖨️📱 : (dev build) 📊 Caisse → onglet Clôtures → bouton **🖨** sur un Z → le ticket 80 mm sort sur la Bluetooth : ventes/apports/dépenses, **SOLDE en gros**, signature → fais une **nouvelle clôture** : l'alerte propose directement **« 🖨 Imprimer le Z »** ✅
50. **Dates libres** 📅 : recopie `StatsController.php` → 📊 Statistiques → choisis **Du** `2026-07-01` **au** `2026-07-15` → 📅 Appliquer → toutes les cartes + les 2 comparatifs suivent la plage (puce « Du … au … ✕ » active) → 📤 Exporter → CSV nommé `…-2026-07-01_2026-07-15-…csv` → inverse les dates (serveur permute seul) → ✕ sur la puce → retour à 30 j ✅
51. **Rafale ruptures** ⚠️🏷️ : thermique configurée → mets 2 produits à 0 → 📦 Produits → bouton **⚠️ Ruptures** → modale quantité → ×2 → **seules les étiquettes des produits à 0** sortent (×2) → remets du stock → re-clic → toast 🎉 « aucune rupture » ✅
52. **Heatmap vendeurs × boutiques** 📊 : recopie les 3 fichiers serveur (`StatsController.php`, `AccountingExportController.php`, `weekly_recap.blade.php`, 0 migration) → vends avec **2 comptes** sur **2 boutiques** (tableau croisé non vide) → 📊 Statistiques → carte **« 📊 Vendeurs × boutiques »** : la case la plus foncée = le plus gros binôme vendeur×boutique, case vide « · », ligne/colonne TOTAL → retire temporairement la clé (vieux serveur) : la carte disparaît **sans erreur** ✅
53. **Pack hebdo par boutique** 📦 : active le bilan hebdo (toggle 9, PC réglé sur un lundi pour le test express) ou 📊 Statistiques → **🧮 Bilan hebdo** → le PDF s'ouvre avec la section **« ① bis — Comparatif boutiques »** (ventes + CA + part % par boutique, TOTAL 100 %) — fais pareil avec l'email du lundi (toggle 11) : la même section est dans le mail ✅
54. **Ruptures du matin** 🔔 : mets 2 produits à 0 → Réglages → 🤖 Automatisations → active le **12ᵉ interrupteur « Ruptures du matin »** → redémarre l'app → ~10 s après le login, la notification Windows/macOS **« ⚠️ 2 rupture(s) de stock ce matin »** arrive (clic → Alertes) → redémarre encore : **rien** (1×/jour) → coupe le réseau et change la date du PC au lendemain + redémarre : rien non plus (retentative plus tard) → rebranche + redémarre : la notification arrive ✅
