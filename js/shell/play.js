import { learningKey, noteLearning, IMPROVED_TITLE, IMPROVED_TEXT } from "../core/learning-feedback.js";
import { dayNum } from "../core/dates.js";
import { roomIcons } from "./room-ui.js";
import { isCompositionKey } from "../core/answer-ui.js";
import { createRecordGate, taskKey } from "../core/pack-contract.js";
// ===== Gyakorlókör: feladat → ellenőrzés → tipp → magyarázat → ikerfeladat → továbblépés =====
// A feladatot a csomag adja (pack.makeTask), a váz végzi a visszajelzést, a pontozást és a rögzítést.
import { $, el, btn, toast, escHtml as esc } from "../core/dom.js";
import { modal, isOpen as isModalOpen } from "../core/modal.js";
import { score, SCORING } from "../core/scoring.js";
import { recordAnswer, addBonus, retypeState } from "../core/answers.js";
import { checkBadges, COMMON_BADGES } from "../core/badges.js";
import { shState, shCap, shEnd } from "../core/stephelp.js";
import { missionProgress, completeMission, addCorrect, giftPending } from "../core/dailygoal.js";
import { C, G, cur, prefs, save, confetti, speak, sfx } from "./ctx.js";
import { maybeWeekly } from "./weekly-ui.js";
import { show, renderTop, renderHome, freeSize, openTopics } from "./home.js";
import { celebrateRank } from "./collection.js";
import { checkHolidays } from "./holidays.js";
import { trophyRain, openGifts } from "./goal-ui.js";
import { maybeAskDevice } from "./players.js";
import { openHelp, openTopicHelp } from "./help.js";

let S = null; // aktuális kör
// „Vissza a főmenüre / térképre / bázisra”: a -ra/-re az utolsó nem i/í magánhangzó szerint (az i, í semleges)
const backHome = () => { const w = G().homeWord, v = (w.match(/[aáeéoóöőuúüű]/gi) || ["e"]).pop(); return `Vissza a ${w}${/[aáoóuú]/i.test(v) ? "ra" : "re"}`; };
export const round = () => S;
function disposeAnswer() {
  if (!S) return;
  S.answerLife?.abort(); S.answerLife = null;
  S.ui?.dispose?.(); S.ui = null;
  clearTimeout(S.autoT);
  $("answer").replaceChildren();
  $("task-actions").replaceChildren();
}

// ---------- ▶ Félbehagyott kör folytatása ----------
// A kör állása a gyerek mentésébe kerül (u.resume) minden válasz után; aznap, ugyanazzal a tananyaggal folytatható.
const packTag = () => `${C.pack.id}@${C.pack.version}`;
function keepResume() {
  const u = cur(); if (!u || !S) return;
  u.resume = S.idx < S.plan.length ? {
    v: 1, day: dayNum(), pack: packTag(), mode: S.mode, topic: S.topic || null, title: $("play-title").textContent,
    idx: S.idx, res: S.res.slice(),
    plan: S.plan.map(({ topic, sub, level, seed, twin }) => ({ topic, sub: sub ?? null, level: level ?? null, seed: seed ?? null, twin: !!twin })),
  } : null;
}
// A kezdőlap ajánlatához: { done, total, title } vagy null
export function resumeInfo(u = cur()) {
  const r = u && u.resume;
  if (!r || r.v !== 1 || r.day !== dayNum() || r.pack !== packTag() || !Array.isArray(r.plan) || !(r.idx < r.plan.length)) return null;
  if (!r.plan.every(it => it && C.pack.topics.some(t => t.id === it.topic))) return null;
  return { done: r.idx, total: r.plan.length, title: r.title || "" };
}
export function resumeRound() {
  const u = cur(), r = u && u.resume;
  if (!resumeInfo(u)) { if (u) { u.resume = null; save(); } return toast("Ez a kör már nem folytatható – indíts egy újat!"); }
  disposeAnswer();
  const plan = r.plan.map(it => { const o = { topic: it.topic, sub: it.sub ?? null, twin: !!it.twin }; if (it.level != null) o.level = it.level; if (it.seed != null) o.seed = it.seed; return o; });
  S = { mode: r.mode, topic: r.topic || undefined, plan, idx: r.idx, res: (r.res || []).slice(), combo: 0 };
  show("scr-play"); $("play-title").textContent = r.title || "";
  nextTask();
}
function beginRound(state, title) {
  disposeAnswer();
  S = state;
  show("scr-play"); $("play-title").textContent = title;
  keepResume(); save();
  nextTask();
}

