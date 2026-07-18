// ============================================================
// StockFlow PC — composants UI (DOM builders minimalistes)
// ============================================================
const UI = (() => {
  /** Crée un élément : UI.h('div', {class:'card', onclick:fn}, children…) */
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    children.flat(Infinity).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    return el;
  }

  const badge = (tone, text) => h('span', { class: `badge badge-${tone}` }, text);

  const statCard = (icon, value, label, tone = 'var(--primary)') =>
    h('div', { class: 'stat-card', style: { '--tone': tone } },
      h('div', { class: 'stat-ico' }, icon),
      h('div', { class: 'stat-value' }, value),
      h('div', { class: 'stat-label' }, label));

  const spinner = () => h('div', { class: 'spinner' });

  const empty = (icon, title, sub) =>
    h('div', { class: 'empty' },
      h('div', { class: 'ico' }, icon),
      h('div', { class: 't1' }, title),
      sub ? h('div', { class: 't2' }, sub) : null);

  function toast(msg, tone = 'var(--primary)', ms = 3200) {
    let zone = document.querySelector('.toast-zone');
    if (!zone) { zone = h('div', { class: 'toast-zone' }); document.body.appendChild(zone); }
    const el = h('div', { class: 'toast', style: { '--tone': tone } }, msg);
    zone.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, ms);
  }

  /** Modale générique. close() la ferme. Clic overlay = ferme. */
  function modal({ title, icon, width, children, onClose }) {
    const close = () => { overlay.remove(); onClose?.(); };
    const overlay = h('div', {
      class: 'overlay',
      onclick: (e) => { if (e.target === overlay) close(); },
    },
      h('div', { class: 'modal', style: width === 'lg' ? {} : undefined, },
        h('div', { class: 'modal-title' },
          icon ? h('span', {}, icon) : null,
          h('span', {}, title),
          h('button', { class: 'modal-close', onclick: close }, '✕')),
        children));
    if (width === 'lg') overlay.firstChild.classList.add('modal-lg');
    document.body.appendChild(overlay);
    return { overlay, close };
  }

  /** Confirmation simple → promesse booléenne */
  function confirm(msg, { okText, danger } = {}) {
    return new Promise((resolve) => {
      const { close } = modal({
        title: msg, icon: danger ? '⚠️' : '❓',
        onClose: () => setTimeout(() => resolve(false), 0),
        children: h('div', { class: 'form-row', style: { marginTop: '16px' } },
          h('button', { class: 'btn', onclick: () => { close(); setTimeout(() => resolve(false), 0); } }, I18n.t('cancel')),
          h('button', {
            class: danger ? 'btn btn-danger' : 'btn btn-primary',
            onclick: () => { close(); setTimeout(() => resolve(true), 0); },
          }, okText || I18n.t('yes'))),
      });
    });
  }

  const field = (label, inputEl) => h('div', { class: 'field' }, h('label', {}, label), inputEl);
  const input = (attrs = {}) => h('input', { class: 'input', ...attrs });
  const select = (attrs, options) => {
    const s = h('select', { class: 'select', ...attrs });
    options.forEach((o) => s.appendChild(h('option', { value: o.value }, o.label)));
    return s;
  };

  const kv = (k, v) => h('div', { class: 'kv' }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, v));

  /** Mini-graphique SVG en ligne (valeurs num[] + labels) */
  function lineChart({ series, labels, height = 150 }) {
    const W = 640, H = height, PAD = 26;
    const maxV = Math.max(1, ...series.flatMap((s) => s.values));
    const n = labels.length;
    const x = (i) => PAD + (n <= 1 ? 0 : (i * (W - PAD * 1.4)) / (n - 1));
    const y = (v) => H - PAD + 6 - (v / maxV) * (H - PAD - 14);

    const polylines = series.map((s) => {
      const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
      const dots = s.values.map((v, i) =>
        `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${s.color}"/>`).join('');
      // aire dégradée subtile sous la ligne
      const area = `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.4"
        stroke-linecap="round" stroke-linejoin="round"/>` + dots;
      return area;
    }).join('');

    const grid = [0.25, 0.5, 0.75, 1].map((g) => {
      const yy = H - PAD + 6 - g * (H - PAD - 14);
      const val = Math.round(maxV * g);
      return `<line x1="${PAD}" y1="${yy}" x2="${W - 8}" y2="${yy}" stroke="#232C47" stroke-dasharray="3 5"/>
        <text x="${PAD - 5}" y="${yy + 3.5}" fill="#94A3B8" font-size="9" text-anchor="end">${Fmt.num(val)}</text>`;
    }).join('');

    const xlabels = labels.map((l, i) =>
      (n > 10 && i % 5 !== 0 && i !== n - 1) ? '' :
        `<text x="${x(i)}" y="${H - 6}" fill="#94A3B8" font-size="9" text-anchor="middle">${Fmt.esc(l)}</text>`).join('');

    const legend = series.map((s, i) =>
      `<circle cx="${W - 90 - i * 90}" cy="10" r="4" fill="${s.color}"/>
       <text x="${W - 82 - i * 90}" y="13.5" fill="#94A3B8" font-size="10">${Fmt.esc(s.name)}</text>`).join('');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', '100%');
    svg.innerHTML = grid + xlabels + legend + polylines;
    return svg;
  }

  /** Jauge de niveau (0..1) teintée */
  const gauge = (ratio, color) =>
    h('div', { class: 'gauge' },
      h('div', { style: { width: `${Math.max(4, Math.min(100, ratio * 100))}%`, background: color } }));

  return { h, badge, statCard, spinner, empty, toast, modal, confirm, field, input, select, kv, lineChart, gauge };
})();
