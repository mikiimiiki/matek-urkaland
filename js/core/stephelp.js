// ===== Lépésenkénti súgó: hány lépést mutathat a súgó, és hogyan csökken / jön vissza =====
// Játékfüggetlen, DOM nélküli logika (a gyakorlókör a js/shell/play.js-ben használja).
// Állapot témánként és gyerekenként: u.stepHelp[téma] = { cut, full, free }
//   cut  – ennyivel kevesebb lépés érhető el a feladat saját maximumánál
//   full – hány egymás utáni feladatban nyomta végig az összes elérhető lépést
//   free – hány egymás utáni feladatot oldott meg súgó nélkül (a csökkentés óta)
export const STEP_HELP = { fullRuns: 2, back1: 3, backAll: 5, maxCut: 3 };

export const shState = (u, topic) => { const all = (u.stepHelp = u.stepHelp || {}); return (all[topic] = all[topic] || { cut: 0, full: 0, free: 0 }); };

// Hány lépés érhető el egy feladatnál: a végeredményt (utolsó lépés) soha nem mutatjuk → legfeljebb n − 1,
// a csökkentéssel kevesebb, de legalább 1. Egylépéses (vagy lépés nélküli) feladatnál 1: ilyenkor a tippet mutatjuk.
export function shCap(nSteps, st = {}) {
  const base = Math.max(1, (nSteps || 0) - 1);
  return Math.max(1, base - (st.cut || 0));
}

// Egy feladat vége: used = hány súgólépést nézett meg, cap = ennyi volt elérhető.
// Visszaad: "reduced" (csökkent a súgó), "back" (visszajött egy lépés), "all" (visszajött minden), vagy null.
export function shEnd(st, used, cap, T = STEP_HELP) {
  if (!used) {
    st.full = 0;
    if (!st.cut) { st.free = 0; return null; }
    st.free = (st.free || 0) + 1;
    if (st.free >= T.backAll) { st.cut = 0; st.free = 0; return "all"; }
    if (st.free === T.back1) { st.cut = Math.max(0, st.cut - 1); if (!st.cut) st.free = 0; return st.cut ? "back" : "all"; }
    return null;
  }
  st.free = 0;
  if (used < cap) { st.full = 0; return null; }
  st.full = (st.full || 0) + 1;
  if (st.full >= T.fullRuns) {
    st.full = 0;
    if ((st.cut || 0) >= T.maxCut) return null;
    st.cut = (st.cut || 0) + 1;
    return "reduced";
  }
  return null;
}
