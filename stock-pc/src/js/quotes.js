// ============================================================
// 🧾 v2.10 — Devis / proforma LOCAUX (brouillons sur le poste)
// Zéro serveur : créés depuis le panier de la caisse, partagés
// en PDF A5 ou en texte (coller dans WhatsApp), puis CHARGÉS en
// 1 clic quand le client se décide → conversion en vente.
// Stockage : localStorage (50 devis max, les plus récents d'abord).
// ============================================================
const Quotes = (() => {
  const LS = 'sfpc.quotes_v1';
  const MAX = 50;
  const VALID_DAYS = 7; // validité affichée du devis (jours)

  function list() {
    try { const v = JSON.parse(localStorage.getItem(LS) ?? '[]'); return Array.isArray(v) ? v : []; }
    catch { return []; }
  }
  function persist(arr) { localStorage.setItem(LS, JSON.stringify(arr.slice(0, MAX))); }

  /**
   * Enregistre un brouillon depuis le panier.
   * @param lines  [{product_id, name, qty, unit_price}]
   * @param meta   { customer?: {id?, name?}, note?: string }
   */
  function save(lines, meta = {}) {
    const clean = (Array.isArray(lines) ? lines : [])
      .map((l) => ({ product_id: l.product_id, name: String(l.name ?? ''), qty: Math.max(1, parseInt(l.qty, 10) || 1), unit_price: Math.max(0, Math.round(Number(l.unit_price) || 0)) }))
      .filter((l) => l.product_id != null && l.unit_price > 0);
    if (!clean.length) return null;
    const now = new Date();
    const quote = {
      id: `DEV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`,
      created_at: now.toISOString(),
      customer: meta.customer ? { id: meta.customer.id ?? null, name: String(meta.customer.name ?? '') } : null,
      lines: clean,
      total: clean.reduce((s, l) => s + l.unit_price * l.qty, 0),
    };
    persist([quote, ...list()]);
    return quote;
  }

  function get(id) { return list().find((q) => q.id === id) ?? null; }
  function remove(id) { persist(list().filter((q) => q.id !== id)); }

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (n) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n ?? 0))} F`;

  /** Date de validité = création + VALID_DAYS. */
  function validUntil(q) {
    const d = new Date(q.created_at);
    d.setDate(d.getDate() + VALID_DAYS);
    return d;
  }

  /** Texte 42 colonnes (coller dans WhatsApp — mêmes conventions que le reçu v2.8). */
  function buildQuoteText(q, shop, t) {
    const col = (left, right) => {
      const room = 42 - String(right).length;
      const l = String(left).length > room ? `${String(left).slice(0, Math.max(1, room - 1))}…` : String(left);
      return l.padEnd(Math.max(l.length + 1, room), ' ') + right;
    };
    const SEP = '--------------------------------';
    const SEP2 = '================================';
    const out = [];
    out.push(`📋 *${t('q_number')} ${q.id}*`);
    out.push(`*${String(shop?.name ?? 'StockFlow').toUpperCase()}*`);
    if (shop?.phone) out.push(`Tél : ${shop.phone}`);
    out.push(SEP);
    out.push(col(new Date(q.created_at).toLocaleDateString('fr-FR'), t('q_valid', { date: new Date(validUntil(q)).toLocaleDateString('fr-FR') })));
    if (q.customer?.name) out.push(col('Client :', q.customer.name));
    out.push(SEP);
    q.lines.forEach((l) => {
      out.push(String(l.name ?? '—'));
      out.push(col(`  ${l.qty} x ${money(l.unit_price)}`, money(l.unit_price * l.qty)));
    });
    out.push(SEP2);
    out.push(col(`${t('wa_txt_total_q')} :`, `*${money(q.total)}*`));
    out.push(SEP);
    out.push(t('q_note'));
    return out.join('\n');
  }

  /** HTML A5 pro (PDF via sfpc.pdf) — gabarit maison, zéro dépendance. */
  function buildQuoteHtml(q, shop, t, { placeName } = {}) {
    const rows = q.lines.map((l, i) => `<tr>
        <td>${i + 1}</td><td><b>${esc(l.name)}</b></td>
        <td class="r">${l.qty}</td>
        <td class="r">${money(l.unit_price)}</td>
        <td class="r b">${money(l.unit_price * l.qty)}</td></tr>`).join('');
    const fmtD = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: A5 portrait; margin: 12mm; }
      body { font-family: system-ui, sans-serif; color: #1a1a2e; font-size: 12px; }
      .head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #7C5CFF; padding-bottom: 8px; }
      h1 { font-size: 20px; margin: 0; color: #7C5CFF; }
      .shop { font-weight: 800; font-size: 15px; }
      .muted { color: #666; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th { text-align: left; font-size: 10.5px; text-transform: uppercase; color: #888; border-bottom: 2px solid #ddd; padding: 5px 4px; }
      td { padding: 6px 4px; border-bottom: 1px solid #eee; }
      .r { text-align: right; } .b { font-weight: 800; }
      .total { margin-top: 10px; display: flex; justify-content: space-between; align-items: baseline; background: #f3f0ff; border-radius: 8px; padding: 10px 12px; }
      .total b { font-size: 19px; color: #7C5CFF; }
      .note { margin-top: 14px; font-size: 10.5px; color: #666; font-style: italic; }
      .sign { margin-top: 34px; display: flex; justify-content: space-between; }
      .sign div { border-top: 1px solid #999; width: 40%; padding-top: 4px; font-size: 10.5px; color: #555; }
    </style></head><body>
      <div class="head">
        <div><div class="shop">${esc(shop?.name ?? 'StockFlow')}</div>
          ${shop?.address ? `<div class="muted">${esc(shop.address)}</div>` : ''}
          ${shop?.phone ? `<div class="muted">Tél : ${esc(shop.phone)}</div>` : ''}
          ${placeName ? `<div class="muted">📍 ${esc(placeName)}</div>` : ''}</div>
        <div style="text-align:right"><h1>${esc(t('q_number'))}</h1>
          <div class="muted">${esc(q.id)}</div>
          <div class="muted">${fmtD(q.created_at)}</div></div>
      </div>
      <div style="margin-top:10px;font-size:12px">
        ${q.customer?.name ? `<b>Client :</b> ${esc(q.customer.name)}<br>` : ''}
        <span class="muted">${esc(t('q_valid', { date: fmtD(validUntil(q)) }))}</span>
      </div>
      <table><thead><tr><th>#</th><th>Article</th><th class="r">Qté</th><th class="r">Prix</th><th class="r">Total</th></tr></thead>
        <tbody>${rows}</tbody></table>
      <div class="total"><span><b>${esc(t('wa_txt_total_q'))}</b></span><b>${money(q.total)}</b></div>
      <div class="note">${esc(t('q_note'))} — ${esc(t('q_valid', { date: fmtD(validUntil(q)) }))}.</div>
      <div class="sign"><div>Le vendeur</div><div>Le client</div></div>
    </body></html>`;
  }

  /** Génère + enregistre le PDF A5 dans Documents/StockFlow/Rapports (Electron). */
  async function savePdf(q, t) {
    if (!window.sfpc?.pdf) throw new Error(I18n.t('rp_electron_only'));
    let shop = Api.shop() ?? {};
    try { const s2 = await Api.get('/shop'); shop = s2?.shop ?? shop; } catch { /* cache OK */ }
    const html = buildQuoteHtml(q, shop, t, {});
    return window.sfpc.pdf.save({ html, defaultName: `devis-${q.id}.pdf` });
  }

  /** Texte → presse-papiers (coller dans WhatsApp). */
  async function copyText(q, t) {
    let shop = Api.shop() ?? {};
    try { const s2 = await Api.get('/shop'); shop = s2?.shop ?? shop; } catch { /* cache OK */ }
    const txt = buildQuoteText(q, shop, t);
    await navigator.clipboard.writeText(txt);
    return txt;
  }

  return { list, save, get, remove, buildQuoteText, buildQuoteHtml, savePdf, copyText, VALID_DAYS };
})();

// ⚠️ Les `const` top-level ne sont PAS des propriétés de window (ES2015).
if (typeof window !== 'undefined') window.Quotes = Quotes;
