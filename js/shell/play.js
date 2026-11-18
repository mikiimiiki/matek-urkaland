// ===== Gyakorlókör: feladat → ellenőrzés → tipp → magyarázat → ikerfeladat → továbblépés =====
// A feladatot a csomag adja (pack.makeTask), a váz végzi a visszajelzést, a pontozást és a rögzítést.
import { $, el, btn, toast, escHtml as esc } from "../core/dom.js";
import { modal, isOpen as isModalOpen } from "../core/modal.js";
import { score, SCORING } from "../core/scoring.js";
import { recordAnswer, addBonus, retypeState } from "../core/answers.js";
import { checkBadges, COMMON_BADGES } from "../core/badges.js";
import { missionProgress, completeMission, addCorrect, giftPending } from "../core/dailygoal.js";
import { C, G, cur, prefs, save, confetti, speak } from "./ctx.js";
import { show, renderTop, renderHome, freeSize, openTopics } from "./home.js";
import { celebrateRank } from "./collection.js";
import { checkHolidays } from "./holidays.js";
import { trophyRain, openGifts } from "./goal-ui.js";
import { maybeAskDevice } from "./players.js";
import { openHelp } from "./help.js";

let S = null; // aktuális kör
export const round = () => S;

export function startMission() {
  const u = cur(), P = prefs(u), mp = missionProgress(u, P);
  const n = mp.done ? 5 : Math.max(1, P.goalTasks - mp.n);
  S = { mode: "mission", plan: C.pack.plan(u, n, C.rng, openTopics(u)), idx: 0, res: [], combo: 0 };
  show("scr-play"); $("play-title").textContent = mp.done ? G().texts.plus : G().texts.mission;
  nextTask();
}
// Szabad gyakorlás: egy témából rögzített hosszú kör (a szülő állítja: 3, 5 vagy 10 feladat)
export function startFree(topicId) {
  const n = freeSize(), t = C.pack.topics.find(x => x.id === topicId);
  S = { mode: "free", topic: topicId, plan: Array.from({ length: n }, () => ({ topic: topicId, sub: null })), idx: 0, res: [], combo: 0 };
  show("scr-play"); $("play-title").textContent = `${t.icon} ${t.place || t.name} – ${n} feladat`;
  nextTask();
}
function nextTask() {
  if (S.idx >= S.plan.length) return endRound();
  const item = S.plan[S.idx];
  const task = C.pack.makeTask(item, C.rng, cur());
  item.sub = task.sub;   // a terv is megjegyzi (ikerfeladathoz)
  clearTimeout(S.autoT);
  Object.assign(S, { task, twin: !!item.twin, tries: 0, helps: 0, t0: Date.now(), phase: "answer", firstWrong: null, onNext: null, ui: null });
  renderTask();
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
  $("side-body").innerHTML = `<div class="side-empty"><div class="big-emoji">${S.twin ? "🔁" : T.sideIcon}</div><p>${S.twin ? "Most egy hasonló feladat jön – próbáld ki, amit az előbb láttál!" : "Olvasd el figyelmesen a feladatot!<br>Ha elakadsz, a hiba után itt kapsz segítséget."}</p></div>`;
  // io: a feladat ezen keresztül kér ellenőrzést, jelzi a segítséget (pontlevonás), és üzen
  $("answer").innerHTML = "";   // az előző feladat felülete ne maradjon ott
  S.ui = t.render($("answer"), { submit: () => onEnter(), answering: () => !!S && S.phase === "answer", toast, useHelp: () => { S.helps = (S.helps || 0) + 1; } });
  setActions(S.ui.auto ? [] : [btn("primary big", "Ellenőrzés ✔", check)]);
  if (C.tts) speak(t.speech || t.q);
}
function setActions(bs) { const a = $("task-actions"); a.innerHTML = ""; bs.forEach(b => a.append(b)); }
// Enter: válasz közben ellenőrzés, utána Tovább
function onEnter() { if (!S) return; if (S.phase === "answer") check(); else if (S.onNext && Date.now() >= (S.lockUntil || 0)) S.onNext(); }

