// ===== 🔔 Halk hangjelzések (Web Audio, hangfájl nélkül) =====
// Rövid, lágy dallamok: jó válasz, fejlődés, új tárgy / rang, küldetés kész; hibára egy halk, barátságos „hmm” (nem büntető).
// A hangot az első koppintás „ébreszti fel” (böngészőszabály); ha nincs hangkártya vagy le van tiltva, csendben marad.
let ctx = null;
const AC = () => (typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null);
// [frekvencia (Hz), kezdés (mp), hossz (mp)]
export const SOUNDS = {
  ok: [[659, 0, 0.09], [880, 0.08, 0.16]],
  improved: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.3]],
  item: [[784, 0, 0.08], [988, 0.08, 0.08], [1175, 0.16, 0.08], [1568, 0.24, 0.35]],
  mission: [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.45]],
  wrong: [[392, 0, 0.14], [330, 0.13, 0.22]],   // két mély, lefelé lépő hang – „hmm, még nem”
};
// hangonként a hullámforma és a hangerő-szorzó (a hibajelzés lágyabb és halkabb)
const TONE = { wrong: { type: "sine", gain: 0.8 } };
export function playSound(name, volume = 0.07) {
  const notes = SOUNDS[name]; if (!notes) return false;
  try {
    const A = AC(); if (!A) return false;
    ctx = ctx || new A();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime + 0.01;
    const tone = TONE[name] || {};
    for (const [f, at, len] of notes) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = tone.type || "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.linearRampToValueAtTime(volume * (tone.gain || 1), t0 + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
      o.connect(g); g.connect(ctx.destination);
      o.start(t0 + at); o.stop(t0 + at + len + 0.05);
    }
    return true;
  } catch { return false; }
}
