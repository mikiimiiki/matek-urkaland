// ===== Matek Űrkaland – felület és játékmenet =====
import { TYPES, COMING, typeById, makeTask } from "./types/index.js";
import { makeRng, plain, esc } from "./util.js";
import { checkAnswer, parseNum, answerText, correctText, comboKey } from "./check.js";
import * as E from "./engine.js";
import { createCloud } from "./cloud.js";
import { createDevice, guessName } from "./core/device.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";
import { PLANET_INFO } from "./planet-info.js";
import { $, el, btn, toast } from "./core/dom.js";
import { modal, ask, isOpen as isModalOpen } from "./core/modal.js";
import * as keys from "./core/keys.js";
import { openTabs } from "./core/tabs.js";
import { resolve } from "./core/settings.js";
import { SETTINGS, GAME } from "./game/config.js";
import { migrateFamily, migrateUser, newId } from "./game/migrate.js";
import { parentTabs } from "./parent/tabs.js";
import { RANKS, rankOf, rankIndex, rankItems, unlockRank, daysTo } from "./game/ranks.js";
import { ITEMS, KINDS, DEFAULTS, itemById } from "./game/cosmetics-catalog.js";
import { unlockedSet, equipped, applyVars, swapClass } from "./core/cosmetics.js";
const rng = makeRng();

// ---------- Állapot (helyben mindig mentünk; a felhő opcionális) ----------
const STORE = "matek_urkaland_v1";
let state = (() => { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch { return null; } })()
  || { familyCode: "", current: "", users: {}, settings: { ...E.DEFAULT_SETTINGS }, deleted: {} };
state.settings = Object.assign({ ...E.DEFAULT_SETTINGS }, state.settings || {});
state.deleted = state.deleted || {};
migrateFamily(state);
const normMig = u => migrateUser(E.normUser(u), state);
Object.keys(state.users).forEach(n => { state.users[n] = normMig(state.users[n]); });
// Gyerekenkénti beállítások: a gyerek saját értéke → családi alapérték → alapértelmezés
const CHILD_DEFS = SETTINGS.filter(d => d.scope === "child");
const prefs = u => Object.fromEntries(CHILD_DEFS.map(d => [d.key, resolve(d, u && u.prefs, state.settings.childDefaults)]));

const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { console.warn(e); } };
const cur = () => state.users[state.current];
function save() { const u = cur(); if (u) u.upd = Date.now(); persist(); if (u) cloud.queue(u.name); }
// A ⚙️ ablak fülei ezekkel mentenek
function saveUser(u) { u.upd = Date.now(); persist(); cloud.queue(u.name); if (u === cur()) { ttsOn = !!prefs(u).tts; updTtsBtn(); } refreshAll(); }
function saveFamily() { state.settings.upd = Date.now(); persist(); cloud.pushSettings(); refreshAll(); }

// Ez az eszköz (azonosító, név, hozzárendelt gyerekek, szinkronmód, forgalom)
const device = createDevice(STORE);
const cloud = createCloud({
  state: () => state, persist, normUser: normMig, device, storeKey: STORE,
  onDevice: rec => {
    // a szülő egy másik eszközön módosíthatta ennek az eszköznek a nevét vagy a hozzárendelést
    let ch = false;
    if ((rec.kidsUpd || 0) > device.kidsUpd) { device.setKids(rec.kids ? (Array.isArray(rec.kids) ? rec.kids : Object.values(rec.kids)) : null, rec.kidsUpd); ch = true; }
    if ((rec.nameUpd || 0) > device.nameUpd && rec.name) device.setName(rec.name, rec.nameUpd);
    if (ch) { enforceDevice(); refreshAll(); }
  },
  refresh: () => {
    migrateFamily(state);
    if (!state.users[state.current]) state.current = Object.keys(state.users)[0] || "";
    enforceDevice();
    ttsOn = !!prefs(cur()).tts; updTtsBtn();
    refreshAll();
    maybeAskDevice();
    // a nyitott ⚙️ ablakot is frissítjük, kivéve ha a szülő épp egy mezőben gépel
    const a = document.activeElement;
    if (gearApi && !(a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))) gearApi.draw();
  },
  onStatus: st => { $("tb-cloud-ic").textContent = st.icon; $("tb-sync").textContent = st.text; $("tb-cloud").className = "pill btn-pill " + (st.cls || ""); $("tb-cloud").title = st.detail; renderCloudLive(); },
});

// ---------- Konfetti, felolvasás ----------
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const u = cur(), C = itemById(u ? look(u).confetti : DEFAULTS.confetti) || itemById(DEFAULTS.confetti);
  const cv = $("confetti"), ctx = cv.getContext("2d"); cv.width = innerWidth; cv.height = innerHeight;
  const cols = C.colors, star = C.shape === "star";
  const ps = Array.from({ length: 150 }, () => ({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * .5, vx: Math.random() * 4 - 2, vy: 2 + Math.random() * 4, s: 6 + Math.random() * 6, c: cols[Math.random() * cols.length | 0], r: Math.random() * 6 }));
  const drawStar = s => { ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = Math.PI / 5 * k, rr = k % 2 ? s / 2.4 : s; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };
  const t0 = performance.now();
  (function frame(t) { ctx.clearRect(0, 0, cv.width, cv.height); ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += .1; ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); if (star) drawStar(p.s * .8); else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }); if (t - t0 < 2800) requestAnimationFrame(frame); else ctx.clearRect(0, 0, cv.width, cv.height); })(t0);
}

// ---------- Kinyitható tárgyak: mi van kinyitva, mi van felvéve ----------
const unlocked = u => unlockedSet(rankItems(u.pts), u.owned);
function look(u) {
  const un = unlocked(u), c = u.cosmetics || {};
  return Object.fromEntries(["bg", "rocket", "confetti", "frame"].map(k => [k, equipped(c[k], k, un, DEFAULTS)]));
}
function applyLook() {
  const u = cur(), L = u ? look(u) : DEFAULTS;
  applyVars((itemById(L.bg) || itemById(DEFAULTS.bg)).vars);
  swapClass($("mascot"), "rk-", (itemById(L.rocket) || {}).cls);
  swapClass($("tb-user"), "fr-", (itemById(L.frame) || {}).cls);
}
const speechText = html => plain(String(html).replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<table[\s\S]*?<\/table>/g, " "))
  .replace(/·/g, " szorozva ").replace(/ : /g, " osztva ").replace(/−/g, " mínusz ").replace(/→/g, ", ").replace(/≥/g, " nagyobb vagy egyenlő ").replace(/&lt;|</g, " kisebb ");
function speak(html) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(speechText(html));
  u.lang = "hu-HU"; u.rate = 0.95;
  const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith("hu")); if (v) u.voice = v;
  speechSynthesis.speak(u);
}
let ttsOn = !!prefs(cur()).tts;

// ---------- Képernyők ----------
function show(id) { document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id === id)); scrollTo(0, 0); keys.setScreen(id === "scr-play" ? playKeys : homeKeys); }
function refreshAll() {
  renderTop();
  if ($("scr-home").classList.contains("on")) renderHome();
  if (cloudBox && cloudBox.isConnected) { cloudBox.innerHTML = ""; renderCloudInto(cloudBox); }
}
function renderTop() {
  const u = cur();
  $("tb-avatar").textContent = u ? u.avatar : "🧑‍🚀";
  $("tb-name").innerHTML = u ? esc(u.name) + (RANKS[rankIndex(u.pts)].title ? `<span class="legend-tag">${RANKS[rankIndex(u.pts)].title}</span>` : "") : "Játékos";
  applyLook();
  $("tb-pts").textContent = u ? u.pts : 0;
  $("tb-streak").textContent = u ? E.streakNow(u) : 0;
  const lock = userLocked();
  $("tb-user").classList.toggle("locked", lock);
  $("tb-user").title = lock ? "Ezen az eszközön csak ez a játékos játszik (a szülő a ⚙️ Család fülön módosíthatja)" : "Játékos váltása";
}

