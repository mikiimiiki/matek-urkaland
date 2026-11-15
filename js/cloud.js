// ===== Felhős mentés: Firebase Authentication (Google) + Realtime Database =====
// A Massalhangzok családi modelljét követi: a szülő Google-lel lép be, a család adatait csak a
// családhoz hozzáadott e-mail-címek olvashatják és írhatják (lásd database.rules.json).
// Ha nincs beállítva Firebase (üres apiKey) vagy nincs net, az app helyi módban (localStorage) működik tovább.
//
// Részletes állapotjelzés: minden lépésnek (bejelentkezés, családkeresés, kapcsolódás, letöltés, mentés)
// saját ikonja és szövege van, a ☁️ panelen pedig egy eseménynapló mutatja, hol tart vagy hol akadt el.
import { FIREBASE_CONFIG } from "./firebase-config.js";

const FB_BASE = "https://www.gstatic.com/firebasejs/13.2.0/";
const PUSH_DELAY = 30000;   // játék közben kötegelve küldünk, legkésőbb fél percenként és a lap elhagyásakor
const STEP_TIMEOUT = 15000; // ennyi idő után egy lépést "lassúnak" jelzünk, és újrapróbáljuk

export const safeKey = n => n.replace(/[.$#\[\]\/]/g, "_");
export const emailKey = e => (e || "").trim().toLowerCase().replace(/\./g, ",");
// A Firebase nem fogad el undefined értéket és bizonyos karaktereket a kulcsokban – küldés előtt megtisztítjuk
const BAD_KEY = /[.$#\[\]\/]/;
function clean(v) {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) { if (x === undefined) continue; o[BAD_KEY.test(k) ? k.replace(/[.$#\[\]\/]/g, ":") : k] = clean(x); } return o; }
  return v;
}
const hhmm = t => new Date(t).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// Hibakódok emberi nyelven
function errText(e) {
  const c = (e && (e.code || e.message)) || String(e);
  if (/permission[_-]denied/i.test(c)) return "Nincs hozzáférés (az adatbázis szabályai elutasították). Ellenőrizd, hogy a database.rules.json publikálva van-e, és hogy a fiók tagja-e a családnak.";
  if (/popup-closed-by-user|cancelled-popup-request/.test(c)) return "A belépési ablakot bezártad.";
  if (/popup-blocked/.test(c)) return "A böngésző letiltotta a felugró ablakot – engedélyezd ennél az oldalnál.";
  if (/unauthorized-domain/.test(c)) return "Ez a webcím nincs engedélyezve a Firebase-ben (Authentication → Settings → Authorized domains).";
  if (/operation-not-allowed/.test(c)) return "A Google-belépés nincs bekapcsolva a Firebase-ben (Authentication → Sign-in method).";
  if (/network-request-failed|network/i.test(c)) return "Hálózati hiba – nincs internet, vagy valami (vírusirtó, reklámblokkoló, céges hálózat) letiltja a Firebase-t.";
  if (/invalid key|contains an invalid/i.test(c)) return "Érvénytelen adat a mentésben: " + c;
  return c;
}

export function createCloud(api) {
  // api: { state(), persist(), refresh(), onStatus(status), normUser(u) }
  let fb = null, db = null, fa = null, auth = null, user = null, member = false, note = "";
  let unsubs = [], applying = false, firstSync = true, pushT = null;
  // állapot
  let phase = "init";            // init | signin | family | ready
  let initError = null, lastError = null, connected = false, everConnected = false, gotData = false;
  let inflight = 0, lastDown = 0, lastUp = 0, slow = null, phaseSince = Date.now();
  const pending = new Set();
  const events = [];
  const S = () => api.state();
  const fam = () => (S().familyCode || "").replace(/[^a-z0-9_-]/gi, "");
  const me = () => emailKey(user && user.email);
  const ready = () => !!(db && user && member && fam().length >= 6);
  const configured = !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey);

  function log(icon, text, isErr = false) {
    events.push({ t: Date.now(), icon, text, err: isErr });
    if (events.length > 40) events.shift();
    (isErr ? console.warn : console.info)(`[felhő] ${icon} ${text}`);
    emit();
  }
  function setPhase(p) { phase = p; phaseSince = Date.now(); slow = null; emit(); }

  // ---- Állapot kiszámítása: ikon + rövid szöveg + részletes magyarázat ----
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
    if (lastError) return { ...base, icon: "⛔", text: "Szinkron hiba", cls: "err", detail: lastError };
    if (!connected) return everConnected
      ? { ...base, icon: "📴", text: pend || inflight ? `Offline · ${pend + inflight} vár` : "Offline", cls: "warn", detail: "Nincs kapcsolat a szerverrel. Minden helyben mentődik, és visszakapcsoláskor automatikusan feltöltődik." }
      : { ...base, icon: "🔌", text: slow ? "Kapcsolódás (lassú)…" : "Kapcsolódás…", cls: slow ? "warn" : "", detail: "Kapcsolódás az adatbázis-szerverhez." + (slow ? " " + slow : "") };
    if (!gotData) return { ...base, icon: "⬇️", text: "Letöltés…", detail: "A család adatainak letöltése." };
    if (inflight) return { ...base, icon: "⬆️", text: "Mentés…", detail: `${inflight} mentés van folyamatban.` };
    return { ...base, icon: "✅", text: pend ? `Szinkronban · ${pend} vár` : "Szinkronban", cls: "online", detail: `Utolsó letöltés: ${lastDown ? hhmm(lastDown) : "–"}, utolsó mentés: ${lastUp ? hhmm(lastUp) : "–"}.` + (pend ? ` ${pend} változás vár feltöltésre (fél percen belül megy, vagy nyomd meg a „Mentés most” gombot).` : "") };
  }
  function emit() { if (api.onStatus) api.onStatus(status()); }

  // Lassú lépés figyelése: ha egy lépés túl sokáig tart, jelezzük, és tippet adunk
  setInterval(() => {
    const waiting = phase === "family" || (ready() && !connected && !everConnected);
    if (waiting && !slow && Date.now() - phaseSince > STEP_TIMEOUT) {
      slow = "Ez szokatlanul sokáig tart. Lehet, hogy gyenge a net, vagy egy vírusirtó / reklámblokkoló / céges hálózat letiltja a firebasedatabase.app címet.";
      log("🐢", phase === "family" ? "A családkeresés 15 mp óta nem válaszol." : "A szerverkapcsolat 15 mp óta nem jött létre.", true);
    }
  }, 3000);

  // ---- Indítás és belépés ----
  async function init() {
    if (!configured) { emit(); return false; }
    log("⏳", "Firebase betöltése…");
    try {
      const [app, dbm, am] = await Promise.all([import(FB_BASE + "firebase-app.js"), import(FB_BASE + "firebase-database.js"), import(FB_BASE + "firebase-auth.js")]);
      const fApp = app.initializeApp(FIREBASE_CONFIG);
      fb = dbm; db = dbm.getDatabase(fApp); fa = am; auth = am.getAuth(fApp); auth.languageCode = "hu";
      // szerverkapcsolat figyelése (a Firebase saját jelzése)
      fb.onValue(fb.ref(db, ".info/connected"), snap => {
        const c = snap.val() === true;
        if (c !== connected) { connected = c; if (c) { everConnected = true; slow = null; } if (user) log(c ? "🟢" : "🔴", c ? "Kapcsolat a szerverrel: él." : "Kapcsolat a szerverrel megszakadt – helyben mentünk tovább."); }
        emit();
      });
      fa.onAuthStateChanged(auth, u => {
        user = u; member = false; note = ""; lastError = null; gotData = false;
        if (u) { log("👤", `Belépve: ${u.email}`); joinFamily(); }
        else { log("🔑", "Nincs belépve senki."); setPhase("ready"); connect(); api.refresh(); }
      });
      return true;
    } catch (e) { initError = errText(e); log("⚠️", "A Firebase nem töltődött be: " + initError, true); return false; }
  }

  async function signIn() {
    if (!fa) return;
    // A fiókválasztó mindig jelenjen meg – különben a böngészőbe épp bejelentkezett (pl. a gyerek) fiókja lép be kérdés nélkül
    const provider = new fa.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    setPhase("signin"); log("🔐", "Google-belépési ablak megnyitva.");
    try { await fa.signInWithPopup(auth, provider); }
    catch (e) { note = "❌ A belépés nem sikerült: " + errText(e); log("❌", "Belépés sikertelen: " + errText(e), true); setPhase("ready"); api.refresh(); }
  }
  async function signOut() { if (fa) { flush(); log("🚪", "Kilépés."); await fa.signOut(auth); } }

  async function joinFamily(attempt = 1) {
    setPhase("family"); log("👪", attempt > 1 ? `Család keresése (${attempt}. próba)…` : "Család keresése…");
    try {
      const snap = await Promise.race([fb.get(fb.ref(db, `memberOf/${me()}`)), new Promise((_, rej) => setTimeout(() => rej({ code: "timeout" }), STEP_TIMEOUT * 2))]);
      const mine = Object.keys(snap.val() || {});
      if (mine.length) {
        if (!mine.includes(fam())) { S().familyCode = mine[0]; api.persist(); }
        member = true; log("🏠", `Család megtalálva (${fam().slice(0, 7)}…).`);
      } else { member = false; log("🏠", "Ehhez a fiókhoz még nem tartozik család."); }
    } catch (e) {
      if (e && e.code === "timeout" && attempt < 3) { log("🐢", "A családkeresés nem válaszolt 30 mp alatt – újrapróbálom.", true); return joinFamily(attempt + 1); }
      note = "❌ " + errText(e); log("❌", "Családkeresés sikertelen: " + errText(e), true);
    }
    firstSync = true; setPhase("ready"); connect(); api.refresh();
  }
  async function claim(code) {
    try {
      await fb.set(fb.ref(db, `families/${code}/members/${me()}`), true); // előbb tag leszünk…
      await fb.set(fb.ref(db, `memberOf/${me()}/${code}`), true);        // …utána írhatjuk a mutatót
      return true;
    } catch (e) { log("❌", "Család létrehozása sikertelen: " + errText(e), true); return false; }
  }
  async function createFamily() {
    log("🏠", "Család létrehozása…");
    const code = "f" + [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, "0")).join("");
    if (await claim(code)) { S().familyCode = code; api.persist(); member = true; note = "✅ Család létrehozva. A meglévő adatok feltöltődnek."; log("✅", "Család létrehozva."); firstSync = true; connect(); }
    else note = "❌ Nem sikerült létrehozni a családot.";
    api.refresh();
  }
  async function addMember(em) {
    em = (em || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { note = "❌ Ez nem tűnik e-mail-címnek."; return api.refresh(); }
    try {
      await fb.set(fb.ref(db, `families/${fam()}/members/${emailKey(em)}`), true);
      await fb.set(fb.ref(db, `memberOf/${emailKey(em)}/${fam()}`), true);
      note = `✅ ${em} hozzáadva. Ha ezzel a Google-fiókkal belép, látni fogja a családot.`; log("➕", `Családtag hozzáadva: ${em}`);
    } catch (e) { note = "❌ " + errText(e); log("❌", "Családtag hozzáadása sikertelen: " + errText(e), true); }
    api.refresh();
  }
  async function members() {
    if (!ready()) return [];
    try { return Object.keys((await fb.get(fb.ref(db, `families/${fam()}/members`))).val() || {}).map(k => k.replace(/,/g, ".")); } catch { return []; }
  }

  // ---- Szinkron ----
  const onErr = what => e => { lastError = `${what}: ${errText(e)}`; log("⛔", lastError, true); };
  function connect() {
    unsubs.forEach(f => f()); unsubs = [];
    gotData = false; lastError = null;
    if (!ready()) return emit();
    log("🔌", "Kapcsolódás a család adataihoz…"); setPhase("ready");
    const c = fam(), ref = p => fb.ref(db, `families/${c}/${p}`);
    // szülői PIN (sózott hash)
    unsubs.push(fb.onValue(ref("parent"), snap => {
      const r = snap.val(), st = S();
      if (r && r.hash && r.salt) { if (!st.parent || r.hash !== st.parent.hash) { st.parent = { salt: r.salt, hash: r.hash }; api.persist(); } }
      else if (st.parent) pushParent();
    }, onErr("PIN olvasása")));
    // beállítások (napi cél, jutalmak, felolvasás) – a frissebb nyer
    unsubs.push(fb.onValue(ref("settings"), snap => {
      const r = snap.val(), st = S();
      if (r && (r.upd || 0) > (st.settings.upd || 0)) { st.settings = Object.assign({}, st.settings, r, { rewards: Array.isArray(r.rewards) ? r.rewards : Object.values(r.rewards || {}) }); api.persist(); api.refresh(); log("⬇️", "Beállítások frissítve a felhőből."); }
      else if (!r || (st.settings.upd || 0) > (r.upd || 0)) pushSettings();
    }, onErr("Beállítások olvasása")));
    // törölt profilok
    unsubs.push(fb.onValue(ref("deleted"), snap => {
      const remote = snap.val() || {}, st = S(); st.deleted = st.deleted || {}; let gone = false;
      Object.values(remote).forEach(r => { if (r && r.name && (r.ts || 0) > (st.deleted[r.name] || 0)) st.deleted[r.name] = r.ts; });
      Object.entries(st.deleted).forEach(([n, ts]) => {
        const r = remote[safeKey(n)];
        if (!r || (r.ts || 0) < ts) write(ref(`deleted/${safeKey(n)}`), { name: n, ts }, "törlés jelzése");
        if (st.users[n] && (st.users[n].upd || 0) <= ts) { delete st.users[n]; gone = true; }
      });
      if (gone) { api.persist(); api.refresh(); }
    }, onErr("Törlések olvasása")));
    // játékosok: játékosonként a frissebb nyer, így két eszköz nem írja felül egymást
    unsubs.push(fb.onValue(ref("users"), snap => {
      const remote = snap.val() || {}, st = S(); let changed = 0;
      applying = true;
      try {
        Object.entries(remote).forEach(([k, r]) => {
          const name = r.name || k, l = st.users[name];
          if ((st.deleted || {})[name] >= (r.upd || 0)) return;
          if (!l || (r.upd || 0) > (l.upd || 0)) { st.users[name] = api.normUser(r); changed++; }
        });
      } finally { applying = false; }
      api.persist();
      lastDown = Date.now();
      if (!gotData) { gotData = true; log("⬇️", `Adatok letöltve (${Object.keys(remote).length} játékos${changed ? `, ${changed} frissült` : ""}).`); }
      else if (changed) log("⬇️", `${changed} játékos adata frissült egy másik eszközről.`);
      if (firstSync) { firstSync = false; Object.keys(st.users).forEach(n => { const r = remote[safeKey(n)]; if (!r || (st.users[n].upd || 0) > (r.upd || 0)) pushUser(n); }); }
      emit();
      if (changed) api.refresh();
    }, onErr("Játékosok olvasása")));
  }
  // Minden írás egy helyen: számoljuk a folyamatban lévőket, és a hibát is elkapjuk (a szinkron hibát is!)
  function write(r, value, what) {
    inflight++; emit();
    let p;
    try { p = fb.set(r, clean(value)); } catch (e) { p = Promise.reject(e); }
    return p.then(() => { lastUp = Date.now(); if (lastError && lastError.startsWith("Mentés")) lastError = null; })
      .catch(e => { lastError = `Mentés (${what}): ${errText(e)}`; log("⛔", lastError, true); })
      .finally(() => { inflight--; emit(); });
  }
  function pushUser(name) {
    const st = S();
    if (!ready() || applying || !st.users[name]) return;
    write(fb.ref(db, `families/${fam()}/users/${safeKey(name)}`), { ...st.users[name], name }, name)
      .then(() => { if (!lastError) log("⬆️", `${name} eredményei elmentve.`); });
  }
  function queue(name) { if (!ready()) return; pending.add(name); emit(); if (!pushT) pushT = setTimeout(flush, PUSH_DELAY); }
  function flush() { clearTimeout(pushT); pushT = null; const ns = [...pending]; pending.clear(); ns.forEach(pushUser); emit(); }
  function pushSettings() { if (ready()) write(fb.ref(db, `families/${fam()}/settings`), S().settings, "beállítások"); }
  function pushParent() { if (ready() && S().parent) write(fb.ref(db, `families/${fam()}/parent`), S().parent, "PIN"); }
  async function fetchParent() {
    if (!ready()) return null;
    try { const r = (await fb.get(fb.ref(db, `families/${fam()}/parent`))).val(); return r && r.hash ? r : null; } catch { return null; }
  }
  function markDeleted(name, ts) {
    if (!ready()) return;
    write(fb.ref(db, `families/${fam()}/deleted/${safeKey(name)}`), { name, ts }, "törlés jelzése");
    fb.remove(fb.ref(db, `families/${fam()}/users/${safeKey(name)}`)).catch(() => {});
  }
  // Újrakapcsolódás kézzel (a ☁️ panelről)
  function reconnect() {
    lastError = null; log("🔄", "Újrakapcsolódás kérve.");
    if (fb && db) { try { fb.goOffline(db); fb.goOnline(db); } catch { /* régebbi SDK */ } }
    if (user) joinFamily(); else emit();
  }

  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  addEventListener("pagehide", flush);

  return {
    init, signIn, signOut, createFamily, addMember, members, queue, flush, pushSettings, pushParent, fetchParent, markDeleted, reconnect, status,
    get events() { return events.slice(); }, get pendingCount() { return pending.size; }, get familyCode() { return fam(); },
    get configured() { return configured; }, get user() { return user; }, get member() { return member; }, get ready() { return ready(); }, get note() { return note; }, set note(v) { note = v; },
  };
}
