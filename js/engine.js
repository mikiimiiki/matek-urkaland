// ===== Játékmotor: haladás, csillagok, ismétlés, napi küldetés, sorozat, jelvények =====
// DOM nélküli, tiszta logika – Node-ban is tesztelhető.
import { TYPES, typeById, subsFor } from "./types/index.js";
import { dayNum, dateKey } from "./core/dates.js";
import { histAdd } from "./core/progress.js";

// ---- Napok (a közös keretből; itt is elérhetők a régi importok miatt) ----
export { dayNum, dateKey };
const weekOf = day => Math.floor((day + 3) / 7); // hétfőtől vasárnapig (1970.01.01. csütörtök volt)

// ---- Alapértékek ----
// freeTasks: hány feladatból áll egy szabad gyakorló kör (3, 5 vagy 10)
export const DEFAULT_SETTINGS = { goalTasks: 10, goalMin: 15, freeTasks: 5, tts: false, rewards: [], upd: 0 };
export const FREE_SIZES = [3, 5, 10];
export const AVATARS = ["🧑‍🚀", "👩‍🚀", "👨‍🚀", "🤖", "👽", "🐱", "🦊", "🐼", "🐶", "🦄"];
const REVIEW_DAYS = [1, 3, 7, 21]; // ismétlés: 1, 3, 7 nap múlva, utána ritkán
export const POINTS = { first: 10, second: 5, explained: 2, twinBonus: 3, lvl3Bonus: 2 };

export function newUser(name, avatar = AVATARS[0]) {
  return { name, avatar, pts: 0, types: {}, subs: {}, log: [], days: {}, streak: { n: 0, last: -1, best: 0 }, shields: {}, badges: [], claimed: {}, total: 0, correct: 0, twins: 0, upd: 0 };
}
// Felhőből érkező adatnál a tömbök objektummá alakulhatnak (Firebase) – visszaalakítjuk
export function normUser(u) {
  const arr = x => Array.isArray(x) ? x : Object.values(x || {});
  const d = newUser(u.name || "Játékos");
  u = Object.assign(d, u);
  u.log = arr(u.log); u.badges = arr(u.badges);
  // régi, ponttal írt kulcsok átalakítása ("T1.kerekites" → "T1:kerekites")
  Object.keys(u.subs).forEach(k => { if (k.includes(".")) { u.subs[k.replace(".", ":")] = u.subs[k]; delete u.subs[k]; } });
  Object.values(u.subs).forEach(s => { s.last = arr(s.last); });
  u.streak = Object.assign({ n: 0, last: -1, best: 0 }, u.streak);
  return u;
}

// ---- Típus szintje és csillagai ----
export const typeState = (u, T) => (u.types[T] = u.types[T] || { stars: 0, run: 0 });
export const typeLvl = (u, T) => Math.min(3, typeState(u, T).stars + 1);
// A kulcsban nem lehet pont: a Firebase Realtime Database tiltja (. $ # [ ] /), ezért kettőspontot használunk
export const subKey = (T, s) => `${T}:${s}`;
export const subState = (u, T, s) => (u.subs[subKey(T, s)] = u.subs[subKey(T, s)] || { n: 0, ok: 0, box: 0, due: 0, last: [] });
export const subAcc = st => st.last.length ? st.last.reduce((a, b) => a + b, 0) / st.last.length : null;

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

// ---- Napi küldetés: ~60% gyenge/új típus, ~30% ismétlés, ~10% meglepetés (ami már jól megy) ----
export function planMission(u, rng, n = 10, today = dayNum()) {
  const nFocus = Math.round(n * 0.6), nSurprise = Math.max(1, Math.round(n * 0.1));
  const nReview = n - nFocus - nSurprise;
  const plan = [];
  // ismétlés: esedékes altípusok, a legrégebben esedékes elöl
  const due = Object.entries(u.subs).filter(([, s]) => s.n && s.due && s.due <= today).sort((a, b) => a[1].due - b[1].due);
  due.slice(0, nReview).forEach(([k]) => { const [T, s] = k.split(":"); if (typeById(T)) plan.push({ T, sub: s, kind: "review" }); });
  // fókusz: a kevesebb csillagos típusok nagyobb eséllyel
  const fw = TYPES.map(T => 4 - typeState(u, T.id).stars + (Object.keys(u.subs).some(k => k.startsWith(T.id + ":")) ? 0 : 1));
  const pickType = ws => { let r = rng.next() * ws.reduce((a, b) => a + b, 0); for (let i = 0; i < TYPES.length; i++) { r -= ws[i]; if (r <= 0) return TYPES[i]; } return TYPES[0]; };
  while (plan.length < nReview + nFocus) { const T = pickType(fw); plan.push({ T: T.id, sub: pickSub(u, T, typeLvl(u, T.id), rng), kind: "focus" }); }
  // meglepetés: a legtöbb csillagos típusból
  const best = TYPES.slice().sort((a, b) => typeState(u, b.id).stars - typeState(u, a.id).stars)[0];
  for (let i = 0; i < nSurprise; i++) plan.push({ T: best.id, sub: pickSub(u, best, typeLvl(u, best.id), rng), kind: "surprise" });
  return rng.shuffle(plan).slice(0, n);
}

