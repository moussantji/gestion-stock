// ============================================================
// 📸 Scan code-barres par webcam (v2.4) — zéro dépendance
// BarcodeDetector (API Chromium, activée côté main via
// enable-experimental-web-platform-features) + getUserMedia.
// La douchette USB reste utilisable ; la caméra est un bonus.
// Modale vidéo : vise le code → détection auto + même bip que
// la douchette (ScanBeep) → callback vers l'écran appelant.
// ============================================================
const ScanCamera = (() => {
  const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'];

  const hasCameraApi = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const hasDetector = () => typeof window !== 'undefined' && typeof window.BarcodeDetector === 'function';
  const SUPPORTED = () => hasCameraApi() && hasDetector();

  // requestAnimationFrame absent en tests headless → timer de repli
  const rafFn = (fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(() => fn(Date.now()), 120));
  const cafFn = (id) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id));

  /**
   * Ouvre la modale caméra ; onCode(code) est appelé à chaque détection.
   * @param {Object} opts
   * @param {(code: string) => void} opts.onCode
   * @param {boolean} [opts.continuous=true]  true → reste ouverte (caisse), false → se ferme au 1er code
   * @param {number}  [opts.cooldownMs=1200]  anti-spam entre 2 détections du MÊME code
   * @returns {Promise<boolean>} true si la caméra tourne
   */
  async function open({ onCode, continuous = true, cooldownMs = 1200 } = {}) {
    const t = I18n.t;
    if (!hasCameraApi()) { UI.toast(t('sc_no_support'), 'var(--warning)', 4200); return false; }
    if (!hasDetector()) { UI.toast(t('sc_api_missing'), 'var(--warning)', 4200); return false; }

    const video = UI.h('video', {
      autoplay: true, playsInline: true, muted: true,
      style: {
        width: '100%', aspectRatio: '4 / 3', background: '#000',
        borderRadius: '12px', display: 'block', objectFit: 'cover',
      },
    });
    const hint = UI.h('div', { class: 'muted', style: { marginTop: '10px', fontSize: '12px', textAlign: 'center' } }, t('sc_hint'));
    let stream = null; let rafId = 0; let stopped = false;
    const stop = () => {
      stopped = true;
      cafFn(rafId);
      try { stream?.getTracks?.().forEach((tr) => tr.stop()); } catch { /* déjà arrêté */ }
    };
    const { close } = UI.modal({
      title: t('sc_title'), icon: '📸',
      onClose: () => setTimeout(stop, 0), // 🔌 coupe la caméra quoi qu'il arrive
      children: UI.h('div', {}, video, hint),
    });

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    } catch (e) {
      close();
      const key = e?.name === 'NotAllowedError' ? 'sc_no_perm' : 'sc_no_camera';
      UI.toast(t(key, { msg: String(e?.message ?? e?.name ?? '') }), 'var(--danger)', 4500);
      return false;
    }

    video.srcObject = stream;
    try { await video.play?.(); } catch { /* certains navigateurs rejouent tout seuls */ }

    const detector = new window.BarcodeDetector({ formats: FORMATS });
    let last = { code: null, at: 0 };
    const loop = async () => {
      if (stopped) return;
      try {
        if (video.readyState === undefined || video.readyState >= 2) { // HAVE_CURRENT_DATA
          const codes = await detector.detect(video);
          const raw = codes?.[0]?.rawValue;
          if (raw) {
            const now = Date.now();
            if (raw !== last.code || now - last.at >= cooldownMs) {
              last = { code: raw, at: now };
              window.ScanBeep?.ok(); // 🔊 même bip que la douchette (v1.8)
              onCode?.(String(raw));
              if (!continuous) { stop(); close(); return; }
            }
          }
        }
      } catch { /* frame illisible → boucle suivante */ }
      rafId = rafFn(loop);
    };
    rafId = rafFn(loop);
    return true;
  }

  return { open, SUPPORTED, hasDetector };
})();

if (typeof window !== 'undefined') window.ScanCamera = ScanCamera;
