// ===== Ünnepek: egyszeri események és adventi naptár (a játék eseménylistája: GAME.events) =====
import { $, el, btn, toast, escHtml as esc } from "../core/dom.js";
import { modal } from "../core/modal.js";
import { dayNum, dateKey } from "../core/dates.js";
import { activeEvents, claimOnce, adventState, adventDay, openWindow } from "../core/events.js";
import { G, cur, prefs, save, confetti, itemIcon, itemLabel } from "./ctx.js";
import { renderTop, renderHome } from "./home.js";
import { openCollection } from "./collection.js";

const E = () => G().events;
const rewardText = rw => rw.map(r => r.pts ? `+${r.pts} ${G().pointsIcon}` : `${itemIcon(r.item)} ${esc(itemLabel(r.item))}`).join(" · ");

export function holidayConds(u) {
  const d = u.days[dateKey(dayNum())] || {}, P = prefs(u);
  return { missionDone: !!d.done, todayOk: !!d.done, makeupOk: !!d.done && (d.n || 0) >= P.goalTasks + E().PLUS_ROUND };
}
export function checkHolidays() {
  const u = cur(); if (!u || !prefs(u).events) return;
  const c = holidayConds(u), won = activeEvents(E().EVENTS, dayNum(), "once").map(ev => claimOnce(u, ev, c)).filter(Boolean);
  if (!won.length) return;
  save(); renderTop(); if ($("scr-home").classList.contains("on")) renderHome();
  won.forEach((r, i) => setTimeout(() => holidayModal(r.ev.title, r.ev.text, r.ev.reward), i * 400));
}
function holidayModal(title, text, reward) {
  confetti();
  modal((box, close) => {
    box.classList.add("celebrate");
    box.append(el("div", "big-emoji", title.split(" ")[0]), el("h3", null, esc(title.split(" ").slice(1).join(" ") || title)));
    if (text) box.append(el("p", null, esc(text)));
    box.append(el("p", "reward-line", rewardText(reward)));
    const row = el("div", "mbtns"); row.style.justifyContent = "center";
    const it = reward.find(r => r.item && !r.item.startsWith("st:") && G().catalog.itemById(r.item));
    row.append(btn(it ? "secondary" : "primary", "Szuper! 🎉", () => close()));
    if (it) row.append(btn("primary", "Megnézem a gyűjteményedben ✨", () => { close(); openCollection("wardrobe", G().catalog.itemById(it.item).kind); }));
    box.append(row);
  });
}
// Az ablakok sorrendje a rácsban (rögzített keverés, mint egy igazi adventi naptárban)
const ADVENT_ORDER = [7, 18, 3, 12, 22, 1, 15, 9, 24, 5, 20, 11, 2, 16, 8, 23, 13, 6, 19, 4, 14, 21, 10, 17];
export function renderAdvent(u) {
  const box = $("advent"), ev = prefs(u).events ? activeEvents(E().EVENTS, dayNum(), "advent")[0] : null;
  box.hidden = !ev; if (!ev) { box.innerHTML = ""; return; }
  const PR = E().PLUS_ROUND, c = holidayConds(u), ws = adventState(u, ev, c), byDay = Object.fromEntries(ws.map(w => [w.day, w])), n = adventDay(ev);
  const t = byDay[n], mk = ws.some(w => w.state === "makeup");
  const note = t.state === "open" ? (mk ? "🎁 Plusz kört teljesítettél – egy kihagyott ablakot ma még pótolhatsz!" : `A mai ablak kinyitva. ${c.makeupOk ? (ws.some(w => w.state === "missed") ? "Ma már pótoltál egy ablakot – holnap újra lehet! 🙂" : "") : `Kihagytál egyet? Egy plusz kör (a napi küldetés után még ${PR} feladat) után pótolhatod.`}`)
    : t.state === "today" ? "✨ Teljesítetted a mai küldetést – nyisd ki a mai ablakot!" : "🎯 Teljesítsd a mai küldetést, és kinyithatod a mai ablakot!";
  box.innerHTML = `<div class="advent-head"><h2>${ev.title}</h2><span class="soft small">${n}. nap / 24</span></div><p class="soft small">${note}</p>`;
  const grid = el("div", "advent-grid");
  ADVENT_ORDER.forEach(d => {
    const w = byDay[d];
    const face = w.state === "open" ? `<span class="aw-got">${w.reward.map(r => r.pts ? `+${r.pts}<small>${G().pointsIcon}</small>` : itemIcon(r.item)).join("")}</span>` : `<span class="aw-no">${d}</span>`;
    const b = btn("aw aw-" + w.state, face, () => adventClick(u, ev, w));
    b.dataset.day = d; b.title = { open: "Kinyitva", today: "Ma nyitható!", makeup: "Pótolható!", wait: "Előbb a mai küldetés", missed: "Kihagytad", future: "Még zárva" }[w.state] + ` (${d}.)`;
    grid.append(b);
  });
  box.append(grid);
  const st = (u.owned || []).filter(id => id.startsWith("st:"));
  if (st.length) box.append(el("p", "small stickers", `Matricáid: ${st.map(id => id.slice(3)).join(" ")}`));
}
function adventClick(u, ev, w) {
  const PR = E().PLUS_ROUND;
  if (w.state === "today" || w.state === "makeup") {
    const r = openWindow(u, ev, w.day, holidayConds(u));
    if (!r) return;
    save(); renderTop();
    const b = document.querySelector(`#advent .aw[data-day="${w.day}"]`); if (b) b.classList.add("opening");
    setTimeout(() => { renderHome(); holidayModal(`🎄 ${w.day}. ablak${r.makeup ? " (pótlás)" : ""}`, r.makeup ? "Ügyes! A plusz körrel pótoltad ezt az ablakot." : "Ezt rejtette a mai ablak:", w.reward); }, 450);
    return;
  }
  const msg = { open: `Ezt már kinyitottad: ${rewardText(w.reward)}`, wait: "🎯 Teljesítsd a mai küldetést, és kinyithatod!", future: "🔒 Még nem lehet – türelem! 🎄",
    missed: holidayConds(u).makeupOk ? "Ma már pótoltál egy ablakot – holnap újra lehet! 🙂" : `Ezt kihagytad. Ha ma a napi küldetés után még egy plusz kört (${PR} feladatot) teljesítesz, egy kihagyott ablakot pótolhatsz!` }[w.state];
  toast(msg, 4000);
}
