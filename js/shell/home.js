// ===== Kezdőlap és felső sáv =====
import { $, el, btn, toast, escHtml as esc, aAz } from "../core/dom.js";
import * as keys from "../core/keys.js";
import { missionProgress, streakNow, shieldAvailable, bigProgress } from "../core/dailygoal.js";
import { C, G, cur, prefs, applyLook, itemIcon, rewardProgress, rewardKinds } from "./ctx.js";
import { allowedUsers, userLocked } from "./players.js";
import { startFree, startReview, resumeInfo, resumeRound, playKeys, homeKeys } from "./play.js";
import { renderRoomRow } from "./room-ui.js";
import { histAgg, pctOf } from "../core/progress.js";
import { dayNum } from "../core/dates.js";
import { renderAdvent } from "./holidays.js";
import { COMMON_BADGES } from "../core/badges.js";

export const blockedTopics = u => (u && u.block && Array.isArray(u.block.topics)) ? u.block.topics : [];
export const openTopics = u => C.pack.topics.map(t => t.id).filter(id => !blockedTopics(u).includes(id));
const FREE_SIZES = [3, 5, 10];
export const freeSize = () => { const f = +prefs(cur()).freeTasks; return FREE_SIZES.includes(f) ? f : 5; };

// 🎯 Gyenge téma: a nyitott témák közül az, amelyikben az utolsó 14 napban a legrosszabb az elsőre jó arány
// (legalább 6 feladat, 85% alatt). null, ha nincs ilyen.
export function weakTopic(u, allowed, today = dayNum()) {
  let best = null;
  for (const t of C.pack.topics) {
    if (!allowed.includes(t.id)) continue;
    const s = histAgg(u, today - 13, today, t.id), pct = pctOf(s);
    if (s.n < 6 || pct >= 85) continue;
    if (!best || pct < best.pct) best = { t, pct, n: s.n };
  }
  return best;
}
export function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id === id));
  scrollTo(0, 0);
  keys.setScreen(id === "scr-play" ? playKeys : homeKeys);
}
export function refreshAll() {
  renderTop();
  if ($("scr-home").classList.contains("on")) renderHome();
  if (C.refreshCloud) C.refreshCloud();
}

export function renderTop() {
  const u = cur(), R = G().ranks;
  $("tb-avatar").textContent = u ? u.avatar : G().mascot;
  const title = u ? R.RANKS[R.rankIndex(u.pts)].title : null;
  $("tb-name").innerHTML = u ? esc(u.name) + (title ? `<span class="legend-tag">${title}</span>` : "") : "Játékos";
  applyLook();
  $("tb-pts").textContent = u ? u.pts : 0;
  $("tb-streak").textContent = u ? streakNow(u) : 0;
  const lock = userLocked();
  $("tb-user").classList.toggle("locked", lock);
  $("tb-user").title = lock ? "Ezen az eszközön csak ez a játékos játszik (a szülő a ⚙️ Család fülön módosíthatja)" : "Játékos váltása";
  // napi nagy cél a felső sávban (🏆 12/30 ×2)
  const P = prefs(u), b = u ? bigProgress(u, P.bigGoal) : { have: 0, need: P.bigGoal, mult: 1, done: false };
  $("tb-big-n").textContent = Math.min(b.have, b.need); $("tb-big-goal").textContent = b.need;
  $("tb-mult").textContent = b.mult > 1 ? "×" + b.mult : "";
  $("tb-big").classList.toggle("fire2", b.mult === 2); $("tb-big").classList.toggle("fire3", b.mult === 3); $("tb-big").classList.toggle("done", b.done);
  $("tb-big").title = `Napi nagy cél: ${Math.min(b.have, b.need)}/${b.need} helyes válasz` + (b.mult > 1 ? ` – ma ${b.mult}-szoros pontszorzó: egy jó válasz ${b.mult}-nek számít` : "") + (b.bonus ? ` (ebből +${b.bonus} ajándék tegnapról)` : "") + (b.done ? " – megvan! 🏆" : "");
}

