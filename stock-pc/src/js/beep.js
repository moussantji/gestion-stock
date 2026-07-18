// ============================================================
// 🔊 Bip de scan (v1.8) — petit bip POS quand la douchette trouve
// un produit (vente & inventaire). Web Audio API : deux tonalités
// courtes (880 Hz → 1320 Hz), zéro ressource, marche hors ligne.
// Interrupteur dans ⚙️ Réglages → 🤖 Automatisations (pref "beep").
// ============================================================
const ScanBeep = (() => {
  const enabled = () => window.Auto?.get?.().beep === true;
  let ctx = null;

  function tone(freqMs, startSec, durSec, vol = 0.035) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freqMs;
    gain.gain.setValueAtTime(vol, ctx.currentTime + startSec);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startSec + durSec); // fondu anti-clic
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + startSec);
    osc.stop(ctx.currentTime + startSec + durSec);
    return osc;
  }

  /** Bip succès (double tonalité). @returns {boolean} joué ou non */
  function ok() {
    if (!enabled()) return false;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = ctx ?? new AC();
      if (ctx.state === 'suspended') ctx.resume?.();
      tone(880, 0, 0.09);
      tone(1320, 0.1, 0.12);
      return true;
    } catch { return false; }
  }

  return { ok, enabled };
})();

window.ScanBeep = ScanBeep;
