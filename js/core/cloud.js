// ===== Felhős mentés: Firebase Authentication (Google) + Realtime Database =====
// A Massalhangzok családi modelljét követi: a szülő Google-lel lép be, a család adatait csak a
// családhoz hozzáadott e-mail-címek olvashatják és írhatják (lásd database.rules.json).
// Ha nincs beállítva Firebase (üres apiKey) vagy nincs net, az app helyi módban (localStorage) működik tovább.
//
// Szinkronmódok (eszközönként, a ⚙️ Felhő fülön):
//   ⚡ live – folyamatos kapcsolat, élő figyelők; feltöltés minden feladat után
//   ✅ task – feltöltés minden feladat után; letöltés induláskor, főmenübe lépéskor, a ⚙️ ablak nyitásakor;
//             a kapcsolat csak a művelet idejére nyílik (utána 30 mp-cel bont)
//   🏠 home – feltöltés és letöltés csak főmenübe lépéskor, induláskor, a ⚙️ ablak nyitásakor és az oldal elhagyásakor
// Mindegyik módban: csak a megváltozott mezők mennek fel (core/syncdiff.js), a hibanapló külön ágon van
// (families/{fam}/logs/{gyerek}), és 5 perc tétlenség vagy háttérbe kerülés után a kapcsolat szünetel.
//
// Felhőszerkezet: families/{fam}/ users/{gyerek} · logs/{gyerek}/{időbélyeg} · settings · parent · deleted ·
//                 devices/{eszköz} · members   (a szabályok a families/{fam} alatt mindent a tagoknak engednek)
import { diff, merge, apply, stable, bytes, clone } from "./syncdiff.js";
import { guessName, monthKey } from "./device.js";
import { makeRetry } from "./retry.js";

const FB_BASE = "https://www.gstatic.com/firebasejs/13.2.0/";
const PUSH_DELAY = 1500;      // feladat után ennyi várakozással küldünk (ha gyorsan jön a következő válasz, egyben megy)
const STEP_TIMEOUT = 15000;   // ennyi idő után egy lépést "lassúnak" jelzünk
const OFF_AFTER = 30000;      // task/home módban ennyi idővel az utolsó művelet után bontjuk a kapcsolatot
const IDLE_MS = 5 * 60000;    // tétlenség után szünetel
const DEVICE_EVERY = 10 * 60000; // az eszköz adatai (forgalom, utoljára látva) legfeljebb ilyen gyakran mennek fel
const OVERHEAD = 200;         // becsült protokoll-többlet üzenetenként (bájt)
export const MODES = ["live", "task", "home"];

export const safeKey = n => n.replace(/[.$#\[\]\/]/g, "_");
export const emailKey = e => (e || "").trim().toLowerCase().replace(/\./g, ",");
// A Firebase nem fogad el undefined értéket és bizonyos karaktereket a kulcsokban – küldés előtt megtisztítjuk
const BAD_KEY = /[.$#\[\]\/]/;
export function clean(v) {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) { if (x === undefined) continue; o[BAD_KEY.test(k) ? k.replace(/[.$#\[\]\/]/g, ":") : k] = clean(x); } return o; }
  return v;
}
const arr = x => Array.isArray(x) ? x : Object.values(x || {});
const hhmm = t => new Date(t).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: "timeout", message: what }), ms))]);
// A felhasználó felhőbe kerülő része: a hibanapló nélkül (az külön ágon van)
export const forSync = u => clean({ ...u, log: undefined });
// Két hibanapló egyesítése időbélyeg szerint (legfeljebb max bejegyzés, a legújabbak)
export function mergeLogs(a, b, max = 120) {
  const m = new Map();
  [...arr(a), ...arr(b)].forEach(l => { if (l && l.t) m.set(String(l.t), l); });
  return [...m.values()].sort((x, y) => x.t - y.t).slice(-max);
}

// Hibakódok emberi nyelven
function errText(e) {
  const c = (e && (e.code || e.message)) || String(e);
  if (/permission[_-]denied/i.test(c)) return "Nincs hozzáférés (az adatbázis szabályai elutasították). Ellenőrizd, hogy a database.rules.json publikálva van-e, és hogy a fiók tagja-e a családnak.";
  if (/popup-closed-by-user|cancelled-popup-request/.test(c)) return "A belépési ablakot bezártad.";
  if (/popup-blocked/.test(c)) return "A böngésző letiltotta a felugró ablakot – engedélyezd ennél az oldalnál.";
  if (/unauthorized-domain/.test(c)) return "Ez a webcím nincs engedélyezve a Firebase-ben (Authentication → Settings → Authorized domains).";
  if (/operation-not-allowed/.test(c)) return "A Google-belépés nincs bekapcsolva a Firebase-ben (Authentication → Sign-in method).";
  if (/^timeout$/.test(c)) return "A szerver nem válaszolt időben – gyenge net, vagy valami (vírusirtó, reklámblokkoló, céges hálózat) letiltja a Firebase-t.";
  if (/network-request-failed|network|offline/i.test(c)) return "Hálózati hiba – nincs internet, vagy valami (vírusirtó, reklámblokkoló, céges hálózat) letiltja a Firebase-t.";
  if (/invalid key|contains an invalid/i.test(c)) return "Érvénytelen adat a mentésben: " + c;
  return c;
}