// ---------- Kezdőképernyő ----------
function renderHome() {
  const u = cur(); if (!u) return;
  const s = prefs(u), mp = E.missionProgress(u, s);
  $("home-hello").textContent = `Szia, ${u.name}! ${mp.done ? "A mai küldetés kész – szabadon repülhetsz tovább! 🌟" : "Indulhat a mai küldetés?"}`;
  $("mission-sub").textContent = `${s.goalTasks} feladat vagy ${s.goalMin} perc – amelyik előbb teljesül`;
  $("map-hint").textContent = `– kattints egy bolygóra: ${freeSize()} feladatos gyakorló kör`;
  $("mission-bar").style.width = Math.round(mp.pct * 100) + "%";
  $("mission").classList.toggle("done", mp.done);
  $("btn-mission").textContent = mp.done ? "🚀 Még egy kör" : mp.n ? "🚀 Folytatás" : "🚀 Indítás";
  const st = E.streakNow(u);
  $("mission-note").textContent = mp.done ? `✅ Ma már ${mp.n} feladatot oldottál meg. Sorozat: ${st} nap 🔥`
    : `Ma: ${mp.n} feladat, ${mp.min} perc. ${st ? `🔥 ${st} napos sorozat – ne szakítsd meg!` : "Kezdj egy új sorozatot!"} ${E.shieldAvailable(u) ? "🛡️ A heti pajzsod még megvan." : ""}`;
  const rk = rankOf(u.pts);
  $("rank-name").textContent = `🧑‍🚀 ${rk.name} (${rk.n}/${rk.total})`;
  $("rank-next").innerHTML = rk.next ? `még <b>${rk.need} ⛽</b> a(z) „${esc(rk.next)}” rangig – kb. ${daysTo(u, rk.need)} nap <span class="rank-peek">· 🎁 ${rk.nextRank.unlocks.map(itemIcon).join(" ")}</span>` : "Elérted a legmagasabb rangot! 🌟";
  $("rank-bar").style.width = Math.round(rk.pct * 100) + "%";
  // következő jutalom
  const rb = $("reward-box"), rws = (u.rewards || []).map(r => ({ r, p: E.rewardProgress(u, r) })).filter(x => !x.p.claimed);
  rb.hidden = !rws.length;
  if (rws.length) {
    const reached = rws.find(x => x.p.done), next = reached || rws.slice().sort((a, b) => b.p.pct - a.p.pct)[0];
    rb.innerHTML = reached ? `🎁 <b>${esc(reached.r.text)}</b> – elérted! Szólj a szüleidnek! 🎉` : `🎁 Következő jutalom: <b>${esc(next.r.text)}</b><br><span class="soft small">még ${next.p.need - next.p.have} ${E.REWARD_KINDS[next.r.kind]}</span><div class="bar"><i style="width:${Math.round(next.p.pct * 100)}%"></i></div>`;
  }
  // bolygók
  const map = $("map"); map.innerHTML = "";
  TYPES.forEach(T => {
    const ts = E.typeState(u, T.id), lvl = E.typeLvl(u, T.id);
    const b = btn("planet", `<div class="orb" style="background:${T.planet.color};--glow:${T.planet.color}">${T.planet.emoji}</div><div class="pname">${T.planet.name}</div><div class="ptype">${T.name}</div><div class="pstars">${[1, 2, 3].map(i => `<span class="${ts.stars >= i ? "" : "off"}">⭐</span>`).join("")}</div><div class="plvl">${ts.stars >= 3 ? "Mester! 👑" : `${lvl}. szint · még ${3 - ts.run} jó válasz a csillagig`}</div>`, () => startFree(T));
    b.dataset.type = T.id; b.title = `${T.planet.name} – ${T.name} (Enter: indulás, F1: mi vár itt?)`;
    map.append(b);
  });
  COMING.forEach(c => map.append(el("div", "planet locked", `<div class="orb" style="background:#475569;--glow:transparent">${c.emoji}</div><div class="pname">${c.name}</div><div class="ptype">🔒 hamarosan</div>`)));
  // jelvények
  const bd = $("badges"); bd.innerHTML = "";
  E.BADGES.forEach(b => bd.append(el("span", "badge" + (u.badges.includes(b.id) ? "" : " off"), `${b.ic} ${b.n}`)));
}

