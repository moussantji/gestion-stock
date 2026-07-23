import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 🖨 Impression Bluetooth directe ESC/POS (thermal 80mm).
 *
 * ⚠️ NÉCESSITE UN DEVELOPMENT BUILD :
 *    le module natif `react-native-thermal-receipt-printer` n'existe
 *    pas dans Expo Go → `require` dynamique + try/catch = repli gracieux.
 *    (require volontairement NON-littéral pour que Metro ne le résolve
 *     pas au bundling ; en dev build le module est présent et chargé.)
 *
 * Les imprimantes thermiques affichent rarement les accents →
 * on normalise tout le texte ("é" → "e", "FCFA" conservé).
 */

const PRINTER_KEY = 'thermal_printer_v1';
const WIDTH = 42; // colonnes (fonte A, papier 80mm)

/* ---------------- Chargement paresseux du module natif ---------------- */

let _lib = undefined;
function lib() {
  if (_lib !== undefined) return _lib;
  try {
    const moduleName = 'react-native-thermal-receipt-printer';
    _lib = require(moduleName);
  } catch (e) {
    _lib = null; // Expo Go ou module absent
  }
  return _lib;
}

export function isPrinterAvailable() {
  return !!lib()?.BluetoothEscposPrinter;
}

/* ---------------- Imprimante enregistrée ---------------- */

export async function getSavedPrinter() {
  try {
    const raw = await AsyncStorage.getItem(PRINTER_KEY);
    return raw ? JSON.parse(raw) : null; // { address, name }
  } catch (e) {
    return null;
  }
}

export async function savePrinter(printer) {
  await AsyncStorage.setItem(PRINTER_KEY, JSON.stringify(printer));
}

export async function clearPrinter() {
  await AsyncStorage.removeItem(PRINTER_KEY);
}

/* ---------------- Bluetooth ---------------- */

/** Liste les appareils appairés → [{ address, name }] */
export async function listPairedPrinters() {
  const l = lib();
  if (!l) return [];
  await l.BluetoothManager.enableBluetooth(); // propose d'activer le BT si éteint
  const raw = await l.BluetoothManager.scanDevices();
  const parsed = JSON.parse(raw);
  const paired = parsed?.paired ?? [];
  // L'appareil "paired" contient déjà address/name sous Android
  return paired.map((d) => ({ address: d.address, name: d.name ?? d.address }));
}

export async function connectPrinter(address) {
  const l = lib();
  if (!l) throw new Error('unavailable');
  await l.BluetoothManager.connect(address);
}

/* ---------------- Construction du ticket ESC/POS ---------------- */

const stripAccents = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // eslint-disable-line no-misleading-character-class

const SEP = '-'.repeat(WIDTH) + '\n\r';
const SEP2 = '='.repeat(WIDTH) + '\n\r';

/**
 * Imprime le ticket d'un reçu :
 * en-tête boutique, articles (colonne qté/montant), TOTAL, 💳 payé/reste, pied.
 */
