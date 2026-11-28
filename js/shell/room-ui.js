// ===== 🏠 Saját sarkom: a kinyitott tárgyak közül hármat kitehet a gyerek =====
// Látszik: a kezdőlap tetején (a középső a kabala helyére kerül), és játék közben a jobb oldali mezőben (váltakozva).
// Díszíteni a Gyűjtemény „Saját sarkom” fülén lehet.
// Csak az elrendezés mentődik (u.room: 3 tárgyazonosító, üres hely = ""); a gyűjtemény és a felszerelés nem változik.
// Koppintás: tárgy → hely (vagy hely → tárgy); a ✕ leveszi a tárgyat. Billentyűzettel: Tab + Enter.
import { $, el, btn, escHtml as esc, aAz } from "../core/dom.js";
import { roomLayout, placeInRoom, ROOM_SLOTS } from "../core/room.js";
import { C, G, cur, itemIcon, saveUser, unlocked, applyLook } from "./ctx.js";

const ROOM_ICONS = ["📚", "🏺", "🪴"];
function roomItems(u) {
  const un = unlocked(u), cat = G().catalog;
  return new Map(cat.ITEMS.filter(it => un.has(it.id)).map(it => [it.id, it]));
}
const canEdit = () => !(C.localSave && !C.localSave.active);

const openRoom = async () => { const { openCollection } = await import("./collection.js"); openCollection("room"); };
// A kitett figurák ikonjai (a játék közbeni jobb oldali mezőhöz); üres, ha nincs kitett tárgy
export function roomIcons(u) {
  if (!u) return [];
  const items = roomItems(u);
  return roomLayout(u.room, id => items.has(id)).filter(Boolean).map(id => itemIcon(id) || "◇");
}
// Kezdőlap teteje: bal polc – fő figura (a kabala helyén) – jobb polc. Koppintásra a díszítő fül nyílik.
// A középső hely tárgya lecseréli a kabalát (pl. a bagolyt); ha üres, a játék saját kabalája marad.
export function renderRoomRow(u) {
  const old = $("home-room"); if (old) { old.hidden = true; old.replaceChildren(); }   // a régi kis sor helyett
  const mascot = $("mascot"); if (!mascot) return;
  let corner = $("hero-corner");
  if (!corner) {
    corner = el("div", "hero-corner"); corner.id = "hero-corner";
    mascot.before(corner); corner.append(el("span", "hc-slot hc-left"), mascot, el("span", "hc-slot hc-right"));
    const ped = el("div", "hc-ped"); ped.id = "hero-ped"; corner.after(ped);
    mascot.dataset.default = mascot.textContent;
    mascot.addEventListener("click", openRoom);
  }
  const items = roomItems(u), layout = roomLayout(u.room, id => items.has(id));
  const fig = (i, cls) => {
    const id = layout[i], it = id && items.get(id);
    if (!it) return el("span", "hc-slot " + cls);
    const b = btn("hc-fig " + cls, ""); b.textContent = itemIcon(id) || "◇";
    b.title = `${it.label} (${ROOM_SLOTS[i]}) – Saját sarkom díszítése`; b.setAttribute("aria-label", b.title);
    b.addEventListener("click", openRoom);
    return b;
  };
  corner.children[0].replaceWith(fig(0, "hc-left"));
  corner.children[2].replaceWith(fig(2, "hc-right"));
  // fő figura: a középső hely tárgya a kabala helyén (rakéta-skinnél a saját díszével)
  const mid = layout[1] && items.get(layout[1]);
  mascot.textContent = mid ? itemIcon(layout[1]) || "◇" : mascot.dataset.default;
  if (mid) { mascot.dataset.room = "1"; [...mascot.classList].filter(c => c.startsWith("rk-")).forEach(c => mascot.classList.remove(c)); if (mid.kind === "rocket" && mid.cls) mascot.classList.add(mid.cls); }
  else if (mascot.dataset.room) { delete mascot.dataset.room; applyLook(); }
  mascot.title = mid ? `${mid.label} – Saját sarkom díszítése` : "Saját sarkom díszítése";
  mascot.classList.add("hc-main");
  const ped = $("hero-ped");
  if (!layout.some(Boolean) && items.size) {
    const hint = btn("hc-hint", "＋ Díszítsd a sarkodat!", openRoom); hint.title = "Saját sarkom – tegyél ki 3 tárgyat a gyűjteményedből";
    ped.replaceChildren(hint);
  } else ped.replaceChildren();
}