// ---------- Játékosok ----------
// first: az első játékos (nem zárható be); after: visszahívás mentés után (pl. a Család fül frissítése)
function newPlayer(first = false, after = null) {
  const START = RANKS[0].unlocks.filter(id => id.startsWith("av:")).map(id => id.slice(3));
  let av = START[Object.keys(state.users).length % START.length];
  modal((box, close) => {
    box.append(el("h3", null, first ? "Üdv a Matek Űrkalandban! 🚀" : "Új játékos"));
    box.append(el("p", null, "Hogy hívnak? Válassz egy űrhajóst is!"));
    const inp = el("input", "minp"); inp.maxLength = 20; inp.placeholder = "Neved"; box.append(inp);
    const avs = el("div", "avatars");
    START.forEach(a => { const b = btn(a === av ? "sel" : "", a, () => { av = a; avs.querySelectorAll("button").forEach(x => x.classList.toggle("sel", x === b)); }); avs.append(b); });
    box.append(avs, el("p", "soft small", "🎁 Gyakorlással újabb avatarokat, hátteret és rakétát nyithatsz ki!"));
    const go = () => {
      const name = inp.value.trim().replace(/[.$#\[\]\/]/g, "");
      if (!name) return toast("Írd be a neved!");
      if (state.users[name]) return toast("Ilyen nevű játékos már van.");
      const nu = E.newUser(name, av); nu.prefs = { ...(state.settings.childDefaults || {}) }; nu.id = newId();
      state.users[name] = migrateUser(nu, state); state.current = name; delete state.deleted[name];
      // ha ehhez az eszközhöz már meg van adva, ki játszik rajta, az új játékos is ide kerül
      if (device.kids) { device.setKids([...device.kids, nu.id]); cloud.pushDevice(true); }
      save(); close(); ttsOn = !!prefs(cur()).tts; updTtsBtn(); refreshAll(); if (after) after();
    };
    inp.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
    const row = el("div", "mbtns");
    if (!first) row.append(btn("secondary", "Mégse", () => close()));
    row.append(btn("primary", "Indulás! 🚀", go));
    box.append(row);
  }, { esc: first ? false : undefined });
}
function switchPlayer() {
  modal((box, close) => {
    box.append(el("h3", null, "Ki játszik?"));
    const list = el("div", "userlist");
    allowedUsers().forEach(u => list.append(btn(u.name === state.current ? "cur" : "", `<span style="font-size:28px">${u.avatar}</span> ${esc(u.name)} <span class="soft small" style="margin-left:auto">⛽ ${u.pts}</span>`, () => { state.current = u.name; persist(); close(); ttsOn = !!prefs(u).tts; updTtsBtn(); refreshAll(); })));
    box.append(list);
    const row = el("div", "mbtns");
    // ha az eszközhöz meg van adva, ki játszik rajta, új játékost csak a szülő vehet fel (⚙️ Család)
    if (!device.kids) row.append(btn("secondary", "➕ Új játékos", () => { close(); newPlayer(); }));
    row.append(btn("primary", "Bezár", () => close()));
    box.append(row);
  });
}

// ---------- Eszköz: ki játszik ezen az eszközön? ----------
// device.kids: a gyerekek belső azonosítói (u.id); null = nincs megadva, mindenki játszhat
function allowedUsers() {
  const all = Object.values(state.users), k = device.kids;
  if (!k) return all;
  const a = all.filter(u => k.includes(u.id));
  return a.length ? a : all;   // ha a hozzárendelt gyerekek közben törlődtek, ne zárjuk ki az összeset
}
const userLocked = () => !!device.kids && allowedUsers().length <= 1 && Object.keys(state.users).length > 1;
function enforceDevice() {
  const a = allowedUsers();
  if (a.length && !a.some(u => u.name === state.current)) { state.current = a[0].name; persist(); ttsOn = !!prefs(cur()).tts; updTtsBtn(); }
}
let deviceAsked = false;
function maybeAskDevice() {
  if (deviceAsked || device.kids || !cloud.settled || isModalOpen() || !$("scr-home").classList.contains("on")) return;
  const us = Object.values(state.users);
  if (!us.length) return;
  if (us.length === 1) { device.setKids([us[0].id]); cloud.pushDevice(true); return; }
  deviceAsked = true;
  askDeviceKids();
}
function askDeviceKids() {
  modal((box, close) => {
    box.append(el("h3", null, "📱 Ki játszik ezen az eszközön?"));
    box.append(el("p", null, `Eszköz: <b>${esc(device.name)}</b>`), el("p", "soft small", "Ha egy gyereket jelölsz be, a játék automatikusan őt indítja. Ha többet, csak közülük lehet választani. Később a ⚙️ → Család fülön módosíthatod."));
    const list = el("div", "kidchecks");
    Object.values(state.users).forEach(u => { const l = el("label", "kidcheck", `<input type="checkbox" value="${esc(u.id)}"> <span style="font-size:24px">${u.avatar}</span> ${esc(u.name)}`); list.append(l); });
    box.append(list);
    const row = el("div", "mbtns");
    row.append(btn("secondary", "Később", () => close()));
    row.append(btn("secondary", "Mindenki", () => list.querySelectorAll("input").forEach(i => { i.checked = true; })));
    row.append(btn("primary", "Mentés 🔒", async () => {
      const ids = [...list.querySelectorAll("input:checked")].map(i => i.value);
      if (!ids.length) return toast("Jelölj be legalább egy gyereket – vagy válaszd a Később gombot.");
      close();
      if (!(await requirePin())) return;
      device.setKids(ids); cloud.pushDevice(true); enforceDevice(); refreshAll();
      toast("✅ Elmentve – ezen az eszközön: " + allowedUsers().map(u => esc(u.name)).join(", "));
    }));
    box.append(row);
  });
}
function onUserClick() {
  if (userLocked()) return toast(`📱 Ezen az eszközön <b>${esc(cur().name)}</b> játszik. A szülő a ⚙️ → Család fülön módosíthatja.`, 4000);
  switchPlayer();
}

// ---------- Gyakorlás ----------
let S = null; // aktuális kör
function startMission() {
  const u = cur(), P = prefs(u), mp = E.missionProgress(u, P);
  const n = mp.done ? 5 : Math.max(1, P.goalTasks - mp.n);
  S = { mode: "mission", plan: E.planMission(u, rng, n), idx: 0, res: [] };
  show("scr-play"); $("play-title").textContent = mp.done ? "🚀 Plusz kör" : "🚀 Napi küldetés";
  nextTask();
}
// Szabad gyakorlás: egy típusból rögzített hosszú kör (a szülő állítja: 3, 5 vagy 10 feladat).
// Az altípust feladatonként, közvetlenül előtte választjuk, hogy a kör közben is a gyengébbek jöjjenek.
const FREE_SIZES = [3, 5, 10]; // itt is megadjuk, hogy egy félig frissült böngésző-gyorsítótár se okozzon hibát
const freeSize = () => { const f = +prefs(cur()).freeTasks; return FREE_SIZES.includes(f) ? f : 5; };
function startFree(T) {
  const n = freeSize();
  S = { mode: "free", T: T.id, plan: Array.from({ length: n }, () => ({ T: T.id, sub: null })), idx: 0, res: [] };
  show("scr-play"); $("play-title").textContent = `${T.planet.emoji} ${T.planet.name} – ${n} feladat`;
  nextTask();
}
function nextTask(twinOf = null) {
  const u = cur();
  let item;
  if (twinOf) item = { T: twinOf.type, sub: twinOf.sub, lvl: twinOf.lvl, twin: true };
  else {
    if (S.idx >= S.plan.length) return endRound();
    item = S.plan[S.idx];
    if (!item.sub) { const T0 = typeById(item.T); item.sub = E.pickSub(u, T0, E.typeLvl(u, T0.id), rng); }
  }
  const T = typeById(item.T);
  const lvl = item.lvl || E.typeLvl(u, T.id);
  const task = makeTask(T, item.sub, lvl, rng);
  clearTimeout(S.autoT);
  S.task = task; S.twin = !!item.twin; S.tries = 0; S.t0 = Date.now(); S.phase = "answer"; S.sel = []; S.set = []; S.lastInput = null; S.firstWrong = null; S.clicked = null; S.onNext = null;
  renderTask();
}
function renderDots() {
  const d = $("play-dots"); d.innerHTML = "";
  // a kör összes feladata már az elején látszik üres karikaként (az ikerfeladatok menet közben kerülnek be)
  const n = Math.max(S.plan.length, S.res.length), res = S.res;
  for (let i = 0; i < n; i++) { const r = res[i]; d.append(el("i", r === 1 ? "ok" : r === 2 ? "mid" : r === 0 ? "bad" : i === res.length ? "cur" : "")); }
}
function renderTask() {
  const t = S.task, T = typeById(t.type), sub = T.subs.find(s => s.id === t.sub);
  renderDots();
  $("task-meta").textContent = `${T.planet.emoji} ${T.name} · ${sub.name} · ${t.lvl}. szint${S.twin ? " · 🔁 ikerfeladat" : ""}`;
  $("task-q").innerHTML = t.q;
  $("task-viz").innerHTML = t.viz || "";
  $("side-body").innerHTML = `<div class="side-empty"><div class="big-emoji">${S.twin ? "🔁" : "🧑‍🚀"}</div><p>${S.twin ? "Most egy hasonló feladat jön – próbáld ki, amit az előbb láttál!" : "Olvasd el figyelmesen a feladatot!<br>Ha elakadsz, a hiba után itt kapsz segítséget."}</p></div>`;
  renderAnswer();
  setActions([btn("primary big", "Ellenőrzés ✔", check)]);
  if (t.ans.kind === "choice") setActions([]);
  if (ttsOn) speak(t.q);
}
function setActions(bs) { const a = $("task-actions"); a.innerHTML = ""; bs.forEach(b => a.append(b)); }

// --- Válaszadó felületek ---
let activeInput = null;
function numInput(cls = "") {
  const i = el("input", "ans-in " + cls); i.inputMode = "numeric"; i.autocomplete = "off"; i.maxLength = 7;
  i.addEventListener("focus", () => { activeInput = i; });
  i.addEventListener("input", () => { i.value = i.value.replace(/[^\d\s]/g, ""); i.classList.remove("wrong"); });
  return i;
}
function numpad(onEnter, extra = []) {
  const p = el("div", "numpad");
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].forEach(d => p.append(btn("", d, () => { if (!activeInput) return; activeInput.value += d; activeInput.classList.remove("wrong"); activeInput.focus(); })));
  p.append(btn("", "⌫", () => { if (activeInput) { activeInput.value = activeInput.value.slice(0, -1); activeInput.focus(); } }));
  extra.forEach(b => p.append(b));
  void onEnter;
  return p;
}
function renderAnswer() {
  const t = S.task, A = t.ans, box = $("answer"); box.innerHTML = ""; activeInput = null;
  if (A.kind === "num") {
    const row = el("div", "ans-row"), i = numInput();
    row.append(i); if (A.unit) row.append(el("span", "unit", esc(A.unit)));
    box.append(row, numpad());
    i.addEventListener("keydown", e => { if (e.key === "Enter") onEnter(e); });
    S.read = () => parseNum(i.value); S.inputs = [i];
    setTimeout(() => i.focus(), 30);
  } else if (A.kind === "time") {
    const row = el("div", "ans-row"), h = numInput("short"), m = numInput("short");
    h.maxLength = 2; m.maxLength = 2; h.placeholder = "óra"; m.placeholder = "perc";
    row.append(h, el("span", "unit", "óra"), m, el("span", "unit", "perc"));
    box.append(row, numpad());
    h.addEventListener("input", () => { if (h.value.length >= 2) m.focus(); });
    [h, m].forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") onEnter(e); if (e.key === ":" || e.key === ".") { e.preventDefault(); m.focus(); } }));
    S.read = () => { const hh = parseNum(h.value), mm = m.value.trim() === "" ? 0 : parseNum(m.value); return hh == null || mm == null || mm > 59 || hh > 24 ? null : hh * 60 + mm; };
    S.inputs = [h, m];
    setTimeout(() => h.focus(), 30);
  } else if (A.kind === "choice") {
    const o = el("div", "opts");
    A.options.forEach((txt, k) => o.append(btn("opt", esc(txt), e => { if (S.phase !== "answer" || e.currentTarget.disabled) return; S.read = () => k; S.clicked = e.currentTarget; check(); })));
    box.append(o); S.inputs = [];
  } else if (A.kind === "pick") {
    const o = el("div", "opts");
    A.options.forEach((txt, k) => { const b = btn("opt", esc(txt), () => { if (S.phase !== "answer") return; b.classList.toggle("sel"); S.sel = b.classList.contains("sel") ? [...S.sel, k] : S.sel.filter(x => x !== k); }); o.append(b); });
    box.append(el("p", "soft small", "Kattints mindegyikre, amelyik jó! (Többet is választhatsz.)"), o);
    S.read = () => S.sel.slice(); S.inputs = [];
  } else if (A.kind === "numset") {
    const row = el("div", "ans-row"), i = numInput(), chips = el("div", "chips");
    const add = () => { const v = parseNum(i.value); if (v == null) return false; if (!S.set.includes(v)) S.set.push(v); i.value = ""; drawChips(); i.focus(); return true; };
    const drawChips = () => { chips.innerHTML = ""; S.set.forEach(v => { const c = el("span", "chip", String(v)); c.append(btn("", "✕", () => { S.set = S.set.filter(x => x !== v); drawChips(); })); chips.append(c); }); if (!S.set.length) chips.append(el("span", "soft small", "Ide kerülnek a beírt számok.")); };
    row.append(i, btn("secondary", "➕ Hozzáad", add));
    box.append(el("p", "soft small", "Írj be egy számot, és nyomd meg a Hozzáad gombot (vagy az Entert). Az összes megoldást add meg!"), row, chips, numpad());
    i.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); if (!add()) onEnter(e); } });
    drawChips();
    S.read = () => { if (i.value.trim()) add(); return S.set.length ? S.set.slice() : null; };
    S.inputs = [i];
    setTimeout(() => i.focus(), 30);
  } else if (A.kind === "combos") renderCombos(A, box);
}