export function startMission() {
  const u = cur(), P = prefs(u), mp = missionProgress(u, P);
  // a küldetés aznap összesen goalTasks feladat (a már megoldottak beszámítanak); utána a plusz kör is ennyi feladat
  const n = mp.done ? P.goalTasks : Math.max(1, P.goalTasks - mp.n);
  const plan = C.pack.plan(u, n, C.rng, openTopics(u));
  if (!plan.length) return toast("Most nincs nyitott téma ehhez a küldetéshez.");
  beginRound({ mode: "mission", plan, idx: 0, res: [], combo: 0 }, mp.done ? G().texts.plus : G().texts.mission);
}
// Szabad gyakorlás: egy témából rögzített hosszú kör (a szülő állítja: 3, 5 vagy 10 feladat)
export function startFree(topicId) {
  const n = freeSize(), t = C.pack.topics.find(x => x.id === topicId);
  if (!t || !openTopics(cur()).includes(topicId)) return toast("Ez a téma most szünetel. Válassz egy másikat!");
  beginRound({ mode: "free", topic: topicId, plan: Array.from({ length: n }, () => ({ topic: topicId, sub: null })), idx: 0, res: [], combo: 0 }, `${t.icon} ${t.place || t.name} – ${n} feladat`);
}
// 🩹 Ismétlő kör: a csomag hibás / ismétlésre váró feladataiból (PACK.review). A kör hossza a szabad
// gyakorláséval azonos (a szülő állítja), de legfeljebb annyi, ahány ismétlendő feladat van.
export function startReview() {
  const u = cur(), R = C.pack.review; if (!R) return;
  const allowed = openTopics(u);
  const n = Math.min(R.count(u, allowed), freeSize());
  if (!n) return toast("Nincs mit ismételni – ügyes vagy! 🎉");
  const plan = R.plan(u, n, C.rng, allowed);
  if (!plan.length) return toast("🔒 Az ismétlendő feladatok most le vannak zárva.");
  beginRound({ mode: "review", plan, idx: 0, res: [], combo: 0 }, `🩹 Javító küldetés – ${plan.length} feladat`);
}
function reviewEnd(ok, all) {
  const R = C.pack.review, left = R ? R.count(cur(), openTopics(cur())) : 0, flawless = ok === all;
  if (flawless) confetti();
  modal((box, close) => {
    box.classList.add("celebrate");
    const done = !left;
    box.append(el("div", "big-emoji", done && flawless ? "🏆" : done ? "🩹" : flawless ? "🌟" : "💪"),
      el("h3", null, done && flawless ? "Ügyes vagy, az összes hibát kijavítottad!" : done ? "Elfogytak az ismétlendő feladatok!" : "Ismétlő kör vége!"),
      el("p", null, `<b>${ok}</b> feladat sikerült elsőre a ${all}-ból.` + (left ? `<br>Még ${left} ${esc(R.unit || "hibás feladat")} vár ismétlésre.` : done && !flawless ? "<br>Ami most nem sikerült, az pár nap múlva újra előjön." : "")),
      el("div", "dots", S.res.map(r => `<i class="${r === 1 ? "ok" : r === 2 ? "mid" : "bad"}"></i>`).join("")));
    box.lastChild.style.justifyContent = "center"; box.lastChild.style.margin = "8px 0";
    const row = el("div", "mbtns"); row.style.justifyContent = "center";
    row.append(btn(left ? "secondary" : "primary", backHome(), () => { close(); goHome(); }));
    if (left) row.append(btn("primary", "🩹 Még egy ismétlő kör", () => { close(); startReview(); }));
    box.append(row);
  }, { esc: close => { close(); goHome(); } });
}
function nextTask() {
  disposeAnswer();
  if (S.idx >= S.plan.length) return endRound();
  const item = S.plan[S.idx];
  let task;
  try {
    if (!openTopics(cur()).includes(item.topic)) throw new Error("LOCKED_PLAN_TOPIC");
    task = C.pack.makeTask(item, C.rng, cur());
    // biztosíték: ha az ikerfeladat mégis ugyanaz lenne, mint az elrontott, a témából kérünk egy másikat
    if (item.twin && item.origin) {
      for (let k = 0; k < 5 && taskKey(task) === item.origin; k++) task = C.pack.makeTask({ topic: item.topic, sub: null, level: item.level }, C.rng, cur());
      if (taskKey(task) === item.origin) console.warn(`[PACK ${C.pack.id}] az ikerfeladat ugyanaz, mint az eredeti (${item.topic})`);
    }
    // a csomag deklarált tartalékága (pl. betűkirakó) a lezárás ellenére is megjelenhet – ez a régi működés
    const fb = (C.pack.topicFallbacks || {})[item.topic] || [];
    if (!openTopics(cur()).includes(task.topic) && !fb.includes(task.topic)) throw new Error("LOCKED_TASK_TOPIC");
  }
  catch (error) { console.error(error); toast("A feladat nem tölthető be. Az eredményeid megmaradtak."); goHome(); return; }
  item.sub = task.sub;   // a terv is megjegyzi (ikerfeladathoz)
  Object.assign(S, { task, item, player: cur(), twin: !!item.twin, tries: 0, helps: 0, learningAid: false, learningId: learningKey(C.pack, task), helpShown: 0, helpCap: 0, t0: Date.now(), phase: "answer", firstWrong: null, onNext: null, ui: null, claimRecord: createRecordGate() });
  try { renderTask(); }
  catch (error) { console.error(error); toast("A feladat felülete hibás; nem számoltam el eredményt."); goHome(); }
}
function renderDots() {
  const d = $("play-dots"); d.innerHTML = "";
  // a kör összes feladata már az elején látszik üres karikaként (az ikerfeladatok menet közben kerülnek be)
  const n = Math.max(S.plan.length, S.res.length), res = S.res;
  for (let i = 0; i < n; i++) { const r = res[i]; d.append(el("i", r === 1 ? "ok" : r === 2 ? "mid" : r === 0 ? "bad" : i === res.length ? "cur" : "")); }
}
function renderTask() {
  const t = S.task, T = G().texts;
  renderDots();
  $("task-meta").textContent = t.meta + (S.twin ? " · 🔁 ikerfeladat" : "");
  $("task-q").innerHTML = t.q;
  $("task-viz").innerHTML = t.viz || "";
  // a jobb oldali mezőben a Saját sarok figurái váltakoznak (ha van kitett tárgy), különben a játék kabalája
  const figs = roomIcons(cur()), fig = figs.length ? figs[(S.figN = (S.figN ?? -1) + 1) % figs.length] : T.sideIcon;
  $("side-body").innerHTML = `<div class="side-empty"><div class="big-emoji">${S.twin ? "🔁" : fig}</div><p>${S.twin ? "Most egy hasonló feladat jön – próbáld ki, amit az előbb láttál!" : "Olvasd el figyelmesen a feladatot!<br>Ha elakadsz, a hiba után itt kapsz segítséget."}</p></div>`;
  // io: a feladat ezen keresztül kér ellenőrzést, jelzi a segítséget (pontlevonás), és üzen
  const scope = S.answerLife = new AbortController(), active = () => S?.answerLife === scope && !scope.signal.aborted;
  const answering = () => active() && S.phase === "answer" && !isModalOpen();
  // Enter / io.submit: válasz közben ellenőrzés, utána Tovább (mint korábban) – de csak a saját, még aktív feladaton
  const submit = () => {
    if (!active() || isModalOpen()) return;
    if (S.phase === "answer") check();
    else if (S.onNext && Date.now() >= (S.lockUntil || 0)) S.onNext();
  };
  const canFocus = () => answering() && document.activeElement === focusAtRender;
  const focusAtRender = document.activeElement;
  S.ui = t.render($("answer"), {
    submit, answering, canFocus, signal: scope.signal,
    focus: node => {
      const id = setTimeout(() => { if (canFocus() && node.isConnected) node.focus(); }, 30);
      scope.signal.addEventListener("abort", () => clearTimeout(id), { once: true });
    },
    toast: (...args) => { if (active()) toast(...args); },
    useHelp: () => { if (answering()) S.helps = (S.helps || 0) + 1; },
    useLearningAid: () => { if (answering()) S.learningAid = true; },
  });
  setActions(S.ui.auto ? [] : [btn("primary big", "Ellenőrzés ✔", submit)]);
  if (stepHelpOn()) S.helpCap = shCap(helpList(t).length + 1, shState(cur(), t.topic));
  helpBadge();
  if (C.tts) speak(t.speech || t.q, t.speechLang);
}
function setActions(bs) { const a = $("task-actions"); a.innerHTML = ""; bs.forEach(b => a.append(b)); }

