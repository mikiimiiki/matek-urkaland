// ===== Matek Űrkaland – felület és játékmenet =====
import { TYPES, COMING, typeById, makeTask } from "./types/index.js";
import { makeRng, plain, esc } from "./util.js";
import { checkAnswer, parseNum, answerText, correctText } from "./check.js";
import * as E from "./engine.js";
import { createCloud } from "./cloud.js";

const $ = id => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const btn = (cls, html, fn) => { const b = el("button", cls, html); b.type = "button"; if (fn) b.addEventListener("click", fn); return b; };
const rng = makeRng();

// ---------- Állapot (helyben mindig mentünk; a felhő opcionális) ----------
const STORE = "matek_urkaland_v1";
let state = (() => { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch { return null; } })()
  || { familyCode: "", current: "", users: {}, settings: { ...E.DEFAULT_SETTINGS }, deleted: {} };
state.settings = Object.assign({ ...E.DEFAULT_SETTINGS }, state.settings || {});
state.deleted = state.deleted || {};
Object.keys(state.users).forEach(n => { state.users[n] = E.normUser(state.users[n]); });

const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { console.warn(e); } };
const cur = () => state.users[state.current];
function save() { const u = cur(); if (u) u.upd = Date.now(); persist(); if (u) cloud.queue(u.name); }

const cloud = createCloud({
  state: () => state, persist, normUser: E.normUser,
  refresh: () => { if (!state.users[state.current]) state.current = Object.keys(state.users)[0] || ""; refreshAll(); },
  setSync: (t, cls) => { $("tb-sync").textContent = t; $("tb-cloud").className = "pill btn-pill " + (cls || ""); },
});

// ---------- Kis segédek: felugró ablak, értesítés, konfetti, felolvasás ----------
function modal(build, { onClose } = {}) {
  const m = $("modal"), box = m.firstElementChild;
  box.innerHTML = "";
  const close = v => { m.classList.remove("on"); if (onClose) onClose(v); };
  build(box, close);
  m.classList.add("on");
  const f = box.querySelector("input, button.primary"); if (f) setTimeout(() => f.focus(), 30);
  return close;
}
function ask({ title, text = "", value = null, ok = "OK", cancel = "Mégse", secret = false, type = "text" }) {
  return new Promise(res => modal((box, close) => {
    box.append(el("h3", null, esc(title)));
    if (text) box.append(el("p", null, text));
    let inp = null;
    if (value !== null) { inp = el("input", "minp"); inp.value = value; inp.type = secret ? "password" : type; if (secret) inp.inputMode = "numeric"; box.append(inp); inp.addEventListener("keydown", e => { if (e.key === "Enter") { close(); res(inp.value); } if (e.key === "Escape") { close(); res(null); } }); }
    const row = el("div", "mbtns");
    if (cancel) row.append(btn("secondary", cancel, () => { close(); res(null); }));
    row.append(btn("primary", ok, () => { close(); res(inp ? inp.value : true); }));
    box.append(row);
  }));
}
let toastT;
function toast(msg, ms = 2800) { const t = $("toast"); t.innerHTML = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), ms); }
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = $("confetti"), ctx = cv.getContext("2d"); cv.width = innerWidth; cv.height = innerHeight;
  const cols = ["#7c3aed", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4", "#facc15"];
  const ps = Array.from({ length: 150 }, () => ({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * .5, vx: Math.random() * 4 - 2, vy: 2 + Math.random() * 4, s: 6 + Math.random() * 6, c: cols[Math.random() * cols.length | 0], r: Math.random() * 6 }));
  const t0 = performance.now();
  (function frame(t) { ctx.clearRect(0, 0, cv.width, cv.height); ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += .1; ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }); if (t - t0 < 2800) requestAnimationFrame(frame); else ctx.clearRect(0, 0, cv.width, cv.height); })(t0);
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
let ttsOn = !!state.settings.tts;

// ---------- Képernyők ----------
function show(id) { document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id === id)); scrollTo(0, 0); }
function refreshAll() {
  renderTop();
  if ($("scr-home").classList.contains("on")) renderHome();
  if ($("scr-parent").classList.contains("on") && parentOpen) { fillChildSelect(); renderParent(); }
}
function renderTop() {
  const u = cur();
  $("tb-avatar").textContent = u ? u.avatar : "🧑‍🚀";
  $("tb-name").textContent = u ? u.name : "Játékos";
  $("tb-pts").textContent = u ? u.pts : 0;
  $("tb-streak").textContent = u ? E.streakNow(u) : 0;
}

