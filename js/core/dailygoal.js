// ===== Kétszintű napi cél – játékfüggetlen =====
// 1) Napi küldetés: X feladat VAGY Y perc → sorozat (hetente 1 pajzs véd egy kihagyott napot)
// 2) Napi nagy cél: N helyes válasz (pontszorzóval ×1/×2/×3, a tegnapi ajándék-előleggel) → serlegeső + ajándékdoboz
// Adatok: u.days[nap] = { n, ok, ms, pts, done } · u.streak = { n, last, best } · u.shields[hét]
//         u.goal = { big: { day, n }, mult: { day, v }, bonus: { day, n }, gift: { due, picked }, giftLog: [] }
import { dayNum, dateKey } from "./dates.js";

export const weekOf = day => Math.floor((day + 3) / 7); // hétfőtől vasárnapig (1970.01.01. csütörtök volt)
const dayRec = (u, today) => (u.days[dateKey(today)] = u.days[dateKey(today)] || { n: 0, ok: 0, ms: 0, done: false });

// ---- Napi küldetés ----
export function missionProgress(u, P, today = dayNum()) {
  const d = u.days[dateKey(today)] || { n: 0, ms: 0, done: false };
  return { n: d.n || 0, min: Math.floor((d.ms || 0) / 60000), done: !!d.done, pct: Math.min(1, Math.max((d.n || 0) / P.goalTasks, (d.ms || 0) / 60000 / P.goalMin)) };
}
// Kihagyott napok: ha mindegyik más-más héten van, és azon a héten még nem használtunk pajzsot, a sorozat megmarad
function shieldPlan(u, today) {
  const last = u.streak.last;
  if (last < 0 || today - last <= 1) return { ok: true, use: [] };
  const weeks = {};
  for (let d = last + 1; d < today; d++) { const w = weekOf(d); weeks[w] = (weeks[w] || 0) + 1; }
  const use = Object.keys(weeks);
  return { ok: use.every(w => weeks[w] === 1 && !(u.shields || {})[w]), use };
}
// Küldetés teljesítése: sorozat léptetése. Visszaadja { streak, shieldUsed }, vagy null, ha már megvolt.
export function completeMission(u, today = dayNum()) {
  const d = dayRec(u, today);
  if (d.done) return null;
  d.done = true;
  u.shields = u.shields || {};
  const sp = shieldPlan(u, today);
  let shieldUsed = false;
  if (u.streak.last === today) { /* már megvolt */ }
  else if (u.streak.last >= 0 && sp.ok) { sp.use.forEach(w => { u.shields[w] = true; shieldUsed = true; }); u.streak.n++; }
  else u.streak.n = 1;
  u.streak.last = today;
  u.streak.best = Math.max(u.streak.best || 0, u.streak.n);
  u.upd = Date.now();
  return { streak: u.streak.n, shieldUsed };
}
export function streakNow(u, today = dayNum()) {
  if (!u.streak || u.streak.last < 0) return 0;
  if (today - u.streak.last <= 1) return u.streak.n;
  return shieldPlan(u, today).ok ? u.streak.n : 0;
}
export const shieldAvailable = (u, today = dayNum()) => !(u.shields || {})[weekOf(today)];

// ---- Napi nagy cél ----
const G = u => (u.goal = u.goal || {});
const onDay = (x, today) => !!x && x.day === dateKey(today);
// Mai pontszorzó (csak aznap érvényes; napváltáskor magától ×1)
export const multOf = (u, today = dayNum()) => { const m = G(u).mult; return onDay(m, today) && [2, 3].includes(+m.v) ? +m.v : 1; };
export function setMult(u, v, today = dayNum()) { G(u).mult = { day: dateKey(today), v: [2, 3].includes(+v) ? +v : 1 }; }
export const bonusToday = (u, today = dayNum()) => { const b = G(u).bonus; return onDay(b, today) ? +b.n || 0 : 0; };
export const bigToday = (u, today = dayNum()) => { const b = G(u).big; return onDay(b, today) ? +b.n || 0 : 0; };
// A nagy cél állása: helyes válaszok (szorzóval) + a tegnapi ajándék-előleg
export const bigProgress = (u, N, today = dayNum()) => { const have = bigToday(u, today) + bonusToday(u, today); return { have, need: N, done: have >= N, pct: Math.min(1, have / N), mult: multOf(u, today), bonus: bonusToday(u, today) }; };
// Egy helyes válasz a nagy cél felé. Visszaadja, hogy most lett-e meg (true csak egyszer, a határ átlépésekor).
export function addCorrect(u, N, today = dayNum()) {
  const before = bigProgress(u, N, today).have, m = multOf(u, today);
  G(u).big = { day: dateKey(today), n: bigToday(u, today) + m };
  const hit = before < N && before + m >= N;
  if (hit) G(u).gift = { due: dateKey(today), picked: "" };
  return hit;
}
export const giftPending = (u, today = dayNum()) => { const g = G(u).gift; return !!g && g.due === dateKey(today) && !g.picked; };
// Ajándék kiválasztása: a holnapi előleget is beírja. gift: { id, bonus? }
export function pickGift(u, gift, today = dayNum()) {
  G(u).gift = { ...(G(u).gift || {}), due: dateKey(today), picked: gift.id };
  if (gift.bonus) G(u).bonus = { day: dateKey(today + 1), n: gift.bonus };
  G(u).giftLog = [...(Array.isArray(G(u).giftLog) ? G(u).giftLog : Object.values(G(u).giftLog || {})), { d: dateKey(today), id: gift.id }].slice(-30);
}
