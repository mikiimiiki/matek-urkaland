// ===== A váz közös állapota és segédei =====
// C: a játék (GAME), a feladatcsomag (PACK), a beállításleírók, az állapot, a felhő, az eszköz és az aktuális kör.
// A képernyőmodulok (home, play, players, collection, holidays, …) mind ezt használják.
import { $ } from "../core/dom.js";
import { resolve } from "../core/settings.js";
import { unlockedSet, equipped, applyVars, swapClass } from "../core/cosmetics.js";
import { activeEvents } from "../core/events.js";
import { setSnow } from "../core/snow.js";
import { dayNum } from "../core/dates.js";
import { streakNow } from "../core/dailygoal.js";

export const C = { game: null, pack: null, defs: [], state: null, cloud: null, device: null, rng: null, S: null, tts: false, gearApi: null };
export const G = () => C.game;
export const cur = () => C.state.users[C.state.current];
const CHILD = () => C.defs.filter(d => d.scope === "child");
// Gyerekenkénti beállítások: a gyerek saját értéke → családi alapérték → alapértelmezés
export const prefs = u => Object.fromEntries(CHILD().map(d => [d.key, resolve(d, u && u.prefs, C.state.settings.childDefaults)]));

// ---- mentés ----
// Bekapcsolt biztonságos helyi mentésnél (C.localSave) az ellenőrzött úton ment, különben a régi módon
export const persist = () => {
  if (C.localSave) return C.localSave.save(C.state);
  try { localStorage.setItem(C.storeKey, JSON.stringify(C.state)); return true; } catch (e) { console.warn(e); return false; }
};
// egy másik lapra átadott (inaktív) lap semmit nem ment, és a felhőbe sem küld
const inactive = () => !!(C.localSave && !C.localSave.active);
export function save() { if (inactive()) return; const u = cur(); if (u) u.upd = Date.now(); persist(); if (u) C.cloud.queue(u.name); }
// A ⚙️ ablak fülei ezekkel mentenek
export function saveUser(u) { if (inactive()) return; u.upd = Date.now(); persist(); C.cloud.queue(u.name); if (u === cur()) applyPrefs(); C.refreshAll(); }
export function saveFamily() { if (inactive()) return; C.state.settings.upd = Date.now(); persist(); C.cloud.pushSettings(); C.refreshAll(); }
// A gyerek beállításainak alkalmazása (felolvasás, betűtípus)
export function applyPrefs() {
  const P = prefs(cur());
  C.tts = !!P.tts; C.updTtsBtn && C.updTtsBtn();
  document.body.classList.toggle("dys", !!P.dyslexia);
}

// ---- jutalmak (szülői): pont, sorozat és a csomag mérőszámai ----
export const rewardKinds = () => ({ pts: `${G().pointsIcon} ${G().pointsName}`, streak: "🔥 napos sorozat", ...Object.fromEntries(Object.entries(C.pack.metrics || {}).map(([k, m]) => [k, m.label])) });
export function rewardProgress(u, r) {
  const m = (C.pack.metrics || {})[r.kind];
  const have = r.kind === "pts" ? u.pts : r.kind === "streak" ? Math.max(u.streak.best || 0, streakNow(u)) : m ? m.value(u) : 0;
  return { have, need: r.need, done: have >= r.need, claimed: !!(u.claimed || {})[r.id], pct: Math.min(1, have / r.need) };
}

// ---- kinyitható tárgyak: mi van kinyitva, mi van felvéve ----
export const unlocked = u => unlockedSet(G().ranks.rankItems(u.pts), u.owned);
export function look(u) {
  const D = G().catalog.DEFAULTS, un = unlocked(u), c = u.cosmetics || {};
  return Object.fromEntries(Object.keys(D).map(k => [k, equipped(c[k], k, un, D)]));
}
export function applyLook() {
  const u = cur(), cat = G().catalog, L = u ? look(u) : cat.DEFAULTS;
  applyVars((cat.itemById(L.bg) || cat.itemById(cat.DEFAULTS.bg)).vars);
  // a Saját sarok fő figurája (ha ki van téve) a kabala helyén áll – akkor a rakéta-skin nem írja felül
  if (!$("mascot")?.dataset.room) swapClass($("mascot"), "rk-", (cat.itemById(L.rocket) || {}).cls);
  swapClass($("tb-user"), "fr-", (cat.itemById(L.frame) || {}).cls);
  // hóesés: ha az ünnepek és a hó is be van kapcsolva, és téli időszak van
  const P = u ? prefs(u) : {};
  setSnow(u && P.events && P.snow && activeEvents(G().events.EVENTS, dayNum(), "ambient").some(e => e.effect === "snow"), G().snowColor ? { color: G().snowColor } : {});
}
// Tárgy ikonja és neve (matrica: "st:…")
export const itemIcon = id => { if (id.startsWith("st:")) return id.slice(3); const it = G().catalog.itemById(id); if (!it) return ""; if (it.kind === "bg") return it.special ? "🎄" : "🌌"; return it.show || ""; };
export const itemLabel = id => id.startsWith("st:") ? "matrica" : (G().catalog.itemById(id) || { label: id }).label;

// ---- konfetti a felvett stílusban ----
export function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const u = cur(), cat = G().catalog, C2 = cat.itemById(u ? look(u).confetti : cat.DEFAULTS.confetti) || cat.itemById(cat.DEFAULTS.confetti);
  const cv = $("confetti"), ctx = cv.getContext("2d"); cv.width = innerWidth; cv.height = innerHeight;
  const cols = C2.colors, star = C2.shape === "star", dot = C2.shape === "dot";
  const ps = Array.from({ length: 150 }, () => ({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * .5, vx: Math.random() * 4 - 2, vy: 2 + Math.random() * 4, s: 6 + Math.random() * 6, c: cols[Math.random() * cols.length | 0], r: Math.random() * 6 }));
  const drawStar = s => { ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = Math.PI / 5 * k, rr = k % 2 ? s / 2.4 : s; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };
  const t0 = performance.now();
  (function frame(t) { ctx.clearRect(0, 0, cv.width, cv.height); ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += .1; ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); if (star) drawStar(p.s * .8); else if (dot) { ctx.beginPath(); ctx.arc(0, 0, p.s / 2.5, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }); if (t - t0 < 2800) requestAnimationFrame(frame); else ctx.clearRect(0, 0, cv.width, cv.height); })(t0);
}

// ---- felolvasás ----
// lang: a feladat saját nyelve (pl. "de-DE"); alapból a játék nyelve
export function speak(html, lang) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  lang = lang || G().speechLang || "hu-HU";
  const u = new SpeechSynthesisUtterance((C.pack.speechText || (x => String(x).replace(/<[^>]+>/g, " ")))(html));
  u.lang = lang; u.rate = 0.95;
  const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith(lang.slice(0, 2))); if (v) u.voice = v;
  speechSynthesis.speak(u);
}