// ---------- Kezdőképernyő ----------
function renderHome() {
  const u = cur(); if (!u) return;
  const s = state.settings, mp = E.missionProgress(u, s);
  $("home-hello").textContent = `Szia, ${u.name}! ${mp.done ? "A mai küldetés kész – szabadon repülhetsz tovább! 🌟" : "Indulhat a mai küldetés?"}`;
  $("mission-sub").textContent = `${s.goalTasks} feladat vagy ${s.goalMin} perc – amelyik előbb teljesül`;
  $("mission-bar").style.width = Math.round(mp.pct * 100) + "%";
  $("mission").classList.toggle("done", mp.done);
  $("btn-mission").textContent = mp.done ? "🚀 Még egy kör" : mp.n ? "🚀 Folytatás" : "🚀 Indítás";
  const st = E.streakNow(u);
  $("mission-note").textContent = mp.done ? `✅ Ma már ${mp.n} feladatot oldottál meg. Sorozat: ${st} nap 🔥`
    : `Ma: ${mp.n} feladat, ${mp.min} perc. ${st ? `🔥 ${st} napos sorozat – ne szakítsd meg!` : "Kezdj egy új sorozatot!"} ${E.shieldAvailable(u) ? "🛡️ A heti pajzsod még megvan." : ""}`;
  const rk = E.rankOf(u.pts);
  $("rank-name").textContent = `🧑‍🚀 ${rk.name}`;
  $("rank-next").textContent = rk.next ? `még ${rk.need} ⛽ a(z) „${rk.next}” rangig` : "Elérted a legmagasabb rangot!";
  $("rank-bar").style.width = Math.round(rk.pct * 100) + "%";
  // következő jutalom
  const rb = $("reward-box"), rws = (s.rewards || []).map(r => ({ r, p: E.rewardProgress(u, r) })).filter(x => !x.p.claimed);
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
    map.append(b);
  });
  COMING.forEach(c => map.append(el("div", "planet locked", `<div class="orb" style="background:#475569;--glow:transparent">${c.emoji}</div><div class="pname">${c.name}</div><div class="ptype">🔒 hamarosan</div>`)));
  // jelvények
  const bd = $("badges"); bd.innerHTML = "";
  E.BADGES.forEach(b => bd.append(el("span", "badge" + (u.badges.includes(b.id) ? "" : " off"), `${b.ic} ${b.n}`)));
}