// --- „Sorold fel az összes lehetőséget”: lehetőség-építő ---
// A gyerek betűgombokkal rak ki egy lehetőséget (a helyek a feladat szerint: torony szintjei, ruhadarabok,
// útvonal állomásai), felírja a listára, és kezdi a következőt. A listából bármelyiket törölheti.
function renderCombos(A, box) {
  S.list = []; S.cur = [];
  const item = k => A.items.find(i => i.k === k) || { k, n: k };
  const dot = k => item(k).c ? `<span class="dot" style="background:${item(k).c}"></span>` : "";
  const prefixLen = () => A.path ? 1 : (() => { let n = 0; while (A.slots[n] && A.slots[n].opts.length === 1) n++; return n; })();
  const reset = () => { S.cur = A.path ? [A.path.start] : []; while (A.slots && A.slots[S.cur.length] && A.slots[S.cur.length].opts.length === 1) S.cur.push(A.slots[S.cur.length].opts[0]); };
  const full = () => A.slots ? S.cur.length === A.slots.length : S.cur.length > 1 && S.cur[S.cur.length - 1] === A.path.end;
  const optsNow = () => {
    if (full()) return [];
    if (A.slots) { const o = A.slots[S.cur.length].opts; return A.ordered ? o : o.filter(x => !S.cur.includes(x)); }
    const last = S.cur[S.cur.length - 1];
    if (A.path.guided) return A.path.edges.filter(e => e[0] === last).map(e => e[1]);
    return A.items.map(i => i.k).filter(k => k !== A.path.start && !S.cur.includes(k));
  };
  const wrap = el("div", "combo"); wrap.tabIndex = 0;
  const curRow = el("div", "combo-cur"), optRow = el("div", "opts combo-opts"), ctl = el("div", "ans-row"), chips = el("div", "chips");
  const back = btn("secondary", "⌫ Vissza", () => { if (S.phase !== "answer") return; if (S.cur.length > prefixLen()) S.cur.pop(); draw(); });
  const add = () => {
    if (S.phase !== "answer") return false;
    if (!full()) { toast(A.path ? "Az útnak F-ben kell véget érnie!" : "Még nincs kész ez a lehetőség – töltsd ki az összes helyet!"); return false; }
    const k = comboKey(A, S.cur), dup = S.list.find(x => comboKey(A, x) === k);
    if (dup) { toast(A.ordered ? "Ezt már felírtad! 🙂" : `Ezt már felírtad: ${dup.join(" ")} – itt a sorrend nem számít.`); reset(); draw(); return true; }
    S.list.push(S.cur.slice()); reset(); draw(); wrap.focus(); return true;
  };
  const addBtn = btn("primary", "➕ Felírom a listára", add);
  function draw() {
    const n = A.slots ? A.slots.length : S.cur.length + (full() ? 0 : 1);
    curRow.innerHTML = Array.from({ length: n }, (_, i) => {
      const k = S.cur[i], lab = A.slots ? A.slots[i].label : `${i + 1}.`;
      return `<div class="slotw"><div class="slot ${k ? "filled" : ""} ${i === S.cur.length ? "next" : ""}">${k ? dot(k) + esc(k) : "?"}</div><div class="slot-l">${esc(lab)}</div></div>`;
    }).join(A.path ? `<span class="slot-arrow">→</span>` : "");
    optRow.innerHTML = "";
    optsNow().forEach(k => optRow.append(btn("opt", `${dot(k)}<b>${esc(k)}</b>${item(k).n ? ` <span class="small">${esc(item(k).n)}</span>` : ""}`, () => { if (S.phase !== "answer") return; S.cur.push(k); draw(); })));
    if (full()) optRow.append(el("span", "soft small", "Kész ez a lehetőség – írd fel a listára!"));
    addBtn.disabled = !full();
    chips.innerHTML = "";
    S.list.forEach((x, i) => { const c = el("span", "chip", `${x.map(k => dot(k) + esc(k)).join(" ")}`); c.append(btn("", "✕", () => { if (S.phase !== "answer") return; S.list.splice(i, 1); draw(); })); chips.append(c); });
    if (!S.list.length) chips.append(el("span", "soft small", "Itt gyűlnek a felírt lehetőségek."));
  }
  ctl.append(back, addBtn);
  wrap.append(el("p", "soft small", "Kattints a betűkre, így rakd ki az egyik lehetőséget, aztán írd fel a listára. Ha mindet felírtad, nyomd meg az Ellenőrzés gombot!"), curRow, optRow, ctl, el("div", "combo-title", "📝 A listád:"), chips);
  box.append(wrap);
  wrap.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); if (full()) add(); else onEnter(e); }
    if (e.key === "Backspace") { e.preventDefault(); back.click(); }
  });
  reset(); draw();
  S.read = () => S.list.length ? S.list.map(x => x.slice()) : null;
  S.inputs = [];
  S.showCombos = () => { optRow.innerHTML = ""; addBtn.disabled = true; back.disabled = true; chips.innerHTML = A.value.map(v => `<span class="chip" style="background:var(--okbg);color:var(--ok)">${v.split("-").map(k => dot(k) + esc(k)).join(" ")}</span>`).join(""); };
  setTimeout(() => wrap.focus(), 30);
}
// Az ellenőrzést kiváltó Enter-leütést "elfogyasztjuk" (preventDefault), így ugyanaz a leütés
// nem nyomja meg rögtön a Tovább gombot is – a gyerek látja a visszajelzést.
function onEnter(e) { if (e) e.preventDefault(); if (S.phase === "answer") check(); else if (S.onNext && Date.now() >= (S.lockUntil || 0)) S.onNext(); }

