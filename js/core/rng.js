// ===== Magozható véletlenszám-generátor (közös keret) =====
// Alapból Math.random, a tesztekben magozható (mulberry32)
export function makeRng(seed) {
  let a = seed == null ? null : seed >>> 0;
  const next = a == null ? Math.random : () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),          // [lo, hi] egész
    pick: arr => arr[Math.floor(next() * arr.length)],
    chance: p => next() < p,
    shuffle: arr => { const a2 = arr.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; },
    sample: (arr, k) => r.shuffle(arr).slice(0, k),
  };
  return r;
}

