// ===== Napi nagy cél: serlegeső, ajándékdobozok, pontszorzós nap =====
import { el, btn, toast } from "../core/dom.js";
import { modal } from "../core/modal.js";
import { giftPending, pickGift, bigProgress, multOf } from "../core/dailygoal.js";
import { dateKey, dayNum } from "../core/dates.js";
import { C, G, cur, prefs, save, confetti } from "./ctx.js";
import { renderTop, renderHome } from "./home.js";

// Serlegeső: a nagy cél elérésekor (a gyakorlás közben, nem állítja meg a kört)
export function trophyRain() {
  document.querySelectorAll(".trophy-banner").forEach(x => x.remove());
  const msg = el("div", "trophy-banner", `<div class="tb-cup">🏆</div><b>Megvan a napi nagy cél!</b><div>${prefs(cur()).gifts !== false ? "A kör végén ajándékdobozt választhatsz! 🎁" : "Szuper munka! 🎉"}</div>`);
  msg.setAttribute("role", "status");
  document.body.append(msg);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const rain = el("div", "trophy-rain");
    for (let i = 0; i < 26; i++) { const s = el("span", null, i % 5 ? "🏆" : "⭐"); s.style.left = Math.random() * 100 + "vw"; s.style.animationDelay = Math.random() * 1.2 + "s"; s.style.fontSize = 22 + Math.random() * 22 + "px"; rain.append(s); }
    document.body.append(rain); setTimeout(() => rain.remove(), 4200);
  }
  confetti();
  setTimeout(() => msg.remove(), 3600);
}

// Ajándékdobozok: 6 doboz, a tartalom és a szín minden alkalommal összekeveredik; naponta egyszer választhat
export function openGifts() {
  const u = cur();
  if (!u || !giftPending(u) || prefs(u).gifts === false || document.querySelector(".gift-grid")) return;
  const { GIFTS, GIFT_COLORS } = G().gifts;
  const order = C.rng.shuffle(GIFTS), colors = C.rng.shuffle(GIFT_COLORS);
  let done = false; // bezárni csak a választás után lehet
  modal((box, close) => {
    box.classList.add("celebrate", "gift-box");
    box.append(el("h3", null, "🎁 Válassz egy ajándékot!"), el("p", null, "Ma elérted a napi nagy célt! Koppints az egyik dobozra."));
    const grid = el("div", "gift-grid"), res = el("div", "gift-res");
    const ok = btn("primary", "Szuper! 🎉", () => close()); ok.hidden = true;
    order.forEach((g, i) => {
      const b = btn("gift", ""); b.style.setProperty("--c", colors[i]); b.style.setProperty("--i", i);
      b.setAttribute("aria-label", `${i + 1}. ajándékdoboz`);
      b.append(el("span", "gift-body"), el("span", "gift-lid"), el("span", "gift-in", g.ic));
      b.addEventListener("click", () => {
        if (done) return; done = true;
        b.classList.add("open", "mine"); b.setAttribute("aria-label", g.t);
        pickGift(u, g); save(); renderTop();
        res.append(el("div", "gift-big", g.ic), el("b", null, g.t), el("div", null, g.d));
        if (g.id !== "empty") confetti();
        // a többi doboz is kinyílik, hogy lássa, mi lett volna máshol
        setTimeout(() => grid.querySelectorAll(".gift:not(.open)").forEach(x => { x.classList.add("open", "other"); }), 1300);
        ok.hidden = false; ok.focus();
      });
      grid.append(b);
    });
    const row = el("div", "mbtns"); row.style.justifyContent = "center"; row.append(ok);
    box.append(grid, res, row);
  }, { esc: close => { if (done) close(); else toast("Előbb válassz egy dobozt! 🎁"); }, onClose: () => { if ($home()) renderHome(); } });
}
const $home = () => document.getElementById("scr-home").classList.contains("on");

// Pontszorzós nap: naponta (és szorzónként) egyszer, eszközönként jelzés indításkor
export function turboGreet() {
  const u = cur(); if (!u) return;
  const m = multOf(u); if (m < 2) return;
  const key = `${C.storeKey}_turbo`, seen = `${u.name}:${dateKey(dayNum())}:${m}`;
  try { if (localStorage.getItem(key) === seen) return; localStorage.setItem(key, seen); } catch { /* privát mód */ }
  const T = { 2: { ic: "🚀", name: "DUPLA" }, 3: { ic: "🌈", name: "TRIPLA" } }[m];
  const g = el("div", "turbo-greet x" + m, `<div class="tg-ic">${T.ic}</div><b>Ma ${T.name} PONT nap van!</b><div>Minden jó válasz ${m}-nek számít a napi nagy célhoz.</div>`);
  g.setAttribute("role", "status");
  const close = () => { g.classList.add("out"); setTimeout(() => g.remove(), 400); };
  g.addEventListener("click", close); document.body.append(g); setTimeout(close, 4200);
}
// A felső sáv 🏆 gombja: rövid magyarázat
export function bigInfo() {
  const u = cur(); if (!u) return;
  const P = prefs(u), b = bigProgress(u, P.bigGoal);
  toast(`🏆 Napi nagy cél: ${Math.min(b.have, b.need)}/${b.need} helyes válasz.${b.mult > 1 ? ` Ma ×${b.mult}: minden jó válasz ${b.mult}-nek számít!` : ""}${b.done ? " Megvan! 🎉" : ""}`, 4000);
}