// --- Ellenőrzés és visszajelzés ---
const PRAISE = ["Szuper! 🚀", "Telitalálat! ⭐", "Pontos landolás! 🛬", "Csillagos ötös! 🌟", "Így kell ezt! 💪", "Hibátlan! 🎯"];
function check() {
  if (S.phase !== "answer") return;
  const t = S.task, A = t.ans, v = S.read ? S.read() : null;
  if (v == null || (Array.isArray(v) && !v.length)) return toast(A.kind === "pick" ? "Jelölj meg legalább egyet!" : A.kind === "time" ? "Írd be az órát és a percet!" : A.kind === "combos" ? "Írj fel legalább egy lehetőséget a listára!" : "Írj be egy számot!");
  const r = checkAnswer(A, v);
  S.lastInput = v;
  if (r.ok) return correct();
  S.tries++;
  if (S.tries === 1) S.firstWrong = v;
  S.inputs.forEach(i => { i.classList.remove("wrong"); void i.offsetWidth; i.classList.add("wrong"); });
  if (S.clicked) { S.clicked.classList.add("wrong"); S.clicked.disabled = true; }
  if (S.tries === 1) {
    let extra = "";
    if (A.kind === "numset" || A.kind === "pick" || A.kind === "combos") extra = `<p>${r.good ? `${r.good} jót már megtaláltál. ` : ""}${r.missing ? `Még hiányzik ${r.missing}. ` : ""}${r.extra ? `${r.extra} olyan is van köztük, ami nem jó – a felvételin ezért pontlevonás jár!` : ""}</p>`;
    $("side-body").innerHTML = `<div class="fb hint"><div class="fb-title">Nem egészen… 🤔</div>Próbáld újra! Itt egy tipp:</div><div class="step" style="padding-left:14px">💡 ${t.hint}</div>${extra}`;
    if (ttsOn) speak("Nem egészen. " + t.hint);
    return;
  }
  explain(v);
}
function correct() {
  const t = S.task, u = cur(), rr = S.tries === 0 ? 1 : 2;
  S.phase = "done";
  S.inputs.forEach(i => { i.classList.remove("wrong"); i.classList.add("right"); i.disabled = true; });
  if (S.clicked) S.clicked.classList.add("right");
  if (t.ans.kind === "pick") document.querySelectorAll("#answer .opt.sel").forEach(b => b.classList.add("right"));
  const ev = E.record(u, t, rr, Date.now() - S.t0, logOpts(t, rr === 2 ? S.firstWrong : null));
  S.res.push(rr); S.idx++;
  save(); renderTop(); renderDots();
  const praise = rr === 1 ? PRAISE[rng.int(0, PRAISE.length - 1)] : "Javítottad! ✔️";
  $("side-body").innerHTML = `<div class="fb ok"><div class="fb-title">${praise}</div>${rr === 1 ? "Elsőre sikerült!" : `A helyes válasz: <b>${esc(correctText(t.ans))}</b>. A tipp után megtaláltad – ügyes!`} <b>+${ev.pts} ⛽</b>${S.twin ? "<br>🧠 Hibából tanultál – ez a legjobb!" : ""}</div>`;
  if (rr === 2) $("side-body").append(btn("secondary", "👀 Megnézem a megoldást", () => { $("side-body").append(stepsAll(t)); }));
  if (ttsOn) speak(praise);
  afterEvents(ev);
  nextButton(rr === 1);
}
function explain(v) {
  const t = S.task, u = cur();
  S.phase = "explain";
  S.inputs.forEach(i => { i.disabled = true; });
  document.querySelectorAll("#answer .opt").forEach(b => { b.disabled = true; });
  const ev = E.record(u, t, 0, Date.now() - S.t0, logOpts(t, v));
  S.res.push(0); S.idx++;
  save(); renderTop(); renderDots();
  let why = null; try { why = t.why ? t.why(v) : null; } catch (e) { console.warn(e); }
  const sb = $("side-body");
  sb.innerHTML = `<div class="fb bad"><div class="fb-title">Nézzük meg együtt! 🧑‍🚀</div>Semmi baj – ebből tanulunk. Lépésről lépésre megmutatom.</div>`;
  sb.append(el("div", "yours", `A te válaszod: <b>${esc(answerText(t.ans, v))}</b>` + (why ? `<br>💡 Lehet, hogy itt csúszott el: ${why}` : "")));
  const box = el("div", "steps"); sb.append(box);
  let k = 0;
  const step = () => {
    box.append(el("div", "step", t.steps[k])); if (ttsOn) speak(t.steps[k]); k++;
    S.lockUntil = Date.now() + 400;
    if (k < t.steps.length) { setActions([btn("primary big", "Tovább ▶", step)]); S.onNext = step; }
    else {
      showCorrect();
      // Ikerfeladat: az első hiba után EGY hasonló feladat kötelező. Ha már az ikerfeladat sem sikerült,
      // a gyerek választhat: továbblép, vagy még gyakorol egy hasonlóval (nem ragad bele végtelen körbe).
      // Küldetésben az ikerfeladat bekerül a tervbe (a pöttyök is mutatják), szabad gyakorlásban rögtön jön.
      const twin = () => {
        S.plan.splice(S.idx, 0, { T: t.type, sub: t.sub, lvl: t.lvl, twin: true }); nextTask();
      };
      const next = () => nextTask();
      if (!S.twin) { setActions([btn("primary big", "🔁 Próbáld ki egy hasonlóval!", twin)]); S.onNext = twin; }
      else {
        const last = S.idx >= S.plan.length;
        setActions([btn("primary big", last ? "Kész! 🏁" : "Következő feladat ▶", next), btn("secondary big", "🔁 Még egy hasonló", twin)]);
        S.onNext = next;
        box.append(el("div", "fb hint", "Ez most nehéz volt – semmi baj! Választhatsz: továbbmehetsz, vagy gyakorolhatsz még egy hasonlóval. Ez a feladattípus pár nap múlva úgyis visszajön."));
      }
    }
    box.lastElementChild.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  step();
  afterEvents(ev);
}
function showCorrect() {
  const t = S.task, A = t.ans;
  if (A.kind === "combos" && S.showCombos) S.showCombos();
  if (A.kind === "num" || A.kind === "numset") { const i = S.inputs[0]; i.value = A.kind === "num" ? A.value : ""; i.classList.remove("wrong"); i.classList.add("right"); if (A.kind === "numset") $("answer").querySelector(".chips").innerHTML = A.value.map(v => `<span class="chip" style="background:var(--okbg);color:var(--ok)">${v}</span>`).join(""); }
  if (A.kind === "time") { const [h, m] = S.inputs; h.value = Math.floor(A.value / 60); m.value = String(A.value % 60).padStart(2, "0"); [h, m].forEach(i => { i.classList.remove("wrong"); i.classList.add("right"); }); }
  if (A.kind === "choice" || A.kind === "pick") { const want = [].concat(A.value); document.querySelectorAll("#answer .opt").forEach((b, k) => { b.classList.remove("sel"); if (want.includes(k)) b.classList.add("right"); }); }
}
function stepsAll(t) { const box = el("div", "steps"); t.steps.forEach(s => box.append(el("div", "step", s))); return box; }
function logOpts(t, v) { return { twin: S.twin, q: speechText(t.q).slice(0, 220), a: v == null ? "" : answerText(t.ans, v), c: correctText(t.ans), w: (() => { try { return v != null && t.why ? plain(t.why(v) || "") : ""; } catch { return ""; } })() }; }
// auto = elsőre jó válasz: 1,5 mp múlva magától továbblép (a gombon egy sáv mutatja az időt).
// Javított válasz után nem lép tovább magától – a gyerek nyugodtan megnézheti, mi lett a jó megoldás.
const AUTO_NEXT_MS = 1500;
function nextButton(auto = false) {
  // a S.idx már a következőre mutat
  const last = S.idx >= S.plan.length;
  const t = S.task;
  const go = () => { clearTimeout(S.autoT); nextTask(); };
  const b = btn("primary big" + (auto ? " auto" : ""), last ? "Kész! 🏁" : "Tovább ▶", go);
  if (auto) b.style.setProperty("--auto", AUTO_NEXT_MS + "ms");
  setActions([b]); S.onNext = go;
  S.lockUntil = Date.now() + 400;
  clearTimeout(S.autoT);
  // ha közben felugró ablak jön (pl. küldetés teljesítve), nem lépünk tovább magától
  if (auto) S.autoT = setTimeout(() => { if (S && S.task === t && S.phase === "done" && !isModalOpen()) go(); }, AUTO_NEXT_MS);
}
function afterEvents(ev) {
  const u = cur();
  if (ev.star) { const T = typeById(ev.star.T); confetti(); toast(`⭐ Új csillag: ${T.planet.name}! ${ev.star.stars < 3 ? "Mostantól nehezebb feladatok jönnek." : "Mester lettél! 👑"}`, 4000); }
  ev.badges.forEach(b => toast(`${b.ic} Új jelvény: ${b.n}`, 3500));
  const rb = rankIndex(u.pts - ev.pts), ra = rankIndex(u.pts);
  if (ra > rb) setTimeout(() => celebrateRank(ra), 1200);
  // napi küldetés teljesítése (feladatszám vagy idő alapján)
  const mp = E.missionProgress(u, prefs(u));
  if (!mp.done && mp.pct >= 1) {
    const me = E.completeMission(u); save(); renderTop();
    if (me) setTimeout(() => celebrate(me), 700);
  }
}
function celebrate(me) {
  confetti();
  modal((box, close) => {
    box.classList.add("celebrate");
    box.append(el("div", "big-emoji", "🏆"), el("h3", null, "Küldetés teljesítve!"),
      el("p", null, `🔥 <b>${me.streak} napos</b> sorozat!${me.shieldUsed ? "<br>🛡️ A heti pajzs megvédte a sorozatodat." : ""}`),
      el("p", null, me.badges.map(b => `${b.ic} ${b.n}`).join("<br>")));
    const row = el("div", "mbtns"); row.style.justifyContent = "center";
    row.append(btn("secondary", "Még gyakorlok", () => close()), btn("primary", "Vissza a térképre", () => { close(); goHome(); }));
    box.append(row);
  });
}
// ---------- Ranglétra és szekrény ----------
const itemIcon = id => { const it = itemById(id); if (!it) return ""; if (it.kind === "bg") return "🌌"; return it.show || ""; };
function celebrateRank(i) {
  const R = RANKS[i];
  confetti();
  modal((box, close) => {
    box.classList.add("celebrate");
    box.append(el("div", "big-emoji", "🎉"), el("h3", null, `Új rang: ${esc(R.name)}!`),
      el("p", null, `Kinyitottad: <b>${R.unlocks.map(id => `${itemIcon(id)} ${esc(itemById(id).label)}`).join(", ")}</b>${R.title ? `<br>…és mostantól a neved mellett ott a <span class="legend-tag">${R.title}</span> felirat!` : ""}`),
      el("p", "soft small", "Kipróbálod? A szekrényben bármikor átöltözhetsz."));
    const row = el("div", "mbtns"); row.style.justifyContent = "center";
    row.append(btn("secondary", "Később", () => close()), btn("primary", "Kipróbálom ✨", () => { close(); openRanks(itemById(R.unlocks[0]).kind); }));
    box.append(row);
  });
}
// A rangablak: felül a rang és a becslés, alatta a 12 rangos létra, lent a szekrény
let wardrobeKind = "av";
function openRanks(kind) {
  const u = cur(); if (!u) return;
  if (kind) wardrobeKind = kind;
  modal((box, close) => {
    const draw = () => {
      const rk = rankOf(u.pts), un = unlocked(u), L = look(u);
      box.innerHTML = "";
      const head = el("div", "tabs-head");
      head.append(el("h3", null, "🪜 Ranglétra és szekrény"), btn("ghost tabs-x", "✕", () => close()));
      box.append(head);
      box.append(el("div", "rk-head", `<div class="rk-big">${u.avatar}</div><div style="flex:1"><h3>🧑‍🚀 ${esc(rk.name)} <span class="soft small">(${rk.n}/${rk.total})</span></h3><div class="bar"><i style="width:${Math.round(rk.pct * 100)}%"></i></div><p class="small">${rk.next ? `Még <b>${rk.need} ⛽</b> a(z) „${esc(rk.next)}” rangig – <b>kb. ${daysTo(u, rk.need)} nap</b> gyakorlás (az utolsó 7 nap tempójával).` : "Elérted a legmagasabb rangot! Te vagy a Csillagflotta legendája! 🌟"}</p></div>`));
      // létra
      box.append(el("h4", "psub", "🪜 A ranglétra"));
      const lad = el("div", "ladder");
      RANKS.forEach((R, i) => {
        const st = i <= rk.i ? "done" : i === rk.i + 1 ? "next" : "locked";
        lad.append(el("div", "rcard " + st, `<div class="rn">${i + 1}. rang · ${R.pts} ⛽</div><div class="rname">${esc(R.name)}</div>${st === "next" ? `<div class="rhint">Ezt nyitod ki következőnek!</div>` : ""}<div class="runl" title="${esc(R.unlocks.map(id => itemById(id).label).join(", "))}">${R.unlocks.map(itemIcon).join("")}${R.title ? "🏅" : ""}</div>`));
      });
      box.append(lad);
      // szekrény
      box.append(el("h4", "psub", "👕 Szekrény – kattints, és felveszed!"));
      const seg = el("div", "segs");
      KINDS.forEach(K => seg.append(btn("seg" + (K.id === wardrobeKind ? " on" : ""), `${K.icon} ${K.label}`, () => { wardrobeKind = K.id; draw(); box.querySelector(".segs .seg.on")?.focus(); })));
      box.append(seg);
      const grid = el("div", "wardrobe");
      const cur0 = wardrobeKind === "av" ? "av:" + u.avatar : L[wardrobeKind];
      const items = ITEMS.filter(it => it.kind === wardrobeKind).concat((u.owned || []).filter(id => id.startsWith(wardrobeKind + ":") && !itemById(id)).map(id => ({ id, kind: wardrobeKind, label: "Különleges", show: id.slice(wardrobeKind.length + 1), value: id.slice(wardrobeKind.length + 1) })));
      items.forEach(it => {
        const open = un.has(it.id), from = unlockRank(it.id);
        let face = `<span class="wic">${it.show || ""}</span>`;
        if (it.kind === "bg") face = `<span class="wsw" style="background:radial-gradient(circle at 70% 0, ${it.vars.glow}, transparent 70%), linear-gradient(180deg, ${it.vars.space2}, ${it.vars.space1})"></span>`;
        if (it.kind === "frame") face = `<span class="wfr" style="box-shadow:${it.cls === "fr-gold" ? "0 0 0 3px #facc15, 0 0 10px #facc15" : it.cls === "fr-silver" ? "0 0 0 3px #e2e8f0, 0 0 8px #e2e8f0" : "none"}">${esc(u.name)}</span>`;
        const b = btn("witem" + (it.id === cur0 ? " on" : ""), `${face}${esc(it.label)}${!from ? `<span class="wtag">🎄 különleges</span>` : ""}${open ? "" : `<span class="wlock">🔒 ${esc(from ? from.name : "?")} rangnál nyílik</span>`}`, () => {
          if (!open) return;
          u.cosmetics = u.cosmetics || {};
          if (it.kind === "av") { u.avatar = it.value; u.cosmetics.avatar = it.value; } else u.cosmetics[it.kind] = it.id;
          saveUser(u); draw(); toast(`✨ Felvetted: ${esc(it.label)}`);
          box.querySelector(".wardrobe .witem.on")?.focus();
        });
        b.disabled = !open; b.title = open ? `${it.label} – felvétel` : `🔒 ${from ? from.name : ""} rangnál nyílik`;
        grid.append(b);
      });
      box.append(grid);
      const row = el("div", "mbtns"); row.append(btn("primary", "Bezár", () => close())); box.append(row);
    };
    draw();
  }, { cls: "wide ranks-modal" });
}

function endRound() {
  cloud.checkpoint("home");   // kör vége: a „főmenübe lépéskor” módban is felmegy
  const ok = S.res.filter(r => r === 1).length, all = S.res.length, mode = S.mode, T = typeById(S.T);
  if (mode !== "free") { toast(`Kör vége: ${ok}/${all} elsőre jó. 🚀`); return goHome(); }
  if (ok === all) confetti();
  modal((box, close) => {
    box.classList.add("celebrate");
    box.append(el("div", "big-emoji", ok === all ? "🌟" : ok >= all / 2 ? "🚀" : "💪"), el("h3", null, `${T.planet.name}: kör vége!`),
      el("p", null, `<b>${ok}</b> feladat sikerült elsőre a ${all}-ból.<br>${ok === all ? "Hibátlan kör – szuper!" : ok >= all / 2 ? "Szép munka! Gyakorlással még jobb lesz." : "Ez nehéz volt – a hibás típusok pár nap múlva visszajönnek gyakorolni."}`),
      el("div", "dots", S.res.map(r => `<i class="${r === 1 ? "ok" : r === 2 ? "mid" : "bad"}"></i>`).join("")));
    box.lastChild.style.justifyContent = "center"; box.lastChild.style.margin = "8px 0";
    const row = el("div", "mbtns"); row.style.justifyContent = "center";
    row.append(btn("secondary", "Vissza a térképre", () => { close(); goHome(); }), btn("primary", "🔁 Még egy kör", () => { close(); startFree(T); }));
    box.append(row);
  }, { esc: close => { close(); goHome(); } });
}
function goHome() { if ("speechSynthesis" in window) speechSynthesis.cancel(); if (S) clearTimeout(S.autoT); S = null; show("scr-home"); renderTop(); renderHome(); cloud.checkpoint("home"); maybeAskDevice(); }

// ---------- Szülői PIN ----------
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
async function hashPin(pin, saltHex) {
  const salt = saltHex ? Uint8Array.from(saltHex.match(/../g).map(h => parseInt(h, 16))) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" }, key, 256);
  return { salt: hex(salt), hash: hex(bits) };
}
const PIN_OK = /^\d{4,8}$/;
async function setNewPin() {
  const a = await ask({ title: "Szülői PIN beállítása", text: "Adj meg egy 4–8 számjegyű PIN-kódot. Ezzel védjük a szülői felületet.", value: "", secret: true });
  if (a == null) return false;
  if (!PIN_OK.test(a)) { toast("A PIN 4–8 számjegyből álljon."); return false; }
  const b = await ask({ title: "PIN megerősítése", text: "Írd be még egyszer.", value: "", secret: true });
  if (a !== b) { toast("A két PIN nem egyezik."); return false; }
  state.parent = await hashPin(a); persist(); cloud.pushParent(); toast("✅ PIN beállítva.");
  return true;
}
async function requirePin() {
  if (!(window.crypto && crypto.subtle)) { toast("A PIN-hez biztonságos (https) kapcsolat kell."); return false; }
  if (!state.parent) { const r = await cloud.fetchParent(); if (r) { state.parent = r; persist(); } }
  if (!state.parent) return setNewPin();
  const p = await ask({ title: "Szülői felület", text: "Írd be a szülői PIN-kódot.", value: "", secret: true });
  if (p == null) return false;
  const ok = (await hashPin(p, state.parent.salt)).hash === state.parent.hash;
  if (!ok) toast("❌ Hibás PIN.");
  return ok;
}
// ---------- ⚙️ Szülői beállítások: 6 fülös ablak (PIN után) ----------
let gearApi = null;
async function openGear(startTab) {
  if (gearApi) return;
  if (!(await requirePin())) return;
  cloud.checkpoint("gear");
  gearApi = openTabs({
    id: "parent", title: GAME.settingsTitle, startTab,
    tabs: parentTabs(app),
    children: () => Object.values(state.users).map(u => ({ id: u.name, label: `${u.avatar} ${esc(u.name)}` })),
    startChild: state.current,
    onClose: () => { gearApi = null; refreshAll(); },
  });
}
async function deleteUser(name) {
  const ok = await ask({ title: `${name} törlése`, text: "Biztosan törlöd? Az összes eredménye elvész, és nem állítható vissza.", ok: "Törlöm", cancel: "Mégse" });
  if (!ok) return false;
  const ts = Date.now(), id = state.users[name] && state.users[name].id;
  state.deleted[name] = ts; delete state.users[name]; cloud.markDeleted(name, ts);
  if (device.kids && id) { device.setKids(device.kids.filter(x => x !== id).length ? device.kids.filter(x => x !== id) : null); cloud.pushDevice(true); }
  if (state.current === name) state.current = Object.keys(state.users)[0] || "";
  persist(); renderTop(); if ($("scr-home").classList.contains("on")) renderHome();
  if (!state.current) newPlayer(true);
  return true;
}
// Átnevezés: a gyerek új néven folytatja (a belső azonosító, így az eszköz-hozzárendelés is megmarad)
async function renameUser(old) {
  const u = state.users[old]; if (!u) return false;
  const v = await ask({ title: `${old} átnevezése`, text: "Új név:", value: old, ok: "Átnevezés" });
  if (v == null) return false;
  const nu = v.trim().replace(/[.$#\[\]\/]/g, "").slice(0, 20);
  if (!nu || nu === old) return false;
  if (state.users[nu]) { toast("Ilyen nevű játékos már van."); return false; }
  const ts = Date.now();
  state.users[nu] = { ...u, name: nu, upd: ts }; delete state.users[old];
  state.deleted[old] = ts; delete state.deleted[nu];
  if (state.current === old) state.current = nu;
  cloud.markDeleted(old, ts); persist(); cloud.queue(nu); refreshAll();
  toast(`✅ Átnevezve: ${esc(nu)}`);
  return true;
}
// Eszközlista a Család és a Felhő fülhöz (a felhőből, kiegészítve ennek az eszköznek a helyi adataival)
async function devicesList() {
  const remote = cloud.ready ? await cloud.fetchDevices() : null;
  const list = Object.entries(remote || {}).map(([id, r]) => ({ id, name: r.name || r.model || id, model: r.model || "", lastSeen: r.lastSeen || 0, kids: r.kids ? (Array.isArray(r.kids) ? r.kids : Object.values(r.kids)) : null, syncMode: r.syncMode || "", traffic: r.traffic || {}, me: id === device.id }));
  const mine = { id: device.id, name: device.name, model: guessName(), lastSeen: Date.now(), kids: device.kids, syncMode: device.syncMode, traffic: device.allTraffic, me: true };
  const i = list.findIndex(d => d.me);
  if (i >= 0) list[i] = { ...list[i], ...mine }; else list.unshift(mine);
  list.sort((a, b) => (b.me - a.me) || (b.lastSeen - a.lastSeen));
  return { list, fromCloud: !!remote };
}
function setDeviceKids(id, kids) {
  const k = kids && kids.length ? [...new Set(kids)] : null, ts = Date.now();
  if (id === device.id) { device.setKids(k, ts); enforceDevice(); refreshAll(); }
  return cloud.updateDevice(id, { kids: k, kidsUpd: ts });
}
function renameDevice(id, name) {
  const n = String(name || "").trim().slice(0, 40), ts = Date.now();
  if (!n) return Promise.resolve(false);
  if (id === device.id) device.setName(n, ts);
  return cloud.updateDevice(id, { name: n, nameUpd: ts });
}
async function removeDevice(id, name) {
  if (id === device.id) return false;
  const ok = await ask({ title: "Eszköz törlése", text: `Törlöd a listából: <b>${esc(name)}</b>? Ha az eszközön újra megnyitják a játékot, új eszközként jelenik meg.`, ok: "Törlöm" });
  return ok ? cloud.removeDevice(id) : false;
}
// A fülek ezen keresztül érik el az adatokat és a műveleteket (így a parent/tabs.js nem függ az app.js-től)
const app = {
  get state() { return state; }, E, TYPES, typeById, cloud, device,
  saveUser, saveFamily, deleteUser, renameUser, setNewPin,
  newPlayer: after => newPlayer(false, after),
  renderCloudInto: box => renderCloudInto(box),
  fetchLogs: name => cloud.fetchLogs(name),
  devicesList, setDeviceKids, renameDevice, removeDevice,
  consoleUrl: FIREBASE_CONFIG && FIREBASE_CONFIG.projectId ? `https://console.firebase.google.com/project/${FIREBASE_CONFIG.projectId}/database` : "",
};

// ---------- Felhő panel ----------
// Élő állapot + eseménynapló: a ☁️ ablakban és a szülői felületen is látszik, és magától frissül
let cloudBox = null;
function renderCloudLive() {
  document.querySelectorAll(".cloud-live").forEach(box => {
    const st = cloud.status();
    const ev = cloud.events.slice(-12).reverse();
    box.innerHTML = `<div class="cl-status ${st.cls || ""}"><span class="cl-ic">${st.icon}</span><div><b>${esc(st.text)}</b><div class="small">${esc(st.detail)}</div></div></div>`
      + (cloud.ready ? `<div class="small soft">Család: ${esc(cloud.familyCode.slice(0, 7))}… · Feltöltésre vár: ${cloud.pendingCount}</div>` : "")
      + (ev.length ? `<details class="cl-log"${st.cls === "err" || st.cls === "warn" || box.classList.contains("log-open") ? " open" : ""}><summary>Eseménynapló (${ev.length})</summary>${ev.map(e => `<div class="${e.err ? "bad" : ""}"><span class="soft">${new Date(e.t).toLocaleTimeString("hu-HU")}</span> ${e.icon} ${esc(e.text)}</div>`).join("")}</details>` : "");
  });
}
function renderCloudInto(c) {
  const live = el("div", "cloud-live"); c.append(live);
  const box = el("div");
  if (!cloud.configured) {
    box.innerHTML = `<p>A felhős mentés még nincs beállítva, ezért az adatok <b>csak ebben a böngészőben</b> tárolódnak.</p><p class="soft small">A beállítás lépései a <code>FIREBASE.md</code> fájlban vannak (kb. 15 perc). Utána a szülő Google-fiókkal lép be, és minden eszközön ugyanaz az állás látszik.</p>`;
  } else if (!cloud.user) {
    box.innerHTML = `<p>Lépj be Google-fiókkal, hogy az eredmények minden eszközön megjelenjenek, és a másik szülő is lássa őket.</p>`;
    box.append(btn("primary", "Belépés Google-lel", () => cloud.signIn()));
  } else {
    box.innerHTML = `<p>Belépve: <b>${esc(cloud.user.email || "")}</b></p>`;
    if (!cloud.member) {
      box.insertAdjacentHTML("beforeend", `<p>Ehhez a fiókhoz még nem tartozik család. Hozz létre egyet – a jelenlegi adatok feltöltődnek –, vagy kérd meg a másik szülőt, hogy adja hozzá az e-mail-címedet.</p>`);
      box.append(btn("primary", "Család létrehozása", () => cloud.createFamily()));
    } else {
      const ml = el("p", "soft small", "Családtagok betöltése…"); box.append(ml);
      cloud.members().then(ms => { ml.innerHTML = "Családtagok: " + ms.map(esc).join(", "); });
      const f = el("div", "form-row", `<input id="cl-mail" type="email" placeholder="masik.szulo@gmail.com">`);
      f.append(btn("secondary", "Hozzáadás", () => cloud.addMember($("cl-mail").value)));
      box.append(el("p", "small", "Másik szülő hozzáadása (a Google-fiókja e-mail-címével):"), f);
    }
    const tools = el("div", "form-row");
    if (cloud.ready) tools.append(btn("secondary", "⬆️ Mentés most", () => cloud.checkpoint("now")));
    tools.append(btn("secondary", "🔄 Újrakapcsolódás", () => cloud.reconnect()), btn("secondary", "🚪 Kilépés", () => cloud.signOut()));
    box.append(tools);
  }
  if (cloud.note) box.append(el("p", "small", cloud.note));
  c.append(box);
  renderCloudLive();
}
// ☁️ kis ablak PIN nélkül: állapot, eseménynapló (nyitva), Mentés most, Újrakapcsolódás;
// a ⚙️ gomb PIN után a beállítások Felhő fülére visz.
function openCloud() {
  modal((box, close) => {
    const head = el("div", "tabs-head");
    const gear = btn("ghost gear-jump", "⚙️", () => { close(); openGear("cloud"); });
    gear.title = "Felhő beállítások (szülői PIN)"; gear.setAttribute("aria-label", gear.title);
    head.append(el("h3", null, "☁️ Szinkron"), gear);
    box.append(head);
    box.append(el("div", "cloud-live log-open"));
    const row = el("div", "mbtns");
    if (cloud.ready) row.append(btn("secondary", "⬆️ Mentés most", () => cloud.checkpoint("now")));
    if (cloud.configured && !cloud.user) row.append(btn("secondary", "Belépés Google-lel", () => { close(); cloud.signIn(); }));
    if (cloud.configured && cloud.user) row.append(btn("secondary", "🔄 Újrakapcsolódás", () => cloud.reconnect()));
    row.append(btn("primary", "Bezár", () => close()));
    box.append(row);
    renderCloudLive();
  });
}

// ---------- Súgó (F1): mi vár a bolygón? ----------
function planetHelp(T, fromHome) {
  const I = PLANET_INFO[T.id] || {};
  modal((box, close) => {
    box.classList.add("help-info");
    box.append(el("h3", null, `${T.planet.emoji} ${T.planet.name}`), el("p", "soft", `<b>${esc(T.name)}</b>`));
    box.append(el("p", null, esc(I.about || "")));
    box.append(el("p", null, `<b>Ilyen feladatok várnak:</b> ${T.subs.map(s => esc(s.name)).join(" · ")}`));
    if (I.example) box.append(el("p", "ex", `Például: ${esc(I.example)}`));
    if (I.tip) box.append(el("p", null, `💡 <b>Tipp:</b> ${esc(I.tip)}`));
    const row = el("div", "mbtns");
    row.append(btn("secondary", "Bezár", () => close()));
    if (fromHome) row.append(btn("primary", `🚀 Indulás (${freeSize()} feladat)`, () => { close(); startFree(T); }));
    box.append(row);
  });
}
function overviewHelp() {
  modal((box, close) => {
    box.append(el("h3", null, "❓ Mi vár a bolygókon?"));
    box.append(el("p", "soft small", "Kattints egy bolygóra (vagy lépj rá Tab-bal, és nyomd meg az Entert), hogy megtudd, milyen feladatok várnak ott!"));
    const list = el("div", "help-list");
    TYPES.forEach(T => list.append(btn("", `<span style="font-size:24px">${T.planet.emoji}</span><span>${T.planet.name}<br><span class="soft small">${esc(T.name)}</span></span>`, () => { close(); planetHelp(T, $("scr-home").classList.contains("on")); })));
    box.append(list);
    box.append(el("p", "small", "⌨️ <b>Tab</b> / <b>Shift+Tab</b>: lépés · <b>Enter</b>: indulás · <b>F1</b>: súgó · <b>Esc</b>: vissza a főmenübe"));
    const row = el("div", "mbtns"); row.append(btn("primary", "Bezár", () => close())); box.append(row);
  });
}
function openHelp() {
  if ($("scr-play").classList.contains("on") && S && S.task) return planetHelp(typeById(S.task.type), false);
  const a = document.activeElement, t = a && a.dataset && a.dataset.type;
  if ($("scr-home").classList.contains("on") && t) return planetHelp(typeById(t), true);
  overviewHelp();
}

// ---------- Felolvasás gomb ----------
function updTtsBtn() { const b = $("play-tts"); b.textContent = ttsOn ? "🔊" : "🔇"; b.setAttribute("aria-pressed", ttsOn); b.title = ttsOn ? "Felolvasás bekapcsolva" : "Felolvasás kikapcsolva"; }

// ---------- Események ----------
$("btn-mission").addEventListener("click", startMission);
$("rankbox").addEventListener("click", () => openRanks());
$("rankbox").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); openRanks(); } });
$("tb-user").addEventListener("click", onUserClick);
$("tb-gear").addEventListener("click", () => openGear());
$("tb-cloud").addEventListener("click", openCloud);
$("tb-help").addEventListener("click", openHelp);
$("play-exit").addEventListener("click", goHome);
$("play-tts").addEventListener("click", () => { ttsOn = !ttsOn; updTtsBtn(); if (ttsOn && S && S.task) speak(S.task.q); else if ("speechSynthesis" in window) speechSynthesis.cancel(); });
// ---------- Gyorsbillentyűk (közös modul: core/keys.js) ----------
// Kezdőlap: Tab / Shift+Tab a küldetés gomb és a bolygók között lép körbe, Enter indít (a gomb saját kezelése),
// F1: súgó a kijelölt bolygóról. Felugró ablakban az ablak saját kontextusa érvényes (Esc = Mégse).
const homeKeys = {
  id: "home",
  items: () => [$("btn-mission"), $("rankbox"), ...document.querySelectorAll("#map button.planet")],
  onF1: () => openHelp(),
};
// Gyakorlás: Enter = Tovább (ha már válaszolt, és nem egy gombon áll); Esc = főmenü; F1 = a bolygó súgója.
const playKeys = {
  id: "play",
  onEnter: a => {
    if (S && S.phase !== "answer" && S.onNext && Date.now() >= (S.lockUntil || 0) && !(a && a.tagName === "BUTTON")) { S.onNext(); return true; }
    return false;
  },
  onEsc: () => goHome(),
  onF1: () => openHelp(),
};
keys.setScreen(homeKeys);

// Tesztelési segéd: a #debug címmel megnyitva a konzolból elérhető az aktuális kör
if (location.hash === "#debug") window.__urk = { S: () => S, state: () => state, show: (T, sub, lvl) => { S = S || { mode: "free", T, plan: [], idx: 0, res: [] }; S.T = T; show("scr-play"); const t = makeTask(typeById(T), sub, lvl, rng); S.task = t; S.twin = false; S.tries = 0; S.t0 = Date.now(); S.phase = "answer"; S.sel = []; S.set = []; S.clicked = null; renderTask(); } };

// ---------- Indulás ----------
updTtsBtn();
if (!state.users[state.current]) state.current = Object.keys(state.users)[0] || "";
enforceDevice();
renderTop(); renderHome();
if (!state.current) newPlayer(true);
device.ready.then(() => cloud.init());
setTimeout(maybeAskDevice, 1500);
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
