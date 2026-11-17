// ===== Részleges szinkron: csak a változás megy fel, mezőnkénti összefésülés =====
// Játékfüggetlen. Egy objektumot „levelekre” bontunk (legfeljebb DEPTH mélységig, pl. hist/2026-11-17/T1),
// és levelenként hasonlítunk. A tömbök mindig egy levélnek számítanak.
//
// - diff(local, base): a felhőbe küldendő változások { "útvonal": érték | null }
// - merge(base, remote, local, localNewer): háromutas összefésülés letöltéskor
//   (base = amit utoljára a felhőben tudtunk, remote = a mostani felhő, local = a helyi állapot)
// - apply(obj, updates): a változások ráírása egy objektumra (a sikeres feltöltés után a „base”-re)

export const DEPTH = 3;
// Mély másolat: a helyi adat, a felhőről tárolt pillanatkép és a küldött változás soha ne osszon közös objektumot
// (különben egy helyi módosítás a pillanatképet is átírná, és a változás nem menne fel)
export const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
const isEmpty = v => v === undefined || v === null || (Array.isArray(v) && !v.length) || (isObj(v) && !Object.keys(v).length);

// Kulcssorrendtől független összehasonlítás (a Firebase ábécérendben adja vissza a kulcsokat)
export function stable(v) {
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  if (isObj(v)) return "{" + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
  return JSON.stringify(v === undefined ? null : v);
}
// Levelek: útvonal → érték. Üres objektum/tömb nem levél (a Firebase sem tárolja őket).
export function flatten(o, depth = DEPTH, pre = "", out = new Map()) {
  if (!isObj(o)) return out;
  for (const [k, v] of Object.entries(o)) {
    if (isEmpty(v)) continue;
    const p = pre ? pre + "/" + k : k;
    if (isObj(v) && depth > 1) flatten(v, depth - 1, p, out);
    else out.set(p, v);
  }
  return out;
}
export function unflatten(map) {
  const o = {};
  for (const [p, v] of map) {
    const ks = p.split("/"); let c = o;
    ks.slice(0, -1).forEach(k => { if (!isObj(c[k])) c[k] = {}; c = c[k]; });
    c[ks[ks.length - 1]] = v;
  }
  return o;
}
// Ami helyben más, mint a felhőben (base): új vagy változott levél → érték; helyben törölt levél → null.
// Ha egy útvonal felett a base-ben nem objektum állt (pl. régen szám volt), a teljes ágat küldjük.
export function diff(local, base, depth = DEPTH) {
  const L = flatten(local, depth), B = flatten(base || {}, depth), up = {};
  for (const [p, v] of L) { const b = B.get(p); if (b === undefined || stable(b) !== stable(v)) up[p] = v; }
  for (const p of B.keys()) if (!L.has(p) && !hasPrefix(L, p)) up[p] = null;
  return dropNested(up);
}
const hasPrefix = (map, p) => { for (const k of map.keys()) if (k.startsWith(p + "/")) return true; return false; };
// A Firebase update() nem fogad el egymásba ágyazódó útvonalakat (pl. „a” és „a/b”) – a rövidebb nyer
function dropNested(up) {
  const ks = Object.keys(up).sort();
  ks.forEach((k, i) => { if (i && ks.slice(0, i).some(x => up[x] !== undefined && k.startsWith(x + "/"))) delete up[k]; });
  return up;
}
export function apply(obj, updates) {
  const m = flatten(obj || {}, 99);
  for (const [p, v] of Object.entries(updates)) {
    for (const k of [...m.keys()]) if (k === p || k.startsWith(p + "/")) m.delete(k);
    if (v !== null && v !== undefined) flatten({ x: v }, 99).forEach((x, kp) => m.set(p + kp.slice(1), x));
  }
  return clone(unflatten(m));
}
// Háromutas összefésülés. Szabályok levelenként:
//  - ha csak a felhőben változott (más eszköz írta) → a felhőé;
//  - ha csak helyben változott (még nincs feltöltve) → a helyi;
//  - ha mindkettő → localNewer dönt;
//  - a felhőben HIÁNYZÓ levél soha nem töröl helyben (egy régebbi változatú eszköz nem ismeri az új mezőket).
export function merge(base, remote, local, localNewer = false, depth = DEPTH) {
  const B = flatten(base || {}, depth), R = flatten(remote || {}, depth), L = flatten(local || {}, depth);
  const out = new Map(L);
  for (const [p, r] of R) {
    const b = B.get(p), l = L.get(p);
    const rChanged = b === undefined || stable(b) !== stable(r);
    const lChanged = l !== undefined && (b === undefined || stable(b) !== stable(l));
    if (l === undefined) { if (!hasPrefix(L, p)) out.set(p, r); continue; }
    if (stable(l) === stable(r)) continue;
    if (rChanged && (!lChanged || !localNewer)) {
      for (const k of [...out.keys()]) if (k.startsWith(p + "/")) out.delete(k);
      out.set(p, r);
    }
  }
  return clone(unflatten(out));
}
// JSON-méret bájtban (UTF-8) – a forgalomszámlálóhoz
export const bytes = v => (v === undefined ? 0 : new TextEncoder().encode(JSON.stringify(v)).length);