// --- Ellenőrzés és visszajelzés ---
function check() {
  if (!S?.ui || S.phase !== "answer" || isModalOpen()) return;
  const t = S.task;
  let v;
  try { v = S.ui.read(); }
  catch (error) { console.error(error); toast("A feladat felülete hibás; nem számoltam el eredményt."); goHome(); return; }
  if (v == null || (Array.isArray(v) && !v.length)) return toast(S.ui.empty || "Adj meg egy választ!");
  let r;
  try { r = t.check(v); }
  catch (error) { console.error(error); toast("Hibás feladatellenőrző; nem számoltam el eredményt."); return; }
  if (r.ok) return correct();
  S.tries++;
  if (S.tries === 1) S.firstWrong = v;
  S.ui.markWrong();
  sfx("wrong");
  // ha a beírás be van kapcsolva, már az első hibánál jön a magyarázat és a beírás (nincs tipp-újrapróba:
  // a helyes alak megmutatása után az újrapróbának nem lenne értelme)
  if (S.tries === 1 && retypeMode(t) === "off") {
    $("side-body").innerHTML = `<div class="fb hint"><div class="fb-title">Nem egészen… 🤔</div>Próbáld újra! Itt egy tipp:</div><div class="step" style="padding-left:14px">💡 ${t.hint}</div>${r.feedback || ""}`;
    if (C.tts) speak("Nem egészen. " + t.hint);
    return;
  }
  explain(v);
}
// Válasz rögzítése: pont (egységes tábla), napi összesítő, csomag-haladás, jelvények, napi cél
function record(r, v) {
  S.claimRecord();
  const t = S.task, u = cur(), P = prefs(u);
  S.combo = r === 1 ? (S.combo || 0) + 1 : 0;
  const sc = score({ r, level: t.level, combo: S.combo, twin: S.twin, helps: S.helps || 0 }, G().scoring);
  const plain = x => String(x || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  recordAnswer(u, { topic: t.topic, r, ms: Date.now() - S.t0, pts: sc.pts, twin: S.twin,
    log: { s: t.sub, lvl: t.level, q: t.plainQ || plain(t.q).slice(0, 220), a: v == null ? "" : t.answerText(v), c: t.correctText, w: v != null ? plain(t.why(v) || "") : "" } });
  if (stepHelpOn()) {
    const sh = shEnd(shState(u, t.topic), S.helpShown || 0, S.helpCap || 1);
    if (sh === "reduced") toast("💡 Ennél a témánál a súgó mostantól eggyel kevesebb lépést mutat. Ha 3 feladatot megoldasz nélküle, visszajön egy lépés.", 5500);
    else if (sh === "back") toast("💡 Ügyes! Visszajött egy súgólépés.", 3500);
    else if (sh === "all") toast("💡 Szuper! A súgó újra minden lépést mutat.", 3500);
  }
  const ev = { pts: sc.pts, combo: S.combo, pack: C.pack.record(u, t, r), badges: checkBadges(u, [...COMMON_BADGES, ...(C.pack.badges || [])]), bigHit: false };
  ev.improved = noteLearning(u, S.learningId, r, S.helps > 0 || S.learningAid);
  if (r >= 1) ev.bigHit = addCorrect(u, P.bigGoal);   // helyes válasz (elsőre vagy tipp után) a nagy cél felé
  return ev;
}
const PRAISE = () => G().praise || ["Szuper!"];
function correct() {
  const t = S.task, rr = S.tries === 0 ? 1 : 2;
  S.phase = "done"; helpBadge();
  S.ui.markRight();
  const ev = record(rr, rr === 2 ? S.firstWrong : null);
  S.res.push(rr); S.idx++; keepResume();
  save(); renderTop(); renderDots();
  // 🌱 fejlődésjelzés: a dicséret helyén (pont, jelvény nem jár érte)
  const praise = ev.improved ? IMPROVED_TITLE : rr === 1 ? PRAISE()[C.rng.int(0, PRAISE().length - 1)] : "Javítottad! ✔️";
  $("side-body").innerHTML = `<div class="fb ok${ev.improved ? " improved" : ""}"><div class="fb-title">${praise}</div>${ev.improved ? IMPROVED_TEXT : rr === 1 ? "Elsőre sikerült!" : `A helyes válasz: <b>${esc(t.correctText)}</b>. A tipp után megtaláltad – ügyes!`} <b>+${ev.pts} ${G().pointsIcon}</b>${ev.combo >= 3 && rr === 1 ? `<br>🔥 ${ev.combo}. elsőre jó egymás után!` : ""}${S.twin ? "<br>🧠 Hibából tanultál – ez a legjobb!" : ""}</div>`;
  if (rr === 2) $("side-body").append(btn("secondary", "👀 Megnézem a megoldást", () => { $("side-body").append(stepsAll(t)); }));
  sfx(ev.improved ? "improved" : "ok");
  if (C.tts) speak(ev.improved ? `Fejlődtél! ${IMPROVED_TEXT}` : praise);
  afterEvents(ev);
  nextButton(rr === 1 && !ev.improved);
}
function explain(v) {
  const t = S.task;
  S.phase = "explain"; helpBadge();
  S.ui.lock();
  const ev = record(0, v);
  S.res.push(0); S.idx++; keepResume();
  save(); renderTop(); renderDots();
  const why = t.why(v);
  const sb = $("side-body");
  sb.innerHTML = `<div class="fb bad"><div class="fb-title">${G().texts.explainTitle}</div>Semmi baj – ebből tanulunk. Lépésről lépésre megmutatom.</div>`;
  sb.append(el("div", "yours", `A te válaszod: <b>${esc(t.answerText(v))}</b>` + (why ? `<br>💡 Lehet, hogy itt csúszott el: ${why}` : "")));
  const box = el("div", "steps"); sb.append(box);
  let k = 0;
  const step = () => {
    box.append(el("div", "step", t.steps[k])); if (C.tts) speak(t.steps[k]); k++;
    S.lockUntil = Date.now() + 400;
    if (k < t.steps.length) { setActions([btn("primary big", "Tovább ▶", step)]); S.onNext = step; }
    else {
      S.ui.showCorrect();
      // Ikerfeladat: az első hiba után EGY hasonló feladat kötelező. Ha már az ikerfeladat sem sikerült,
      // a gyerek választhat: továbbléphet, vagy még gyakorol egy hasonlóval (nem ragad bele végtelen körbe).
      const twin = () => {
        let it; try { it = C.pack.twin(t, S.item, C.rng, cur()); } catch (error) { console.error(error); it = { topic: S.item.topic, sub: null, level: t.level, twin: true }; }
        S.plan.splice(S.idx, 0, { ...it, origin: taskKey(t) }); nextTask();
      };
      const next = () => nextTask();
      let acts;
      if (!S.twin) acts = [{ label: "🔁 Próbáld ki egy hasonlóval!", fn: twin, primary: true }];
      else {
        const last = S.idx >= S.plan.length;
        acts = [{ label: last ? "Kész! 🏁" : "Következő feladat ▶", fn: next, primary: true }, { label: "🔁 Még egy hasonló", fn: twin }];
        box.append(el("div", "fb hint", "Ez most nehéz volt – semmi baj! Választhatsz: továbbmehetsz, vagy gyakorolhatsz még egy hasonlóval. Ez a feladattípus pár nap múlva úgyis visszajön."));
      }
      const showActs = () => { setActions(acts.map(a => btn((a.primary ? "primary" : "secondary") + " big", a.label, a.fn))); S.onNext = acts[0].fn; };
      const mode = retypeMode(t);
      // a beíró ablak MOST, ebben a koppintás-kezelőben nyílik (iPaden csak így ugrik fel a billentyűzet)
      if (mode === "off") showActs(); else openRetype(t, acts, mode, showActs);
    }
    box.lastElementChild.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  step();
  afterEvents(ev);
}
function stepsAll(t) { const box = el("div", "steps"); t.steps.forEach(s => box.append(el("div", "step", s))); return box; }
// auto = elsőre jó válasz: 1,5 mp múlva magától továbblép (a gombon egy sáv mutatja az időt)
const AUTO_NEXT_MS = 1500;
function nextButton(auto = false) {
  const last = S.idx >= S.plan.length, t = S.task;
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
  const u = cur(), R = G().ranks;
  if (ev.pack) {
    // gyűjtött esemény (pl. új szókártya): nem minden válasznál, hanem a kör végén egyben
    if (ev.pack.gather) { const g = ev.pack.gather; S.gather = S.gather || {}; S.gather[g.key] = (S.gather[g.key] || 0) + (g.n || 1); }
    if (ev.pack.text) { if (ev.pack.confetti) confetti(); toast(ev.pack.text, 4000); }
  }
  ev.badges.forEach(b => toast(`${b.ic} Új jelvény: ${b.n}`, 3500));
  const rb = R.rankIndex(u.pts - ev.pts), ra = R.rankIndex(u.pts);
  if (ra > rb) setTimeout(() => celebrateRank(ra), 1200);
  if (ev.bigHit) { trophyRain(); save(); }
  // napi küldetés teljesítése (feladatszám vagy idő alapján)
  const mp = missionProgress(u, prefs(u));
  if (!mp.done && mp.pct >= 1) {
    const me = completeMission(u);
    if (me) me.badges = checkBadges(u, [...COMMON_BADGES, ...(C.pack.badges || [])]);
    save(); renderTop();
    if (me) setTimeout(() => { sfx("mission"); celebrate(me); }, 700);
    setTimeout(checkHolidays, 1600);
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
    row.append(btn("secondary", "Még gyakorlok", () => close()), btn("primary", backHome(), () => { close(); goHome(); }));
    box.append(row);
  });
}
// A körben gyűjtött csomagesemények összesítő szövege (PACK.gatherText[kulcs](db)); egyszer adja vissza
function takeGather() {
  const g = S && S.gather; if (!g) return "";
  S.gather = null;
  const T = C.pack.gatherText || {};
  return Object.entries(g).map(([k, n]) => (T[k] ? T[k](n) : "")).filter(Boolean).join(" ");
}
function endRound() {
  const u0 = cur(); if (u0 && u0.resume) { u0.resume = null; save(); }
  C.cloud.checkpoint("home");   // kör vége: a „főmenübe lépéskor” módban is felmegy
  const gt = takeGather();
  if (gt) { confetti(); setTimeout(() => toast(gt, 5000), 600); }
  const ok = S.res.filter(r => r === 1).length, all = S.res.length, mode = S.mode, t = C.pack.topics.find(x => x.id === S.topic);
  if (mode === "review") return reviewEnd(ok, all);
  if (mode !== "free") { toast(`Kör vége: ${ok}/${all} elsőre jó. ${G().logo}`); return goHome(); }
  if (ok === all) confetti();
  modal((box, close) => {
    box.classList.add("celebrate");
    box.append(el("div", "big-emoji", ok === all ? "🌟" : ok >= all / 2 ? G().logo : "💪"), el("h3", null, `${esc(t.place || t.name)}: kör vége!`),
      el("p", null, `<b>${ok}</b> feladat sikerült elsőre a ${all}-ból.<br>${ok === all ? "Hibátlan kör – szuper!" : ok >= all / 2 ? "Szép munka! Gyakorlással még jobb lesz." : "Ez nehéz volt – a hibás típusok pár nap múlva visszajönnek gyakorolni."}`),
      el("div", "dots", S.res.map(r => `<i class="${r === 1 ? "ok" : r === 2 ? "mid" : "bad"}"></i>`).join("")));
    box.lastChild.style.justifyContent = "center"; box.lastChild.style.margin = "8px 0";
    const row = el("div", "mbtns"); row.style.justifyContent = "center";
    row.append(btn("secondary", backHome(), () => { close(); goHome(); }), btn("primary", "🔁 Még egy kör", () => { close(); startFree(t.id); }));
    box.append(row);
  }, { esc: close => { close(); goHome(); } });
}
export function goHome() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (S) {
    if (S.phase === "answer" && S.learningId && (S.tries > 0 || S.helps > 0 || S.learningAid) && S.player === cur()) {
      noteLearning(cur(), S.learningId, 0, true); save();
    }
    disposeAnswer(); const gt = takeGather(); if (gt) toast(gt, 5000);
  }   // félbehagyott kör: az addig gyűjtött is látsszon
  S = null; helpBadge(); show("scr-home"); renderTop(); renderHome();
  C.cloud.checkpoint("home"); maybeAskDevice(); checkHolidays();
  setTimeout(() => maybeWeekly(), 1400);   // ha közben új hét kezdődött
  const u = cur();
  if (u && giftPending(u) && prefs(u).gifts !== false) setTimeout(() => openGifts(), 900);
}

