// ============================================================
// 🧭 QA-HEAD StockFlow PC — cohérence structurelle (PÉRENNE, dans le repo)
//  • parité i18n FR=EN + couverture d'usage (chaque t('clé') existe)
//  • routes app.js ↔ écrans Screens.* ↔ <script> index.html
// Lancement : node tools/qa-head.js   (depuis stock-pc/)
// ============================================================
const fs = require('fs');
const path = require('path');
const ROOT = require('path').join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const i18n = read('src/js/i18n.js');
const frBlock = i18n.split('const fr = {')[1].split('\n  };')[0];
const enBlock = i18n.split('const en = {')[1].split('\n  };')[0];
const keyRe = /(?:^|,)\s*\n?\s*([a-z0-9_]+):/gm;
const keys = (b) => { const s = new Set(); let m; while ((m = keyRe.exec(b))) s.add(m[1]); return s; };
const frKeys = keys(frBlock); const enKeys = keys(enBlock);
const jsFiles = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.js')) jsFiles.push(full);
  }
})(path.join(ROOT, 'src/js'));
const used = new Set();
const useRe = /\bt\(\s*'([a-z0-9_]+)'/g;
for (const f of jsFiles) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = useRe.exec(src))) used.add(m[1]);
}
const missing = [...used].filter((k) => !frKeys.has(k));
const driftFr = [...frKeys].filter((k) => !enKeys.has(k));
const driftEn = [...enKeys].filter((k) => !frKeys.has(k));
console.log(`i18n: ${frKeys.size} clés FR / ${enKeys.size} EN, ${used.size} utilisées → manquantes:`, missing.length ? missing : 'AUCUNE ✅', '| parité:', (driftFr.length || driftEn.length) ? { driftFr, driftEn } : 'OK ✅');

const appSrc = read('src/js/app.js');
const routeRe = /screen:\s*\(\)\s*=>\s*Screens\.([a-zA-Z0-9_]+)/g;
let m; const routed = new Set();
while ((m = routeRe.exec(appSrc))) routed.add(m[1]);
const defined = new Set();
for (const f of jsFiles) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /Screens\.([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(/g;
  let mm;
  while ((mm = re.exec(src))) defined.add(mm[1]);
}
const html = read('src/index.html');
const missingRoutes = [...routed].filter((x) => !defined.has(x));
const orphans = [...defined].filter((x) => !routed.has(x) && !['login'].includes(x));
const missingHtml = [...defined].filter((x) => !html.includes(`${x}.js`));
console.log('routes→écran manquant:', missingRoutes.length ? missingRoutes : 'AUCUN ✅', '| écrans non routés (hors login):', orphans, '| absents de index.html:', missingHtml.length ? missingHtml : 'AUCUN ✅');
process.exit(missing.length || missingRoutes.length || missingHtml.length || driftFr.length || driftEn.length ? 1 : 0);