export function renderHome() {
  const u = cur(); if (!u) return;
  const g = G(), T = g.texts, s = prefs(u), mp = missionProgress(u, s);
  document.title = g.title; $("app-title").textContent = g.title;
  $("home-hello").textContent = `Szia, ${u.name}! ${mp.done ? T.helloDone : T.helloTodo}`;
  $("mission-sub").textContent = `${s.goalTasks} feladat vagy ${s.goalMin} perc – amelyik előbb teljesül`;
  $("map-title").textContent = g.topicWord.many[0].toUpperCase() + g.topicWord.many.slice(1);
  $("map-hint").textContent = `– kattints egy ${g.topicWord.acc}: ${freeSize()} feladatos gyakorló kör`;
  $("mission-bar").style.width = Math.round(mp.pct * 100) + "%";
  $("mission").classList.toggle("done", mp.done);
  $("btn-mission").textContent = mp.done ? T.again : mp.n ? T.cont : T.start;
  const st = streakNow(u);
  $("mission-note").textContent = mp.done ? `✅ Ma már ${mp.n} feladatot oldottál meg. Sorozat: ${st} nap 🔥`
    : `Ma: ${mp.n} feladat, ${mp.min} perc. ${st ? `🔥 ${st} napos sorozat – ne szakítsd meg!` : "Kezdj egy új sorozatot!"} ${shieldAvailable(u) ? "🛡️ A heti pajzsod még megvan." : ""}`;
  // napi nagy cél
  const b = bigProgress(u, s.bigGoal);
  $("biggoal-bar").style.width = Math.round(b.pct * 100) + "%";
  $("biggoal").classList.toggle("done", b.done);
  $("biggoal-txt").textContent = b.done ? `✅ Megvan: ${b.have} helyes válasz! 🏆` : `${b.have} / ${b.need} helyes válasz${b.mult > 1 ? ` · ma ×${b.mult}!` : ""}${b.bonus ? ` · +${b.bonus} ajándék tegnapról` : ""}`;
  // rang
  const R = g.ranks, rk = R.rankOf(u.pts);
  $("rank-name").textContent = `${g.mascot} ${rk.name} (${rk.n}/${rk.total})`;
  $("rank-next").innerHTML = rk.next ? `még <b>${rk.need} ${g.pointsIcon}</b> ${aAz(esc(rk.next))} „${esc(rk.next)}” rangig – kb. ${R.daysTo(u, rk.need)} nap <span class="rank-peek">· 🎁 ${rk.nextRank.unlocks.map(itemIcon).join(" ")}</span>` : "Elérted a legmagasabb rangot! 🌟";
  $("rank-bar").style.width = Math.round(rk.pct * 100) + "%";
  // következő szülői jutalom
  const rb = $("reward-box"), rws = (u.rewards || []).map(r => ({ r, p: rewardProgress(u, r) })).filter(x => !x.p.claimed);
  rb.hidden = !rws.length;
  if (rws.length) {
    const reached = rws.find(x => x.p.done), next = reached || rws.slice().sort((a, b2) => b2.p.pct - a.p.pct)[0];
    rb.innerHTML = reached ? `🎁 <b>${esc(reached.r.text)}</b> – elérted! Szólj a szüleidnek! 🎉` : `🎁 Következő jutalom: <b>${esc(next.r.text)}</b><br><span class="soft small">még ${next.p.need - next.p.have} ${rewardKinds()[next.r.kind] || ""}</span><div class="bar"><i style="width:${Math.round(next.p.pct * 100)}%"></i></div>`;
  }
  renderAdvent(u);
  // „Neked ajánljuk”: félbehagyott kör, javító küldetés (ha van mit javítani) vagy gyenge téma – csak ha van mit mutatni
  const offers = $("home-offers"), allowed = openTopics(u);
  if (offers) {
    const items = [], ri = resumeInfo(u);
    if (ri) items.push(btn("primary offer offer-resume", `▶ Folytatod a kört? <span class="offer-sub">${esc(ri.title)} · ${ri.done}/${ri.total} kész</span>`, resumeRound));
    const rv = allowed.length && C.pack.review ? C.pack.review.count(u, allowed) : 0;
    if (rv > 0) items.push(btn("secondary offer offer-review", `🩹 Javító küldetés <span class="offer-sub">${rv} ${esc(C.pack.review.unit || "hibás feladat")} vár javításra · ${Math.min(rv, freeSize())} feladat egy körben</span>`, () => startReview()));
    else {
      const w = weakTopic(u, allowed);
      if (w) items.push(btn("secondary offer offer-weak", `🎯 Gyakorold ezt: ${esc(w.t.place || w.t.name)} <span class="offer-sub">az utóbbi 2 hétben ${w.pct}% ment elsőre · ${freeSize()} feladat</span>`, () => startFree(w.t.id)));
    }
    offers.replaceChildren(...(items.length ? [el("h3", null, "Neked ajánljuk"), ...items] : []));
    // a mai küldetés az első; az ajánlat csak a teljesített küldetés után kerül fölé
    const mission = $("mission");
    if (mission) { if (mp.done) mission.before(offers); else mission.after(offers); }
    offers.hidden = !items.length;
  }
  renderRoomRow(u);
  // témakártyák (a lezártak 🔒-vel)
  const map = $("map"), bl = blockedTopics(u); map.innerHTML = "";
  // (a 🩹 javító küldetés a „Neked ajánljuk” kártyára került)
  C.pack.topics.forEach(t => {
    const st2 = C.pack.status(u, t.id), locked = bl.includes(t.id);
    const b2 = btn("tcard" + (locked ? " blocked" : ""), `<div class="orb" style="background:${t.color};--glow:${t.color}">${t.icon}</div><div class="pname">${esc(t.place || t.name)}</div><div class="ptype">${esc(t.tagline || (t.place && t.place !== t.name ? t.name : ""))}</div><div class="pstars">${[1, 2, 3].map(i => `<span class="${st2.stars >= i ? "" : "off"}">⭐</span>`).join("")}</div><div class="plvl">${locked ? "🔒 most szünetel" : esc(st2.label)}</div>`, () => { if (locked) return toast("🔒 Ezt most lezárták, hogy a többire jusson idő. Válassz egy másikat!"); startFree(t.id); });
    b2.dataset.type = t.id; b2.title = `${t.place || t.name} – ${t.name}${locked ? " (lezárva)" : " (Enter: indulás, F1: mi vár itt?)"}`;
    if (locked) b2.setAttribute("aria-disabled", "true");
    map.append(b2);
  });
  (C.pack.coming || []).forEach(c => map.append(el("div", "tcard locked", `<div class="orb" style="background:#475569;--glow:transparent">${c.icon}</div><div class="pname">${esc(c.place)}</div><div class="ptype">🔒 hamarosan</div>`)));
  $("lock-note").hidden = !bl.length;
  $("lock-note").textContent = bl.length ? `🔒 Néhány ${g.topicWord.one} most szünetel, hogy a gyengébb részekre jusson idő.` : "";
  // jelvények
  const bd = $("badges"); bd.innerHTML = "";
  [...COMMON_BADGES, ...(C.pack.badges || [])].forEach(b3 => bd.append(el("span", "badge" + (u.badges.includes(b3.id) ? "" : " off"), `${b3.ic} ${b3.n}`)));
}
export { allowedUsers };
