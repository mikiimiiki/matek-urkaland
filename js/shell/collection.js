// ===== 🎒 Gyűjtemény: ranglétra, szekrény, eredményeim + a csomag saját fülei =====
import { el, btn, toast, escHtml as esc } from "../core/dom.js";
import { modal } from "../core/modal.js";
import { openTabs } from "../core/tabs.js";
import { histAgg, pctOf, compare } from "../core/progress.js";
import { dayNum, dateKey } from "../core/dates.js";
import { streakNow } from "../core/dailygoal.js";
import { COMMON_BADGES } from "../core/badges.js";
import { C, G, cur, saveUser, confetti, unlocked, look, itemIcon, sfx } from "./ctx.js";
import { roomTab, resetRoomSelection } from "./room-ui.js";

let wardrobeKind = "av", api = null;

export function celebrateRank(i) {
  const g = G(), R = g.ranks.RANKS[i], cat = g.catalog;
  confetti(); sfx("item");
  modal((box, close) => {
    box.classList.add("celebrate");
    box.append(el("div", "big-emoji", "🎉"), el("h3", null, `Új rang: ${esc(R.name)}!`),
      el("p", null, `Kinyitottad: <b>${R.unlocks.map(id => `${itemIcon(id)} ${esc(cat.itemById(id).label)}`).join(", ")}</b>${R.title ? `<br>…és mostantól a neved mellett ott a <span class="legend-tag">${R.title}</span> felirat!` : ""}`),
      el("p", "soft small", "Kipróbálod? A gyűjteményedben bármikor átöltözhetsz."));
    const row = el("div", "mbtns"); row.style.justifyContent = "center";
    row.append(btn("secondary", "Később", () => close()), btn("primary", "Kipróbálom ✨", () => { close(); openCollection("wardrobe", cat.itemById(R.unlocks[0]).kind); }));
    box.append(row);
  });
}

export function openCollection(tab, kind) {
  if (!cur()) return;
  if (kind) wardrobeKind = kind;
  if (api) { api.close && api.close(); }
  resetRoomSelection();
  api = openTabs({
    id: "collection", title: "", ariaLabel: "Gyűjtemény", startTab: tab, // nincs külön cím, csak a fülek és a ✕
    tabs: [
      { id: "ranks", icon: "🪜", label: "Ranglétra", help: "A rangod, és hogy melyik rangnál mi nyílik ki.", render: ranksTab },
      { id: "wardrobe", icon: "👕", label: "Gyűjteményem", help: "Kattints egy kinyitott tárgyra, és felveszed.", render: wardrobeTab },
      { id: "room", icon: "🏠", label: "Saját sarkom", help: "Koppints egy tárgyra, aztán a helyére – így díszítheted a sarkodat.", render: roomTab },
      { id: "results", icon: "📊", label: "Eredményeim", help: "Az utolsó 7 nap, a témák és a jelvényeid.", render: resultsTab },
      ...(C.pack.collectionTabs || []).map(t => ({ ...t, render: (box, ctx) => t.render(box, { ...ctx, user: cur() }) })),
    ],
    onClose: () => { api = null; },
  });
}

function ranksTab(box) {
  const g = G(), u = cur(), R = g.ranks, rk = R.rankOf(u.pts), cat = g.catalog;
  box.append(el("div", "rk-head", `<div class="rk-big">${u.avatar}</div><div style="flex:1"><h3>${g.mascot} ${esc(rk.name)} <span class="soft small">(${rk.n}/${rk.total})</span></h3><div class="bar"><i style="width:${Math.round(rk.pct * 100)}%"></i></div><p class="small">${rk.next ? `Még <b>${rk.need} ${g.pointsIcon}</b> a(z) „${esc(rk.next)}” rangig – <b>kb. ${R.daysTo(u, rk.need)} nap</b> gyakorlás (az utolsó 7 nap tempójával).` : "Elérted a legmagasabb rangot! " + (g.legendLine || "🌟")}</p></div>`));
  const lad = el("div", "ladder");
  R.RANKS.forEach((Q, i) => {
    const st = i <= rk.i ? "done" : i === rk.i + 1 ? "next" : "locked";
    lad.append(el("div", "rcard " + st, `<div class="rn">${i + 1}. rang · ${Q.pts} ${g.pointsIcon}</div><div class="rname">${esc(Q.name)}</div>${st === "next" ? `<div class="rhint">Ezt nyitod ki következőnek!</div>` : ""}<div class="runl" title="${esc(Q.unlocks.map(id => cat.itemById(id).label).join(", "))}">${Q.unlocks.map(itemIcon).join("")}${Q.title ? "🏅" : ""}</div>`));
  });
  box.append(lad);
}