// ---------- Gyorsbillentyűk ----------
// Kezdőlap: Tab / Shift+Tab a küldetés gomb, a nyitható adventi ablak, a rangsáv és a témák között; F1 súgó
export const homeKeys = {
  id: "home",
  items: () => [...document.querySelectorAll("#btn-mission, #home-offers button, #hero-corner button, #hero-ped button"), ...document.querySelectorAll("#advent .aw-today, #advent .aw-makeup"), $("rankbox"), ...document.querySelectorAll("#map button.tcard")],
  onF1: () => openHelp(),
};
// Gyakorlás: Enter = Tovább (ha már válaszolt, és nem egy gombon áll); Esc = főmenü; F1 = a téma súgója
export const playKeys = {
  id: "play",
  onEnter: (a, e) => {
    if (isCompositionKey(e) || !S || (a && a.tagName === "BUTTON")) return false;
    if (S.phase !== "answer" && S.onNext && Date.now() >= (S.lockUntil || 0)) { S.onNext(); return true; }
    // válasz közben: ellenőrzés (a beviteli mezők és a saját Enter-kezelők ezt előbb elkapják)
    if (S.phase === "answer" && !(S.ui && S.ui.auto) && !(a && /^(INPUT|TEXTAREA)$/.test(a.tagName))) { check(); return true; }
    return false;
  },
  onEsc: () => goHome(),
  onF1: () => openHelp(),
  // minden más billentyű a feladat felületéé (pl. betűgépelés a betűkirakón, 1–4 a választós gomboknál)
  onKey: e => !!(!e.defaultPrevented && !isCompositionKey(e) && S && S.phase === "answer" && S.ui && S.ui.onKey && !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || "") && S.ui.onKey(e)),
};
// ---------- ✍️ A helyes alak beírása (hibás válasz és magyarázat után) ----------
// mode: "must" (kötelező) | "skip" (kihagyható). Középen nyílik; a továbblépő gomb(ok) csak a helyes beírás után aktívak.
// Egyezés: betűre pontosan (ékezet, hosszú mássalhangzó), de a kis/nagybetű, a szélső szóköz és az Unicode-alak mindegy.
// a beírás módja ennél a feladatnál: "must" | "skip" | "off" (csak ha a feladat megadja a helyes alakot)
function retypeMode(t) { return t && t.retype ? (prefs(cur()).retype || "must") : "off"; }
function openRetype(t, acts, mode, showActs) {
  let done = false;
  modal((box, close) => {
    box.classList.add("retype-box");
    box.append(el("div", "rt-label", "✍️ Írd le a helyes alakot:"), el("div", "rt-word", esc(t.retype)));
    const inp = el("input", "rt-in");
    Object.assign(inp, { type: "text", autocomplete: "off", spellcheck: false, placeholder: "Írd le ide…" });
    inp.setAttribute("autocapitalize", "off"); inp.setAttribute("autocorrect", "off"); inp.setAttribute("enterkeyhint", "done");
    inp.setAttribute("aria-label", "Írd le a helyes alakot: " + t.retype);
    const row = el("div", "mbtns rt-btns");
    const bs = acts.map(a => { const b = btn((a.primary ? "primary" : "secondary") + " big", a.label, () => { if (!done) return; close(); a.fn(); }); b.disabled = true; return b; });
    if (mode === "skip") row.append(btn("ghost rt-skip", "Kihagyom", () => { close(); showActs(); }));
    row.append(...bs);
    box.append(inp, row);
    const update = () => {
      const st = retypeState(inp.value, t.retype);
      inp.classList.toggle("ok", st === "ok"); inp.classList.toggle("bad", st === "bad");
      if (st === "ok" && !done) {
        done = true; bs.forEach(b => { b.disabled = false; });
        const u = cur(), pts = (G().scoring || SCORING).retype ?? SCORING.retype, R = G().ranks, rb = R.rankIndex(u.pts);
        addBonus(u, pts); save(); renderTop();
        toast(`✍️ Ügyes! +${pts} ${G().pointsIcon}`);
        if (R.rankIndex(u.pts) > rb) setTimeout(() => celebrateRank(R.rankIndex(u.pts)), 1200);
      }
    };
    inp.addEventListener("input", update);
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); if (done) bs[0].click(); } });
    inp.focus(); // azonnal, a gyerek koppintásának kezelőjében – így nyílik meg iPaden a billentyűzet
  }, { esc: close => { close(); goHome(); } });   // Esc: ki a körből a főmenübe (a beírás nem kerülhető meg)
  // a háttérben is a helyes továbblépés álljon készen (ha az ablak valamiért bezárulna)
  setActions([]); S.onNext = null;
}

