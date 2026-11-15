// ===== Felhős mentés: Firebase Authentication (Google) + Realtime Database =====
// A Massalhangzok családi modelljét követi: a szülő Google-lel lép be, a család adatait csak a
// családhoz hozzáadott e-mail-címek olvashatják és írhatják (lásd database.rules.json).
// Ha nincs beállítva Firebase (üres apiKey) vagy nincs net, az app helyi módban (localStorage) működik tovább.
import { FIREBASE_CONFIG } from "./firebase-config.js";

const FB_BASE = "https://www.gstatic.com/firebasejs/13.2.0/";
const PUSH_DELAY = 30000; // játék közben kötegelve küldünk, legkésőbb fél percenként és a lap elhagyásakor

export const safeKey = n => n.replace(/[.$#\[\]\/]/g, "_");
export const emailKey = e => (e || "").trim().toLowerCase().replace(/\./g, ",");

export function createCloud(api) {
  // api: { state(), persist(), refresh(), setSync(text, cls), normUser(u) }
  let fb = null, db = null, fa = null, auth = null, user = null, member = false, note = "";
  let unsubs = [], applying = false, firstSync = true, pushT = null;
  const pending = new Set();
  const S = () => api.state();
  const fam = () => (S().familyCode || "").replace(/[^a-z0-9_-]/gi, "");
  const me = () => emailKey(user && user.email);
  const ready = () => !!(db && user && member && fam().length >= 6);
  const configured = !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey);

  async function init() {
    if (!configured) { api.setSync("Helyi mód", ""); return false; }
    try {
      const [app, dbm, am] = await Promise.all([import(FB_BASE + "firebase-app.js"), import(FB_BASE + "firebase-database.js"), import(FB_BASE + "firebase-auth.js")]);
      const fApp = app.initializeApp(FIREBASE_CONFIG);
      fb = dbm; db = dbm.getDatabase(fApp); fa = am; auth = am.getAuth(fApp); auth.languageCode = "hu";
      fa.onAuthStateChanged(auth, u => { user = u; member = false; note = ""; if (u) joinFamily(); else { connect(); api.refresh(); } });
      return true;
    } catch (e) { console.warn("Firebase nem érhető el, helyi mód:", e); api.setSync("Offline", ""); return false; }
  }

  async function signIn() {
    if (!fa) return;
    try { await fa.signInWithPopup(auth, new fa.GoogleAuthProvider()); }
    catch (e) { note = "❌ A belépés nem sikerült: " + (e.code || e.message); api.refresh(); }
  }
  async function signOut() { if (fa) { flush(); await fa.signOut(auth); } }

  async function joinFamily() {
    api.setSync("Kapcsolódás…", "");
    try {
      const mine = Object.keys((await fb.get(fb.ref(db, `memberOf/${me()}`))).val() || {});
      if (mine.length) { if (!mine.includes(fam())) { S().familyCode = mine[0]; api.persist(); } member = true; }
      else member = false;
    } catch (e) { console.warn(e); note = "❌ " + (e.code || e.message); }
    firstSync = true; connect(); api.refresh();
  }
  async function claim(code) {
    try {
      await fb.set(fb.ref(db, `families/${code}/members/${me()}`), true); // előbb tag leszünk…
      await fb.set(fb.ref(db, `memberOf/${me()}/${code}`), true);        // …utána írhatjuk a mutatót
      return true;
    } catch (e) { console.warn(e); return false; }
  }
  async function createFamily() {
    const code = "f" + [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, "0")).join("");
    if (await claim(code)) { S().familyCode = code; api.persist(); member = true; note = "✅ Család létrehozva. A meglévő adatok feltöltődnek."; firstSync = true; connect(); }
    else note = "❌ Nem sikerült létrehozni a családot.";
    api.refresh();
  }
  async function addMember(em) {
    em = (em || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { note = "❌ Ez nem tűnik e-mail-címnek."; return api.refresh(); }
    try {
      await fb.set(fb.ref(db, `families/${fam()}/members/${emailKey(em)}`), true);
      await fb.set(fb.ref(db, `memberOf/${emailKey(em)}/${fam()}`), true);
      note = `✅ ${em} hozzáadva. Ha ezzel a Google-fiókkal belép, látni fogja a családot.`;
    } catch (e) { note = "❌ " + (e.code || e.message); }
    api.refresh();
  }
  async function members() {
    if (!ready()) return [];
    try { return Object.keys((await fb.get(fb.ref(db, `families/${fam()}/members`))).val() || {}).map(k => k.replace(/,/g, ".")); } catch { return []; }
  }

  // ---- Szinkron ----
  function connect() {
    unsubs.forEach(f => f()); unsubs = [];
    if (!configured) return api.setSync("Helyi mód", "");
    if (!user) return api.setSync("Belépés", "");
    if (!ready()) return api.setSync("Család beállítása", "");
    api.setSync("Kapcsolódás…", "");
    const c = fam(), ref = p => fb.ref(db, `families/${c}/${p}`);
    // szülői PIN (sózott hash)
    unsubs.push(fb.onValue(ref("parent"), snap => {
      const r = snap.val(), st = S();
      if (r && r.hash && r.salt) { if (!st.parent || r.hash !== st.parent.hash) { st.parent = { salt: r.salt, hash: r.hash }; api.persist(); } }
      else if (st.parent) pushParent();
    }));
    // beállítások (napi cél, jutalmak, felolvasás) – a frissebb nyer
    unsubs.push(fb.onValue(ref("settings"), snap => {
      const r = snap.val(), st = S();
      if (r && (r.upd || 0) > (st.settings.upd || 0)) { st.settings = Object.assign({}, st.settings, r, { rewards: Array.isArray(r.rewards) ? r.rewards : Object.values(r.rewards || {}) }); api.persist(); api.refresh(); }
      else if (!r || (st.settings.upd || 0) > (r.upd || 0)) pushSettings();
    }));
    // törölt profilok
    unsubs.push(fb.onValue(ref("deleted"), snap => {
      const remote = snap.val() || {}, st = S(); st.deleted = st.deleted || {}; let gone = false;
      Object.values(remote).forEach(r => { if (r && r.name && (r.ts || 0) > (st.deleted[r.name] || 0)) st.deleted[r.name] = r.ts; });
      Object.entries(st.deleted).forEach(([n, ts]) => {
        const r = remote[safeKey(n)];
        if (!r || (r.ts || 0) < ts) fb.set(ref(`deleted/${safeKey(n)}`), { name: n, ts }).catch(() => {});
        if (st.users[n] && (st.users[n].upd || 0) <= ts) { delete st.users[n]; gone = true; }
      });
      if (gone) { api.persist(); api.refresh(); }
    }));
    // játékosok: játékosonként a frissebb nyer, így két eszköz nem írja felül egymást
    unsubs.push(fb.onValue(ref("users"), snap => {
      const remote = snap.val() || {}, st = S(); let changed = false;
      applying = true;
      Object.entries(remote).forEach(([k, r]) => {
        const name = r.name || k, l = st.users[name];
        if ((st.deleted || {})[name] >= (r.upd || 0)) return;
        if (!l || (r.upd || 0) > (l.upd || 0)) { st.users[name] = api.normUser(r); changed = true; }
      });
      applying = false;
      api.persist();
      if (firstSync) { firstSync = false; Object.keys(st.users).forEach(n => { const r = remote[safeKey(n)]; if (!r || (st.users[n].upd || 0) > (r.upd || 0)) pushUser(n); }); }
      api.setSync("Szinkronban", "online");
      if (changed) api.refresh();
    }, () => api.setSync("Nincs hozzáférés", "err")));
  }
  function pushUser(name) {
    const st = S();
    if (!ready() || applying || !st.users[name]) return;
    fb.set(fb.ref(db, `families/${fam()}/users/${safeKey(name)}`), { ...st.users[name], name })
      .then(() => api.setSync("Szinkronban", "online")).catch(() => api.setSync("Szinkron hiba", "err"));
  }
  function queue(name) { if (!ready()) return; pending.add(name); if (!pushT) pushT = setTimeout(flush, PUSH_DELAY); }
  function flush() { clearTimeout(pushT); pushT = null; const ns = [...pending]; pending.clear(); ns.forEach(pushUser); }
  function pushSettings() { if (ready()) fb.set(fb.ref(db, `families/${fam()}/settings`), S().settings).catch(() => api.setSync("Szinkron hiba", "err")); }
  function pushParent() { if (ready() && S().parent) fb.set(fb.ref(db, `families/${fam()}/parent`), S().parent).catch(() => api.setSync("Szinkron hiba", "err")); }
  async function fetchParent() {
    if (!ready()) return null;
    try { const r = (await fb.get(fb.ref(db, `families/${fam()}/parent`))).val(); return r && r.hash ? r : null; } catch { return null; }
  }
  function markDeleted(name, ts) { if (ready()) fb.set(fb.ref(db, `families/${fam()}/deleted/${safeKey(name)}`), { name, ts }).catch(() => {}); if (ready()) fb.remove(fb.ref(db, `families/${fam()}/users/${safeKey(name)}`)).catch(() => {}); }

  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  addEventListener("pagehide", flush);

  return {
    init, signIn, signOut, createFamily, addMember, members, queue, flush, pushSettings, pushParent, fetchParent, markDeleted,
    get configured() { return configured; }, get user() { return user; }, get member() { return member; }, get ready() { return ready(); }, get note() { return note; }, set note(v) { note = v; },
  };
}
