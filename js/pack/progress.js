// ===== Matek csomag: bolygónkénti haladás (csillagok, szintek), altípus-választás, küldetésterv =====
// DOM nélkül, Node-ban is tesztelhető. Az általános részek (pont, napi összesítő, sorozat) a közös keretben vannak.
import { TYPES, typeById, subsFor } from "./types/index.js";
import { dayNum } from "../core/dates.js";
import { newItem, srsStep, accuracy } from "../core/srs.js";

// ---- Típus szintje és csillagai ----
export const typeState = (u, T) => (u.types[T] = u.types[T] || { stars: 0, run: 0 });
export const typeLvl = (u, T) => Math.min(3, typeState(u, T).stars + 1);
// A kulcsban nem lehet pont (Firebase), ezért kettőspontot használunk
export const subKey = (T, s) => `${T}:${s}`;
export const subState = (u, T, s) => (u.subs[subKey(T, s)] = u.subs[subKey(T, s)] || newItem());
export const subAcc = accuracy;
export const starsTotal = u => Object.values(u.types || {}).reduce((a, t) => a + (t.stars || 0), 0);

// Szülői térkép színe: zöld (megy), sárga (bizonytalan), piros (gyenge), szürke (még nem próbálta)
export function subColor(u, T, s) {
  const st = u.subs[subKey(T, s)];
  if (!st || !st.n) return "grey";
  const a = subAcc(st);
  if (st.last.length < 3) return a >= 0.67 ? "yellow" : "red";
  return a >= 0.8 ? "green" : a >= 0.5 ? "yellow" : "red";
}

// ---- Altípus választása: a gyengébb és a még nem látott altípusok gyakrabban jönnek ----
export function pickSub(u, T, lvl, rng) {
  const cands = subsFor(T, lvl);
  const w = cands.map(s => { const st = u.subs[subKey(T.id, s.id)]; if (!st || !st.n) return 3; const a = subAcc(st) ?? 0.5; return 1 + (1 - a) * 3; });
  let r = rng.next() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < cands.length; i++) { r -= w[i]; if (r <= 0) return cands[i].id; }
  return cands[cands.length - 1].id;
}

// ---- Napi küldetés terve: ~60% gyenge/új típus, ~30% ismétlés, ~10% meglepetés (ami már jól megy) ----
// allowed: a nem lezárt bolygók azonosítói (témazár)
export function planMission(u, rng, n = 10, allowed = null, today = dayNum()) {
  const pool = TYPES.filter(T => !allowed || allowed.includes(T.id));
  const types = pool.length ? pool : TYPES;
  const nFocus = Math.round(n * 0.6), nSurprise = Math.max(1, Math.round(n * 0.1));
  const nReview = n - nFocus - nSurprise;
  const plan = [];
  // ismétlés: esedékes altípusok, a legrégebben esedékes elöl
  const due = Object.entries(u.subs).filter(([k, s]) => s.n && s.due && s.due <= today && types.some(T => k.startsWith(T.id + ":"))).sort((a, b) => a[1].due - b[1].due);
  due.slice(0, nReview).forEach(([k]) => { const [T, s] = k.split(":"); if (typeById(T)) plan.push({ topic: T, sub: s, kind: "review" }); });
  // fókusz: a kevesebb csillagos típusok nagyobb eséllyel
  const fw = types.map(T => 4 - typeState(u, T.id).stars + (Object.keys(u.subs).some(k => k.startsWith(T.id + ":")) ? 0 : 1));
  const pickType = ws => { let r = rng.next() * ws.reduce((a, b) => a + b, 0); for (let i = 0; i < types.length; i++) { r -= ws[i]; if (r <= 0) return types[i]; } return types[0]; };
  while (plan.length < nReview + nFocus) { const T = pickType(fw); plan.push({ topic: T.id, sub: pickSub(u, T, typeLvl(u, T.id), rng), kind: "focus" }); }
  // meglepetés: a legtöbb csillagos típusból
  const best = types.slice().sort((a, b) => typeState(u, b.id).stars - typeState(u, a.id).stars)[0];
  for (let i = 0; i < nSurprise; i++) plan.push({ topic: best.id, sub: pickSub(u, best, typeLvl(u, best.id), rng), kind: "surprise" });
  return rng.shuffle(plan).slice(0, n);
}

// ---- A csomag saját haladásának rögzítése (ismétlés + csillag) ----
// r: 1 = elsőre jó, 2 = tipp után jó, 0 = magyarázat kellett
export function recordProgress(u, task, r, today = dayNum()) {
  srsStep(subState(u, task.topic, task.sub), r === 1, today);
  // csillag: 3 egymás utáni elsőre jó válasz a típus aktuális szintjén
  const ts = typeState(u, task.topic);
  let star = null;
  if (r === 1 && task.level >= typeLvl(u, task.topic)) {
    ts.run++;
    if (ts.run >= 3 && ts.stars < 3) { ts.stars++; ts.run = 0; star = { topic: task.topic, stars: ts.stars }; }
  } else if (r !== 1) ts.run = 0;
  return star;
}

// ---- 🩹 Ismétlő kör: az elrontott feladatok, pontosan ugyanúgy újra ----
// Minden feladat egy magból (seed) generálódik; hibás válasznál (magyarázat után) a téma, az altípus, a szint és a mag
// a listára kerül, így az ismétlő kör ugyanazt a feladatot állítja elő. Ha elsőre jó, lekerül. Legfeljebb REVIEW_MAX.
export const REVIEW_MAX = 30;
const reviewList = u => (u.review = Array.isArray(u.review) ? u.review : Object.values(u.review || {}));
const sameTask = task => x => x.topic === task.topic && x.sub === task.sub && x.seed === task.seed;
export function reviewNote(u, task, r) {
  if (task.seed == null) return;
  const L = reviewList(u), i = L.findIndex(sameTask(task));
  if (r === 1) { if (i >= 0) L.splice(i, 1); return; }
  if (r === 0 && i < 0) { L.push({ topic: task.topic, sub: task.sub, level: task.level, seed: task.seed }); if (L.length > REVIEW_MAX) L.splice(0, L.length - REVIEW_MAX); }
}
export const reviewCount = (u, allowed) => reviewList(u).filter(x => typeById(x.topic) && (!allowed || allowed.includes(x.topic))).length;
export function planReview(u, n, rng, allowed) {
  return rng.shuffle(reviewList(u).filter(x => typeById(x.topic) && (!allowed || allowed.includes(x.topic)))).slice(0, n)
    .map(x => ({ topic: x.topic, sub: x.sub, level: x.level, seed: x.seed }));
}

// ---- A csomag jelvényei ----
export const PACK_BADGES = [
  { id: "star1", ic: "⭐", n: "Első csillag", t: u => starsTotal(u) >= 1 },
  { id: "all1", ic: "🪐", n: "Minden bolygón csillag", t: u => TYPES.every(T => (u.types[T.id] || {}).stars >= 1) },
  { id: "full", ic: "👑", n: "Egy bolygó 3 csillaggal", t: u => Object.values(u.types).some(t => t.stars >= 3) },
];