let sel = { item: null, slot: null };
// Gyűjtemény-fül
export function roomTab(box, ctx) {
  const u = cur(), items = roomItems(u), canUse = id => items.has(id), layout = roomLayout(u.room, canUse);
  const status = el("p", "soft small room-status"); status.setAttribute("role", "status");
  const place = (slot, id) => {
    if (!canEdit()) return;
    const next = placeInRoom(u.room, slot, id, canUse); if (!next) return;
    u.room = next; sel = { item: null, slot: null }; saveUser(u);
    ctx.redraw();
    const st = document.querySelector(".room-status");
    if (st) st.textContent = id ? `${items.get(id).label} → ${ROOM_SLOTS[slot]}` : `${ROOM_SLOTS[slot]}: üres`;
    setTimeout(() => document.querySelectorAll(".room-slots .room-slot")[slot]?.focus(), 0);
  };
  box.append(el("p", "soft", sel.item ? "Most koppints egy helyre, ahová kiteszed!" : sel.slot != null ? `Most válassz tárgyat ide: ${esc(ROOM_SLOTS[sel.slot])}` : "Koppints egy tárgyra, aztán a helyére! A tárgy a gyűjteményedben is megmarad."));
  const slots = el("div", "room-slots");
  layout.forEach((id, i) => {
    const it = id && items.get(id);
    const s = btn("room-slot" + (sel.slot === i ? " on" : "") + (sel.item ? " target" : ""), `<span class="room-slot-name">${ROOM_ICONS[i]} ${esc(ROOM_SLOTS[i])}</span><span class="room-icon">${it ? itemIcon(id) || "◇" : "＋"}</span><span class="small">${it ? esc(it.label) : "üres"}</span>`, () => {
      if (sel.item) return place(i, sel.item);
      sel = { item: null, slot: sel.slot === i ? null : i }; ctx.redraw();
      setTimeout(() => document.querySelectorAll(".room-slots .room-slot")[i]?.focus(), 0);
    });
    s.setAttribute("aria-label", `${ROOM_SLOTS[i]}: ${it ? it.label : "üres"}`);
    const wrap = el("div", "room-slot-wrap"); wrap.append(s);
    if (it) { const x = btn("room-off", "✕", () => place(i, "")); x.title = `${it.label} levétele innen: ${ROOM_SLOTS[i]}`; x.setAttribute("aria-label", x.title); wrap.append(x); }
    slots.append(wrap);
  });
  box.append(slots);
  if (!items.size) {
    const R = G().ranks, rk = R.rankOf(u.pts);
    box.append(el("p", "room-empty", rk.next ? `Még nincs kinyitott tárgyad. Az elsőt ${aAz(esc(rk.next))} „${esc(rk.next)}” rangnál kapod – még <b>${rk.need} ${G().pointsIcon}</b>!` : "Még nincs kitehető tárgyad."));
  } else {
    box.append(el("h4", "psub", "A tárgyaid"));
    const grid = el("div", "room-items");
    for (const [id, it] of items) {
      const at = layout.indexOf(id);
      const b = btn("room-item" + (sel.item === id ? " on" : "") + (at >= 0 ? " placed" : ""), `<span class="room-icon">${itemIcon(id) || "◇"}</span><span class="small">${esc(it.label)}</span>${at >= 0 ? `<span class="room-at">${ROOM_ICONS[at]}</span>` : ""}`, () => {
        if (sel.slot != null) return place(sel.slot, id);
        sel = { item: sel.item === id ? null : id, slot: null }; ctx.redraw();
        setTimeout(() => document.querySelector(".room-items .room-item.on, .room-slots .room-slot")?.focus(), 0);
      });
      b.setAttribute("aria-pressed", String(sel.item === id));
      b.title = it.label + (at >= 0 ? ` (most: ${ROOM_SLOTS[at]})` : "");
      grid.append(b);
    }
    box.append(grid);
  }
  box.append(status);
}
export const resetRoomSelection = () => { sel = { item: null, slot: null }; };