// ---------- 💡 Lépésenkénti súgó (ha a csomag kéri: PACK.stepHelp) ----------
// Feladat közben a ❓ / F1 a megoldás levezetésének következő lépését mutatja – a végeredményt (utolsó lépés) soha.
// Minden lépés egy segítség (pontlevonás). A csökkenés / visszatérés szabályai: js/core/stephelp.js.
// A súgóban mutatható lépések: a csomag megadhatja (task.helpSteps, pl. kitakart végeredménnyel, vagy a megoldást
// felsoroló lépések nélkül); különben a levezetés az utolsó lépés (a végeredmény) nélkül. Üres lista: a tippet mutatjuk.
const helpList = t => Array.isArray(t.helpSteps) ? t.helpSteps : (t.steps || []).slice(0, -1);
const stepHelpOn = () => !!(C.pack && C.pack.stepHelp && S && S.task && prefs(cur()).stepHelp !== false);
function helpBadge() {
  const b = $("tb-help"); if (!b) return;
  const on = stepHelpOn() && S.phase === "answer", left = on ? Math.max(0, S.helpCap - S.helpShown) : 0;
  b.innerHTML = on ? `❓<sup class="hb${left ? "" : " out"}">${left}</sup>` : "❓";
  b.title = on ? `Súgó (F1) – még ${left} lépés` : "Súgó (F1)";
}
// true: lekezelte (feladat közben, bekapcsolt súgónál); false: a megszokott témaleírás jöjjön
export function markLearningAid() { if (S?.phase === "answer") S.learningAid = true; }
export function stepHelpPress() {
  if (!stepHelpOn() || S.phase !== "answer") return false;
  if (S.helpShown < S.helpCap) { S.helpShown++; S.helps = (S.helps || 0) + 1; }
  renderStepHelp(); helpBadge();
  return true;
}
function renderStepHelp() {
  const t = S.task, steps = helpList(t), single = !steps.length, sb = $("side-body");
  const cost = ((G().scoring || SCORING).help ?? SCORING.help);
  sb.innerHTML = "";
  sb.append(el("div", "fb hint", `<div class="fb-title">💡 Súgó · ${S.helpShown}/${S.helpCap} ${single ? "tipp" : "lépés"}</div>Minden lépés −${cost} pont. A végeredményt neked kell kiszámolnod!`));
  const box = el("div", "steps");
  if (single) box.append(el("div", "step", t.hint || ""));
  else steps.slice(0, S.helpShown).forEach(s => box.append(el("div", "step", s)));
  sb.append(box);
  if (S.helpShown >= S.helpCap) {
    sb.append(el("div", "fb hint sh-out", "Többet most nem mutathatok – a többit próbáld meg kiszámolni! 💪"));
    sb.append(btn("secondary", "ℹ️ Mi ez a téma?", () => openTopicHelp(t.topic)));
  } else sb.append(el("p", "soft small", "Nyomd meg újra a ❓ gombot (vagy az F1-et) a következő lépésért."));
  if (C.tts) speak(single ? t.hint : steps[S.helpShown - 1]);
  if (box.lastElementChild) box.lastElementChild.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Teszteléshez (#debug): egy adott feladat megnyitása
export function debugShow(item) { S = S || { mode: "free", topic: item.topic, plan: [], idx: 0, res: [], combo: 0 }; S.topic = item.topic; S.plan.splice(S.idx, 0, item); show("scr-play"); nextTask(); }
