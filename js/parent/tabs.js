// ===== A szülői ablak 6 füle =====
// A fülek leírása a közös kerethez (core/tabs.js). Az app egy „app” objektumon keresztül adja a szükséges
// adatokat és műveleteket, így ez a modul nem függ közvetlenül az app.js-től.
import { el, btn, escHtml, toast } from "../core/dom.js";
import { renderForm, resolve } from "../core/settings.js";
import { series, compare, histAgg, pctOf, PERIODS, MIN_ANSWERS } from "../core/progress.js";
import { trendChart } from "../core/charts.js";
import { dayNum, dateKey } from "../core/dates.js";
import { SETTINGS, TOPICS, GAME } from "../game/config.js";

const PER_KEY = "progress_period";
const getPeriod = () => { try { return localStorage.getItem(PER_KEY) || "week"; } catch { return "week"; } };
const setPeriod = p => { try { localStorage.setItem(PER_KEY, p); } catch { /* */ } };

export function parentTabs(app) {
  const { E, TYPES, typeById } = app;
  const child = ctx => app.state.users[ctx.childId];
  const empty = (box, msg = "Még nincs játékos.") => box.append(el("div", "placeholder", msg));

  // ---------- 📊 Fejlődés ----------
  function progress(box, ctx) {
    const u = child(ctx); if (!u) return empty(box);
    const t = dayNum();
    const tile = (title, from) => {
      const s = histAgg(u, from, t), done = Object.entries(u.days || {}).filter(([k, d]) => d.done && k >= dateKey(from) && k <= dateKey(t)).length;
      return `<div class="ptile"><div class="ptile-t">${title}</div><div class="ptile-g"><div><b>${s.n}</b><span>feladat</span></div><div><b>${Math.round(s.ms / 60000)}</b><span>perc</span></div><div><b>${s.n ? pctOf(s) + "%" : "–"}</b><span>elsőre jó</span></div><div><b>${done}</b><span>küldetés</span></div></div></div>`;
    };
    const stars = Object.values(u.types || {}).reduce((a, x) => a + (x.stars || 0), 0);
    box.append(el("div", "pstrip", `<span>🔥 Sorozat: <b>${E.streakNow(u)} nap</b> (legjobb: ${u.streak.best})</span><span>⭐ Csillagok: <b>${stars}</b> / ${TYPES.length * 3}</span><span>${GAME.pointsIcon} Üzemanyag: <b>${u.pts}</b></span>`));
    box.append(el("div", "ptiles", tile("Ma", t) + tile("Utolsó 7 nap", t - 6) + tile("Utolsó 30 nap", t - 29)));

    const period = getPeriod(), P = PERIODS[period];
    const seg = el("div", "segs");
    seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Időszak");
    Object.entries(PERIODS).forEach(([id, Q]) => seg.append(btn("seg" + (id === period ? " on" : ""), Q.label, () => { setPeriod(id); ctx.redraw(); })));
    box.append(el("h4", "psub", "Feladatok és pontosság időben"), seg);
    const pts = series(u, period, t);
    const chartBox = el("div", "trend-chart", trendChart(pts, { step: P.step }));
    if (!pts.some(p => p.n)) chartBox.append(el("div", "trend-empty", "📈 Gyűlik az adat… Az első gyakorlás után itt jelenik meg a görbe."));
    box.append(chartBox, el("p", "legend", `<span class="lg-bar"></span> oszlop: feladatok száma · <span class="lg-line"></span> vonal: elsőre jó válaszok aránya (${P.label === "Nap" ? "naponta" : P.label === "Hét" ? "hetente" : "30 naponta"}; 3 feladat alatt nincs pont)`));

    box.append(el("h4", "psub", `Bolygónként: ${P.cur} (a fekete jel: ${P.prev})`));
    const rows = compare(u, TOPICS(), period, t);
    const list = el("div", "prows");
    rows.forEach(r => {
      const row = el("div", "prow");
      const bar = el("div", "pbar"), fill = el("i");
      fill.style.width = (r.pct || 0) + "%";
      if (r.pct !== null && r.pct < 70) fill.className = "r"; else if (r.pct >= 90) fill.className = "g";
      bar.append(fill);
      if (r.prevPct !== null) { const m = el("b", "pprev"); m.style.left = `calc(${r.prevPct}% - 2px)`; m.title = `${P.prev}: ${r.prevPct}% (${r.prev.n} feladat)`; bar.append(m); }
      const d = r.delta === null ? (r.cur.n || r.prev.n ? `<em class="delta few">${r.few ? "kevés adat" : r.prevPct === null ? "nincs előző" : ""}</em>` : "") : `<em class="delta ${r.delta > 0 ? "up" : r.delta < 0 ? "down" : "same"}">${r.delta > 0 ? "▲ +" + r.delta : r.delta < 0 ? "▼ " + r.delta : "= 0"}%</em>`;
      row.append(el("span", "pname", `${r.icon} ${escHtml(r.label)}`), bar, el("span", "pval", `${r.cur.n ? `${r.pct}% <span class="soft">(${r.cur.n})</span>` : "–"} ${d}`));
      list.append(row);
    });
    box.append(list, el("p", "legend", `Piros: 70% alatt · zöld: 90% fölött · ▲/▼: változás az előző időszakhoz képest (legalább ${MIN_ANSWERS} feladat kell). A gyengébb bolygók vannak felül.`));
  }

  // ---------- 🗺️ Bolygók ----------
  function planets(box, ctx) {
    const u = child(ctx); if (!u) return empty(box);
    const rows = TYPES.map(T => {
      const ts = E.typeState(u, T.id);
      const chips = T.subs.map(s => { const st = u.subs[E.subKey(T.id, s.id)], a = st ? E.subAcc(st) : null; return `<span class="sc ${E.subColor(u, T.id, s.id)}" title="${st ? `${st.n} feladat, az utolsó ${st.last.length}-ból ${Math.round((a || 0) * 100)}% jó` : "még nem próbálta"}">${escHtml(s.name)}${st ? ` · ${Math.round((a || 0) * 100)}%` : ""}</span>`; }).join("");
      return `<tr><td><b>${T.planet.emoji} ${escHtml(T.name)}</b><br><span class="soft small">${"⭐".repeat(ts.stars) || "–"} · ${E.typeLvl(u, T.id)}. szint</span></td><td>${chips}</td></tr>`;
    }).join("");
    box.append(el("div", null, `<table class="tmap">${rows}</table><p class="legend"><span class="sc green">megy</span> <span class="sc yellow">bizonytalan</span> <span class="sc red">gyenge – érdemes együtt átnézni</span> <span class="sc grey">még nem próbálta</span><br>A százalék az utolsó (legfeljebb 10) feladat elsőre jó aránya.</p>`));
  }

  // ---------- 📝 Hibák ----------
  let mistakeFilter = "";
  function mistakes(box, ctx) {
    const u = child(ctx); if (!u) return empty(box);
    const sel = el("select", "mfilter");
    sel.append(new Option("Minden bolygó", ""));
    TYPES.forEach(T => sel.append(new Option(`${T.planet.emoji} ${T.name}`, T.id)));
    sel.value = mistakeFilter;
    sel.addEventListener("change", () => { mistakeFilter = sel.value; ctx.redraw(); });
    box.append(el("div", "form-row", "Szűrés: "), sel);
    box.firstChild.append(sel);
    const log = (u.log || []).filter(l => !mistakeFilter || l.T === mistakeFilter).slice(-60).reverse();
    if (!log.length) return box.append(el("p", "soft", "Itt még nincs hiba – vagy még nem gyakorolt. 🙂"));
    box.append(el("div", "log", log.map(l => { const T = typeById(l.T), s = T && T.subs.find(x => x.id === l.s); return `<div class="log-item"><div class="soft small">${new Date(l.t).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · ${T ? T.planet.emoji + " " + escHtml(T.name) : l.T} – ${s ? escHtml(s.name) : l.s} · ${l.r === 2 ? "🟡 tipp után javította" : "🔴 magyarázat kellett"}</div><div class="lq">${escHtml(l.q)}</div><div class="la">Válasza: <b>${escHtml(l.a)}</b> · Helyes: <b>${escHtml(l.c)}</b>${l.w ? `<br>💡 ${escHtml(l.w)}` : ""}</div></div>`; }).join("")));
  }

  // ---------- ⚙️ Beállítások (gyerekenként) + jutalmak ----------
  function settings(box, ctx) {
    const u = child(ctx); if (!u) return empty(box);
    const defs = SETTINGS.filter(d => d.scope === "child");
    box.append(el("h4", "psub", `Napi cél és gyakorlás – ${escHtml(u.name)}`));
    const form = el("div", "set-form"); box.append(form);
    renderForm(form, defs, def => resolve(def, u.prefs, app.state.settings.childDefaults), (def, v) => { u.prefs = u.prefs || {}; u.prefs[def.key] = v; app.saveUser(u); toast("✅ Elmentve"); });
    const tools = el("div", "form-row");
    tools.append(
      btn("secondary", "↺ Családi alapérték visszaállítása", () => { u.prefs = { ...(app.state.settings.childDefaults || {}) }; app.saveUser(u); ctx.redraw(); toast("✅ Visszaállítva"); }),
      btn("secondary", "📌 Legyen ez a családi alapérték", () => { app.state.settings.childDefaults = Object.fromEntries(defs.map(d => [d.key, resolve(d, u.prefs, app.state.settings.childDefaults)])); app.saveFamily(); toast("✅ Az új gyerekek ezzel indulnak"); }),
    );
    box.append(tools, el("p", "legend", "Tipp: hétvégére emelheted a célt (pl. 20 perc), hétköznap elég a 15 perc. A változás azonnal mentődik."));

    box.append(el("h4", "psub", `🎁 Jutalmak – ${escHtml(u.name)}`));
    const list = el("div");
    (u.rewards || []).forEach(r => {
      const p = E.rewardProgress(u, r);
      const row = el("div", "rw-item", `<span>${escHtml(r.text)} <span class="soft small">(${r.need} ${E.REWARD_KINDS[r.kind]} – most: ${p.have})</span></span>`);
      const right = el("span");
      if (p.claimed) right.append(el("span", "soft small", "✅ átadva"));
      else if (p.done) right.append(btn("secondary", "Átadtam ✓", () => { u.claimed = u.claimed || {}; u.claimed[r.id] = Date.now(); app.saveUser(u); ctx.redraw(); }));
      const del = btn("ghost danger", "🗑️", () => { u.rewards = u.rewards.filter(x => x.id !== r.id); app.saveUser(u); ctx.redraw(); });
      del.setAttribute("aria-label", "Jutalom törlése");
      right.append(del); row.append(right); list.append(row);
    });
    if (!(u.rewards || []).length) list.append(el("p", "soft small", "Még nincs jutalom. Adj hozzá egyet – a gyerek a kezdőképernyőn látja, mennyi hiányzik még."));
    box.append(list);
    const f = el("div", "form-row", `<input class="rw-text" placeholder="pl. Mozi 🎬" maxlength="40" aria-label="Jutalom"><select class="rw-kind" aria-label="Mi alapján">${Object.entries(E.REWARD_KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select><input class="rw-need" type="number" min="1" value="500" aria-label="Cél">`);
    f.append(btn("primary", "Hozzáad", () => {
      const text = f.querySelector(".rw-text").value.trim(), need = +f.querySelector(".rw-need").value;
      if (!text || !(need > 0)) return toast("Add meg a jutalmat és a célt!");
      u.rewards = [...(u.rewards || []), { id: "r" + Date.now().toString(36), text, kind: f.querySelector(".rw-kind").value, need }];
      app.saveUser(u); ctx.redraw();
    }));
    box.append(f);
    const others = Object.values(app.state.users).filter(x => x !== u);
    if (others.length && (u.rewards || []).length) box.append(btn("secondary", `📋 Jutalmak másolása: ${others.map(x => escHtml(x.name)).join(", ")}`, () => {
      others.forEach(x => { const have = new Set((x.rewards || []).map(r => r.text + r.kind + r.need)); x.rewards = [...(x.rewards || []), ...u.rewards.filter(r => !have.has(r.text + r.kind + r.need)).map(r => ({ ...r, id: "r" + Math.random().toString(36).slice(2, 9) }))]; app.saveUser(x); });
      toast("✅ Átmásolva");
    }));
  }

  // ---------- 👪 Család ----------
  function family(box, ctx) {
    box.append(el("h4", "psub", "👧 Játékosok"));
    Object.values(app.state.users).forEach(x => {
      const row = el("div", "rw-item", `<span>${x.avatar} <b>${escHtml(x.name)}</b> <span class="soft small">⛽ ${x.pts} · ${x.total} feladat</span></span>`);
      const del = btn("ghost danger", "🗑️ Törlés", async () => { if (await app.deleteUser(x.name)) ctx.redraw(); });
      row.append(del); box.append(row);
    });
    const r = el("div", "form-row");
    r.append(btn("secondary", "➕ Új játékos", () => app.newPlayer(() => ctx.redraw())));
    box.append(r);
    box.append(el("h4", "psub", "📱 Eszközök"), el("p", "placeholder small", "Az eszközök felismerése és a gyerekek eszközhöz rendelése a következő ütemben érkezik."));
    box.append(el("h4", "psub", "🔑 Szülői PIN"));
    box.append(btn("secondary", "🔑 PIN módosítása", () => app.setNewPin()));
  }

  // ---------- ☁️ Felhő ----------
  function cloudTab(box) { app.renderCloudInto(box); }

  return [
    { id: "progress", icon: "📊", label: "Fejlődés", child: true, help: "Mennyit és milyen pontosan gyakorolt napi, heti és havi bontásban, bolygónként.", render: progress },
    { id: "planets", icon: "🗺️", label: "Bolygók", child: true, help: "Minden bolygó csillagai, szintje és az altípusok állapota (zöld: megy, piros: gyenge).", render: planets },
    { id: "mistakes", icon: "📝", label: "Hibák", child: true, help: "Mit rontott el, mi lett volna a jó válasz, és mi lehetett a hiba oka.", render: mistakes },
    { id: "settings", icon: "⚙️", label: "Beállítások", child: true, help: "Napi cél, a szabad kör hossza, felolvasás és jutalmak – gyerekenként.", render: settings },
    { id: "family", icon: "👪", label: "Család", child: false, help: "Játékosok, eszközök és a szülői PIN.", render: family },
    { id: "cloud", icon: "☁️", label: "Felhő", child: false, help: "Belépés, családtagok, szinkron és eseménynapló.", render: cloudTab },
  ];
}