export function createCloud(api) {
  // api: { config (Firebase-beállítás), state(), persist(), refresh(), onStatus(status), normUser(u), device, storeKey, onDevice(rec) }
  const FIREBASE_CONFIG = api.config || {};
  const dev = api.device;
  let fb = null, db = null, fa = null, auth = null, user = null, member = false, note = "", authKnown = false;
  let unsubs = [], pushT = null, offT = null;
  // állapot
  let phase = "init";            // init | signin | family | ready
  let initError = null, lastError = null, connected = false, everConnected = false, gotData = false;
  let inflight = 0, pulling = 0, lastDown = 0, lastUp = 0, slow = null, phaseSince = Date.now();
  let online = true, paused = false, pauseWhy = "", lastAct = Date.now(), lastDevPush = 0, remoteDev = null;
  const pending = new Set();
  const events = [];
  const sizes = { users: 0, settings: 0, parent: 0, deleted: 0, devices: 0, logs: {} };
  const S = () => api.state();
  const fam = () => (S().familyCode || "").replace(/[^a-z0-9_-]/gi, "");
  const me = () => emailKey(user && user.email);
  const ready = () => !!(db && user && member && fam().length >= 6);
  const configured = !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey) || !!api.firebase;
  const mode = () => (MODES.includes(dev.syncMode) ? dev.syncMode : "task");

  // ---- Mit tudunk a felhőről (a részleges mentéshez): gyerekenként az utolsó ismert felhőállapot ----
  const SNAP = (api.storeKey || "cloud") + "_sync";
  let snap = (() => { try { return JSON.parse(localStorage.getItem(SNAP) || "null"); } catch { return null; } })() || {};
  const resetSnap = () => { snap = { fam: fam(), users: {}, logs: {}, legacy: {} }; };
  if (!snap.users) resetSnap();
  const saveSnap = () => { try { localStorage.setItem(SNAP, JSON.stringify(snap)); } catch { /* tele a tárhely: a következő letöltéskor újraépül */ } };
  const checkSnapFam = () => { if (snap.fam !== fam()) { resetSnap(); saveSnap(); } };

  function log(icon, text, isErr = false) {
    events.push({ t: Date.now(), icon, text, err: isErr });
    if (events.length > 40) events.shift();
    (isErr ? console.warn : console.info)(`[felhő] ${icon} ${text}`);
    emit();
  }
  function setPhase(p) { phase = p; phaseSince = Date.now(); slow = null; emit(); }
  const countDown = v => { const b = bytes(v) + OVERHEAD; dev.count("down", b); return b; };
  const countUp = v => { const b = bytes(v) + OVERHEAD; dev.count("up", b); return b; };
  const kb = b => b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;

  // ---- Állapot kiszámítása: ikon + rövid szöveg + részletes magyarázat ----
  const MODE_TXT = { live: "⚡ folyamatos", task: "✅ minden feladat után", home: "🏠 főmenübe lépéskor" };
  function status() {
    const pend = pending.size;
    const base = { icon: "☁️", text: "", cls: "", detail: "", step: phase };
    if (!configured) return { ...base, icon: "💾", text: "Helyi mód", detail: "A felhős mentés nincs beállítva – az adatok csak ebben a böngészőben vannak." };
    if (initError) return { ...base, icon: "⚠️", text: "Felhő nem elérhető", cls: "err", detail: "A Firebase nem töltődött be: " + initError + " Az app helyi módban működik tovább." };
    if (phase === "init") return { ...base, icon: "⏳", text: "Indítás…", detail: "A Firebase betöltése folyamatban." };
    if (phase === "signin") return { ...base, icon: "🔐", text: "Bejelentkezés…", detail: "A Google-belépési ablak nyitva van." };
    if (!user) return { ...base, icon: "🔑", text: "Belépés", detail: "Nincs belépve senki – az adatok csak ebben a böngészőben vannak. Kattints a belépéshez." };
    if (phase === "family") return { ...base, icon: "👪", text: slow ? "Család keresése (lassú)…" : "Család keresése…", cls: slow ? "warn" : "", detail: "Megnézzük, melyik családhoz tartozik a fiók." + (slow ? " " + slow : "") };
    if (!member) return { ...base, icon: "🏠", text: "Család beállítása", cls: "warn", detail: "A fiókhoz még nem tartozik család. Hozz létre egyet, vagy kérd meg a másik szülőt, hogy adjon hozzá." };
    if (retry.active() && !inflight && !pulling && mode() !== "live") {
      const n = retry.nextIn(), wait = retry.waitingVisible() ? "amint az app újra előtérbe kerül" : n == null ? "most" : `kb. ${dur(n)} múlva`;
      return { ...base, icon: "📴", text: pend ? `Offline · ${pend} vár` : "Offline", cls: "warn",
        detail: `Nincs kapcsolat a szerverrel${lastError ? ` (${lastError})` : ""}. Minden helyben mentődik${pend ? `, ${pend} játékos változása vár feltöltésre` : ""}. Következő próbálkozás: ${wait}.` };
    }
    if (lastError) return { ...base, icon: "⛔", text: "Szinkron hiba", cls: "err", detail: lastError };
    const when = `Utolsó letöltés: ${lastDown ? hhmm(lastDown) : "–"}, utolsó mentés: ${lastUp ? hhmm(lastUp) : "–"}. Szinkronmód: ${MODE_TXT[mode()]}.`;
    if (paused) return { ...base, icon: "💤", text: pend ? `Szünetel · ${pend} vár` : "Szünetel", detail: `A kapcsolat szünetel (${pauseWhy}), hogy ne fogyjon feleslegesen a keret. Amint újra használod az appot, szinkronizál. ${when}` };
    if (pulling) return { ...base, icon: "⬇️", text: "Letöltés…", detail: "A család adatainak letöltése." };
    if (inflight) return { ...base, icon: "⬆️", text: "Mentés…", detail: `${inflight} mentés van folyamatban.` };
    if (mode() === "live") {
      if (!connected) return everConnected
        ? { ...base, icon: "📴", text: pend ? `Offline · ${pend} vár` : "Offline", cls: "warn", detail: "Nincs kapcsolat a szerverrel. Minden helyben mentődik, és visszakapcsoláskor automatikusan feltöltődik." }
        : { ...base, icon: "🔌", text: slow ? "Kapcsolódás (lassú)…" : "Kapcsolódás…", cls: slow ? "warn" : "", detail: "Kapcsolódás az adatbázis-szerverhez." + (slow ? " " + slow : "") };
      if (!gotData) return { ...base, icon: "⬇️", text: "Letöltés…", detail: "A család adatainak letöltése." };
    } else if (!gotData) return { ...base, icon: "🔌", text: slow ? "Kapcsolódás (lassú)…" : "Kapcsolódás…", cls: slow ? "warn" : "", detail: "Az első letöltés folyamatban." + (slow ? " " + slow : "") };
    const waitTxt = mode() === "home" ? "a főmenübe lépéskor megy fel" : "pár másodpercen belül felmegy";
    return { ...base, icon: "📡", text: pend ? `Szinkronban · ${pend} vár` : "Szinkronban", cls: "online", detail: when + (pend ? ` ${pend} játékos változása vár feltöltésre (${waitTxt}, vagy nyomd meg a „Mentés most” gombot).` : "") };
  }
  function emit() { if (api.onStatus) api.onStatus(status()); }
  const dur = ms => ms < 60000 ? `${Math.max(1, Math.ceil(ms / 1000))} mp` : `${Math.round(ms / 60000)} perc`;

  // ---- Újrapróbálkozás, ha a szerver nem érhető el (js/core/retry.js) ----
  // 3× 15 mp → 3× 1 perc → 3× 5 perc → 15 percenként; csak ha van várakozó adat, és csak előtérben.
  // A folyamatos módban a Firebase saját újrakapcsolódása dolgozik, ott ez nem fut.
  const STAGE_TXT = ["15 mp múlva újrapróbálom", "mostantól percenként próbálom", "mostantól 5 percenként próbálom", "mostantól 15 percenként próbálom"];
  const retry = makeRetry({
    needed: () => ready() && mode() !== "live" && (pending.size > 0 || !gotData),
    visible: () => document.visibilityState !== "hidden",
    attempt: async () => { if (!gotData) await pull("újrapróbálás"); if (gotData) await flush(); return gotData && !pending.size; },
    onStage: s => log(s > 0 ? "🐢" : "🔴", s > 0 ? `Továbbra sincs kapcsolat a szerverrel – ${STAGE_TXT[s]}.` : `Nem sikerült elérni a szervert – ${STAGE_TXT[0]}.`, true),
    onRecover: () => log("🟢", "A kapcsolat helyreállt – a várakozó változások feltöltve."),
    onChange: () => emit(),
  });

  // Lassú lépés figyelése, tétlenség figyelése
  setInterval(() => {
    const waiting = phase === "family" || (ready() && !gotData);
    if (waiting && !slow && Date.now() - phaseSince > STEP_TIMEOUT) {
      slow = "Ez szokatlanul sokáig tart. Lehet, hogy gyenge a net, vagy egy vírusirtó / reklámblokkoló / céges hálózat letiltja a firebasedatabase.app címet.";
      log("🐢", phase === "family" ? "A családkeresés 15 mp óta nem válaszol." : "A szerverkapcsolat 15 mp óta nem jött létre.", true);
    }
    if (!paused && ready() && gotData && Date.now() - lastAct > IDLE_MS) pause("5 perce nincs használat");
    if (retry.active()) emit();
  }, 5000);

  // ---- Kapcsolat: task/home módban csak a műveletek idejére nyitjuk ----
  function goOnline() { clearTimeout(offT); if (fb && db && !online) { fb.goOnline(db); online = true; } }
  function goOffline() { clearTimeout(offT); if (fb && db && online) { fb.goOffline(db); online = false; emit(); } }
  async function ensureOnline() {
    if (!fb) throw { code: "offline" };
    goOnline();
    if (connected) return;
    let off = null;
    try {
      await withTimeout(new Promise(res => { off = fb.onValue(fb.ref(db, ".info/connected"), s => { if (s.val() === true) res(); }); }), STEP_TIMEOUT, "timeout");
    } finally { setTimeout(() => off && off(), 0); }
  }
  function laterOffline() {
    clearTimeout(offT);
    if (mode() === "live" || !ready()) return;
    offT = setTimeout(() => { if (!inflight && !pulling && mode() !== "live") goOffline(); }, OFF_AFTER);
  }
  async function op(what, fn) {
    inflight++; emit();
    try { await ensureOnline(); const r = await fn(); lastUp = Date.now(); if (lastError && lastError.startsWith("Mentés")) lastError = null; return r; }
    catch (e) { lastError = `Mentés (${what}): ${errText(e)}`; if (!retry.active()) log("⛔", lastError, true); throw e; }
    finally { inflight--; emit(); laterOffline(); }
  }

  // ---- Indítás és belépés ----
  async function init() {
    if (!configured) { emit(); return false; }
    log("⏳", "Firebase betöltése…");
    try {
      // api.firebase: tesztekhez beadható helyettesítő (memóriabeli adatbázis)
      const [app, dbm, am] = api.firebase ? await api.firebase() : await Promise.all([import(FB_BASE + "firebase-app.js"), import(FB_BASE + "firebase-database.js"), import(FB_BASE + "firebase-auth.js")]);
      const fApp = app.initializeApp(FIREBASE_CONFIG);
      fb = dbm; db = dbm.getDatabase(fApp); fa = am; auth = am.getAuth(fApp); auth.languageCode = "hu";
      // szerverkapcsolat figyelése (a Firebase saját jelzése)
      fb.onValue(fb.ref(db, ".info/connected"), snap => {
        const c = snap.val() === true;
        if (c !== connected) {
          connected = c; if (c) { everConnected = true; slow = null; }
          if (user && mode() === "live" && !paused) log(c ? "🟢" : "🔴", c ? "Kapcsolat a szerverrel: él." : "Kapcsolat a szerverrel megszakadt – helyben mentünk tovább.");
        }
        emit();
      });
      fa.onAuthStateChanged(auth, u => {
        user = u; member = false; note = ""; lastError = null; gotData = false; authKnown = true;
        if (u) { log("👤", `Belépve: ${u.email}`); joinFamily(); }
        else { log("🔑", "Nincs belépve senki."); setPhase("ready"); connect(); api.refresh(); }
      });
      return true;
    } catch (e) { initError = errText(e); authKnown = true; log("⚠️", "A Firebase nem töltődött be: " + initError, true); api.refresh(); return false; }
  }

  async function signIn() {
    if (!fa) return;
    // A fiókválasztó mindig jelenjen meg – különben a böngészőbe épp bejelentkezett (pl. a gyerek) fiókja lép be kérdés nélkül
    const provider = new fa.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    setPhase("signin"); log("🔐", "Google-belépési ablak megnyitva.");
    try { goOnline(); await fa.signInWithPopup(auth, provider); }
    catch (e) { note = "❌ A belépés nem sikerült: " + errText(e); log("❌", "Belépés sikertelen: " + errText(e), true); setPhase("ready"); api.refresh(); }
  }
  async function signOut() { if (fa) { await flush(); log("🚪", "Kilépés."); await fa.signOut(auth); } }

  async function joinFamily(attempt = 1) {
    setPhase("family"); log("👪", attempt > 1 ? `Család keresése (${attempt}. próba)…` : "Család keresése…");
    try {
      goOnline();
      const snap = await withTimeout(fb.get(fb.ref(db, `memberOf/${me()}`)), STEP_TIMEOUT * 2, "timeout");
      const mine = Object.keys(snap.val() || {});
      if (mine.length) {
        if (!mine.includes(fam())) { S().familyCode = mine[0]; api.persist(); }
        member = true; log("🏠", `Család megtalálva (${fam().slice(0, 7)}…).`);
      } else { member = false; log("🏠", "Ehhez a fiókhoz még nem tartozik család."); }
    } catch (e) {
      if (e && e.code === "timeout" && attempt < 3) { log("🐢", "A családkeresés nem válaszolt 30 mp alatt – újrapróbálom.", true); return joinFamily(attempt + 1); }
      note = "❌ " + errText(e); log("❌", "Családkeresés sikertelen: " + errText(e), true);
    }
    setPhase("ready"); connect(); api.refresh();
  }
  async function claim(code) {
    try {
      goOnline();
      await fb.set(fb.ref(db, `families/${code}/members/${me()}`), true); // előbb tag leszünk…
      await fb.set(fb.ref(db, `memberOf/${me()}/${code}`), true);        // …utána írhatjuk a mutatót
      return true;
    } catch (e) { log("❌", "Család létrehozása sikertelen: " + errText(e), true); return false; }
  }
  async function createFamily() {
    log("🏠", "Család létrehozása…");
    const code = "f" + [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, "0")).join("");
    if (await claim(code)) { S().familyCode = code; api.persist(); member = true; note = "✅ Család létrehozva. A meglévő adatok feltöltődnek."; log("✅", "Család létrehozva."); connect(); }
    else note = "❌ Nem sikerült létrehozni a családot.";
    api.refresh();
  }
  async function addMember(em) {
    em = (em || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { note = "❌ Ez nem tűnik e-mail-címnek."; return api.refresh(); }
    try {
      await ensureOnline();
      await fb.set(fb.ref(db, `families/${fam()}/members/${emailKey(em)}`), true);
      await fb.set(fb.ref(db, `memberOf/${emailKey(em)}/${fam()}`), true);
      note = `✅ ${em} hozzáadva. Ha ezzel a Google-fiókkal belép, látni fogja a családot.`; log("➕", `Családtag hozzáadva: ${em}`);
    } catch (e) { note = "❌ " + errText(e); log("❌", "Családtag hozzáadása sikertelen: " + errText(e), true); }
    laterOffline(); api.refresh();
  }
  async function members() {
    if (!ready()) return [];
    try { await ensureOnline(); const v = (await fb.get(fb.ref(db, `families/${fam()}/members`))).val() || {}; countDown(v); return Object.keys(v).map(k => k.replace(/,/g, ".")); }
    catch { return []; } finally { laterOffline(); }
  }

  // ---- Letöltött adatok alkalmazása ----
  const onErr = what => e => { lastError = `${what}: ${errText(e)}`; log("⛔", lastError, true); };
  function applyParent(r) {
    const st = S();
    if (r && r.hash && r.salt) { if (!st.parent || r.hash !== st.parent.hash) { st.parent = { salt: r.salt, hash: r.hash }; api.persist(); } }
    else if (st.parent) pushParent();
  }
  // családi beállítások (alapértékek, …) – a frissebb nyer
  function applySettings(r) {
    const st = S();
    if (r && (r.upd || 0) > (st.settings.upd || 0)) { st.settings = Object.assign({}, st.settings, r, { rewards: arr(r.rewards) }); api.persist(); api.refresh(); log("⬇️", "Családi beállítások frissítve a felhőből."); }
    else if (!r || (st.settings.upd || 0) > (r.upd || 0)) pushSettings();
  }
  function applyDeleted(remote) {
    remote = remote || {};
    const st = S(); st.deleted = st.deleted || {}; let gone = false;
    Object.values(remote).forEach(r => { if (r && r.name && (r.ts || 0) > (st.deleted[r.name] || 0)) st.deleted[r.name] = r.ts; });
    Object.entries(st.deleted).forEach(([n, ts]) => {
      const r = remote[safeKey(n)];
      if (!r || (r.ts || 0) < ts) op("törlés jelzése", () => fb.set(fb.ref(db, `families/${fam()}/deleted/${safeKey(n)}`), { name: n, ts })).catch(() => {});
      if (st.users[n] && (st.users[n].upd || 0) <= ts) { delete st.users[n]; pending.delete(n); gone = true; }
    });
    if (gone) { api.persist(); api.refresh(); }
  }
  // Játékosok: háromutas, mezőnkénti összefésülés (a másik eszköz változásai és a még fel nem töltött
  // helyi változások is megmaradnak). A felhőben hiányzó mező helyben nem törlődik.
  function applyUsers(remote) {
    remote = remote || {};
    const st = S(); let changed = 0;
    checkSnapFam();
    Object.entries(remote).forEach(([k, r0]) => {
      if (!r0 || typeof r0 !== "object") return;
      const name = r0.name || k;
      if ((st.deleted || {})[name] >= (r0.upd || 0)) return;
      const legacyLog = r0.log ? arr(r0.log) : null;      // régi változatú eszköz a felhasználóban tárolja a hibanaplót
      const r = clone(clean({ ...r0, name, log: undefined }));   // a név a kulcsból is jöhet (régebbi adat)
      const l = st.users[name];
      if (!l) {
        st.users[name] = api.normUser(clone({ ...r, log: legacyLog || [] })); changed++;
      } else {
        const lv = forSync(l), base = snap.users[name];
        const m = merge(base, r, lv, (l.upd || 0) > (r.upd || 0));
        const logs = legacyLog ? mergeLogs(l.log, legacyLog) : l.log;
        if (Object.keys(diff(m, lv)).length || logs !== l.log) { st.users[name] = api.normUser({ ...m, log: logs }); changed++; }
        if (Object.keys(diff(forSync(st.users[name]), r)).length) pending.add(name);
      }
      snap.users[name] = r;
      if (legacyLog) snap.legacy[name] = true; else delete snap.legacy[name];
    });
    // helyben van, a felhőben nincs (és nem törölt) → fel kell tölteni
    Object.keys(st.users).forEach(n => { if (!remote[safeKey(n)] && !Object.values(remote).some(r => r && r.name === n)) { delete snap.users[n]; pending.add(n); } });
    saveSnap(); api.persist();
    lastDown = Date.now();
    return changed;
  }
  function applyDevice(rec) {
    remoteDev = rec || null;
    if (rec && api.onDevice) api.onDevice(rec);
  }

  // ---- Kapcsolódás a mód szerint ----
  function unsubAll() { unsubs.forEach(f => f()); unsubs = []; }
  function connect() {
    unsubAll();
    gotData = false; lastError = null; paused = false;
    if (!ready()) return emit();
    checkSnapFam();
    if (mode() === "live") { goOnline(); listen(); }   // az eszköz adatai az első eszköz-esemény után mennek fel
    else pull("indulás").then(() => flush()).then(() => pushDevice(true)).catch(() => {});
  }
  function listen() {
    log("🔌", "Kapcsolódás a család adataihoz (folyamatos mód)…");
    const c = fam(), ref = p => fb.ref(db, `families/${c}/${p}`);
    unsubs.push(fb.onValue(ref("parent"), s => { const v = s.val(); sizes.parent = countDown(v); applyParent(v); }, onErr("PIN olvasása")));
    unsubs.push(fb.onValue(ref("settings"), s => { const v = s.val(); sizes.settings = countDown(v); applySettings(v); }, onErr("Beállítások olvasása")));
    unsubs.push(fb.onValue(ref("deleted"), s => { const v = s.val(); sizes.deleted = countDown(v); applyDeleted(v); }, onErr("Törlések olvasása")));
    let devFirst = true;
    unsubs.push(fb.onValue(ref(`devices/${dev.id}`), s => { applyDevice(s.val()); if (devFirst) { devFirst = false; pushDevice(true); } }, onErr("Eszköz olvasása")));
    unsubs.push(fb.onValue(ref("users"), s => {
      const remote = s.val() || {};
      // forgalom: csak a változott játékosokat számoljuk (a Firebase is csak a változást küldi)
      let b = 0; Object.entries(remote).forEach(([k, r]) => { const name = (r && r.name) || k; if (stable(clean({ ...r, log: undefined })) !== stable(snap.users[name] || null)) b += bytes(r); });
      if (b) dev.count("down", b + OVERHEAD);
      sizes.users = bytes(remote);
      const changed = applyUsers(remote), first = !gotData;
      if (first) { gotData = true; log("⬇️", `Adatok letöltve (${Object.keys(remote).length} játékos${changed ? `, ${changed} frissült` : ""}).`); }
      else if (changed) log("⬇️", `${changed} játékos adata frissült egy másik eszközről.`);
      if (pending.size) schedule();
      emit();
      if (changed) api.refresh();
    }, onErr("Játékosok olvasása")));
  }
  // Egyszeri letöltés (task/home mód, illetve a ⚙️ ablak nyitásakor)
  async function pull(why = "") {
    if (!ready()) return;
    pulling++; emit();
    try {
      await ensureOnline();
      const c = fam(), get = p => withTimeout(fb.get(fb.ref(db, `families/${c}/${p}`)), STEP_TIMEOUT * 2, "timeout").then(s => s.val());
      const [users, settings, parent, deleted, device] = await Promise.all([get("users"), get("settings"), get("parent"), get("deleted"), get(`devices/${dev.id}`)]);
      sizes.users = bytes(users); sizes.settings = bytes(settings); sizes.parent = bytes(parent); sizes.deleted = bytes(deleted);
      const total = [users, settings, parent, deleted, device].reduce((a, v) => a + countDown(v), 0);
      dev.count("sync");
      applyParent(parent); applySettings(settings); applyDeleted(deleted); applyDevice(device);
      const changed = applyUsers(users);
      const first = !gotData; gotData = true; if (lastError && /olvas|Letölt/.test(lastError)) lastError = null;
      log("⬇️", `${first ? "Adatok letöltve" : "Letöltés"}${why ? ` (${why})` : ""}: ${Object.keys(users || {}).length} játékos${changed ? `, ${changed} frissült` : ""} · ${kb(total)}`);
      if (changed) api.refresh();
      retry.succeeded();
    } catch (e) { lastError = `Letöltés: ${errText(e)}`; if (!retry.active()) log("⛔", lastError, true); retry.failed(); }
    finally { pulling--; emit(); laterOffline(); }
  }

  // ---- Feltöltés: csak a változás (egyetlen update() hívás a család gyökerére) ----
  function schedule() {
    if (mode() === "home" || paused || retry.active()) return;   // a lépcsőn a következő ütemezett próba viszi fel
    clearTimeout(pushT); pushT = setTimeout(flush, PUSH_DELAY);
  }
  function queue(name) { if (!ready()) return; pending.add(name); emit(); schedule(); }
  let flushing = null;
  async function flush() {
    clearTimeout(pushT); pushT = null;
    if (!ready() || !pending.size) return;
    if (flushing) { await flushing; if (pending.size) return flush(); return; }
    flushing = (async () => {
      checkSnapFam();
      const st = S(), names = [...pending]; pending.clear();
      const up = {}, per = {};
      names.forEach(name => {
        const u = st.users[name]; if (!u) return;
        const key = safeKey(name), L = forSync({ ...u, name });
        const d = diff(L, snap.users[name]);
        Object.entries(d).forEach(([p, v]) => { up[`users/${key}/${p}`] = v; });
        // hibanapló: új bejegyzések fel, a helyben már nem tárolt (régi) bejegyzések törlése
        const known = new Set(snap.logs[name] || []), localKeys = arr(u.log).map(l => String(l.t));
        arr(u.log).forEach(l => { if (!known.has(String(l.t))) up[`logs/${key}/${l.t}`] = clean(l); });
        known.forEach(k => { if (!localKeys.includes(k)) up[`logs/${key}/${k}`] = null; });
        if (snap.legacy[name]) up[`users/${key}/log`] = null;   // átállás: a régi helyről törlés
        per[name] = { d, localKeys, n: Object.keys(d).length };
      });
      if (!Object.keys(up).length) { emit(); return; }
      try {
        await op("játékosok", () => fb.update(fb.ref(db, `families/${fam()}`), up));
        const sent = countUp(up); dev.count("sync");
        Object.entries(per).forEach(([name, x]) => { snap.users[name] = apply(snap.users[name] || {}, x.d); snap.logs[name] = x.localKeys; delete snap.legacy[name]; });
        saveSnap();
        log("⬆️", `${Object.keys(per).join(", ")} mentve · ${Object.keys(up).length} mező · ${kb(sent)}`);
        retry.succeeded();
      } catch { names.forEach(n => pending.add(n)); retry.failed(); }
    })();
    try { await flushing; } finally { flushing = null; emit(); }
  }
  const pushSettings = () => { if (ready()) op("beállítások", () => { const v = clean(S().settings); countUp(v); return fb.set(fb.ref(db, `families/${fam()}/settings`), v); }).catch(() => {}); };
  const pushParent = () => { if (ready() && S().parent) op("PIN", () => { countUp(S().parent); return fb.set(fb.ref(db, `families/${fam()}/parent`), S().parent); }).catch(() => {}); };
  async function fetchParent() {
    if (!ready()) return null;
    try { await ensureOnline(); const r = (await fb.get(fb.ref(db, `families/${fam()}/parent`))).val(); countDown(r); return r && r.hash ? r : null; }
    catch { return null; } finally { laterOffline(); }
  }
  function markDeleted(name, ts) {
    pending.delete(name); delete snap.users[name]; delete snap.logs[name]; saveSnap();
    if (!ready()) return;
    const key = safeKey(name);
    op("törlés", () => fb.update(fb.ref(db, `families/${fam()}`), { [`deleted/${key}`]: { name, ts }, [`users/${key}`]: null, [`logs/${key}`]: null })).catch(() => {});
  }
  // Hibanapló letöltése (a Hibák fül nyitásakor) és egyesítése a helyivel
  async function fetchLogs(name) {
    const u = S().users[name];
    if (!ready() || !u) return false;
    try {
      await ensureOnline();
      const v = (await withTimeout(fb.get(fb.ref(db, `families/${fam()}/logs/${safeKey(name)}`)), STEP_TIMEOUT * 2, "timeout")).val() || {};
      sizes.logs[name] = countDown(v);
      const remote = Object.values(v), before = stable(u.log);
      u.log = mergeLogs(u.log, remote);
      snap.logs[name] = Object.keys(v); saveSnap();
      const changed = stable(u.log) !== before;
      if (changed) api.persist();
      if (u.log.some(l => !v[String(l.t)]) || Object.keys(v).some(k => !u.log.some(l => String(l.t) === k))) queue(name);
      return changed;
    } catch (e) { log("⛔", "Hibanapló letöltése: " + errText(e), true); return false; }
    finally { laterOffline(); }
  }

  // ---- Eszközök (devices/{id}) ----
  function pushDevice(force = false) {
    if (!ready() || (!force && Date.now() - lastDevPush < DEVICE_EVERY)) return;
    lastDevPush = Date.now();
    const m = monthKey(), up = { name: dev.name, nameUpd: dev.nameUpd, model: guessName(), firstSeen: dev.firstSeen, lastSeen: Date.now(), syncMode: mode(), [`traffic/${m}`]: dev.traffic(m) };
    // a hozzárendelést csak akkor írjuk, ha a helyi frissebb (a szülő egy másik eszközön is módosíthatta)
    if (dev.kidsUpd && dev.kidsUpd >= ((remoteDev && remoteDev.kidsUpd) || 0)) { up.kids = dev.kids; up.kidsUpd = dev.kidsUpd; }
    if (remoteDev && (remoteDev.nameUpd || 0) > (dev.nameUpd || 0)) { delete up.name; delete up.nameUpd; }
    // csak a változás megy fel: ami a felhőben már ugyanígy van (név, típus, első használat, mód…), az nem
    if (remoteDev) Object.keys(up).forEach(k => { if (k !== "lastSeen" && !k.startsWith("traffic/") && stable(remoteDev[k] ?? null) === stable(clean(up[k]) ?? null)) delete up[k]; });
    // a kulcsok útvonalak (pl. traffic/2026-11) – csak az értékeket tisztítjuk
    const payload = Object.fromEntries(Object.entries(up).map(([k, v]) => [k, clean(v)]));
    op("eszköz", () => { countUp(payload); return fb.update(fb.ref(db, `families/${fam()}/devices/${dev.id}`), payload); })
      .then(() => { remoteDev = { ...(remoteDev || {}), ...up }; }).catch(() => {});
  }
  async function fetchDevices() {
    if (!ready()) return null;
    try { await ensureOnline(); const v = (await withTimeout(fb.get(fb.ref(db, `families/${fam()}/devices`)), STEP_TIMEOUT * 2, "timeout")).val() || {}; sizes.devices = countDown(v); return v; }
    catch (e) { log("⛔", "Eszközlista letöltése: " + errText(e), true); return null; }
    finally { laterOffline(); }
  }
  function updateDevice(id, fields) {
    if (!ready()) return Promise.resolve(false);
    if (id === dev.id) remoteDev = { ...(remoteDev || {}), ...fields };
    return op("eszköz", () => { countUp(fields); return fb.update(fb.ref(db, `families/${fam()}/devices/${id}`), clean(fields)); }).then(() => true, () => false);
  }
  function removeDevice(id) {
    if (!ready()) return Promise.resolve(false);
    return op("eszköz törlése", () => fb.remove(fb.ref(db, `families/${fam()}/devices/${id}`))).then(() => true, () => false);
  }

  // ---- Mód szerinti pillanatok ----
  // "home": főmenübe lépés, kör vége · "gear": a ⚙️ ablak nyitása · "now": Mentés most
  async function checkpoint(kind) {
    if (!ready()) return;
    if (retry.active() && mode() !== "live") { if (kind === "now") retry.kick(true); return; }
    if (paused) return resume();
    if (mode() === "live") { await flush(); if (kind === "gear") pushDevice(true); return; }
    if (kind === "now") { await flush(); await pull("kézi"); }
    else if (Date.now() - lastDown < 5000) await flush();   // pl. kör vége + főmenü: nem töltünk le kétszer
    else { await pull(kind === "gear" ? "beállítások" : "főmenü"); await flush(); }
    pushDevice(kind === "gear" || kind === "now");
  }
  function setMode(m) {
    if (!MODES.includes(m) || m === dev.syncMode) return;
    dev.setSyncMode(m);
    log("🔁", `Szinkronmód: ${MODE_TXT[m]}.`);
    if (!ready()) return emit();
    unsubAll(); clearTimeout(offT);
    if (m === "live") { goOnline(); gotData = false; listen(); }
    else { gotData = true; laterOffline(); if (pending.size && m === "task") schedule(); }
    pushDevice(true); emit();
  }

  // ---- Tétlenség és háttér: a kapcsolat szünetel ----
  async function pause(why) {
    if (paused || !ready()) return;
    paused = true; pauseWhy = why; log("💤", `Szünetel: ${why}.`);
    try { await withTimeout(flush(), 8000, "timeout"); } catch { /* a helyi mentés megvan, később felmegy */ }
    if (paused) { clearTimeout(pushT); goOffline(); }
    emit();
  }
  function resume() {
    if (!paused) return;
    paused = false; log("▶️", "Folytatás – szinkronizálás.");
    if (mode() === "live") { goOnline(); if (pending.size) schedule(); emit(); return Promise.resolve(); }
    return pull("visszatérés").then(() => flush());
  }
  const activity = () => { lastAct = Date.now(); if (paused && document.visibilityState !== "hidden") resume(); };
  ["pointerdown", "keydown", "touchstart", "wheel"].forEach(ev => addEventListener(ev, activity, { passive: true, capture: true }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") pause("az app háttérben van");
    else { activity(); retry.onVisible(); }
  });
  addEventListener("online", () => { if (!ready()) return; log("🌐", "A böngésző szerint visszajött az internet."); retry.kick(true); });
  addEventListener("pagehide", () => { flush(); });

  // Újrakapcsolódás kézzel (a ☁️ panelről)
  function reconnect() {
    lastError = null; paused = false; retry.reset(); log("🔄", "Újrakapcsolódás kérve.");
    if (fb && db) { try { fb.goOffline(db); online = false; goOnline(); } catch { /* régebbi SDK */ } }
    if (user) joinFamily(); else emit();
  }
  // Becsült tárhely: a legutóbbi letöltések mérete (a hibanaplóé, ha még nem töltöttük le, a helyi alapján)
  function storageEstimate() {
    const st = S();
    const logs = Object.keys(st.users).reduce((a, n) => a + (sizes.logs[n] ?? bytes(st.users[n].log)), 0);
    return sizes.users + sizes.settings + sizes.parent + sizes.deleted + sizes.devices + logs;
  }

  return {
    init, signIn, signOut, createFamily, addMember, members, queue, flush, pushSettings, pushParent, fetchParent, markDeleted, reconnect, status,
    checkpoint, setMode, fetchLogs, fetchDevices, updateDevice, removeDevice, pushDevice, storageEstimate,
    get mode() { return mode(); }, get paused() { return paused; },
    get events() { return events.slice(); }, get pendingCount() { return pending.size; }, get familyCode() { return fam(); },
    get configured() { return configured; }, get user() { return user; }, get member() { return member; }, get ready() { return ready(); }, get note() { return note; }, set note(v) { note = v; },
    // igaz, ha már eldőlt, honnan jönnek az adatok (nincs felhő, nincs belépve, vagy megjött az első letöltés)
    get settled() { return !configured || !!initError || (authKnown && (!user || (phase === "ready" && (!member || gotData)))); },
  };
}
