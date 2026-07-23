// ============================================================
// 📥 v24 (v2.13) — Import CSV produits : parseur SANS dépendance
// (miroir strict du PC csvimport.js — mêmes règles, mêmes formats)
// Mobile = collage direct (pas de sélecteur de fichier sans dépendance).
// ============================================================

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

export const normHead = (h) => String(h ?? '')
  .trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // accents combinants
  .replace(/_/g, ' ').replace(/\s+/g, ' ');

/** « 1 500 F » / « 1 500,50 » / « 1500 FCFA » → nombre | null */
export const num = (v) => {
  let s = String(v ?? '').trim();
  if (s === '') return null;
  s = s.replace(/[^\d.,-]/g, '');
  if (s === '' || s === '-') return null;
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Découpe un texte CSV (séparateur auto « ; » sinon « , », guillemets, BOM, \r\n). */
export function splitCsv(text) {
  const t = String(text ?? '').replace(/^﻿/, '');
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
  row.push(field); rows.push(row);
  return rows;
}

const NUMERIC_FIELDS = ['purchase_price', 'sale_price', 'wholesale_price', 'quantity', 'alert_threshold'];

/**
 * Parse le texte collé → lignes prêtes pour POST /products/import.
 * @returns {{ rows: object[], errors: {line:number, message:string}[], ignored: string[], total: number }}
 */
export function parseProductsCsv(text) {
  const lines = splitCsv(text);
  const headIdx = lines.findIndex((r) => r.some((c) => String(c).trim() !== ''));
  if (headIdx < 0) return { rows: [], errors: [{ line: 0, message: 'empty' }], ignored: [], total: 0 };

  const mapping = [];
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
    if (cells.every((c) => String(c).trim() === '')) continue;
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
