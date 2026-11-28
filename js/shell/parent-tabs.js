// ===== A szülői ablak 6 füle =====
// A fülek leírása a közös kerethez (core/tabs.js). A váz egy „app” objektumon keresztül adja a szükséges
// adatokat és műveleteket (players.js); a témafüggő részeket a csomag rajzolja (pack.parentTopics).
import { el, btn, escHtml, toast } from "../core/dom.js";
import { renderForm, resolve } from "../core/settings.js";
import { series, compare, histAgg, pctOf, PERIODS, MIN_ANSWERS } from "../core/progress.js";
import { trendChart } from "../core/charts.js";
import { dayNum, dateKey } from "../core/dates.js";
import { monthKey } from "../core/device.js";
import { multOf } from "../core/dailygoal.js";
import { improvementsIn } from "../core/learning-feedback.js";
import { voiceRow } from "./voice-ui.js";
import { GROUPS } from "./settings-defs.js";

// Bájtok emberi formában
const fmtBytes = b => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : b < 1073741824 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1073741824).toFixed(2)} GB`;
// „ma 16:20”, „tegnap 8:05”, „5 napja”
function seen(t) {
  if (!t) return "–";
  const d = dayNum() - dayNum(new Date(t)), hm = new Date(t).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
  return d <= 0 ? `ma ${hm}` : d === 1 ? `tegnap ${hm}` : `${d} napja`;
}
const MODE_LABEL = { live: "⚡ Folyamatos", task: "✅ Feladatonként", home: "🏠 Főmenüben" };
const SPARK = { down: 10 * 1073741824, store: 1073741824 };   // Spark: 10 GB letöltés / hó, 1 GB tárhely

const PER_KEY = "progress_period";
const getPeriod = () => { try { return localStorage.getItem(PER_KEY) || "week"; } catch { return "week"; } };
const setPeriod = p => { try { localStorage.setItem(PER_KEY, p); } catch { /* */ } };

export function parentTabs(app) {
  const P = app.pack, G = app.game, W = G.topicWord;
  const child = ctx => app.state.users[ctx.childId];
  const TOPICS = () => P.topics.map(t => ({ id: t.id, label: t.name, icon: t.icon, name: t.place }));
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const empty = (box, msg = "Még nincs játékos.") => box.append(el("div", "placeholder", msg));

  // ---------- 📊 Fejlődés ----------
  function progress(box, ctx) {
    const u = child(ctx); if (!u) return empty(box);
    const t = dayNum();
    const tile = (title, from) => {
      const s = histAgg(u, from, t), done = Object.entries(u.days || {}).filter(([k, d]) => d.done && k >= dateKey(from) && k <= dateKey(t)).length;
      return `<div class="ptile"><div class="ptile-t">${title}</div><div class="ptile-g"><div><b>${s.n}</b><span>feladat</span></div><div><b>${Math.round(s.ms / 60000)}</b><span>perc</span></div><div><b>${s.n ? pctOf(s) + "%" : "–"}</b><span>elsőre jó</span></div><div><b>${done}</b><span>küldetés</span></div></div></div>`;
    };
    const metrics = Object.values(P.metrics || {}).map(m => `<span>${m.label}: <b>${m.value(u)}</b></span>`).join("");
    box.append(el("div", "pstrip", `<span>🔥 Sorozat: <b>${app.streakNow(u)} nap</b> (legjobb: ${u.streak.best})</span>${metrics}<span>${G.pointsIcon} ${cap(G.pointsName)}: <b>${u.pts}</b></span>`));
    box.append(el("div", "ptiles", tile("Ma", t) + tile("Utolsó 7 nap", t - 6) + tile("Utolsó 30 nap", t - 29)));
    // 🌱 fejlődésjelzés: korábban nehéz feladat, amely később elsőre, segítség nélkül sikerült
    const imp7 = improvementsIn(u, t - 6, t), imp30 = improvementsIn(u, t - 29, t);
    box.append(el("p", "pnote", imp7 ? `🌱 Az utolsó 7 napban <b>${imp7}</b> korábban nehéz feladat ment már elsőre, segítség nélkül (30 nap: ${imp30}).` : `🌱 Fejlődésjelzés: ha egy korábban elrontott feladat később elsőre, segítség nélkül sikerül, itt megjelenik (30 nap: ${imp30}).`));

    const period = getPeriod(), Q = PERIODS[period];
    const seg = el("div", "segs");
    seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Időszak");
    Object.entries(PERIODS).forEach(([id, X]) => seg.append(btn("seg" + (id === period ? " on" : ""), X.label, () => { setPeriod(id); ctx.redraw(); })));
    box.append(el("h4", "psub", "Feladatok és pontosság időben"), seg);
    const pts = series(u, period, t);
    const chartBox = el("div", "trend-chart", trendChart(pts, { step: Q.step }));
    if (!pts.some(p => p.n)) chartBox.append(el("div", "trend-empty", "📈 Gyűlik az adat… Az első gyakorlás után itt jelenik meg a görbe."));
    box.append(chartBox, el("p", "legend", `<span class="lg-bar"></span> oszlop: feladatok száma · <span class="lg-line"></span> vonal: elsőre jó válaszok aránya (${Q.label === "Nap" ? "naponta" : Q.label === "Hét" ? "hetente" : "30 naponta"}; 3 feladat alatt nincs pont)`));

    box.append(el("h4", "psub", `${cap(W.one)}nként: ${Q.cur} (a fekete jel: ${Q.prev})`));
    const rows = compare(u, TOPICS(), period, t);
    const list = el("div", "prows");
    rows.forEach(r => {
      const row = el("div", "prow");
      const bar = el("div", "pbar"), fill = el("i");
      fill.style.width = (r.pct || 0) + "%";
      if (r.pct !== null && r.pct < 70) fill.className = "r"; else if (r.pct >= 90) fill.className = "g";
      bar.append(fill);
      if (r.prevPct !== null) { const m = el("b", "pprev"); m.style.left = `calc(${r.prevPct}% - 2px)`; m.title = `${Q.prev}: ${r.prevPct}% (${r.prev.n} feladat)`; bar.append(m); }
      const d = r.delta === null ? (r.cur.n || r.prev.n ? `<em class="delta few">${r.few ? "kevés adat" : r.prevPct === null ? "nincs előző" : ""}</em>` : "") : `<em class="delta ${r.delta > 0 ? "up" : r.delta < 0 ? "down" : "same"}">${r.delta > 0 ? "▲ +" + r.delta : r.delta < 0 ? "▼ " + r.delta : "= 0"}%</em>`;
      row.append(el("span", "pname", `${r.icon} ${escHtml(r.label)}`), bar, el("span", "pval", `${r.cur.n ? `${r.pct}% <span class="soft">(${r.cur.n})</span>` : "–"} ${d}`));
      list.append(row);
    });
    box.append(list, el("p", "legend", `Piros: 70% alatt · zöld: 90% fölött · ▲/▼: változás az előző időszakhoz képest (legalább ${MIN_ANSWERS} feladat kell). A gyengébbek vannak felül.`));
  }

  // ---------- 🗺️ Témák (a csomag rajzolja) ----------
  function topicsTab(box, ctx) {
    const u = child(ctx); if (!u) return empty(box);
    P.parentTopics(box, u);
  }

  // ---------- 📝 Hibák ----------
  let mistakeFilter = "";
  const logsFetched = new Set();
  function mistakes(box, ctx) {
    const u = child(ctx); if (!u) return empty(box);
    if (app.cloud.ready && !logsFetched.has(u.name)) {
      logsFetched.add(u.name);
      app.fetchLogs(u.name).then(changed => { if (changed) ctx.redraw(); });
    }
    const sel = el("select", "mfilter");
    sel.append(new Option(`Minden ${W.one}`, ""));
    P.topics.forEach(t => sel.append(new Option(`${t.icon} ${t.name}`, t.id)));
    sel.value = mistakeFilter;
    sel.addEventListener("change", () => { mistakeFilter = sel.value; ctx.redraw(); });
    box.append(el("div", "form-row", "Szűrés: "), sel);
    box.firstChild.append(sel);
    const log = (u.log || []).filter(l => !mistakeFilter || l.T === mistakeFilter).slice(-60).reverse();
    if (!log.length) return box.append(el("p", "soft", "Itt még nincs hiba – vagy még nem gyakorolt. 🙂"));
    box.append(el("div", "log", log.map(l => { return `<div class="log-item"><div class="soft small">${new Date(l.t).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · ${escHtml(P.topicLabel(l.T))} – ${escHtml(P.subLabel(l.T, l.s))} · ${l.r === 2 ? "🟡 tipp után javította" : "🔴 magyarázat kellett"}</div><div class="lq">${escHtml(l.q)}</div><div class="la">Válasza: <b>${escHtml(l.a)}</b> · Helyes: <b>${escHtml(l.c)}</b>${l.w ? `<br>💡 ${escHtml(l.w)}` : ""}</div></div>`; }).join("")));
  }

  // ---------- ⚙️ Beállítások (gyerekenként) + jutalmak ----------
  function settings(box, ctx) {
    const u = child(ctx); if (!u) return empty(box);
    const defs = app.defs.filter(d => d.scope === "child");
    const get = def => resolve(def, u.prefs, app.state.settings.childDefaults);
    const set = (def, v) => { u.prefs = u.prefs || {}; u.prefs[def.key] = v; app.saveUser(u); toast("✅ Elmentve"); };
    GROUPS.forEach(gr => {
      const gd = defs.filter(d => (d.group || "play") === gr.id);
      if (!gd.length) return;
      box.append(el("h4", "psub", `${gr.title} – ${escHtml(u.name)}`));
      const form = el("div", "set-form"); box.append(form);
      renderForm(form, gd, get, set);
      // 🗣️ felolvasó hang: közvetlenül a „Felolvasás alapból bekapcsolva” alatt (eszközönként, nem gyerekenként)
      const tts = form.querySelector("#set-tts"); if (tts) voiceRow(tts.closest(".set-row"));
      if (gr.id === "goal") goalExtras(box, u, ctx);
    });
    const tools = el("div", "form-row");
    tools.append(
      btn("secondary", "↺ Családi alapérték visszaállítása", () => { u.prefs = { ...(app.state.settings.childDefaults || {}) }; app.saveUser(u); ctx.redraw(); toast("✅ Visszaállítva"); }),
      btn("secondary", "📌 Legyen ez a családi alapérték", () => { app.state.settings.childDefaults = Object.fromEntries(defs.map(d => [d.key, get(d)])); app.saveFamily(); toast("✅ Az új gyerekek ezzel indulnak"); }),
    );
    box.append(tools, el("p", "legend", "Tipp: hétvégére emelheted a célt (pl. 20 perc), hétköznap elég a 15 perc. A változás azonnal mentődik."));

    box.append(el("h4", "psub", `🎁 Jutalmak – ${escHtml(u.name)}`));
    const list = el("div");
    (u.rewards || []).forEach(r => {
      const p = app.rewardProgress(u, r);
      const row = el("div", "rw-item", `<span>${escHtml(r.text)} <span class="soft small">(${r.need} ${app.rewardKinds()[r.kind] || ""} – most: ${p.have})</span></span>`);
      const right = el("span");
      if (p.claimed) right.append(el("span", "soft small", "✅ átadva"));
      else if (p.done) right.append(btn("secondary", "Átadtam ✓", () => { u.claimed = u.claimed || {}; u.claimed[r.id] = Date.now(); app.saveUser(u); ctx.redraw(); }));
      const del = btn("ghost danger", "🗑️", () => { u.rewards = u.rewards.filter(x => x.id !== r.id); app.saveUser(u); ctx.redraw(); });
      del.setAttribute("aria-label", "Jutalom törlése");
      right.append(del); row.append(right); list.append(row);
    });
    if (!(u.rewards || []).length) list.append(el("p", "soft small", "Még nincs jutalom. Adj hozzá egyet – a gyerek a kezdőképernyőn látja, mennyi hiányzik még."));
    box.append(list);
    const f = el("div", "form-row", `<input class="rw-text" placeholder="pl. Mozi 🎬" maxlength="40" aria-label="Jutalom"><select class="rw-kind" aria-label="Mi alapján">${Object.entries(app.rewardKinds()).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select><input class="rw-need" type="number" min="1" value="500" aria-label="Cél">`);
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

  // ---------- 🏆 Napi cél: mai pontszorzó és témazár ----------
  function goalExtras(box, u, ctx) {
    const m = multOf(u), row = el("div", "set-row");
    row.append(el("label", "set-label", `⚡ Mai pontszorzó<span class="set-help">Ma minden helyes válasz ennyinek számít a napi nagy célhoz. Holnap magától visszaáll ×1-re.</span>`));
    const ctl = el("div", "set-ctl segs");
    [1, 2, 3].forEach(v => ctl.append(btn("seg" + (m === v ? " on" : ""), "×" + v, () => { app.setTodayMult(u, v); ctx.redraw(); toast(v > 1 ? `✅ Ma ×${v} pont nap!` : "✅ Szorzó kikapcsolva"); })));
    row.append(ctl); box.append(row);
    const lock = el("div", "set-row lockrow");
    lock.append(el("label", "set-label", `🔒 Lezárt ${W.many}<span class="set-help">A lezártat a gyerek nem indíthatja el, és a napi küldetésbe sem kerül – így több idő jut a gyengébb részekre. A zár addig marad, amíg itt fel nem oldod.</span>`));
    const lc = el("div", "lockgrid"), cur = new Set((u.block && u.block.topics) || []);
    P.topics.forEach(t => {
      const l = el("label", "lockitem" + (cur.has(t.id) ? " on" : "")), cb = el("input"); cb.type = "checkbox"; cb.checked = cur.has(t.id);
      cb.addEventListener("change", () => { const n = new Set((u.block && u.block.topics) || []); if (cb.checked) n.add(t.id); else n.delete(t.id); if (!app.setBlocked(u, [...n])) cb.checked = false; ctx.redraw(); });
      l.append(cb, el("span", null, `${t.icon} ${escHtml(t.place || t.name)}`)); lc.append(l);
    });
    lock.append(lc); box.append(lock);
  }

  // ---------- Eszközök: közös gyorsítótár a Család és a Felhő fülhöz ----------
  let devs = null, devAt = 0, devBusy = false;
  function loadDevices(ctx) {
    if (devBusy || Date.now() - devAt < 15000) return;
    devBusy = true;
    app.devicesList().then(r => {
      const changed = JSON.stringify(r) !== JSON.stringify(devs);
      devs = r; devAt = Date.now(); devBusy = false;
      if (changed) ctx.redraw();
    }, () => { devBusy = false; });
  }

  // ---------- 👪 Család ----------
  function family(box, ctx) {
    const users = Object.values(app.state.users);
    box.append(el("h4", "psub", "👧 Játékosok"));
    users.forEach(x => {
      const row = el("div", "rw-item", `<span>${x.avatar} <b>${escHtml(x.name)}</b> <span class="soft small">${G.pointsIcon} ${x.pts} · ${x.total} feladat</span></span>`);
      const acts = el("span", "rw-acts");
      acts.append(btn("ghost", "✏️ Átnevezés", async () => { if (await app.renameUser(x.name)) ctx.redraw(); }));
      acts.append(btn("ghost danger", "🗑️ Törlés", async () => { if (await app.deleteUser(x.name)) ctx.redraw(); }));
      row.append(acts); box.append(row);
    });
    const r = el("div", "form-row");
    r.append(btn("secondary", "➕ Új játékos", () => app.newPlayer(() => ctx.redraw())));
    box.append(r);

    // Eszközök: ki játszik melyik eszközön
    box.append(el("h4", "psub", "📱 Eszközök – ki játszik rajtuk?"));
    loadDevices(ctx);
    const list = devs ? devs.list : [{ id: app.device.id, name: app.device.name, model: "", lastSeen: Date.now(), kids: app.device.kids, syncMode: app.device.syncMode, me: true }];
    const wrap = el("div", "devwrap"), tb = el("table", "devtable");
    tb.innerHTML = `<thead><tr><th>Eszköz</th><th>Utoljára</th>${users.map(u => `<th class="c" title="${escHtml(u.name)}">${u.avatar}<br><span class="small">${escHtml(u.name)}</span></th>`).join("")}<th></th></tr></thead>`;
    const body = el("tbody");
    list.forEach(d => {
      const tr = el("tr", d.me ? "me" : "");
      const old = d.lastSeen && dayNum() - dayNum(new Date(d.lastSeen)) > 60;
      const td0 = el("td");
      const name = el("input", "devname"); name.value = d.name; name.maxLength = 40; name.setAttribute("aria-label", "Eszköz neve");
      name.addEventListener("change", () => app.renameDevice(d.id, name.value).then(ok => { if (ok) { toast("✅ Átnevezve"); devAt = 0; } }));
      td0.append(name, el("div", "soft small", `${d.me ? "<b>ez az eszköz</b>" : escHtml(d.model || "")}${old ? ' · <span class="tag-old">régi</span>' : ""}`));
      tr.append(td0, el("td", "small", seen(d.lastSeen)));
      users.forEach(u => {
        const td = el("td", "c"), cb = el("input"); cb.type = "checkbox";
        cb.checked = !!(d.kids && d.kids.includes(u.id));
        cb.setAttribute("aria-label", `${u.name} játszhat ezen: ${d.name}`);
        cb.addEventListener("change", () => {
          const k = new Set(d.kids || []); if (cb.checked) k.add(u.id); else k.delete(u.id);
          d.kids = k.size ? [...k] : null;
          app.setDeviceKids(d.id, d.kids).then(ok => toast(ok ? "✅ Elmentve" : "💾 Ezen az eszközön elmentve – a felhőbe a következő szinkronkor kerül"));
        });
        td.append(cb); tr.append(td);
      });
      // a szinkronmód csak a ☁️ Felhő fülön látszik és állítható (ezen az eszközön)
      const tdd = el("td");
      if (!d.me) tdd.append(btn("ghost danger", "🗑️", async () => { if (await app.removeDevice(d.id, d.name)) { devAt = 0; devs.list = devs.list.filter(x => x.id !== d.id); ctx.redraw(); } }));
      tr.append(tdd); body.append(tr);
    });
    tb.append(body); wrap.append(tb); box.append(wrap);
    box.append(el("p", "legend", `Pipa nélkül mindenki játszhat az eszközön (a játékosválasztó minden gyereket mutat). Egy pipa: a játék automatikusan az ő nevével indul. ${!app.cloud.ready ? "A többi eszköz a felhős belépés után jelenik meg." : devs ? "" : "Eszközlista betöltése…"}`));

    box.append(el("h4", "psub", "🔑 Szülői PIN"));
    box.append(btn("secondary", "🔑 PIN módosítása", () => app.setNewPin()));
  }

  // ---------- ☁️ Felhő ----------
  // ---------- 💾 Helyi mentés ezen az eszközön ----------
  function localSaveSection(box, ctx) {
    box.append(el("h4", "psub", "💾 Helyi mentés ezen az eszközön"));
    const st = app.localSave ? app.localSave.status : null;
    const info = !st ? "⚠️ A böngésző nem engedi a biztonságos mentést – egyszerű helyi mentés fut."
      : (st.lastSaved ? `✅ Működik · utolsó helyi mentés: ${new Date(st.lastSaved).toLocaleTimeString("hu-HU")}` : "✅ Működik · még nem volt mentés ezen a lapon") + (st.phase === "error" ? " · ⚠️ az utolsó mentés nem sikerült, újrapróbálja" : "");
    box.append(el("p", "small soft", info), el("p", "legend", "Mentés után visszaolvassa és ellenőrzi az adatot, megtartja az előző mentést, hibánál újrapróbál, és egyszerre csak egy lapon enged játszani."));
    box.append(btn("secondary", "⬇️ Mentés letöltése (JSON)", () => app.exportState()),
      el("p", "legend", "A letöltött fájlban a család minden adata és a szülői PIN ujjlenyomata is benne van – ne oszd meg, és ne tedd nyilvános helyre."));
  }

  function cloudTab(box, ctx) {
    localSaveSection(box, ctx);
    // Szinkronmód ehhez az eszközhöz
    box.append(el("h4", "psub", "🔁 Szinkron ezen az eszközön"));
    const form = el("div", "set-form");
    renderForm(form, app.defs.filter(d => d.scope === "device" && d.key === "syncMode"), () => app.cloud.mode, (def, v) => { app.cloud.setMode(v); devAt = 0; toast("✅ Szinkronmód: " + (MODE_LABEL[v] || v)); });
    box.append(form);

    // Forgalom ebben a hónapban
    loadDevices(ctx);
    const m = monthKey(), mine = app.device.traffic(m);
    const others = devs ? devs.list.filter(d => !d.me) : [];
    const fam = others.reduce((a, d) => { const t = (d.traffic || {})[m] || {}; a.up += t.up || 0; a.down += t.down || 0; a.syncs += t.syncs || 0; return a; }, { ...mine });
    const store = app.cloud.storageEstimate();
    const pct = (a, b) => Math.min(100, a / b * 100);
    const bar = (p) => `<div class="pbar sbar"><i style="width:${Math.max(p, 0.5)}%" class="${p > 80 ? "r" : p > 50 ? "" : "g"}"></i></div>`;
    box.append(el("h4", "psub", `📶 Forgalom – ${m.replace("-", ". ")}.`));
    box.append(el("div", "ptiles", `
      <div class="ptile"><div class="ptile-t">Ez az eszköz</div><div class="ptile-g g3"><div><b>${fmtBytes(mine.up)}</b><span>feltöltve</span></div><div><b>${fmtBytes(mine.down)}</b><span>letöltve</span></div><div><b>${mine.syncs}</b><span>szinkron</span></div></div></div>
      <div class="ptile"><div class="ptile-t">A család összesen${devs ? ` (${devs.list.length} eszköz)` : ""}</div><div class="ptile-g g3"><div><b>${fmtBytes(fam.up)}</b><span>feltöltve</span></div><div><b>${fmtBytes(fam.down)}</b><span>letöltve</span></div><div><b>${fam.syncs}</b><span>szinkron</span></div></div></div>`));
    const spark = el("div", "spark");
    spark.innerHTML = `<div class="spark-row"><span>Letöltés ebben a hónapban</span>${bar(pct(fam.down, SPARK.down))}<b>${pct(fam.down, SPARK.down).toFixed(3)}%</b><span class="soft small">${fmtBytes(fam.down)} / 10 GB</span></div>
      <div class="spark-row"><span>Tárhely</span>${bar(pct(store, SPARK.store))}<b>${pct(store, SPARK.store).toFixed(3)}%</b><span class="soft small">${fmtBytes(store)} / 1 GB</span></div>`;
    box.append(el("p", "small", "<b>Becsült Spark-felhasználás</b> (ingyenes Firebase-csomag):"), spark);
    box.append(el("p", "legend", `Ez <b>becslés</b>: az app minden küldött és fogadott adatot megmér (+200 bájt protokoll-többlet üzenetenként). A pontos adatok a Firebase-konzolban vannak (Realtime Database → Usage)${app.consoleUrl ? ` – <a href="${app.consoleUrl}" target="_blank" rel="noopener">megnyitás</a>` : ""}.`));

    // Belépés, családtagok, eseménynapló
    box.append(el("h4", "psub", "☁️ Fiók és család"));
    app.renderCloudInto(box);
  }

  return [
    { id: "progress", icon: "📊", label: "Fejlődés", child: true, help: `Mennyit és milyen pontosan gyakorolt napi, heti és havi bontásban, ${W.one}nként.`, render: progress },
    { id: "topics", icon: (W.tab || "🗺️ Témák").split(" ")[0], label: (W.tab || "🗺️ Témák").split(" ").slice(1).join(" "), child: true, help: `Minden ${W.one} állapota (zöld: megy, piros: gyenge).`, render: topicsTab },
    { id: "mistakes", icon: "📝", label: "Hibák", child: true, help: "Mit rontott el, mi lett volna a jó válasz, és mi lehetett a hiba oka.", render: mistakes },
    { id: "settings", icon: "⚙️", label: "Beállítások", child: true, help: "Gyakorlás, napi cél és szorzók, ünnepek és jutalmak – gyerekenként.", render: settings },
    { id: "family", icon: "👪", label: "Család", child: false, help: "Játékosok (átnevezés, törlés), melyik eszközön ki játszik, szülői PIN.", render: family },
    { id: "cloud", icon: "☁️", label: "Felhő", child: false, help: "Szinkronmód, adatforgalom és Spark-becslés, belépés, családtagok, eseménynapló.", render: cloudTab },
  ];
}
