import React from 'react';
import { Platform, Text, View } from 'react-native';

/**
 * 🖼 Ticket blanc rendu en vues RN puis capturé en PNG (react-native-view-shot)
 * pour être partagé comme image (WhatsApp, photo…).
 *
 * Volontairement 100% local (pas d'image distante) : une image réseau non
 * encore chargée ressortirait blanche sur la capture.
 */

const MONO = Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' });
const WIDTH = 380;

const money = (n) => `${Number(n ?? 0).toLocaleString('fr-FR')} F`;

function Sep({ char = '-' }) {
  return (
    <Text style={{ fontFamily: MONO, color: '#111', fontSize: 13, marginVertical: 6 }}>
      {char.repeat(34)}
    </Text>
  );
}

export default function ReceiptImage({ receipt, shop }) {
  const items = receipt?.items ?? [];
  const total = Number(receipt?.total ?? 0);
  const paid = Number(receipt?.amount_paid ?? total);
  const remaining = Number(receipt?.remaining ?? Math.max(0, total - paid));
  const date = receipt?.created_at
    ? new Date(receipt.created_at).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '';

  return (
    <View style={{ width: WIDTH, backgroundColor: '#fff', padding: 18 }}>
      {/* En-tête boutique */}
      <Text style={{ fontFamily: MONO, fontSize: 19, fontWeight: '900', color: '#000', textAlign: 'center', letterSpacing: 1 }}>
        ◆ {String(shop?.name ?? 'StockFlow').toUpperCase()}
      </Text>
      {shop?.address ? (
        <Text style={{ fontFamily: MONO, fontSize: 11.5, color: '#333', textAlign: 'center', marginTop: 2 }}>
          {shop.address}
        </Text>
      ) : null}
      {shop?.phone ? (
        <Text style={{ fontFamily: MONO, fontSize: 11.5, color: '#333', textAlign: 'center' }}>
          Tel: {shop.phone}
        </Text>
      ) : null}

      <Sep />

      {/* Méta */}
      <Text style={{ fontFamily: MONO, fontSize: 12.5, color: '#000' }}>
        {receipt?.number}  {date}
      </Text>
      <Text style={{ fontFamily: MONO, fontSize: 12.5, color: '#000' }}>
        Client  : {receipt?.client_name ?? 'Client comptoir'}
      </Text>
      <Text style={{ fontFamily: MONO, fontSize: 12.5, color: '#000' }}>
        Vendeur : {receipt?.user?.name ?? ''}
      </Text>

      <Sep />

      {/* Articles */}
      {items.map((it, i) => (
        <View key={it.id ?? i} style={{ marginBottom: 2 }}>
          <Text style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: '700', color: '#000' }}>
            {it.product_name}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: MONO, fontSize: 12, color: '#333' }}>
              {'  '}{it.quantity} x {money(it.unit_price)}
            </Text>
            <Text style={{ fontFamily: MONO, fontSize: 12, fontWeight: '700', color: '#000' }}>
              {money(it.subtotal)}
            </Text>
          </View>
        </View>
      ))}

      <Sep char="=" />

      {/* TOTAL */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: MONO, fontSize: 17, fontWeight: '900', color: '#000' }}>TOTAL</Text>
        <Text style={{ fontFamily: MONO, fontSize: 17, fontWeight: '900', color: '#000' }}>
          {money(total)}
        </Text>
      </View>
      {remaining > 0 ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontFamily: MONO, fontSize: 12.5, color: '#000' }}>Paye</Text>
            <Text style={{ fontFamily: MONO, fontSize: 12.5, color: '#000' }}>{money(paid)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            <Text style={{ fontFamily: MONO, fontSize: 13, fontWeight: '900', color: '#000' }}>RESTE A PAYER</Text>
            <Text style={{ fontFamily: MONO, fontSize: 13, fontWeight: '900', color: '#000' }}>{money(remaining)}</Text>
          </View>
        </>
      ) : null}
      <Text style={{ fontFamily: MONO, fontSize: 11, color: '#333', textAlign: 'center', marginTop: 5 }}>
        {items.length} article(s){remaining > 0 ? '  ·  ⚠ CREDIT' : '  ·  ✔ PAYE'}
      </Text>

      <Sep />

      <Text style={{ fontFamily: MONO, fontSize: 14, fontWeight: '900', color: '#000', textAlign: 'center', letterSpacing: 2 }}>
        *** MERCI ! ***
      </Text>
      {shop?.slogan ? (
        <Text style={{ fontFamily: MONO, fontSize: 11, color: '#333', textAlign: 'center', marginTop: 3 }}>
          {shop.slogan}
        </Text>
      ) : null}
    </View>
  );
}