// ---- Eredmény rögzítése ----
// r: 1 = elsőre jó, 2 = tipp után jó, 0 = magyarázat kellett
export function record(u, task, r, ms, opts = {}) {
  const today = dayNum(), ev = { pts: 0, star: null, badges: [] };
  const st = subState(u, task.type, task.sub);
  st.n++; if (r === 1) st.ok++;
  st.last.push(r === 1 ? 1 : 0); if (st.last.length > 10) st.last.shift();
  if (r === 1) { if (!st.due || st.due <= today) { st.box = Math.min(st.box + (st.due ? 1 : 0), REVIEW_DAYS.length - 1); } st.due = today + REVIEW_DAYS[st.box]; }
  else { st.box = 0; st.due = today + 1; }
  // csillag: 3 egymás utáni elsőre jó válasz a típus aktuális szintjén
  const ts = typeState(u, task.type);
  if (r === 1 && task.lvl >= typeLvl(u, task.type)) {
    ts.run++;
    if (ts.run >= 3 && ts.stars < 3) { ts.stars++; ts.run = 0; ev.star = { T: task.type, stars: ts.stars }; }
  } else if (r !== 1) ts.run = 0;
  // pontok (üzemanyag) – rossz válaszért nincs levonás
  ev.pts = r === 1 ? POINTS.first + (task.lvl === 3 ? POINTS.lvl3Bonus : 0) : r === 2 ? POINTS.second : POINTS.explained;
  if (opts.twin && r >= 1) { ev.pts += POINTS.twinBonus; u.twins++; }
  u.pts += ev.pts;
  u.total++; if (r === 1) u.correct++;
  const d = (u.days[dateKey(today)] = u.days[dateKey(today)] || { n: 0, ok: 0, ms: 0, done: false });
  d.n++; if (r === 1) d.ok++; d.ms += Math.min(ms || 0, 180000);
  histAdd(u, task.type, r === 1, ms, today); // napi, bolygónkénti statisztika a Fejlődés fülhöz
  if (r !== 1) {
    // az időbélyeg a bejegyzés kulcsa a felhőben → mindig egyedi
    u.log.push({ t: Math.max(Date.now(), u.log.length ? (u.log[u.log.length - 1].t || 0) + 1 : 0), T: task.type, s: task.sub, lvl: task.lvl, r, q: opts.q || "", a: opts.a || "", c: opts.c || "", w: opts.w || "" });
    if (u.log.length > 120) u.log.splice(0, u.log.length - 120);
  }
  ev.badges = checkBadges(u);
  u.upd = Date.now();
  return ev;
}

// ---- Napi küldetés és sorozat (heti 1 pajzs) ----
export function missionProgress(u, s = DEFAULT_SETTINGS, today = dayNum()) {
  const d = u.days[dateKey(today)] || { n: 0, ms: 0, done: false };
  return { n: d.n, min: Math.floor(d.ms / 60000), done: d.done, pct: Math.min(1, Math.max(d.n / s.goalTasks, d.ms / 60000 / s.goalMin)) };
}
// Kihagyott napok: ha mindegyik más-más héten van, és azon a héten még nem használtunk pajzsot, a sorozat megmarad
function shieldPlan(u, today) {
  const last = u.streak.last;
  if (last < 0 || today - last <= 1) return { ok: true, use: [] };
  const weeks = {};
  for (let d = last + 1; d < today; d++) { const w = weekOf(d); weeks[w] = (weeks[w] || 0) + 1; }
  const use = Object.keys(weeks);
  const ok = use.every(w => weeks[w] === 1 && !u.shields[w]);
  return { ok, use };
}
export function completeMission(u, today = dayNum()) {
  const d = (u.days[dateKey(today)] = u.days[dateKey(today)] || { n: 0, ok: 0, ms: 0, done: false });
  if (d.done) return null;
  d.done = true;
  const sp = shieldPlan(u, today);
  let shieldUsed = false;
  if (u.streak.last === today) { /* már megvolt */ }
  else if (u.streak.last >= 0 && sp.ok) { sp.use.forEach(w => { u.shields[w] = true; shieldUsed = true; }); u.streak.n++; }
  else u.streak.n = 1;
  u.streak.last = today;
  u.streak.best = Math.max(u.streak.best, u.streak.n);
  const ev = { streak: u.streak.n, shieldUsed, badges: checkBadges(u) };
  u.upd = Date.now();
  return ev;
}
export function streakNow(u, today = dayNum()) {
  if (u.streak.last < 0) return 0;
  if (today - u.streak.last <= 1) return u.streak.n;
  return shieldPlan(u, today).ok ? u.streak.n : 0;
}
export const shieldAvailable = (u, today = dayNum()) => !u.shields[weekOf(today)];

