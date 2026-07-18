// ============================================================
// 🖨 Impression thermique 80 mm (v1.2)
// 2 canaux, zéro boîte de dialogue :
//  • 'net'    → imprimante réseau ESC/POS (IP:9100) via socket du main
//  • 'system' → imprimante installée (pilote OS) via impression silencieuse
// Texte ASCII (accents simplifiés) = compatibilité maximale ESC/POS.
// ============================================================
const Thermal = (() => {
  const LS = 'sfpc.printer.v1';
  const W = 42; // colonnes standard 80 mm (police A)

  // ---------- Configuration (localStorage) ----------
  function getCfg() {
    try { return { mode: 'off', ...(JSON.parse(localStorage.getItem(LS)) ?? {}) }; }
    catch { return { mode: 'off' }; }
  }
  function saveCfg(cfg) { localStorage.setItem(LS, JSON.stringify(cfg)); }
  const electronReady = () => !!window.sfpc?.thermal;
  const isConfigured = () => electronReady() && getCfg().mode !== 'off';

  // ---------- Translittération ASCII (compat ESC/POS) ----------
  const MAP = {
    'à': 'a', 'â': 'a', 'ä': 'a', 'á': 'a', 'ç': 'c',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'î': 'i', 'ï': 'i',
    'ô': 'o', 'ö': 'o', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ÿ': 'y',
    'À': 'A', 'Â': 'A', 'Ç': 'C', 'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'Ô': 'O', 'Ù': 'U', 'Û': 'U',
    '€': 'EUR', '£': 'GBP', '’': "'", '‘': "'", '“': '"', '”': '"',
    '—': '-', '–': '-', '…': '...', '°': 'o',
  };
  const ascii = (s) => String(s ?? '')
    .replace(/[  ]/g, ' ') // espaces insécables → espace
    .split('').map((c) => MAP[c] ?? (c.charCodeAt(0) < 128 ? c : '')).join('');

  const money = (n) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(Math.round(Number(n) || 0)).replace(/[  ]/g, ' ')} F`;
  const dt = (iso) => {
    const d = iso ? new Date(iso) : new Date();
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  function lr(left, right) {
    left = ascii(left); right = ascii(right);
    const space = W - left.length - right.length;
    if (space < 1) return `${left.slice(0, Math.max(1, W - right.length - 1))} ${right}`;
    return left + ' '.repeat(space) + right;
  }
  const line = (ch) => ch.repeat(W);
  const clientOf = (r) => r.customer?.name ?? r.client_name ?? null;

  // ---------- 🖼 Logo raster ESC/POS (v1.6) ----------
  /**
   * Convertit un buffer RGBA (canvas ImageData) en bitmap ESC/POS « GS v 0 ».
   * Fonction PURE (testable sans navigateur) : largeur ramenée à maxW points,
   * padding à un multiple de 8, seuil de luminance 128, alpha < 128 = blanc.
   */
  function rasterEscpos(data, width, height, maxW = 240) {
    const scale = width > maxW ? maxW / width : 1;
    const outW = Math.max(8, Math.floor(width * scale));
    const outH = Math.max(1, Math.floor(height * scale));
    const rowBytes = Math.ceil(outW / 8);
    const bytes = [];
    for (let y = 0; y < outH; y++) {
      const sy = Math.min(height - 1, Math.floor(y / scale));
      for (let bx = 0; bx < rowBytes; bx++) {
        let b = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit;
          let ink = 0;
          if (x < outW) {
            const sx = Math.min(width - 1, Math.floor(x / scale));
            const i = (sy * width + sx) * 4;
            if (data[i + 3] >= 128) { // pixel opaque
              const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              if (lum < 128) ink = 1;
            }
          }
          b |= ink << (7 - bit);
        }
        bytes.push(b);
      }
    }
    // En-tête GS v 0 : m=0 (normal), x = rowBytes octets/ligne, y = outH lignes
    return [0x1D, 0x76, 0x30, 0x00, rowBytes & 0xFF, (rowBytes >> 8) & 0xFF, outH & 0xFF, (outH >> 8) & 0xFF, ...bytes];
  }

  /** URL → Image (<img>) via data URL : évite le canvas « tainted » cross-origin. */
  async function loadImageSafe(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => resolve(null);
        fr.readAsDataURL(blob);
      });
      if (!dataUrl || typeof Image === 'undefined') return null;
      return await new Promise((resolve) => {
        const img = new Image();
        const to = setTimeout(() => resolve(null), 5000);
        img.onload = () => { clearTimeout(to); resolve(img); };
        img.onerror = () => { clearTimeout(to); resolve(null); };
        img.src = dataUrl;
      });
    } catch { return null; }
  }

  /** Logo de la boutique → octets raster (ou null : jamais bloquant). */
  async function collectLogoBytes(shop) {
    const url = shop?.logo_url;
    if (!url || typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
    const img = await loadImageSafe(url);
    const side = Math.max(img?.naturalWidth ?? 0, img?.naturalHeight ?? 0);
    if (!side) return null;
    const scale = Math.min(1, 512 / side);
    const w = Math.max(1, Math.floor(img.naturalWidth * scale));
    const h = Math.max(1, Math.floor(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext && canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !ctx.getImageData) return null;
    ctx.fillStyle = '#fff'; // fond blanc : les logos transparents restent lisibles
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return rasterEscpos(ctx.getImageData(0, 0, w, h).data, w, h, 240);
  }

  // ---------- Binaire ESC/POS ----------
  function buildBytes(receipt, shop = {}, logoBytes = null, tva = null) {
    const B = [];
    const w = (s) => { for (const c of ascii(s)) B.push(c.charCodeAt(0) & 0x7F); };
    const raw = (...a) => B.push(...a);
    const ln = (s = '') => { w(s); B.push(0x0A); };

    raw(0x1B, 0x40);               // ESC @ init
    raw(0x1B, 0x61, 0x01);         // centré
    if (logoBytes?.length) { B.push(...logoBytes); ln(); } // 🖼 v1.6 : logo raster en tête
    raw(0x1D, 0x21, 0x11);         // double taille
    raw(0x1B, 0x45, 0x01);         // gras
    ln(shop.name ?? 'StockFlow');
    raw(0x1D, 0x21, 0x00);         // taille normale
    raw(0x1B, 0x45, 0x00);         // fin gras
    if (shop.address) ln(shop.address);
    if (shop.phone) ln(shop.phone);
    if (shop.slogan) ln(shop.slogan);
    ln(line('='));
    raw(0x1B, 0x61, 0x00);         // gauche
    ln(lr(receipt.number ?? '', dt(receipt.created_at)));
    ln(line('-'));

    (receipt.items ?? []).forEach((it) => {
      const qty = Number(it.quantity ?? 0);
      ln(`${qty}x ${it.product_name ?? ''}${it.promo ? ' *PROMO*' : ''}`.slice(0, W)); // 🏷️ v2.11
      ln(lr(`   ${qty} x ${money(it.unit_price ?? 0)}`, money(qty * (it.unit_price ?? 0))));
      const rq = Number(it.refunded_qty ?? 0); // 🧾 v2.12 : avoir partiel sur la ligne (additif — absent sinon)
      if (rq > 0) ln(`  <- ${rq} retourne(s) rembourse(s)`);
    });

    ln(line('-'));
    raw(0x1B, 0x45, 0x01);
    ln(lr('TOTAL', `${money(receipt.total ?? 0)}CFA`));
    raw(0x1B, 0x45, 0x00);
    // 🧮 v2.9 : ventilation « dont TVA » (param additif — null = ticket identique à la v2.8)
    if (tva?.enabled && (tva?.by_rate ?? []).length) {
      ln(lr('dont HT', `${money(tva.total_ht ?? 0)}CFA`));
      (tva.by_rate ?? []).forEach((row) => ln(lr(`dont TVA ${row.rate}%`, `${money(row.amount ?? 0)}CFA`)));
    }
    // 🧾 v2.12 : avoirs par article — récap (Σ retours > 0 uniquement, sinon ticket byte-identique)
    const refundedAmt = (receipt.items ?? []).reduce((s2, it) => s2 + Number(it.refunded_qty ?? 0) * Number(it.unit_price ?? 0), 0);
    if (refundedAmt > 0) {
      ln(lr('Avoir (retours)', `- ${money(refundedAmt)}`));
      ln(lr('TOTAL NET', `${money(Math.max(0, Number(receipt.total ?? 0) - refundedAmt))}CFA`));
    }
    const discount = Number(receipt.points_discount ?? 0);
    if (discount > 0) ln(lr('Remise points', `- ${money(discount)}`));
    ln(lr('Paye', `${money(receipt.amount_paid ?? 0)}CFA`));
    const remaining = Number(receipt.remaining ?? 0);
    if (remaining > 0) ln(lr('RESTE A PAYER', `${money(remaining)}CFA`));
    if (receipt.points_earned) ln(`+${receipt.points_earned} points fidelite`);
    ln(line('-'));
    const client = clientOf(receipt);
    if (client) ln(`Client : ${client}`);
    if (receipt.user?.name) ln(`Vendeur : ${receipt.user.name}`);
    raw(0x1B, 0x61, 0x01);
    ln('Merci de votre visite !');
    ln();
    ln();
    raw(0x1D, 0x56, 0x41, 0x05);   // avance 5 + coupe partielle
    return B;
  }

  // ---------- Version HTML (spooler OS / impression silencieuse) ----------
  function buildTicketHtml(receipt, shop = {}, withLogo = true, tva = null) {
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const rows = (receipt.items ?? []).map((it) => {
      const qty = Number(it.quantity ?? 0);
      return `<tr><td colspan="2">${qty}× ${esc(it.product_name ?? '')}${it.promo ? ' <span style="color:#B45309;font-weight:800;">[PROMO]</span>' : ''}</td></tr>
        <tr><td class="m">${qty} × ${money(it.unit_price ?? 0)}</td><td class="r">${money(qty * (it.unit_price ?? 0))}</td></tr>${Number(it.refunded_qty ?? 0) > 0 ? `
        <tr><td colspan="2" class="m" style="color:#B91C1C;">↩ ${it.refunded_qty} retourné(s)</td></tr>` : ''}`; // 🧾 v2.12
    }).join('');
    const discount = Number(receipt.points_discount ?? 0);
    const refundedAmt = (receipt.items ?? []).reduce((s2, it) => s2 + Number(it.refunded_qty ?? 0) * Number(it.unit_price ?? 0), 0); // 🧾 v2.12
    const remaining = Number(receipt.remaining ?? 0);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { margin: 0; } body { width: 72mm; margin: 0 auto; padding: 4mm 2mm;
        font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
      .c { text-align: center; } .b { font-weight: 800; } .big { font-size: 16px; }
      .logo { display: block; max-width: 34mm; max-height: 18mm; margin: 0 auto 2mm; }
      table { width: 100%; border-collapse: collapse; } td { padding: 1px 0; vertical-align: top; }
      .r { text-align: right; } .m { color: #333; padding-left: 8px; font-size: 11px; }
      hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
      </style></head><body>
      ${withLogo && shop.logo_url ? `<img class="logo" src="${esc(shop.logo_url)}" alt="">` : ''}
      <div class="c b big">${esc(shop.name ?? 'StockFlow')}</div>
      ${shop.address ? `<div class="c">${esc(shop.address)}</div>` : ''}
      ${shop.phone ? `<div class="c">${esc(shop.phone)}</div>` : ''}
      <hr><table><tr><td>${esc(receipt.number ?? '')}</td><td class="r">${dt(receipt.created_at)}</td></tr></table><hr>
      <table>${rows}</table><hr>
      <table>
        <tr class="b"><td>TOTAL</td><td class="r">${money(receipt.total ?? 0)}CFA</td></tr>
        ${refundedAmt > 0 ? `<tr><td class="m" style="color:#B91C1C;">Avoir (retours)</td><td class="r m" style="color:#B91C1C;">- ${money(refundedAmt)}</td></tr>
        <tr class="b"><td>TOTAL NET</td><td class="r">${money(Math.max(0, Number(receipt.total ?? 0) - refundedAmt))}CFA</td></tr>` : ''}
        ${tva?.enabled && (tva?.by_rate ?? []).length ? `<tr><td class="m">dont HT</td><td class="r m">${money(tva.total_ht ?? 0)}CFA</td></tr>`
          + (tva.by_rate ?? []).map((row) => `<tr><td class="m">dont TVA ${esc(row.rate)} %</td><td class="r m">${money(row.amount ?? 0)}CFA</td></tr>`).join('') : ''}
        ${discount > 0 ? `<tr><td>Remise points</td><td class="r">− ${money(discount)}</td></tr>` : ''}
        <tr><td>Payé</td><td class="r">${money(receipt.amount_paid ?? 0)}CFA</td></tr>
        ${remaining > 0 ? `<tr class="b"><td>RESTE À PAYER</td><td class="r">${money(remaining)}CFA</td></tr>` : ''}
        ${receipt.points_earned ? `<tr><td colspan="2">+${receipt.points_earned} points fidélité 🎁</td></tr>` : ''}
      </table><hr>
      ${clientOf(receipt) ? `<div>Client : ${esc(clientOf(receipt))}</div>` : ''}
      ${receipt.user?.name ? `<div>Vendeur : ${esc(receipt.user.name)}</div>` : ''}
      <div class="c" style="margin-top:6px">Merci de votre visite !</div>
      </body></html>`;
  }

  // ---------- 💵 Z de caisse thermique (v1.3) ----------
  const zDate = (iso) => {
    const d = iso ? new Date(iso) : new Date();
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  /** Binaire ESC/POS du Z : ventes, apports, dépenses, solde cumulé + signature */
  // ---------- 🧾 v2.10 : ticket DEVIS 80 mm (module local, zéro serveur) ----------

  /** ESC/POS du devis : plan ticket, en-tête « DEVIS — non facturé », sans Payé/Reste. */
  function buildQuoteBytes(q, shop = {}, logoBytes = null) {
    const B = [];
    const w = (s) => { for (const c of ascii(s)) B.push(c.charCodeAt(0) & 0x7F); };
    const raw = (...a) => B.push(...a);
    const ln = (s = '') => { w(s); B.push(0x0A); };
    raw(0x1B, 0x40);
    raw(0x1B, 0x61, 0x01);
    raw(0x1B, 0x45, 0x01); ln('*** DEVIS — NON FACTURE ***'); raw(0x1B, 0x45, 0x00);
    if (logoBytes?.length) { B.push(...logoBytes); ln(); }
    raw(0x1D, 0x21, 0x11);
    raw(0x1B, 0x45, 0x01); ln(shop.name ?? 'StockFlow'); raw(0x1D, 0x21, 0x00); raw(0x1B, 0x45, 0x00);
    if (shop.address) ln(shop.address);
    if (shop.phone) ln(shop.phone);
    ln(line('='));
    raw(0x1B, 0x61, 0x00);
    ln(lr(q.id ?? '', dt(q.created_at)));
    ln(line('-'));
    (q.lines ?? []).forEach((l) => {
      ln(`${l.qty}x ${l.name ?? ''}`.slice(0, W));
      ln(lr(`   ${l.qty} x ${money(l.unit_price ?? 0)}`, money((l.qty ?? 0) * (l.unit_price ?? 0))));
    });
    ln(line('-'));
    raw(0x1B, 0x45, 0x01);
    ln(lr('TOTAL', `${money(q.total ?? 0)}CFA`));
    raw(0x1B, 0x45, 0x00);
    if (q.customer?.name) ln(`Client : ${q.customer.name}`);
    const vu = new Date(q.created_at); vu.setDate(vu.getDate() + 7); // validité affichée : 7 j (idem Quotes)
    ln(`Valable jusqu'au ${vu.toLocaleDateString('fr-FR')}`);
    ln(line('-'));
    raw(0x1B, 0x61, 0x01);
    ln('Merci de votre visite !');
    ln(); ln();
    raw(0x1D, 0x56, 0x41, 0x05);
    return B;
  }

  /** HTML 72 mm du devis (canal imprimante système). */
  function buildQuoteTicketHtml(q, shop = {}, withLogo = true) {
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const rows = (q.lines ?? []).map((l) => `<tr>
      <td>${l.qty} x ${esc(l.name ?? '')}</td><td class="r">${money(l.unit_price * l.qty)}</td></tr>`).join('');
    const vu = new Date(q.created_at); vu.setDate(vu.getDate() + 7);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; margin: 0; }
      body { font-family: Arial, sans-serif; width: 72mm; padding: 4mm; font-size: 11px; color: #000; }
      .c { text-align: center; } .b { font-weight: 700; } .r { text-align: right; }
      .q { border: 2px solid #000; border-radius: 6px; padding: 3px; font-weight: 800; margin-bottom: 5px; }
      table { width: 100%; border-collapse: collapse; } td { padding: 2px 0; border-bottom: 1px dashed #ccc; }
      .tot { border-top: 2px solid #000; margin-top: 4px; padding-top: 4px; font-size: 14px; }
      .m { color: #444; font-size: 10px; } hr { border: none; border-top: 1px dashed #999; margin: 6px 0; }
    </style></head><body>
      <div class="c q">DEVIS — NON FACTURÉ</div>
      <div class="c">
        ${withLogo && shop?.logo_url ? `<img src="${esc(shop.logo_url)}" style="height:34px"><br>` : ''}
        <span class="b" style="font-size:14px">${esc(shop?.name ?? 'StockFlow')}</span>
        ${shop?.address ? `<div class="m">${esc(shop.address)}</div>` : ''}
        ${shop?.phone ? `<div class="m">Tél : ${esc(shop.phone)}</div>` : ''}
      </div><hr>
      <div class="m">${esc(q.id)} · ${dt(q.created_at)}</div>
      ${q.customer?.name ? `<div>Client : <b>${esc(q.customer.name)}</b></div>` : ''}
      <table>${rows}</table>
      <div class="tot b" style="display:flex;justify-content:space-between"><span>TOTAL</span><span>${money(q.total ?? 0)} CFA</span></div>
      <div class="m" style="margin-top:4px">Valable jusqu'au ${vu.toLocaleDateString('fr-FR')} · merci de votre visite !</div>
    </body></html>`;
  }

  /** 🧾 v2.10 — impression thermique d'un brouillon de devis (jamais bloquant côté vente). */
  async function printQuote(q) {
    const cfg = getCfg();
    if (cfg.mode === 'off') throw new Error(I18n.t('th_cfg_needed'));
    if (!electronReady()) throw new Error(I18n.t('th_electron_only'));
    let shop = Api.shop() ?? {};
    try { const s2 = await Api.get('/shop'); shop = s2?.shop ?? shop; } catch { /* boutique en cache OK */ }
    if (cfg.mode === 'net') {
      if (!cfg.ip) throw new Error(I18n.t('th_cfg_needed'));
      const logo = cfg.logo === false ? null : await collectLogoBytes(shop).catch(() => null);
      await window.sfpc.thermal.printNet({ ip: cfg.ip, port: cfg.port ?? 9100, payload: buildQuoteBytes(q, shop, logo) });
      return;
    }
    await window.sfpc.thermal.printSilent({ deviceName: cfg.deviceName ?? null, html: buildQuoteTicketHtml(q, shop, cfg.logo !== false) });
  }

  function buildZBytes(z, shop = {}, placeName = null, logoBytes = null) {
    const B = [];
    const w = (s) => { for (const c of ascii(s)) B.push(c.charCodeAt(0) & 0x7F); };
    const raw = (...a) => B.push(...a);
    const ln = (s = '') => { w(s); B.push(0x0A); };

    raw(0x1B, 0x40);
    raw(0x1B, 0x61, 0x01);
    if (logoBytes?.length) { B.push(...logoBytes); ln(); } // 🖼 v1.6
    ln(shop.name ?? 'StockFlow');
    raw(0x1D, 0x21, 0x11); raw(0x1B, 0x45, 0x01);
    ln('Z DE CAISSE');
    raw(0x1D, 0x21, 0x00); raw(0x1B, 0x45, 0x00);
    ln(zDate(z.closing_date));
    ln(line('='));
    raw(0x1B, 0x61, 0x00);
    if (placeName) ln(`Point de vente : ${placeName}`);
    ln(`Caissier : ${z.user?.name ?? '—'}`);
    ln(line('-'));
    ln(lr('Ventes encaissees', money(z.sales_collected ?? 0)));
    ln(lr('Apports (jour)', `+${money(z.total_in ?? 0)}`));
    ln(lr('Depenses (jour)', `-${money(z.total_out ?? 0)}`));
    ln(line('-'));
    raw(0x1B, 0x45, 0x01);
    ln(lr('SOLDE CAISSE (cumul)', `${money(z.balance ?? 0)}CFA`));
    raw(0x1B, 0x45, 0x00);
    if (z.notes) { ln(line('-')); ln(`Note : ${z.notes}`); }
    ln(line('-'));
    ln();
    ln('Signature : ____________________');
    ln();
    raw(0x1B, 0x61, 0x01);
    ln(`Genere le ${dt(new Date().toISOString())}`);
    raw(0x1D, 0x56, 0x41, 0x05);
    return B;
  }

  /** HTML 72 mm du Z (canal imprimante système) */
  function buildZHtml(z, shop = {}, placeName = null, withLogo = true) {
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { margin: 0; } body { width: 72mm; margin: 0 auto; padding: 4mm 2mm;
        font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
      .c { text-align: center; } .b { font-weight: 800; } .big { font-size: 16px; }
      table { width: 100%; border-collapse: collapse; } td { padding: 1px 0; }
      .r { text-align: right; } hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
      </style></head><body>
      ${withLogo && shop.logo_url ? `<img style="display:block;max-width:30mm;max-height:16mm;margin:0 auto 2mm" src="${esc(shop.logo_url)}" alt="">` : ''}
      <div class="c">${esc(shop.name ?? 'StockFlow')}</div>
      <div class="c b big">Z DE CAISSE</div>
      <div class="c">${zDate(z.closing_date)}</div><hr>
      ${placeName ? `<div>Point de vente : ${esc(placeName)}</div>` : ''}
      <div>Caissier : ${esc(z.user?.name ?? '—')}</div><hr>
      <table>
        <tr><td>Ventes encaissées</td><td class="r">${money(z.sales_collected ?? 0)}</td></tr>
        <tr><td>Apports (jour)</td><td class="r">+${money(z.total_in ?? 0)}</td></tr>
        <tr><td>Dépenses (jour)</td><td class="r">−${money(z.total_out ?? 0)}</td></tr>
      </table><hr>
      <table><tr class="b"><td>SOLDE CAISSE (cumul)</td><td class="r">${money(z.balance ?? 0)}CFA</td></tr></table>
      ${z.notes ? `<hr><div>Note : ${esc(z.notes)}</div>` : ''}
      <hr><div style="margin-top:10px">Signature : ____________________</div>
      <div class="c" style="margin-top:8px">Généré le ${dt(new Date().toISOString())}</div>
      </body></html>`;
  }

  // ---------- 🏷 Étiquette produit individuelle (v1.9) ----------
  /**
   * Découpe un nom produit en lignes ≤ maxLen (max maxLines, « … » si tronqué).
   * Fonction PURE (testable) — ascii() applique la translittération ESC/POS.
   */
  function labelNameLines(name, maxLen = 20, maxLines = 2) {
    const words = ascii(name).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const lines = [''];
    let cut = false; // des mots ont été sacrifiés / raccourcis ?
    for (const wd of words) {
      const i = lines.length - 1;
      const cand = lines[i] ? `${lines[i]} ${wd}` : wd;
      if (cand.length <= maxLen) { lines[i] = cand; continue; }
      if (lines.length >= maxLines) { cut = true; break; } // plus de place → stop
      if (lines[i]) { lines.push(wd.length <= maxLen ? wd : `${wd.slice(0, maxLen - 1)}…`); }
      else { lines[i] = wd.length <= maxLen ? wd : `${wd.slice(0, maxLen - 1)}…`; }
      if (wd.length > maxLen) { cut = true; break; }
    }
    const out = lines.filter(Boolean).slice(0, maxLines);
    if (cut && out.length && !out[out.length - 1].endsWith('…')) {
      out[out.length - 1] = `${out[out.length - 1].slice(0, maxLen - 1)}…`;
    }
    return out;
  }

  /** Vrai code-barres CODE128 (sous-jeu B) en ESC/POS : GS k 73. */
  function barcodeEscpos(code) {
    const data = `{B${code}`;
    return [0x1D, 0x68, 40, 0x1D, 0x77, 0x02, 0x1D, 0x48, 0x02, // hauteur, largeur, texte sous le code
      0x1D, 0x6B, 0x49, data.length, ...[...data].map((c) => c.charCodeAt(0) & 0x7F), 0x0A];
  }
  const barcodeSafe = (code) => {
    const c = ascii(code).trim();
    return c && c.length <= 30 && /^[\x20-\x7E]+$/.test(c) ? c : null;
  };

  /** Binaire ESC/POS d'une étiquette : [logo], boutique, nom (gras), prix (gros), code-barres. */
  function buildLabelBytes(product, shop = {}, logoBytes = null) {
    const B = [];
    const w = (s) => { for (const c of ascii(s)) B.push(c.charCodeAt(0) & 0x7F); };
    const raw = (...a) => B.push(...a);
    const ln = (s = '') => { w(s); B.push(0x0A); };

    raw(0x1B, 0x40);               // init
    raw(0x1B, 0x61, 0x01);         // centré
    if (logoBytes?.length) { B.push(...logoBytes); ln(); } // 🖼 v2.0 : logo raster (étiquette « marque »)
    if (shop?.name) ln(shop.name.slice(0, W));
    ln(line('-'));
    raw(0x1B, 0x45, 0x01);         // nom produit en gras (2 lignes max)
    labelNameLines(product?.name ?? '', 20, 2).forEach((l2) => ln(l2));
    raw(0x1B, 0x45, 0x00);
    raw(0x1D, 0x21, 0x11);         // prix en double taille
    raw(0x1B, 0x45, 0x01);
    ln(money(product?.sale_price ?? 0));
    raw(0x1D, 0x21, 0x00);
    raw(0x1B, 0x45, 0x00);
    const bc = barcodeSafe(product?.barcode);
    if (bc) { raw(...barcodeEscpos(bc)); } // 🏷 vrai code-barres scannable
    ln();
    raw(0x1D, 0x56, 0x41, 0x05);   // avance + coupe partielle
    return B;
  }

  /** HTML 72 mm (canal imprimante système) — code-barres affiché en texte. */
  /** Fragment interne d'une étiquette (réutilisé à l'unité et en rafale v2.3). */
  function labelInnerHtml(product, shop = {}, withLogo = true) {
    const esc = (x) => String(x ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]));
    const bc = barcodeSafe(product?.barcode);
    return `
      ${withLogo && shop?.logo_url ? `<img class="logo" src="${esc(shop.logo_url)}" alt="">` : ''}
      ${shop?.name ? `<div class="shop">${esc(shop.name)}</div><hr>` : ''}
      <div class="name">${esc(product?.name ?? '')}</div>
      <div class="price">${money(product?.sale_price ?? 0)}CFA</div>
      ${bc ? `<div class="bc">||||| ${esc(bc)} |||||</div>` : ''}`;
  }

  const LABEL_CSS = `@page { margin: 0; } body { width: 60mm; margin: 0 auto; padding: 3mm 2mm;
        font-family: 'Courier New', monospace; font-size: 12px; color: #000; text-align: center; }
      .logo { display: block; max-width: 22mm; max-height: 12mm; margin: 0 auto 1mm; }
      .shop { font-size: 10px; } .name { font-weight: 800; margin: 2mm 0 1mm; }
      .price { font-size: 20px; font-weight: 800; } .bc { letter-spacing: 3px; margin-top: 2mm; }
      hr { border: none; border-top: 1px dashed #000; margin: 2mm 0; }`;

  function buildLabelHtml(product, shop = {}, withLogo = true) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      ${LABEL_CSS}
      </style></head><body>
      ${labelInnerHtml(product, shop, withLogo)}
      </body></html>`;
  }

  // ---------- 🏷️ Rafale d'étiquettes (v2.3) — tout un rayon d'un coup ----------
  // v2.5 : paramètre `copies` (1..20) = quantité d'étiquettes par produit (saisie express).
  /** Binaire ESC/POS de N×copies étiquettes (chaque étiquette garde init+coupe) → UN seul envoi réseau. */
  function buildLabelsBytes(products, shop = {}, logoBytes = null, copies = 1) {
    const n = Math.max(1, Math.min(20, parseInt(copies, 10) || 1));
    return (Array.isArray(products) ? products : []).filter(Boolean)
      .flatMap((p) => { const one = buildLabelBytes(p, shop, logoBytes); return Array(n).fill(one).flat(); });
  }

  /** HTML 60 mm de N×copies étiquettes (saut de page entre chaque) — canal imprimante système. */
  function buildLabelsHtml(products, shop = {}, withLogo = true, copies = 1) {
    const n = Math.max(1, Math.min(20, parseInt(copies, 10) || 1));
    const labels = (Array.isArray(products) ? products : []).filter(Boolean)
      .flatMap((p) => Array(n).fill(p));
    const pages = labels
      .map((p, i) => `<div${i > 0 ? ' style="page-break-before: always;"' : ''}>${labelInnerHtml(p, shop, withLogo)}</div>`)
      .join('\n');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      ${LABEL_CSS}
      </style></head><body>${pages}
      </body></html>`;
  }

  // ---------- 🧮 Bilan hebdo thermique (v2.2) ----------
  const shortDate = (iso) => {
    const d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  /** Binaire ESC/POS : KPIs semaine + journal des Z (données /accounting/summary plage). */
  function buildWeeklyBytes(recap, from, to, shop = {}, logoBytes = null) {
    const B = [];
    const w = (s) => { for (const c of ascii(s)) B.push(c.charCodeAt(0) & 0x7F); };
    const raw = (...a) => B.push(...a);
    const ln = (s = '') => { w(s); B.push(0x0A); };

    const rc = recap?.receipts ?? {};
    const cash = recap?.cash ?? {};
    const cl = recap?.closings ?? {};
    const days = cl.days ?? [];
    const count = Number(rc.count ?? 0);
    const avg = count > 0 ? Math.round(Number(rc.total ?? 0) / count) : 0;

    raw(0x1B, 0x40);
    raw(0x1B, 0x61, 0x01);
    if (logoBytes?.length) { B.push(...logoBytes); ln(); }
    ln(shop.name ?? 'StockFlow');
    raw(0x1D, 0x21, 0x11); raw(0x1B, 0x45, 0x01);
    ln('BILAN HEBDO');
    raw(0x1D, 0x21, 0x00); raw(0x1B, 0x45, 0x00);
    ln(`du ${shortDate(from)} au ${shortDate(to)}`);
    ln(line('='));
    raw(0x1B, 0x61, 0x00);
    ln(lr('CA semaine', money(rc.total ?? 0)));
    ln(lr('Nb ventes', String(count)));
    ln(lr('Panier moyen', money(avg)));
    ln(lr('Encaisse', money(rc.paid ?? 0)));
    ln(lr('Apports', `+${money(cash.in ?? 0)}`));
    ln(lr('Depenses', `-${money(cash.out ?? 0)}`));
    if (Number(rc.points_discount ?? 0) > 0) ln(lr('Remises points', `-${money(rc.points_discount)}`));
    if (Number(rc.refunds_total ?? 0) > 0) ln(lr('Avoirs', `-${money(rc.refunds_total)}`));
    ln(line('-'));
    if (days.length) {
      days.forEach((d2) => {
        const label = `${shortDate(d2.date)} ${(d2.cashier ?? '').slice(0, 10)}`.trim();
        ln(lr(label, money(d2.sales_collected ?? 0)));
      });
      ln(line('-'));
    }
    raw(0x1B, 0x45, 0x01);
    ln(lr('SOLDE CAISSE', `${money(cl.end_balance ?? 0)}CFA`));
    raw(0x1B, 0x45, 0x00);
    ln(lr('Nb de clotures (Z)', String(cl.count ?? 0)));
    ln(line('-'));
    ln();
    ln('Signature : ____________________');
    ln();
    raw(0x1B, 0x61, 0x01);
    ln(`Genere le ${dt(new Date().toISOString())}`);
    raw(0x1D, 0x56, 0x41, 0x05);
    return B;
  }

  /** HTML 72 mm du bilan hebdo (canal imprimante système). */
  function buildWeeklyTicketHtml(recap, from, to, shop = {}, withLogo = true) {
    const esc = (s) => String(s ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]));
    const rc = recap?.receipts ?? {};
    const cash = recap?.cash ?? {};
    const cl = recap?.closings ?? {};
    const days = cl.days ?? [];
    const count = Number(rc.count ?? 0);
    const avg = count > 0 ? Math.round(Number(rc.total ?? 0) / count) : 0;
    const dayRows = days.map((d2) => `<tr><td>${esc(shortDate(d2.date))} ${esc((d2.cashier ?? '').slice(0, 10))}</td><td class="r">${money(d2.sales_collected ?? 0)}</td></tr>`).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { margin: 0; } body { width: 72mm; margin: 0 auto; padding: 4mm 2mm;
        font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
      .c { text-align: center; } .b { font-weight: 800; } .big { font-size: 15px; }
      table { width: 100%; border-collapse: collapse; } td { padding: 1px 0; }
      .r { text-align: right; } hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
      </style></head><body>
      ${withLogo && shop.logo_url ? `<img style="display:block;max-width:28mm;max-height:14mm;margin:0 auto 2mm" src="${esc(shop.logo_url)}" alt="">` : ''}
      <div class="c">${esc(shop.name ?? 'StockFlow')}</div>
      <div class="c b big">BILAN HEBDOMADAIRE</div>
      <div class="c">du ${esc(shortDate(from))} au ${esc(shortDate(to))}</div><hr>
      <table>
        <tr><td>CA semaine</td><td class="r">${money(rc.total ?? 0)}</td></tr>
        <tr><td>Nb ventes</td><td class="r">${count}</td></tr>
        <tr><td>Panier moyen</td><td class="r">${money(avg)}</td></tr>
        <tr><td>Encaissé</td><td class="r">${money(rc.paid ?? 0)}</td></tr>
        <tr><td>Apports</td><td class="r">+${money(cash.in ?? 0)}</td></tr>
        <tr><td>Dépenses</td><td class="r">−${money(cash.out ?? 0)}</td></tr>
        ${Number(rc.points_discount ?? 0) > 0 ? `<tr><td>Remises points</td><td class="r">−${money(rc.points_discount)}</td></tr>` : ''}
        ${Number(rc.refunds_total ?? 0) > 0 ? `<tr><td>Avoirs</td><td class="r">−${money(rc.refunds_total)}</td></tr>` : ''}
      </table>
      ${dayRows ? `<hr><table>${dayRows}</table>` : ''}
      <hr><table><tr class="b"><td>SOLDE CAISSE</td><td class="r">${money(cl.end_balance ?? 0)}CFA</td></tr>
        <tr><td>Clôtures (Z)</td><td class="r">${cl.count ?? 0}</td></tr></table>
      <hr><div style="margin-top:8px">Signature : ____________________</div>
      <div class="c" style="margin-top:8px">Généré le ${dt(new Date().toISOString())}</div>
      </body></html>`;
  }

  /** 🖨 Imprime le bilan hebdo de la plage sur la thermique (données fraîches serveur). */
  async function printWeekly(from, to) {
    const cfg = getCfg();
    if (cfg.mode === 'off') throw new Error(I18n.t('th_cfg_needed'));
    if (!electronReady()) throw new Error(I18n.t('th_electron_only'));
    const [recapRes, shopRes] = await Promise.all([
      Api.get('/accounting/summary', { from, to }),
      Api.get('/shop').catch(() => null),
    ]);
    const shop = shopRes?.shop ?? Api.shop() ?? {};
    const recap = recapRes?.data ?? {};
    try {
      if (cfg.mode === 'net') {
        if (!cfg.ip) throw new Error(I18n.t('th_cfg_needed'));
        const logo = cfg.logo === false ? null : await collectLogoBytes(shop).catch(() => null);
        await window.sfpc.thermal.printNet({
          ip: cfg.ip, port: cfg.port ?? 9100, payload: buildWeeklyBytes(recap, from, to, shop, logo),
        });
        return;
      }
      await window.sfpc.thermal.printSilent({
        deviceName: cfg.deviceName ?? null, html: buildWeeklyTicketHtml(recap, from, to, shop, cfg.logo !== false),
      });
    } catch (e) { throw cleanErr(e); }
  }

  // ---------- Impression ----------
  const cleanErr = (e) => new Error(String(e?.message ?? e)
    .replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));

  async function print(receipt, shop = {}, tva = null) { // 🧮 v2.9 : tva optionnel (additive)
    const cfg = getCfg();
    if (cfg.mode === 'off') throw new Error(I18n.t('th_cfg_needed'));
    if (!electronReady()) throw new Error(I18n.t('th_electron_only'));
    try {
      if (cfg.mode === 'net') {
        if (!cfg.ip) throw new Error(I18n.t('th_cfg_needed'));
        const logo = cfg.logo === false ? null : await collectLogoBytes(shop).catch(() => null); // 🖼 v1.6 (jamais bloquant)
        await window.sfpc.thermal.printNet({
          ip: cfg.ip, port: cfg.port ?? 9100, payload: buildBytes(receipt, shop, logo, tva),
        });
        return;
      }
      await window.sfpc.thermal.printSilent({
        deviceName: cfg.deviceName ?? null, html: buildTicketHtml(receipt, shop, cfg.logo !== false, tva),
      });
    } catch (e) { throw cleanErr(e); }
  }

  async function printById(id) {
    const [r, s] = await Promise.all([
      Api.get(`/receipts/${id}`),
      Api.get('/shop').catch(() => null),
    ]);
    await print(r.data, s?.shop ?? Api.shop() ?? {}, r.tva ?? null); // 🧮 v2.9 : ventilation serveur additive
  }

  /** Imprime un Z de caisse (clôture complète, renvoyée par /cash-ops/closings) */
  async function printZ(closing, placeName = null) {
    const cfg = getCfg();
    if (cfg.mode === 'off') throw new Error(I18n.t('th_cfg_needed'));
    if (!electronReady()) throw new Error(I18n.t('th_electron_only'));
    const s = await Api.get('/shop').catch(() => null);
    const shop = s?.shop ?? Api.shop() ?? {};
    try {
      if (cfg.mode === 'net') {
        if (!cfg.ip) throw new Error(I18n.t('th_cfg_needed'));
        const logo = cfg.logo === false ? null : await collectLogoBytes(shop).catch(() => null); // 🖼 v1.6 (jamais bloquant)
        await window.sfpc.thermal.printNet({
          ip: cfg.ip, port: cfg.port ?? 9100, payload: buildZBytes(closing, shop, placeName, logo),
        });
        return;
      }
      await window.sfpc.thermal.printSilent({
        deviceName: cfg.deviceName ?? null, html: buildZHtml(closing, shop, placeName, cfg.logo !== false),
      });
    } catch (e) { throw cleanErr(e); }
  }

  /** 🏷 v1.9 : imprime l'étiquette d'un produit (net → ESC/POS, sinon spooler OS) */
  async function printLabel(product) {
    const cfg = getCfg();
    if (cfg.mode === 'off') throw new Error(I18n.t('th_cfg_needed'));
    if (!electronReady()) throw new Error(I18n.t('th_electron_only'));
    let shop = Api.shop() ?? {};
    try { const s = await Api.get('/shop'); shop = s?.shop ?? shop; } catch { /* boutique en cache OK */ }
    try {
      if (cfg.mode === 'net') {
        if (!cfg.ip) throw new Error(I18n.t('th_cfg_needed'));
        const logo = cfg.logo === false ? null : await collectLogoBytes(shop).catch(() => null); // 🖼 v2.0 (jamais bloquant)
        await window.sfpc.thermal.printNet({
          ip: cfg.ip, port: cfg.port ?? 9100, payload: buildLabelBytes(product, shop, logo),
        });
        return;
      }
      await window.sfpc.thermal.printSilent({
        deviceName: cfg.deviceName ?? null, html: buildLabelHtml(product, shop, cfg.logo !== false),
      });
    } catch (e) { throw cleanErr(e); }
  }

  /** 🏷️ v2.3 — rafale : N étiquettes en UNE impression (net : 1 socket, système : pages). */
  async function printLabels(products, copies = 1) {
    const list = (Array.isArray(products) ? products : []).filter(Boolean);
    if (!list.length) throw new Error(I18n.t('p_none'));
    const n = Math.max(1, Math.min(20, parseInt(copies, 10) || 1)); // 🏷️ v2.5 : quantité par produit
    const cfg = getCfg();
    if (cfg.mode === 'off') throw new Error(I18n.t('th_cfg_needed'));
    if (!electronReady()) throw new Error(I18n.t('th_electron_only'));
    let shop = Api.shop() ?? {};
    try { const s2 = await Api.get('/shop'); shop = s2?.shop ?? shop; } catch { /* boutique en cache OK */ }
    try {
      if (cfg.mode === 'net') {
        if (!cfg.ip) throw new Error(I18n.t('th_cfg_needed'));
        const logo = cfg.logo === false ? null : await collectLogoBytes(shop).catch(() => null);
        await window.sfpc.thermal.printNet({
          ip: cfg.ip, port: cfg.port ?? 9100, payload: buildLabelsBytes(list, shop, logo, n),
        });
        return;
      }
      await window.sfpc.thermal.printSilent({
        deviceName: cfg.deviceName ?? null, html: buildLabelsHtml(list, shop, cfg.logo !== false, n),
      });
    } catch (e) { throw cleanErr(e); }
  }

  async function testPrint() {
    await print({
      number: 'TEST-0001',
      created_at: new Date().toISOString(),
      items: [{ product_name: 'Article de démonstration', quantity: 1, unit_price: 500 }],
      total: 500, amount_paid: 500, remaining: 0,
    }, Api.shop() ?? { name: 'StockFlow' });
  }

  return {
    getCfg, saveCfg, isConfigured,
    buildQuoteBytes, buildQuoteTicketHtml, printQuote, // 🧾 v2.10 : ticket devis 80 mm
    buildBytes, buildTicketHtml, buildZBytes, buildZHtml, ascii, rasterEscpos, collectLogoBytes,
    buildLabelBytes, buildLabelHtml, buildLabelsBytes, buildLabelsHtml, printLabel, printLabels, labelNameLines,
    buildWeeklyBytes, buildWeeklyTicketHtml, printWeekly,
    print, printById, printZ, testPrint,
  };
})();

// ⚠️ Les `const` top-level ne sont PAS des propriétés de window (ES2015) :
// sans cette ligne, window.Thermal est undefined → les boutons 🖨 ne s'affichaient jamais.
if (typeof window !== 'undefined') window.Thermal = Thermal;
