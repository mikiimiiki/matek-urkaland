// ===== Biztonságos helyi mentés a vázban: kapcsoló, egy aktív lap, hibasáv, sérült mentés, letöltés =====
// Alapból KIKAPCSOLT (a régi mentés fut). Eszközönként bekapcsolható: ?helyimentes=be (vissza: ?helyimentes=ki),
// vagy a ⚙️ → Felhő fülön. A mentés formátuma nem változik, így a ki- és bekapcsolás adatvesztés nélkül oda-vissza megy.
import { el, btn, escHtml as esc } from "../core/dom.js";
import { ask } from "../core/modal.js";
import { createLocalSave, PREV, BAD } from "../core/local-save.js";
import { createTabLease } from "../core/tab-lease.js";
import { C } from "./ctx.js";
import { verifyPin } from "./players.js";

const FLAG = "__helyimentes";
const ls = () => { try { return globalThis.localStorage; } catch { return null; } };
// A kapcsoló: az URL-paraméter eszközönként megmarad
export function localSaveEnabled(storeKey) {
  const s = ls(); if (!s) return false;
  const p = new URLSearchParams(location.search).get("helyimentes");
  try { if (p === "be" || p === "ki") s.setItem(storeKey + FLAG, p); return s.getItem(storeKey + FLAG) === "be"; } catch { return false; }
}
export function setLocalSaveEnabled(storeKey, on) { try { ls().setItem(storeKey + FLAG, on ? "be" : "ki"); } catch { /* */ } }

// Indítás: { ok, state } – vagy { ok: false } (sérült mentés: a helyreállító panel már látszik, a váz ne induljon)
export function initLocalSave(storeKey) {
  const storage = ls();
  const lease = createTabLease({ key: storeKey, storage, onLost: showTakenOver });
  const store = createLocalSave({ key: storeKey, storage, onStatus: showStatus, canWrite: () => lease.isActive() });
  const r = store.load();
  if (!r.ok) { showCorrupt(storeKey, store, r); return { ok: false }; }
  lease.claim();
  addEventListener("storage", e => lease.onStorage(e));
  const flush = () => { if (!lease.lost) store.flush(); };
  addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  C.localSave = {
    save: state => store.save(state),
    get active() { return !lease.lost && lease.isActive(); },
    get status() { return store.status; },
  };
  return { ok: true, state: r.state };
}

// --- Hibasáv: csak baj esetén látszik ---
let bar = null;
function showStatus(s) {
  const bad = s.phase === "error" || s.phase === "invalid";
  if (!bad) { if (bar) { bar.remove(); bar = null; } return; }
  if (!bar) {
    bar = el("div", "ls-bar"); bar.setAttribute("role", "alert");
    document.body.prepend(bar);
  }
  bar.innerHTML = "";
  bar.append(el("span", null, s.phase === "invalid"
    ? `⚠️ A legutóbbi állapot hibás, ezért nem mentettem el (a korábbi mentés megmaradt). ${esc(s.error || "")}`
    : `⚠️ A helyi mentés most nem sikerült – az eredmények egyelőre csak a memóriában vannak. Újrapróbálom… ${esc(s.error || "")}`));
  if (s.phase === "error") bar.append(btn("secondary", "💾 Mentés újra", () => { if (C.localSave && C.state) C.localSave.save(C.state); }));
}

// --- Egy aktív lap: a régi lap lezárul ---
function showTakenOver() {
  if (document.querySelector(".ls-cover")) return;
  const cover = el("div", "ls-cover");
  const box = el("div", "ls-box");
  box.append(el("div", "big-emoji", "🗂️"), el("h3", null, "A játék egy másik lapon fut"),
    el("p", null, "Ezen a lapon már nem mentünk, hogy a két lap ne írja felül egymást. Folytasd a másik lapon – vagy vedd át ide."),
    btn("primary", "▶️ Átveszem itt", () => location.reload()));
  cover.append(box); document.body.append(cover);
  cover.querySelector("button").focus();
}

// --- Sérült mentés: a játék nem indul el, a szülő dönt (PIN-nel, ha van) ---
function download(text, name) {
  const a = el("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json;charset=utf-8" })); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function exportState(state, name = "gyakorlo-mentes") { download(JSON.stringify(state, null, 2), `${name}-${new Date().toISOString().slice(0, 10)}.json`); }

function showCorrupt(storeKey, store, r) {
  const cover = el("div", "ls-cover");
  const box = el("div", "ls-box");
  const prev = r.previous, parent = prev && prev.parent;
  box.append(el("div", "big-emoji", "🛟"), el("h3", null, "A mentés nem tölthető be"),
    el("p", null, "Szólj a szülőnek! A tárolt adat sérült, ezért a játék nem indult el – és semmit nem írtunk felül."),
    el("p", "soft small", "Részlet: " + esc(r.error || "")));
  const row = el("div", "mbtns");
  if (r.raw != null) row.append(btn("secondary", "⬇️ Sérült eredeti letöltése", () => download(r.raw, "gyakorlo-serult-mentes.json")));
  row.append(btn("primary", "👪 Szülő: helyreállítás", async () => {
    // PIN: az előző (ép) mentésben tárolt szülői PIN-nel; ha nincs PIN, nincs mit védeni
    if (parent && parent.hash) {
      const p = await ask({ title: "Szülői PIN", text: "Írd be a szülői PIN-kódot a helyreállításhoz.", value: "", secret: true });
      if (p == null) return;
      if (!(await verifyPin(parent, p))) { alertMsg("❌ Hibás PIN."); return; }
    }
    chooseRestore();
  }));
  box.append(row); cover.append(box); document.body.append(cover);
  const msg = el("p", "ls-msg"); box.append(msg);
  function alertMsg(t) { msg.textContent = t; }
  function chooseRestore() {
    row.innerHTML = "";
    if (r.raw != null) row.append(btn("secondary", "⬇️ Sérült eredeti letöltése", () => download(r.raw, "gyakorlo-serult-mentes.json")));
    if (prev) row.append(btn("primary", "↩️ Visszaállítás az előző mentésből", () => {
      try { store.restorePrevious(r.raw, prev); location.reload(); } catch (e) { alertMsg("❌ " + (e.message || e)); }
    }));
    row.append(btn(prev ? "secondary" : "primary", "🆕 Indulás üresen (a felhős család újra letölti)", () => {
      try { store.startEmpty(r.raw); location.reload(); } catch (e) { alertMsg("❌ " + (e.message || e)); }
    }));
    alertMsg(`A sérült eredeti megmarad a böngészőben (${storeKey + BAD}), ${prev ? "és az előző mentés ép." : "de előző mentés nincs."}`);
  }
}
export { PREV };