// --- Ellenőrzés és visszajelzés ---
function check() {
  if (S.phase !== "answer") return;
  const t = S.task, v = S.ui.read();
  if (v == null || (Array.isArray(v) && !v.length)) return toast(S.ui.empty || "Adj meg egy választ!");
  const r = t.check(v);
  if (r.ok) return correct();
  S.tries++;
  if (S.tries === 1) S.firstWrong = v;
  S.ui.markWrong();
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
  const t = S.task, u = cur(), P = prefs(u);
  S.combo = r === 1 ? (S.combo || 0) + 1 : 0;
  const sc = score({ r, level: t.level, combo: S.combo, twin: S.twin, helps: S.helps || 0 }, G().scoring);
  const plain = x => String(x || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  recordAnswer(u, { topic: t.topic, r, ms: Date.now() - S.t0, pts: sc.pts, twin: S.twin,
    log: { s: t.sub, lvl: t.level, q: t.plainQ || plain(t.q).slice(0, 220), a: v == null ? "" : t.answerText(v), c: t.correctText, w: v != null ? plain(t.why(v) || "") : "" } });
  const ev = { pts: sc.pts, combo: S.combo, pack: C.pack.record(u, t, r), badges: checkBadges(u, [...COMMON_BADGES, ...(C.pack.badges || [])]), bigHit: false };
  if (r >= 1) ev.bigHit = addCorrect(u, P.bigGoal);   // helyes válasz (elsőre vagy tipp után) a nagy cél felé
  return ev;
}
const PRAISE = () => G().praise || ["Szuper!"];
function correct() {
  const t = S.task, rr = S.tries === 0 ? 1 : 2;
  S.phase = "done";
  S.ui.markRight();
  const ev = record(rr, rr === 2 ? S.firstWrong : null);
  S.res.push(rr); S.idx++;
  save(); renderTop(); renderDots();
  const praise = rr === 1 ? PRAISE()[C.rng.int(0, PRAISE().length - 1)] : "Javítottad! ✔️";
  $("side-body").innerHTML = `<div class="fb ok"><div class="fb-title">${praise}</div>${rr === 1 ? "Elsőre sikerült!" : `A helyes válasz: <b>${esc(t.correctText)}</b>. A tipp után megtaláltad – ügyes!`} <b>+${ev.pts} ${G().pointsIcon}</b>${ev.combo >= 3 && rr === 1 ? `<br>🔥 ${ev.combo}. elsőre jó egymás után!` : ""}${S.twin ? "<br>🧠 Hibából tanultál – ez a legjobb!" : ""}</div>`;
  if (rr === 2) $("side-body").append(btn("secondary", "👀 Megnézem a megoldást", () => { $("side-body").append(stepsAll(t)); }));
  if (C.tts) speak(praise);
  afterEvents(ev);
  nextButton(rr === 1);
}
function explain(v) {
  const t = S.task;
  S.phase = "explain";
  S.ui.lock();
  const ev = record(0, v);
  S.res.push(0); S.idx++;
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
      const twin = () => { S.plan.splice(S.idx, 0, { topic: t.topic, sub: t.sub, level: t.level, twin: true }); nextTask(); };
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
  if (ev.pack) { if (ev.pack.confetti) confetti(); toast(ev.pack.text, 4000); }
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
    if (me) setTimeout(() => celebrate(me), 700);
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
    row.append(btn("secondary", "Még gyakorlok", () => close()), btn("primary", `Vissza a ${G().homeWord}ra`, () => { close(); goHome(); }));
    box.append(row);
  });
}
function endRound() {
  C.cloud.checkpoint("home");   // kör vége: a „főmenübe lépéskor” módban is felmegy
  const ok = S.res.filter(r => r === 1).length, all = S.res.length, mode = S.mode, t = C.pack.topics.find(x => x.id === S.topic);
  if (mode !== "free") { toast(`Kör vége: ${ok}/${all} elsőre jó. ${G().logo}`); return goHome(); }
  if (ok === all) confetti();
  modal((box, close) => {
    box.classList.add("celebrate");
    box.append(el("div", "big-emoji", ok === all ? "🌟" : ok >= all / 2 ? G().logo : "💪"), el("h3", null, `${esc(t.place || t.name)}: kör vége!`),
      el("p", null, `<b>${ok}</b> feladat sikerült elsőre a ${all}-ból.<br>${ok === all ? "Hibátlan kör – szuper!" : ok >= all / 2 ? "Szép munka! Gyakorlással még jobb lesz." : "Ez nehéz volt – a hibás típusok pár nap múlva visszajönnek gyakorolni."}`),
      el("div", "dots", S.res.map(r => `<i class="${r === 1 ? "ok" : r === 2 ? "mid" : "bad"}"></i>`).join("")));
    box.lastChild.style.justifyContent = "center"; box.lastChild.style.margin = "8px 0";
    const row = el("div", "mbtns"); row.style.justifyContent = "center";
    row.append(btn("secondary", `Vissza a ${G().homeWord}ra`, () => { close(); goHome(); }), btn("primary", "🔁 Még egy kör", () => { close(); startFree(t.id); }));
    box.append(row);
  }, { esc: close => { close(); goHome(); } });
}
export function goHome() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (S) clearTimeout(S.autoT);
  S = null; show("scr-home"); renderTop(); renderHome();
  C.cloud.checkpoint("home"); maybeAskDevice(); checkHolidays();
  const u = cur();
  if (u && giftPending(u) && prefs(u).gifts !== false) setTimeout(() => openGifts(), 900);
}

// ---------- Gyorsbillentyűk ----------
// Kezdőlap: Tab / Shift+Tab a küldetés gomb, a nyitható adventi ablak, a rangsáv és a témák között; F1 súgó
export const homeKeys = {
  id: "home",
  items: () => [$("btn-mission"), ...document.querySelectorAll("#advent .aw-today, #advent .aw-makeup"), $("rankbox"), ...document.querySelectorAll("#map button.tcard")],
  onF1: () => openHelp(),
};
// Gyakorlás: Enter = Tovább (ha már válaszolt, és nem egy gombon áll); Esc = főmenü; F1 = a téma súgója
export const playKeys = {
  id: "play",
  onEnter: a => {
    if (!S || (a && a.tagName === "BUTTON")) return false;
    if (S.phase !== "answer" && S.onNext && Date.now() >= (S.lockUntil || 0)) { S.onNext(); return true; }
    // válasz közben: ellenőrzés (a beviteli mezők és a saját Enter-kezelők ezt előbb elkapják)
    if (S.phase === "answer" && !(S.ui && S.ui.auto) && !(a && /^(INPUT|TEXTAREA)$/.test(a.tagName))) { check(); return true; }
    return false;
  },
  onEsc: () => goHome(),
  onF1: () => openHelp(),
  // minden más billentyű a feladat felületéé (pl. betűgépelés a betűkirakón, 1–4 a választós gomboknál)
  onKey: e => !!(S && S.ui && S.ui.onKey && !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || "") && S.ui.onKey(e)),
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

// Teszteléshez (#debug): egy adott feladat megnyitása
export function debugShow(item) { S = S || { mode: "free", topic: item.topic, plan: [], idx: 0, res: [], combo: 0 }; S.topic = item.topic; S.plan.splice(S.idx, 0, item); show("scr-play"); nextTask(); }
