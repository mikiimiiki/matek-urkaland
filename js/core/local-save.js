// ===== Biztonságos helyi mentés (localStorage) – játékfüggetlen, DOM nélkül =====
// A mentés formátuma NEM változik: ugyanaz a JSON, ugyanazon a kulcson (storeKey). Amit hozzátesz:
//  - mentés előtt alapszerkezet-ellenőrzés, írás után visszaolvasás (csak egyezésnél „mentve”)
//  - az előző mentés megtartása: <kulcs>__previous_v1 (egyetlen gördülő előzmény)
//  - írási hiba (pl. tele a tárhely): a legújabb állapot függőben marad, lépcsőzetes újrapróbálás
//  - sérült tárolt adat: nem írja felül csendben; a nyers eredeti <kulcs>__corrupt_v1 alatt megmarad,
//    és a szülő dönthet: visszaállítás az előző mentésből, vagy indulás üresen (a felhőből)
// Több lap: ezt a tab-lease.js kezeli (mindig csak az utolsó lap ír).
export const PREV = "__previous_v1", BAD = "__corrupt_v1";
export const emptyState = () => ({ familyCode: "", current: "", users: {}, settings: {}, deleted: {} });
const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);

// Alapszerkezet-ellenőrzés (a csomagsaját mezőket nem vizsgálja)
export function validateState(s) {
  if (!isObj(s) || !isObj(s.users)) throw new Error("A mentésben nincs játékoslista.");
  for (const f of ["settings", "deleted"]) if (s[f] !== undefined && !isObj(s[f])) throw new Error(`Hibás mező: ${f}`);
  for (const f of ["current", "familyCode"]) if (s[f] !== undefined && typeof s[f] !== "string") throw new Error(`Hibás mező: ${f}`);
  for (const [n, u] of Object.entries(s.users)) {
    if (!isObj(u)) throw new Error(`Hibás játékos: ${n}`);
    if (u.pts !== undefined && !(Number.isFinite(u.pts) && u.pts >= 0)) throw new Error(`Hibás pontszám: ${n}`);
  }
  return s;
}
// Egy tárolt szöveg beolvasása: { ok, state } vagy { ok: false, error }
export function parseStored(raw) {
  if (raw == null) return { ok: true, state: emptyState(), empty: true };
  try { return { ok: true, state: validateState(JSON.parse(raw)) }; }
  catch (e) { return { ok: false, error: e.message || String(e) }; }
}

// storage: localStorage-szerű ({ getItem, setItem }); onStatus({ phase, pending, lastSaved, error })
// phase: ready · saved · error (újrapróbál) · invalid (a memóriabeli állapot hibás – nem írja ki) · stopped
export function createLocalSave({ key, storage, onStatus = () => {}, schedule = (f, ms) => setTimeout(f, ms), cancel = t => clearTimeout(t), canWrite = () => true }) {
  if (!key) throw new Error("Hiányzó tárolókulcs.");
  let pending = null, timer = null, attempts = 0, lastSaved = null, phase = "ready", error = null, stopped = false;
  const status = () => ({ phase, pending: pending !== null, lastSaved, error, attempts });
  const emit = (p, e = null) => { phase = p; error = e ? String(e.message || e) : null; try { onStatus(status()); } catch (x) { console.warn(x); } };
  const later = () => {
    if (timer !== null || stopped) return;
    timer = schedule(() => { timer = null; flush(); }, Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)));
  };

  function load() {
    let raw = null;
    try { raw = storage.getItem(key); } catch (e) { return { ok: false, error: "A böngésző tárhelye nem érhető el: " + (e.message || e), raw: null, previous: null }; }
    const r = parseStored(raw);
    if (r.ok) { emit("ready"); return { ok: true, state: r.state, empty: !!r.empty }; }
    let prevRaw = null; try { prevRaw = storage.getItem(key + PREV); } catch { /* */ }
    const p = prevRaw == null ? null : parseStored(prevRaw);
    return { ok: false, error: r.error, raw, previous: p && p.ok ? p.state : null };
  }
  // A memóriabeli állapot kiírása (ha a lap aktív). true = most sikeresen mentve.
  function save(state) {
    if (stopped) return false;
    try { const s = JSON.stringify(state); validateState(JSON.parse(s)); pending = s; }
    catch (e) { emit("invalid", e); return false; }
    return flush();
  }
  function flush() {
    if (timer !== null) { cancel(timer); timer = null; }
    if (stopped || pending === null) return pending === null;
    if (!canWrite()) return false;               // inaktív lap: nem ír
    try {
      const cur = storage.getItem(key);
      if (cur === pending) { pending = null; attempts = 0; lastSaved = Date.now(); emit("saved"); return true; }
      if (cur !== null && parseStored(cur).ok) {    // csak ép mentésből lesz „előző”
        storage.setItem(key + PREV, cur);
        if (storage.getItem(key + PREV) !== cur) throw new Error("Az előző mentés megtartása nem sikerült.");
      }
      const next = pending;
      storage.setItem(key, next);
      if (storage.getItem(key) !== next) throw new Error("A mentés visszaolvasása eltért.");
      pending = null; attempts = 0; lastSaved = Date.now(); emit("saved"); return true;
    } catch (e) { emit("error", e); later(); return false; }
  }
  // Sérült mentés kezelése (a szülő döntése után). A nyers eredeti mindig megmarad a __corrupt_v1 kulcson.
  function keepCorrupt(raw) { if (raw != null) storage.setItem(key + BAD, raw); }
  function restorePrevious(raw, prevState) {
    keepCorrupt(raw);
    const s = JSON.stringify(validateState(prevState));
    storage.setItem(key, s);
    if (storage.getItem(key) !== s) throw new Error("A visszaállítás nem sikerült.");
    return true;
  }
  function startEmpty(raw) {
    keepCorrupt(raw);
    const s = JSON.stringify(emptyState());
    storage.setItem(key, s);
    return storage.getItem(key) === s;
  }
  return {
    load, save, flush, restorePrevious, startEmpty,
    stop() { stopped = true; if (timer !== null) { cancel(timer); timer = null; } emit("stopped"); },
    get status() { return status(); },
  };
}