// ---------- Játékosok ----------
function newPlayer(first = false) {
  let av = E.AVATARS[Object.keys(state.users).length % E.AVATARS.length];
  modal((box, close) => {
    box.append(el("h3", null, first ? "Üdv a Matek Űrkalandban! 🚀" : "Új játékos"));
    box.append(el("p", null, "Hogy hívnak? Válassz egy űrhajóst is!"));
    const inp = el("input", "minp"); inp.maxLength = 20; inp.placeholder = "Neved"; box.append(inp);
    const avs = el("div", "avatars");
    E.AVATARS.forEach(a => { const b = btn(a === av ? "sel" : "", a, () => { av = a; avs.querySelectorAll("button").forEach(x => x.classList.toggle("sel", x === b)); }); avs.append(b); });
    box.append(avs);
    const go = () => {
      const name = inp.value.trim().replace(/[.$#\[\]\/]/g, "");
      if (!name) return toast("Írd be a neved!");
      if (state.users[name]) return toast("Ilyen nevű játékos már van.");
      state.users[name] = E.newUser(name, av); state.current = name; delete state.deleted[name];
      save(); close(); refreshAll();
    };
    inp.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
    const row = el("div", "mbtns");
    if (!first) row.append(btn("secondary", "Mégse", () => close()));
    row.append(btn("primary", "Indulás! 🚀", go));
    box.append(row);
  });
}
function switchPlayer() {
  modal((box, close) => {
    box.append(el("h3", null, "Ki játszik?"));
    const list = el("div", "userlist");
    Object.values(state.users).forEach(u => list.append(btn(u.name === state.current ? "cur" : "", `<span style="font-size:28px">${u.avatar}</span> ${esc(u.name)} <span class="soft small" style="margin-left:auto">⛽ ${u.pts}</span>`, () => { state.current = u.name; persist(); close(); refreshAll(); })));
    box.append(list);
    const row = el("div", "mbtns");
    row.append(btn("secondary", "➕ Új játékos", () => { close(); newPlayer(); }));
    row.append(btn("primary", "Bezár", () => close()));
    box.append(row);
  });
}

// ---------- Gyakorlás ----------
let S = null; // aktuális kör
function startMission() {
  const u = cur(), mp = E.missionProgress(u, state.settings);
  const n = mp.done ? 5 : Math.max(1, state.settings.goalTasks - mp.n);
  S = { mode: "mission", plan: E.planMission(u, rng, n), idx: 0, res: [] };
  show("scr-play"); $("play-title").textContent = mp.done ? "🚀 Plusz kör" : "🚀 Napi küldetés";
  nextTask();
}
function startFree(T) {
  S = { mode: "free", T: T.id, plan: [], idx: 0, res: [] };
  show("scr-play"); $("play-title").textContent = `${T.planet.emoji} ${T.planet.name} – szabad gyakorlás`;
  nextTask();
}
function nextTask(twinOf = null) {
  const u = cur();
  let item;
  if (twinOf) item = { T: twinOf.type, sub: twinOf.sub, lvl: twinOf.lvl, twin: true };
  else if (S.mode === "mission") { if (S.idx >= S.plan.length) return endRound(); item = S.plan[S.idx]; }
  else { const T = typeById(S.T); item = { T: T.id, sub: E.pickSub(u, T, E.typeLvl(u, T.id), rng) }; }
  const T = typeById(item.T);
  const lvl = item.lvl || E.typeLvl(u, T.id);
  const task = makeTask(T, item.sub, lvl, rng);
  S.task = task; S.twin = !!item.twin; S.tries = 0; S.t0 = Date.now(); S.phase = "answer"; S.sel = []; S.set = []; S.lastInput = null; S.firstWrong = null; S.clicked = null; S.onNext = null;
  renderTask();
}
function renderDots() {
  const d = $("play-dots"); d.innerHTML = "";
  const n = S.mode === "mission" ? Math.max(S.plan.length, S.res.length + 1) : Math.min(10, S.res.length + 1);
  const res = S.mode === "mission" ? S.res : S.res.slice(-9);
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
    i.addEventListener("keydown", e => { if (e.key === "Enter") onEnter(); });
    S.read = () => parseNum(i.value); S.inputs = [i];
    setTimeout(() => i.focus(), 30);
  } else if (A.kind === "time") {
    const row = el("div", "ans-row"), h = numInput("short"), m = numInput("short");
    h.maxLength = 2; m.maxLength = 2; h.placeholder = "óra"; m.placeholder = "perc";
    row.append(h, el("span", "unit", "óra"), m, el("span", "unit", "perc"));
    box.append(row, numpad());
    h.addEventListener("input", () => { if (h.value.length >= 2) m.focus(); });
    [h, m].forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") onEnter(); if (e.key === ":" || e.key === ".") { e.preventDefault(); m.focus(); } }));
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
    i.addEventListener("keydown", e => { if (e.key === "Enter") { if (!add()) onEnter(); } });
    drawChips();
    S.read = () => { if (i.value.trim()) add(); return S.set.length ? S.set.slice() : null; };
    S.inputs = [i];
    setTimeout(() => i.focus(), 30);
  }
}
function onEnter() { if (S.phase === "answer") check(); else if (S.onNext) S.onNext(); }

// --- Ellenőrzés és visszajelzés ---
const PRAISE = ["Szuper! 🚀", "Telitalálat! ⭐", "Pontos landolás! 🛬", "Csillagos ötös! 🌟", "Így kell ezt! 💪", "Hibátlan! 🎯"];
function check() {
  if (S.phase !== "answer") return;
  const t = S.task, A = t.ans, v = S.read ? S.read() : null;
  if (v == null || (Array.isArray(v) && !v.length)) return toast(A.kind === "pick" ? "Jelölj meg legalább egyet!" : A.kind === "time" ? "Írd be az órát és a percet!" : "Írj be egy számot!");
  const r = checkAnswer(A, v);
  S.lastInput = v;
  if (r.ok) return correct();
  S.tries++;
  if (S.tries === 1) S.firstWrong = v;
  S.inputs.forEach(i => { i.classList.remove("wrong"); void i.offsetWidth; i.classList.add("wrong"); });
  if (S.clicked) { S.clicked.classList.add("wrong"); S.clicked.disabled = true; }
  if (S.tries === 1) {
    let extra = "";
    if (A.kind === "numset" || A.kind === "pick") extra = `<p>${r.good ? `${r.good} jót már megtaláltál. ` : ""}${r.missing ? `Még hiányzik ${r.missing}. ` : ""}${r.extra ? `${r.extra} olyan is van köztük, ami nem jó – a felvételin ezért pontlevonás jár!` : ""}</p>`;
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
  S.res.push(rr); if (S.mode === "mission") S.idx++;
  save(); renderTop(); renderDots();
  const praise = PRAISE[rng.int(0, PRAISE.length - 1)];
  $("side-body").innerHTML = `<div class="fb ok"><div class="fb-title">${praise}</div>${rr === 1 ? "Elsőre sikerült!" : "A tipp után sikerült – ügyes!"} <b>+${ev.pts} ⛽</b>${S.twin ? "<br>🧠 Hibából tanultál – ez a legjobb!" : ""}</div>`;
  if (rr === 2) $("side-body").append(btn("secondary", "👀 Megnézem a megoldást", () => { $("side-body").append(stepsAll(t)); }));
  if (ttsOn) speak(praise);
  afterEvents(ev);
  nextButton();
}
function explain(v) {
  const t = S.task, u = cur();
  S.phase = "explain";
  S.inputs.forEach(i => { i.disabled = true; });
  document.querySelectorAll("#answer .opt").forEach(b => { b.disabled = true; });
  const ev = E.record(u, t, 0, Date.now() - S.t0, logOpts(t, v));
  S.res.push(0); if (S.mode === "mission") S.idx++;
  save(); renderTop(); renderDots();
  let why = null; try { why = t.why ? t.why(v) : null; } catch (e) { console.warn(e); }
  const sb = $("side-body");
  sb.innerHTML = `<div class="fb bad"><div class="fb-title">Nézzük meg együtt! 🧑‍🚀</div>Semmi baj – ebből tanulunk. Lépésről lépésre megmutatom.</div>`;
  sb.append(el("div", "yours", `A te válaszod: <b>${esc(answerText(t.ans, v))}</b>` + (why ? `<br>💡 Lehet, hogy itt csúszott el: ${why}` : "")));
  const box = el("div", "steps"); sb.append(box);
  let k = 0;
  const step = () => {
    box.append(el("div", "step", t.steps[k])); if (ttsOn) speak(t.steps[k]); k++;
    if (k < t.steps.length) { setActions([btn("primary big", "Tovább ▶", step)]); S.onNext = step; }
    else {
      showCorrect();
      // ikerfeladat: küldetésben bekerül a tervbe (a pöttyök is mutatják), szabad gyakorlásban rögtön jön
      if (S.mode === "mission") S.plan.splice(S.idx, 0, { T: t.type, sub: t.sub, lvl: t.lvl, twin: true });
      const go = S.mode === "mission" ? () => nextTask() : () => nextTask(t);
      setActions([btn("primary big", "🔁 Próbáld ki egy hasonlóval!", go)]); S.onNext = go;
    }
    box.lastElementChild.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  step();
  afterEvents(ev);
}
function showCorrect() {
  const t = S.task, A = t.ans;
  if (A.kind === "num" || A.kind === "numset") { const i = S.inputs[0]; i.value = A.kind === "num" ? A.value : ""; i.classList.remove("wrong"); i.classList.add("right"); if (A.kind === "numset") $("answer").querySelector(".chips").innerHTML = A.value.map(v => `<span class="chip" style="background:var(--okbg);color:var(--ok)">${v}</span>`).join(""); }
  if (A.kind === "time") { const [h, m] = S.inputs; h.value = Math.floor(A.value / 60); m.value = String(A.value % 60).padStart(2, "0"); [h, m].forEach(i => { i.classList.remove("wrong"); i.classList.add("right"); }); }
  if (A.kind === "choice" || A.kind === "pick") { const want = [].concat(A.value); document.querySelectorAll("#answer .opt").forEach((b, k) => { b.classList.remove("sel"); if (want.includes(k)) b.classList.add("right"); }); }
}
function stepsAll(t) { const box = el("div", "steps"); t.steps.forEach(s => box.append(el("div", "step", s))); return box; }
function logOpts(t, v) { return { twin: S.twin, q: speechText(t.q).slice(0, 220), a: v == null ? "" : answerText(t.ans, v), c: correctText(t.ans), w: (() => { try { return v != null && t.why ? plain(t.why(v) || "") : ""; } catch { return ""; } })() }; }
function nextButton() {
  // a S.idx már a következőre mutat
  const last = S.mode === "mission" && S.idx >= S.plan.length;
  const go = () => nextTask();
  setActions([btn("primary big", last ? "Kész! 🏁" : "Tovább ▶", go)]); S.onNext = go;
}
function afterEvents(ev) {
  const u = cur();
  if (ev.star) { const T = typeById(ev.star.T); confetti(); toast(`⭐ Új csillag: ${T.planet.name}! ${ev.star.stars < 3 ? "Mostantól nehezebb feladatok jönnek." : "Mester lettél! 👑"}`, 4000); }
  ev.badges.forEach(b => toast(`${b.ic} Új jelvény: ${b.n}`, 3500));
  // napi küldetés teljesítése (feladatszám vagy idő alapján)
  const mp = E.missionProgress(u, state.settings);
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
function endRound() {
  const ok = S.res.filter(r => r === 1).length;
  toast(`Kör vége: ${ok}/${S.res.length} elsőre jó. 🚀`);
  goHome();
}
function goHome() { if ("speechSynthesis" in window) speechSynthesis.cancel(); S = null; show("scr-home"); renderTop(); renderHome(); }

// ---------- Szülői felület ----------
let parentOpen = false;
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
async function openParent() {
  if (!(await requirePin())) return;
  parentOpen = true; show("scr-parent");
  fillChildSelect(); renderParent();
}
function fillChildSelect() {
  const sel = $("parent-child"), keep = sel.value; sel.innerHTML = "";
  Object.keys(state.users).forEach(n => { const o = el("option", null, esc(n)); o.value = n; sel.append(o); });
  sel.value = state.users[keep] ? keep : state.current;
}
function renderParent() {
  const sel = $("parent-child"), name = sel.value || state.current, u = state.users[name];
  const body = $("parent-body"); body.innerHTML = "";
  if (!u) { body.append(el("div", "card", "Még nincs játékos.")); return; }
  const grid = el("div", "pgrid"); body.append(grid);
  const card = (title, html) => { const c = el("section", "card pcard", `<h3>${title}</h3>`); if (html != null) c.insertAdjacentHTML("beforeend", html); grid.append(c); return c; };

  // 1. Heti összefoglaló
  const w = E.weekSummary(u), maxN = Math.max(1, ...w.days.map(d => d.n));
  card("📅 Az elmúlt 7 nap", `<div class="kpis"><div class="kpi"><b>${w.active}/7</b><span>gyakorlós nap</span></div><div class="kpi"><b>${w.n}</b><span>feladat</span></div><div class="kpi"><b>${Math.round(w.ms / 60000)}</b><span>perc</span></div><div class="kpi"><b>${w.acc == null ? "–" : Math.round(w.acc * 100) + "%"}</b><span>elsőre jó</span></div></div>
    <div class="weekbars">${w.days.map(d => `<div title="${d.key}: ${d.n} feladat, ${Math.round(d.ms / 60000)} perc"><i class="${d.done ? "done" : ""}" style="height:${Math.round(d.n / maxN * 90)}%"></i>${["V", "H", "K", "Sze", "Cs", "P", "Szo"][new Date(d.key).getDay()]}</div>`).join("")}</div>
    <p class="legend">Zöld oszlop: aznap teljesítette a napi küldetést. Sorozat: 🔥 ${E.streakNow(u)} nap (legjobb: ${u.streak.best}). Összes pont: ⛽ ${u.pts}.</p>`);

  // 2. Típusonkénti térkép
  const rows = TYPES.map(T => {
    const ts = E.typeState(u, T.id);
    const chips = T.subs.map(s => { const st = u.subs[E.subKey(T.id, s.id)], a = st ? E.subAcc(st) : null; return `<span class="sc ${E.subColor(u, T.id, s.id)}" title="${st ? `${st.n} feladat, utóbbi ${st.last.length}-ból ${Math.round((a || 0) * 100)}% jó` : "még nem próbálta"}">${s.name}${st ? ` · ${Math.round((a || 0) * 100)}%` : ""}</span>`; }).join("");
    return `<tr><td><b>${T.planet.emoji} ${T.name}</b><br><span class="soft small">${"⭐".repeat(ts.stars) || "–"} · ${E.typeLvl(u, T.id)}. szint</span></td><td>${chips}</td></tr>`;
  }).join("");
  card("🗺️ Miben erős, min kell még dolgozni?", `<table class="tmap">${rows}</table><p class="legend"><span class="sc green">megy</span> <span class="sc yellow">bizonytalan</span> <span class="sc red">gyenge – érdemes együtt átnézni</span> <span class="sc grey">még nem próbálta</span><br>A százalék az utolsó (legfeljebb 10) feladat elsőre jó aránya.</p>`);

  // 3. Hibanapló
  const log = u.log.slice(-40).reverse();
  card("📝 Hibanapló", log.length ? `<div class="log">${log.map(l => { const T = typeById(l.T), s = T && T.subs.find(x => x.id === l.s); return `<div class="log-item"><div class="soft small">${new Date(l.t).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · ${T ? T.name : l.T} – ${s ? s.name : l.s} · ${l.r === 2 ? "🟡 tipp után javította" : "🔴 magyarázat kellett"}</div><div class="lq">${esc(l.q)}</div><div class="la">Válasza: <b>${esc(l.a)}</b> · Helyes: <b>${esc(l.c)}</b>${l.w ? `<br>💡 ${esc(l.w)}` : ""}</div></div>`; }).join("")}</div>` : `<p class="soft">Még nincs hiba – vagy még nem gyakorolt. 🙂</p>`);

  // 4. Próbafelvételi (2. ütem)
  card("📈 Próbafelvételik", `<div class="placeholder">A 45 perces próbafelvételi mód az eredeti feladatsorokkal a következő ütemben érkezik.<br>Itt jelenik majd meg a pontszámok alakulása (50 pontos skálán).</div>`);

  // 5. Jutalmak
  const rc = card("🎁 Jutalmak");
  const rlist = el("div");
  (state.settings.rewards || []).forEach(r => {
    const p = E.rewardProgress(u, r);
    const row = el("div", "rw-item", `<span>${esc(r.text)} <span class="soft small">(${r.need} ${E.REWARD_KINDS[r.kind]} – most: ${p.have})</span></span>`);
    const right = el("span");
    if (p.claimed) right.append(el("span", "soft small", "✅ átadva"));
    else if (p.done) right.append(btn("secondary", "Átadtam ✓", () => { u.claimed = u.claimed || {}; u.claimed[r.id] = Date.now(); u.upd = Date.now(); persist(); cloud.queue(u.name); renderParent(); }));
    right.append(btn("ghost", "🗑️", () => { state.settings.rewards = state.settings.rewards.filter(x => x.id !== r.id); saveSettings(); }));
    right.lastChild.style.color = "var(--bad)";
    row.append(right); rlist.append(row);
  });
  if (!(state.settings.rewards || []).length) rlist.append(el("p", "soft small", "Még nincs jutalom. Adj hozzá egyet – a gyerek a kezdőképernyőn látja, mennyi hiányzik még."));
  rc.append(rlist);
  const f = el("div", "form-row", `<input id="rw-text" placeholder="pl. Mozi 🎬" maxlength="40"><select id="rw-kind">${Object.entries(E.REWARD_KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select><input id="rw-need" type="number" min="1" value="500">`);
  f.append(btn("primary", "Hozzáad", () => {
    const text = $("rw-text").value.trim(), need = +$("rw-need").value;
    if (!text || !(need > 0)) return toast("Add meg a jutalmat és a célt!");
    state.settings.rewards = [...(state.settings.rewards || []), { id: "r" + Date.now().toString(36), text, kind: $("rw-kind").value, need }];
    saveSettings();
  }));
  rc.append(f);

  // 6. Beállítások
  const sc = card("⚙️ Napi cél és beállítások");
  sc.insertAdjacentHTML("beforeend", `<div class="form-row">Napi küldetés: <input id="set-tasks" type="number" min="3" max="40" value="${state.settings.goalTasks}"> feladat vagy <input id="set-min" type="number" min="5" max="60" value="${state.settings.goalMin}"> perc</div>
    <div class="form-row"><label><input id="set-tts" type="checkbox" ${state.settings.tts ? "checked" : ""}> 🔊 Felolvasás alapból bekapcsolva</label></div>`);
  sc.append(btn("primary", "Mentés", () => {
    state.settings.goalTasks = Math.max(3, Math.min(40, +$("set-tasks").value || 10));
    state.settings.goalMin = Math.max(5, Math.min(60, +$("set-min").value || 15));
    state.settings.tts = $("set-tts").checked; ttsOn = state.settings.tts; updTtsBtn();
    saveSettings(); toast("✅ Elmentve.");
  }));
  sc.append(el("p", "legend", "Tipp: hétvégére emelheted a célt (pl. 20 perc), hétköznap elég a 15 perc."));

  // 7. Játékosok és PIN
  const pc = card("👧 Játékosok és PIN");
  Object.values(state.users).forEach(x => {
    const row = el("div", "rw-item", `<span>${x.avatar} ${esc(x.name)} <span class="soft small">⛽ ${x.pts} · ${x.total} feladat</span></span>`);
    row.append(btn("ghost", "🗑️ Törlés", async () => {
      const ok = await ask({ title: `${x.name} törlése`, text: "Biztosan törlöd? Az összes eredménye elvész, és nem állítható vissza.", ok: "Törlöm", cancel: "Mégse" });
      if (!ok) return;
      const ts = Date.now(); state.deleted[x.name] = ts; delete state.users[x.name]; cloud.markDeleted(x.name, ts);
      if (state.current === x.name) state.current = Object.keys(state.users)[0] || "";
      persist(); fillChildSelect(); renderParent(); renderTop();
      if (!state.current) newPlayer(true);
    }));
    row.lastChild.style.color = "var(--bad)";
    pc.append(row);
  });
  const prow = el("div", "form-row");
  prow.append(btn("secondary", "➕ Új játékos", () => newPlayer()), btn("secondary", "🔑 PIN módosítása", () => setNewPin()));
  pc.append(prow);

  // 8. Felhő
  const cc = card("☁️ Felhős mentés");
  renderCloudInto(cc);
}
function saveSettings() { state.settings.upd = Date.now(); persist(); cloud.pushSettings(); refreshAll(); }

// ---------- Felhő panel ----------
function renderCloudInto(c) {
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
    box.append(btn("ghost", "Kilépés", () => cloud.signOut()));
    box.lastChild.style.color = "var(--soft)";
  }
  if (cloud.note) box.append(el("p", "small", cloud.note));
  c.append(box);
}
function openCloud() {
  modal((box, close) => {
    box.append(el("h3", null, "☁️ Felhős mentés"));
    renderCloudInto(box);
    const row = el("div", "mbtns"); row.append(btn("primary", "Bezár", () => close())); box.append(row);
  });
}

// ---------- Felolvasás gomb ----------
function updTtsBtn() { const b = $("play-tts"); b.textContent = ttsOn ? "🔊" : "🔇"; b.setAttribute("aria-pressed", ttsOn); b.title = ttsOn ? "Felolvasás bekapcsolva" : "Felolvasás kikapcsolva"; }

// ---------- Események ----------
$("btn-mission").addEventListener("click", startMission);
$("tb-user").addEventListener("click", switchPlayer);
$("tb-parent").addEventListener("click", openParent);
$("tb-cloud").addEventListener("click", openCloud);
$("play-exit").addEventListener("click", goHome);
$("parent-exit").addEventListener("click", () => { parentOpen = false; goHome(); });
$("parent-child").addEventListener("change", renderParent);
$("play-tts").addEventListener("click", () => { ttsOn = !ttsOn; updTtsBtn(); if (ttsOn && S && S.task) speak(S.task.q); else if ("speechSynthesis" in window) speechSynthesis.cancel(); });
document.addEventListener("keydown", e => { if (e.key === "Enter" && S && S.phase !== "answer" && S.onNext && !$("modal").classList.contains("on") && document.activeElement.tagName !== "BUTTON") { e.preventDefault(); S.onNext(); } });

// Tesztelési segéd: a #debug címmel megnyitva a konzolból elérhető az aktuális kör
if (location.hash === "#debug") window.__urk = { S: () => S, state: () => state, show: (T, sub, lvl) => { S = S || { mode: "free", T, plan: [], idx: 0, res: [] }; S.T = T; show("scr-play"); const t = makeTask(typeById(T), sub, lvl, rng); S.task = t; S.twin = false; S.tries = 0; S.t0 = Date.now(); S.phase = "answer"; S.sel = []; S.set = []; S.clicked = null; renderTask(); } };

// ---------- Indulás ----------
updTtsBtn();
if (!state.users[state.current]) state.current = Object.keys(state.users)[0] || "";
renderTop(); renderHome();
if (!state.current) newPlayer(true);
cloud.init();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