function wardrobeTab(box, ctx) {
  const g = G(), cat = g.catalog, u = cur(), un = unlocked(u), L = look(u);
  const seg = el("div", "segs");
  cat.KINDS.forEach(K => seg.append(btn("seg" + (K.id === wardrobeKind ? " on" : ""), `${K.icon} ${K.label}`, () => { wardrobeKind = K.id; ctx.redraw(); box.querySelector(".segs .seg.on")?.focus(); })));
  box.append(seg);
  const grid = el("div", "wardrobe");
  const cur0 = wardrobeKind === "av" ? "av:" + u.avatar : L[wardrobeKind];
  const items = cat.ITEMS.filter(it => it.kind === wardrobeKind && (!it.special || un.has(it.id)))
    .concat((u.owned || []).filter(id => id.startsWith(wardrobeKind + ":") && !cat.itemById(id)).map(id => ({ id, kind: wardrobeKind, label: "Különleges", show: id.slice(wardrobeKind.length + 1), value: id.slice(wardrobeKind.length + 1) })));
  items.forEach(it => {
    const open = un.has(it.id), from = g.ranks.unlockRank(it.id);
    let face = `<span class="wic">${it.show || ""}</span>`;
    if (it.kind === "bg") face = `<span class="wsw" style="background:radial-gradient(circle at 70% 0, ${it.vars.glow}, transparent 70%), linear-gradient(180deg, ${it.vars.space2}, ${it.vars.space1})"></span>`;
    if (it.kind === "frame") face = `<span class="wfr ${it.cls || ""}">${esc(u.name)}</span>`;
    const b = btn("witem" + (it.id === cur0 ? " on" : ""), `${face}${esc(it.label)}${!from ? `<span class="wtag">🎄 különleges</span>` : ""}${open ? "" : `<span class="wlock">🔒 ${esc(from ? from.name : "?")} rangnál nyílik</span>`}`, () => {
      if (!open) return;
      u.cosmetics = u.cosmetics || {};
      if (it.kind === "av") { u.avatar = it.value; u.cosmetics.avatar = it.value; } else u.cosmetics[it.kind] = it.id;
      saveUser(u); ctx.redraw(); toast(`✨ Felvetted: ${esc(it.label)}`);
      setTimeout(() => document.querySelector(".wardrobe .witem.on")?.focus(), 0);
    });
    b.disabled = !open; b.title = open ? `${it.label} – felvétel` : `🔒 ${from ? from.name : ""} rangnál nyílik`;
    grid.append(b);
  });
  box.append(grid);
}

// Gyerekbarát eredmények: az utolsó 7 nap, témák, jelvények
function resultsTab(box) {
  const g = G(), u = cur(), t = dayNum(), days = [];
  for (let i = 6; i >= 0; i--) { const k = dateKey(t - i); days.push({ k, d: (u.days || {})[k] || { n: 0, ok: 0, done: false } }); }
  const max = Math.max(5, ...days.map(x => x.d.n || 0)), w = histAgg(u, t - 6, t);
  box.append(el("div", "pstrip", `<span>🔥 Sorozat: <b>${streakNow(u)} nap</b></span><span>✅ 7 nap: <b>${w.n}</b> feladat</span><span>🎯 Elsőre jó: <b>${w.n ? pctOf(w) + "%" : "–"}</b></span><span>${g.pointsIcon} <b>${u.pts}</b></span>`));
  box.append(el("h4", "psub", "Az utolsó 7 nap"));
  box.append(el("div", "weekbars", days.map(x => `<div title="${x.k}: ${x.d.n || 0} feladat"><i class="${x.d.done ? "done" : ""}" style="height:${Math.round((x.d.n || 0) / max * 90)}%"></i>${["V", "H", "K", "Sze", "Cs", "P", "Szo"][new Date(x.k).getDay()]}</div>`).join("")));
  box.append(el("p", "legend", "Zöld oszlop: aznap megvolt a napi küldetés."));
  box.append(el("h4", "psub", `${g.topicWord.many[0].toUpperCase() + g.topicWord.many.slice(1)} – az utolsó 7 nap`));
  const rows = compare(u, C.pack.topics.map(x => ({ id: x.id, label: x.name, icon: x.icon })), "week", t).filter(r => r.cur.n);
  if (!rows.length) box.append(el("p", "soft", "Az utolsó héten még nem gyakoroltál – indulhat egy kör? 🙂"));
  rows.forEach(r => box.append(el("div", "prow", `<span class="pname">${r.icon} ${esc(r.label)}</span><div class="pbar"><i class="${r.pct < 70 ? "r" : r.pct >= 90 ? "g" : ""}" style="width:${r.pct}%"></i></div><span class="pval">${r.pct}% <span class="soft">(${r.cur.n})</span></span>`)));
  box.append(el("h4", "psub", "🏅 Jelvények"));
  const bd = el("div", "badges");
  [...COMMON_BADGES, ...(C.pack.badges || [])].forEach(b => bd.append(el("span", "badge" + (u.badges.includes(b.id) ? "" : " off"), `${b.ic} ${b.n}`)));
  box.append(bd);
}