// ---- Rangok és jelvények ----
export const RANKS = [[0, "Űrkadét"], [300, "Pilóta"], [800, "Navigátor"], [1600, "Kapitány"], [3000, "Parancsnok"], [5000, "Galaxis-admirális"]];
export function rankOf(pts) {
  let i = 0; while (i + 1 < RANKS.length && pts >= RANKS[i + 1][0]) i++;
  const next = RANKS[i + 1];
  return { name: RANKS[i][1], next: next ? next[1] : null, pct: next ? (pts - RANKS[i][0]) / (next[0] - RANKS[i][0]) : 1, need: next ? next[0] - pts : 0 };
}
const doneDays = u => Object.values(u.days).filter(d => d.done).length;
const starsTotal = u => Object.values(u.types).reduce((a, t) => a + t.stars, 0);
export const BADGES = [
  { id: "first", ic: "🚀", n: "Első küldetés", t: u => doneDays(u) >= 1 },
  { id: "c10", ic: "🌟", n: "10 jó válasz", t: u => u.correct >= 10 },
  { id: "c100", ic: "💫", n: "100 jó válasz", t: u => u.correct >= 100 },
  { id: "c500", ic: "🌠", n: "500 jó válasz", t: u => u.correct >= 500 },
  { id: "s3", ic: "🔥", n: "3 napos sorozat", t: u => u.streak.best >= 3 },
  { id: "s7", ic: "🌋", n: "7 napos sorozat", t: u => u.streak.best >= 7 },
  { id: "s14", ic: "☄️", n: "14 napos sorozat", t: u => u.streak.best >= 14 },
  { id: "star1", ic: "⭐", n: "Első csillag", t: u => starsTotal(u) >= 1 },
  { id: "all1", ic: "🪐", n: "Minden bolygón csillag", t: u => TYPES.every(T => (u.types[T.id] || {}).stars >= 1) },
  { id: "full", ic: "👑", n: "Egy bolygó 3 csillaggal", t: u => Object.values(u.types).some(t => t.stars >= 3) },
  { id: "learn5", ic: "🧠", n: "Hibából tanultam (5×)", t: u => u.twins >= 5 },
  { id: "learn25", ic: "🦉", n: "Hibából tanultam (25×)", t: u => u.twins >= 25 },
];
export function checkBadges(u) {
  const got = [];
  BADGES.forEach(b => { if (!u.badges.includes(b.id) && b.t(u)) { u.badges.push(b.id); got.push(b); } });
  return got;
}

// ---- Szülői jutalmak ----
// kind: "pts" (üzemanyag), "streak" (napos sorozat), "stars" (összes csillag)
export function rewardProgress(u, r) {
  const have = r.kind === "pts" ? u.pts : r.kind === "streak" ? u.streak.best : starsTotal(u);
  return { have, need: r.need, done: have >= r.need, claimed: !!(u.claimed || {})[r.id], pct: Math.min(1, have / r.need) };
}
export const REWARD_KINDS = { pts: "⛽ üzemanyag", streak: "🔥 napos sorozat", stars: "⭐ csillag" };

// ---- Szülői statisztika ----
export function weekSummary(u, today = dayNum()) {
  const days = [];
  for (let i = 6; i >= 0; i--) { const k = dateKey(today - i), d = u.days[k] || { n: 0, ok: 0, ms: 0, done: false }; days.push({ key: k, ...d }); }
  const sum = days.reduce((a, d) => ({ n: a.n + d.n, ok: a.ok + d.ok, ms: a.ms + d.ms, active: a.active + (d.n > 0 ? 1 : 0) }), { n: 0, ok: 0, ms: 0, active: 0 });
  return { days, ...sum, acc: sum.n ? sum.ok / sum.n : null };
}
export { starsTotal };