export async function printReceiptTicket(receipt, shop) {
  const l = lib();
  if (!l || !l.BluetoothEscposPrinter) {
    const err = new Error('unavailable');
    err.code = 'UNAVAILABLE';
    throw err;
  }
  const saved = await getSavedPrinter();
  if (!saved?.address) {
    const err = new Error('no printer');
    err.code = 'NO_PRINTER';
    throw err;
  }

  await connectPrinter(saved.address);

  const P = l.BluetoothEscposPrinter;
  const A = P.ALIGN;

  const money = (n) => `${Number(n ?? 0).toLocaleString('fr-FR').replace(/,/g, ' ')} F`;
  const shopName = stripAccents(shop?.name ?? 'StockFlow');
  const items = receipt?.items ?? [];

  await P.printerInit();

  // ---------- En-tête centré ----------
  await P.printText(`${stripAccents(shopName).toUpperCase()}\n\r`, {
    align: A.CENTER,
    widthtimes: 1,
    heigthtimes: 1,
    fonttype: 1,
  });
  if (shop?.address) await P.printText(stripAccents(shop.address) + '\n\r', { align: A.CENTER });
  if (shop?.phone) await P.printText(`Tel: ${stripAccents(shop.phone)}\n\r`, { align: A.CENTER });
  await P.printText(SEP, { align: A.CENTER });

  // ---------- Méta ----------
  await P.printText(`${stripAccents(receipt.number)}  ${formatTicketDate(receipt.created_at)}\n\r`);
  const clientName = stripAccents(receipt.client_name ?? 'Client comptoir');
  await P.printColumn([12, 30], [A.LEFT, A.LEFT], ['Client:', clientName], {});
  const sellerName = stripAccents(receipt.user?.name ?? '');
  await P.printColumn([12, 30], [A.LEFT, A.LEFT], ['Vendeur:', sellerName], {});
  await P.printText(SEP, { align: A.CENTER });

  // ---------- Articles ----------
  for (const it of items) {
    await P.printText(stripAccents(it.product_name) + '\n\r', { align: A.LEFT });
    await P.printColumn(
      [24, 18],
      [A.LEFT, A.RIGHT],
      [`  ${it.quantity} x ${money(it.unit_price)}`, money(it.subtotal)],
      {}
    );
  }
  await P.printText(SEP2, { align: A.CENTER });

  // ---------- TOTAL ----------
  await P.printText(`TOTAL : ${money(receipt.total)}CFA\n\r`, {
    align: A.CENTER,
    widthtimes: 1,
    heigthtimes: 1,
    fonttype: 1,
  });

  // ---------- 💳 Paiement partiel / crédit ----------
  const paid = Number(receipt.amount_paid ?? receipt.total ?? 0);
  const remaining = Number(receipt.remaining ?? Math.max(0, Number(receipt.total ?? 0) - paid));
  if (remaining > 0) {
    await P.printColumn([14, 28], [A.LEFT, A.RIGHT], ['Paye:', money(paid)], {});
    await P.printColumn([14, 28], [A.LEFT, A.RIGHT], ['RESTE:', money(remaining)], {});
  }
  const stateLine = remaining > 0 ? 'CREDIT - RESTE A PAYER' : 'Paye OK';
  await P.printText(`${items.length} article(s) - ${stateLine}\n\r`, { align: A.CENTER });
  await P.printText(SEP, { align: A.CENTER });

  // ---------- Pied ----------
  await P.printText('*** MERCI ! ***\n\r', { align: A.CENTER, widthtimes: 1 });
  if (shop?.slogan) await P.printText(stripAccents(shop.slogan) + '\n\r', { align: A.CENTER });
  await P.printText('\n\r\n\r', {}); // avance papier pour la découpe

  return true;
}

/**
 * 🔒 v16 — Ticket « Z DE CAISSE » thermique (Bluetooth direct) :
 * en-tête boutique, caissier, ventes encaissées / apports / dépenses du jour,
 * SOLDE CAISSE cumulé (gros, gras), note et ligne de signature —
 * le même plan que le `buildZBytes` du PC.
 * @param {{closing_date: string, sales_collected?: number, total_in?: number,
 *          total_out?: number, balance?: number, notes?: string,
 *          user?: {name?: string}}} z — clôture (liste `/cash-ops/closings` ou retour `close`)
 * @param {{name?: string, address?: string, phone?: string}} shop
 */
export async function printZTicket(z, shop) {
  const l = lib();
  if (!l || !l.BluetoothEscposPrinter) {
    const err = new Error('unavailable');
    err.code = 'UNAVAILABLE';
    throw err;
  }
  const saved = await getSavedPrinter();
  if (!saved?.address) {
    const err = new Error('no printer');
    err.code = 'NO_PRINTER';
    throw err;
  }

  await connectPrinter(saved.address);

  const P = l.BluetoothEscposPrinter;
  const A = P.ALIGN;
  const money = (n) => `${Number(n ?? 0).toLocaleString('fr-FR').replace(/,/g, ' ')} F`;

  const row = (label, value) =>
    P.printColumn([26, 16], [A.LEFT, A.RIGHT], [stripAccents(label), stripAccents(value)], {});

  await P.printerInit();

  // ---------- En-tête ----------
  await P.printText(`${stripAccents(shop?.name ?? 'StockFlow').toUpperCase()}\n\r`, { align: A.CENTER });
  await P.printText('Z DE CAISSE\n\r', {
    align: A.CENTER, widthtimes: 1, heigthtimes: 1, fonttype: 1,
  });
  const d = z?.closing_date ? new Date(String(z.closing_date).slice(0, 10) + 'T12:00:00') : new Date();
  await P.printText(`${d.toLocaleDateString('fr-FR')}\n\r`, { align: A.CENTER });
  await P.printText(SEP2, { align: A.CENTER });
  await P.printColumn([12, 30], [A.LEFT, A.LEFT], ['Caissier:', stripAccents(z?.user?.name ?? '-')], {});
  await P.printText(SEP, { align: A.CENTER });

  // ---------- Chiffres du jour ----------
  await row('Ventes encaissees', money(z?.sales_collected ?? 0));
  await row('Apports (jour)', `+${money(z?.total_in ?? 0)}`);
  await row('Depenses (jour)', `-${money(z?.total_out ?? 0)}`);
  await P.printText(SEP, { align: A.CENTER });

  // ---------- SOLDE (gros + gras) ----------
  await P.printText(`SOLDE CAISSE : ${money(z?.balance ?? 0)}CFA\n\r`, {
    align: A.CENTER, widthtimes: 1, heigthtimes: 1, fonttype: 1,
  });

  if (z?.notes) {
    await P.printText(SEP, { align: A.CENTER });
    await P.printText(`Note : ${stripAccents(z.notes)}\n\r`, {});
  }
  await P.printText(SEP, { align: A.CENTER });
  await P.printText('\n\rSignature : ____________________\n\r\n\r', {});
  await P.printText(`Genere le ${formatTicketDate(new Date().toISOString())}\n\r`, { align: A.CENTER });
  await P.printText('\n\r\n\r', {}); // avance papier pour la découpe

  return true;
}

