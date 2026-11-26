// ===== 📅 Heti összefoglaló ablak a gyereknek (az új hét első belépésekor) =====
import { el, btn, escHtml as esc } from "../core/dom.js";
import { modal, isOpen as isModalOpen } from "../core/modal.js";
import { dayNum } from "../core/dates.js";
import { streakNow } from "../core/dailygoal.js";
import { weeklyDue, markWeeklySeen } from "../core/weekly.js";
import { G, cur, prefs, save, confetti, sfx } from "./ctx.js";

// tries: ha épp másik ablak van nyitva (ajándék, ünnep, eszköz), később újra próbálja
export function maybeWeekly(tries = 8) {
  const u = cur(); if (!u || prefs(u).weekly === false) return;
  if (isModalOpen() || !document.getElementById("scr-home")?.classList.contains("on")) { if (tries > 0) setTimeout(() => maybeWeekly(tries - 1), 1500); return; }
  const due = weeklyDue(u, dayNum()); if (!due) return;
  markWeeklySeen(u, due.week); save();
  openWeekly(u, due);
}
export function openWeekly(u, { last: s, prev: p }) {
  const g = G(), great = s.missions >= 5 || s.activeDays >= 5;
  if (great) confetti();
  sfx(great ? "mission" : "ok");
  modal((box, close) => {
    box.classList.add("celebrate", "weekly");
    const tiles = [
      ["📝", s.n, "feladat"],
      ["🎯", s.pct == null ? "–" : s.pct + "%", "elsőre jó"],
      ["🏆", s.missions, "teljesített küldetés"],
      ["🌱", s.imp, "fejlődés"],
    ];
    const streak = streakNow(u);
    box.append(el("div", "big-emoji", great ? "🌟" : "📅"), el("h3", null, `Szia, ${esc(u.name)}! Így ment a múlt hét:`),
      el("div", "wk-tiles", tiles.map(([ic, v, label]) => `<div class="wk-tile"><div class="wk-ic">${ic}</div><b>${v}</b><span>${label}</span></div>`).join("")),
      el("p", null, [
        s.n && p.n ? (s.n > p.n ? `📈 ${s.n - p.n} feladattal többet gyakoroltál, mint előtte – szuper!` : s.n === p.n ? "Ugyanannyit gyakoroltál, mint előtte – szép egyenletes!" : "Ezen a héten kicsit többet is gyakorolhatsz – menni fog! 💪") : "",
        s.best ? `A legszorgalmasabb napod: <b>${s.best.on}</b> (${s.best.n} feladat).` : "",
        s.imp ? `🌱 ${s.imp} korábban nehéz feladat ment már elsőre – ez a fejlődés!` : "",
        streak ? `🔥 ${streak} napos sorozatod van – ne szakítsd meg!` : "Kezdj ma egy új sorozatot! 🔥",
      ].filter(Boolean).join("<br>")));
    const row = el("div", "mbtns"); row.style.justifyContent = "center";
    row.append(btn("primary", `Hajrá, új hét! ${g.logo || "🚀"}`, () => close()));
    box.append(row);
  });
}
