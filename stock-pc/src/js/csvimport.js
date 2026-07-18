// ============================================================
// 📥 v2.13 — Import CSV produits en masse : parseur SANS dépendance.
// Accepte le fichier « Export produits » de StockFlow (BOM, « ; »),
// un CSV Excel classique (« ; » ou « , » auto) ou un collage direct.
// Le serveur revérifie TOUT (ligne par ligne) — ici : confort + aperçu.
// ============================================================
const CsvImport = (() => {

  // En-têtes reconnus (après normalisation : minuscules, sans accents, _→espace)
  const HEADERS = [
    ['name',            ['nom', 'name', 'produit', 'product', 'designation']],
    ['sku',             ['sku', 'ref', 'reference']],
    ['barcode',         ['code-barres', 'code barres', 'barcode', 'codebarre', 'ean']],
    ['category',        ['categorie', 'category']],
    ['supplier',        ['fournisseur', 'supplier']],
    ['purchase_price',  ['prix achat', "prix d'achat", 'purchase price', 'achat', 'cout', 'cost']],
    ['sale_price',      ['prix vente', 'prix de vente', 'sale price', 'vente', 'price', 'sell price']],
    ['wholesale_price', ['prix gros', 'prix de gros', 'wholesale price', 'wholesale', 'gros']],
    ['quantity',        ['quantite', 'quantity', 'stock', 'qte']],
    ['alert_threshold', ['seuil alerte', "seuil d'alerte", 'seuil', 'alert threshold', 'threshold', 'alerte']],
  ];

  const normHead = (h) => String(h ?? '')
    .trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // accents combinants U+0300–U+036F
    .replace(/_/g, ' ').replace(/\s+/g, ' ');

  /** « 1 500 F » / « 1 500,50 » / « 1500 FCFA » / « 42 » → nombre | null */
  const num = (v) => {
    let s = String(v ?? '').trim();
    if (s === '') return null;
    s = s.replace(/[^\d.,-]/g, ''); // FCFA, F, espaces fines…
    if (s === '' || s === '-') return null;
    if (s.includes(',') && s.includes('.')) {
      // « 1.500,50 » : la virgule est après le point → point = milliers
      s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    } else if (s.includes(',')) {
      s = s.replace(',', '.'); // décimale française
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  /**
   * Découpe un texte CSV : séparateur auto (« ; » prioritaire, sinon « , »),
   * champs entre "…" dégroupés ("" → "), BOM retiré, \r\n géré.
   * @returns {string[][]} lignes → cellules (lignes vides conservées : numérotation fichier)
   */
  function splitCsv(text) {
    const t = String(text ?? '').replace(/^﻿/, '');
    // Séparateur = celui le plus présent sur la première ligne hors guillemets
    const firstLine = t.split(/\r?\n/, 1)[0] ?? '';
    const semi = (firstLine.match(/;/g) ?? []).length;
    const comma = (firstLine.match(/,/g) ?? []).length;
    const sep = semi >= comma ? ';' : ',';

    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (inQuotes) {
        if (ch === '"') {
          if (t[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
        } else { field += ch; }
        continue;
      }
      if (ch === '"') { inQuotes = true; continue; }
      if (ch === sep) { row.push(field); field = ''; continue; }
      if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && t[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
        continue;
      }
      field += ch;
    }
    row.push(field); rows.push(row); // dernière ligne (sans \n final)
    return rows;
  }

  const NUMERIC_FIELDS = ['purchase_price', 'sale_price', 'wholesale_price', 'quantity', 'alert_threshold'];

  /**
   * Parse le texte collé/fichier → lignes prêtes pour POST /products/import.
   * @returns {{ rows: object[], errors: {line:number, message:string}[], ignored: string[], total: number }}
   *   rows    : lignes valides (name/sku obligatoires, nombres nettoyés — « 1 500 F » → 1500)
   *   errors  : lignes rejetées (numéro de ligne = ligne fichier, en-têtes = 1)
   *   ignored : en-têtes non reconnus (ex. « ID », « Valeur stock » de l'export)
   */
  function parseProductsCsv(text) {
    const lines = splitCsv(text);
    // Ligne d'en-têtes = première ligne non vide
    let headIdx = lines.findIndex((r) => r.some((c) => String(c).trim() !== ''));
    if (headIdx < 0) return { rows: [], errors: [{ line: 0, message: 'empty' }], ignored: [], total: 0 };

    const mapping = []; // indexColonne → champ | null
    const ignored = [];
    lines[headIdx].forEach((cell, idx) => {
      const h = normHead(cell);
      const hit = HEADERS.find(([, aliases]) => aliases.includes(h));
      if (h === '' || !hit) { if (h !== '') ignored.push(String(cell).trim()); mapping.push(null); return; }
      mapping.push(hit[0]);
    });
    if (!mapping.includes('name') || !mapping.includes('sku')) {
      return { rows: [], errors: [{ line: headIdx + 1, message: 'headers' }], ignored, total: 0 };
    }

    const rows = [], errors = [];
    const seen = new Set();
    for (let r = headIdx + 1; r < lines.length; r++) {
      const cells = lines[r];
      if (cells.every((c) => String(c).trim() === '')) continue; // ligne vide
      const lineNo = r + 1;
      const rec = {};
      let bad = null;
      mapping.forEach((field, idx) => {
        if (!field) return;
        const raw = String(cells[idx] ?? '').trim();
        if (raw === '') return;
        if (NUMERIC_FIELDS.includes(field)) {
          const n = num(raw);
          if (n === null) { bad = `${field}: « ${raw} »`; return; }
          rec[field] = n;
          return;
        }
        rec[field] = raw;
      });
      if (bad) { errors.push({ line: lineNo, message: bad }); continue; }
      if (!rec.name || !rec.sku) { errors.push({ line: lineNo, message: 'required' }); continue; }
      const key = String(rec.sku).toLowerCase();
      if (seen.has(key)) { errors.push({ line: lineNo, message: `duplicate: ${rec.sku}` }); continue; }
      seen.add(key);
      rows.push(rec);
    }
    return { rows, errors, ignored, total: rows.length + errors.length };
  }

  return { parseProductsCsv, splitCsv, num, normHead };
})();

window.CsvImport = CsvImport; // window toujours présent (navigateur / tests avec stub)