/**
 * 🏷️ v2.4 — Rafale d'étiquettes produit (tout un rayon d'un coup) :
 * pour chaque produit : boutique (petite), nom (gras), prix (gros),
 * vrai code-barres CODE128 via printBarCode quand la lib le propose
 * (repli : le code imprimé en texte). UNE SEULE connexion Bluetooth
 * pour toute la rafale. products = liste actuellement affichée.
 * v16 : paramètre `copies` (1..10) = quantité d'étiquettes par produit.
 * @param {Array} products
 * @param {{name?: string}} shop
 * @param {number} copies
 */
export async function printProductLabels(products, shop, copies = 1) {
  const l = lib();
  if (!l || !l.BluetoothEscposPrinter) {
    const err = new Error('unavailable');
    err.code = 'UNAVAILABLE';
    throw err;
  }
  const saved = await getSavedPrinter();
  if (!saved?.address) {
    const err = new Error('no printer');
    err.code = 'NO_PRINTER';
    throw err;
  }
  const list = (Array.isArray(products) ? products : []).filter(Boolean);
  if (!list.length) {
    const err = new Error('empty');
    err.code = 'EMPTY';
    throw err;
  }

  await connectPrinter(saved.address); // ⛓ une seule poignée de main pour toute la rafale

  const P = l.BluetoothEscposPrinter;
  const A = P.ALIGN;
  const code128 = P.BARCODETYPE?.CODE128 ?? 73; // ESC/POS « GS k » type 73 = CODE128
  const money = (n) => `${Number(n ?? 0).toLocaleString('fr-FR').replace(/,/g, ' ')} FCFA`;
  const shopName = stripAccents(shop?.name ?? 'StockFlow');
  const barcodeSafe = (code) => {
    const c = stripAccents(code).trim();
    return c && c.length <= 30 && /^[\x20-\x7E]+$/.test(c) ? c : null;
  };
  const n = Math.max(1, Math.min(10, parseInt(copies, 10) || 1)); // 🏷️ v16 : quantité par produit

  await P.printerInit();
  let first = true;
  for (const p of list) {
    for (let c = 0; c < n; c += 1) {
      if (!first) await P.printText('\n\r\n\r', {}); // espace entre étiquettes
      first = false;
      await P.printText(`${shopName.toUpperCase().slice(0, WIDTH)}\n\r`, { align: A.CENTER });
      await P.printText(`${stripAccents(p?.name ?? '').slice(0, WIDTH)}\n\r`, { align: A.CENTER, fonttype: 1 });
      await P.printText(`${money(p?.sale_price ?? 0)}\n\r`, { align: A.CENTER, widthtimes: 1, heigthtimes: 1 });
      const bc = barcodeSafe(p?.barcode);
      if (bc) {
        try {
          await P.printBarCode(bc, code128, 2, 120, 2); // texte lisible sous le code
        } catch (e) {
          await P.printText(`${bc}\n\r`, { align: A.CENTER }); // vieille lib → repli texte
        }
      }
      await P.printText('\n\r', {});
    }
  }
  await P.printText('\n\r\n\r', {}); // avance papier finale pour la découpe
}

export async function printTestPage(shop) {
  const l = lib();
  const saved = await getSavedPrinter();
  if (!l?.BluetoothEscposPrinter || !saved?.address) {
    const err = new Error('no printer');
    err.code = 'NO_PRINTER';
    throw err;
  }
  await connectPrinter(saved.address);
  const P = l.BluetoothEscposPrinter;
  const A = P.ALIGN;

  await P.printerInit();
  await P.printText(`${stripAccents(shop?.name ?? 'StockFlow').toUpperCase()}\n\r`, { align: A.CENTER, widthtimes: 1 });
  await P.printText('--- TEST IMPRESSION OK ---\n\r', { align: A.CENTER });
  await P.printText(`${new Date().toLocaleString('fr-FR')}\n\r`, { align: A.CENTER });
  await P.printText(SEP, { align: A.CENTER });
  await P.printText('1234567890 ABCDEF abcdef +-%\n\r', { align: A.CENTER });
  await P.printText('\n\r\n\r', {});
}

function formatTicketDate(value) {
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch (e) {
    return '';
  }
}
