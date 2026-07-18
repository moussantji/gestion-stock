// QA v2.15 — Backend Laravel 13 (docs & cohérence, serveur uniquement)
// Vérifie que la doc de migration est complète/précise et que les apps n'ont PAS bougé.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');        // stock-pc/
const MGR = path.join(ROOT, '..');              // dépôt (stock-manager/)
const API = path.join(MGR, 'stock-api');
const APP = path.join(MGR, 'stock-app');

const read = (p) => fs.readFileSync(p, 'utf8');
let ok = 0, ko = 0;
const check = (name, cond) => { if (cond) { ok++; console.log(`✅ ${name}`); } else { ko++; console.log(`❌ ${name}`); } };

console.log('— 📘 README serveur (stock-api) : instructions Laravel 13 —');
const apiReadme = read(path.join(API, 'README.md'));
check('titre annonce Laravel 13 + PHP 8.3+', /Backend \*\*Laravel 13\*\* · \*\*PHP 8\.3\+\*\*/.test(apiReadme));
check('prérequis PHP 8.3 dans l\'installation', /PHP 8\.3 ou \+/.test(apiReadme));
check('section « Mettre à jour (11/12 → 13) » présente', /Mettre à jour une installation existante \(Laravel 11\/12 → 13\)/.test(apiReadme));
check('contrainte framework ^13.0 documentée', /`\^13\.0`/.test(apiReadme));
check('tinker ^3.0 + phpunit ^12.0 documentés', /`\^3\.0`/.test(apiReadme) && /`\^12\.0`/.test(apiReadme));
check('composer update --with-all-dependencies + 3 clears', /--with-all-dependencies/.test(apiReadme) && /config:clear && php artisan route:clear && php artisan view:clear/.test(apiReadme));
check('Sanctum ^4 déclaré compatible 11/12/13', /la v4 supporte 11\/12\/13/.test(apiReadme));
check('dompdf v3.1.2+ exigé pour ^13', /v3\.1\.2/.test(apiReadme));
check('tableau d\'audit : 8 points vérifiés', (apiReadme.match(/\| ✅/g) || []).length >= 8);
check('effet de bord honnête : déconnexion unique des sessions site', /déconnecté une fois/.test(apiReadme));

console.log('\n— 🧹 README serveur : reliquats « clé de licence » v2.14 nettoyés —');
check('plus de SF-XXXX dans le flux de vente', !/SF-XXXX/.test(apiReadme));
check('/verifier-licence rétrogradé en redirect historique', /\/verifier-licence` | \*\(historique — redirige/.test(apiReadme));
check('portail /compte documenté dans les routes', /\/compte\/connexion`/.test(apiReadme) && /GET `\/compte`/.test(apiReadme));
check('flux = création/prolongation de compte client', /crée ou PROLONGE le compte/.test(apiReadme));
check('reçu renommé « Reçu de commande » (sans clé)', /Reçu de commande\*\* \(A4\)/.test(apiReadme) && !/clé de licence, statut/.test(apiReadme));
check('email de validation = compte client (pas clé)', /compte client créé ou prolongé/.test(apiReadme));

console.log('\n— 📗 README racine —');
const rootReadme = read(path.join(MGR, 'README.md'));
check('backend marqué Laravel 13 · PHP 8.3+', /Laravel 13 · PHP 8\.3\+ \(v2\.15\)/.test(rootReadme));
check('renvoi vers la marche à suivre du kit', /« ⬆️ Mettre à jour » dans stock-api\/README\.md/.test(rootReadme));
check('aucune mention « Laravel 11 » comme version cible (sauf migration)', !/Laravel 11/.test(rootReadme.replace(/Laravel 11\/12/g, '')));

console.log('\n— 📕 README PC / mobile : v2.15 serveur-only correctement signalé —');
const pcReadme = read(path.join(ROOT, 'README.md'));
check('PC : section v2.15 présente', /## 🆕 v2\.15 — ⬆️ serveur sous \*\*Laravel 13\*\*/.test(pcReadme));
check('PC : « rien à recopier » explicite', /Côté PC & mobile : rien à faire, rien à recopier/.test(pcReadme));
const appReadme = read(path.join(APP, 'README.md'));
check('mobile : note v2.15 serveur-only à la fin', /## ⬆️ v2\.15 \(serveur\) — Backend sous Laravel 13 — aucun changement côté app/.test(appReadme));

console.log('\n— 🔒 Apps NON touchées (la v2.15 ne change que le serveur) —');
const pcConfig = read(path.join(ROOT, 'src/js/config.js'));
check('APP_VERSION PC toujours v2.14 (pas de fausse bump app)', /APP_VERSION: 'StockFlow PC v2\.14'/.test(pcConfig));
const i18nPc = read(path.join(ROOT, 'src/js/i18n.js'));
const i18nApp = read(path.join(APP, 'src/i18n/translations.js'));
const kms = (b) => { const m = b.match(/(?:^|,)\s*\n?\s*([a-z0-9_]+):/gm); return m ? m.length : 0; };
const pcFr = kms(i18nPc.match(/const fr = \{([\s\S]*?)\n  \};?/)[1]);
const pcEn = kms(i18nPc.match(/const en = \{([\s\S]*?)\n  \};?/)[1]);
const appFr = kms(i18nApp.match(/export const fr = \{([\s\S]*?)\n\};?/)[1]);
const appEn = kms(i18nApp.match(/export const en = \{([\s\S]*?)\n\};?/)[1]);
check(`i18n PC inchangée : 796 = 796 (${pcFr}/${pcEn})`, pcFr === 796 && pcEn === 796);
check(`i18n mobile inchangée : 770 = 770 (${appFr}/${appEn})`, appFr === 770 && appEn === 770);

console.log('\n— 🧬 Code serveur : déjà au format moderne (rien à porter) —');
const models = fs.readdirSync(path.join(API, 'app/Models')).filter(f => f.endsWith('.php'));
const withCastsMethod = models.filter(f => /function casts\(\)/.test(read(path.join(API, 'app/Models', f))));
check(`${models.length} modèles, ${withCastsMethod.length} avec casts() méthode (majorité moderne)`, withCastsMethod.length >= models.length * 0.8);
check('pas de référence directe à VerifyCsrfToken dans le kit', !/VerifyCsrfToken|ValidateCsrfToken/.test(read(path.join(API, 'routes/web.php')) + read(path.join(API, 'routes/api.php'))));
check('cache Google = tableau PHP (compatible serializable_classes=false)', /\['token' => \$token, 'email' => \$user->email\]/.test(read(path.join(API, 'app/Http/Controllers/Web/GoogleAuthController.php'))));
check('upsert : uniquement lockForUpdate + update/insert (pas d\'appel upsert())', !/->upsert\(/.test(read(path.join(API, 'app/Support/ShopStock.php'))));

console.log('\n— 📝 REVUE —');
const review = read(path.join(MGR, 'REVIEW.md'));
check('REVIEW.md § v2.15 présente', /Revue v2\.15 \(backend\) — ⬆️ passage à Laravel 13/.test(review));
check('REVIEW cite les 2 paquets inchangés', /Sanctum/.test(review) && /dompdf/.test(review));

console.log(`\nRÉSULTAT v2.15 : ${ok} OK / ${ko} KO`);
process.exit(ko ? 1 : 0);
