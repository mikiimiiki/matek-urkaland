// A felhős szinkron tesztje memóriabeli „ál-Firebase”-szel: két eszköz ugyanabban a családban.
// Futtatás: node tests/cloud.test.mjs
// Ellenőrzi: részleges feltöltés, külön hibanapló-ág, mezőnkénti összefésülés két eszköz között,
// régi változatú eszköz írása, törlés, eszköz-hozzárendelés átvétele.

// ---- böngésző-környezet pótlása Node alatt ----
const mem = new Map();
const mkStorage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; };
globalThis.localStorage = mkStorage();
globalThis.document = { visibilityState: "visible", addEventListener() {} };
globalThis.addEventListener = () => {};
void mem;

// ---- memóriabeli Realtime Database ----
const clone = v => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
function prune(v) {
  if (Array.isArray(v)) { const a = v.map(prune).filter(x => x !== null); return a.length ? a : null; }
  if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) { const p = prune(x); if (p !== null) o[k] = p; } return Object.keys(o).length ? o : null; }
  return v === undefined ? null : v;
}
function makeServer() {
  let root = {};
  const listeners = [];
  const parts = p => p.split("/").filter(Boolean);
  const getAt = p => parts(p).reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), root);
  function setAt(p, v) {
    const ks = parts(p); if (!ks.length) { root = prune(v) || {}; return; }
    let o = root; ks.slice(0, -1).forEach(k => { if (!o[k] || typeof o[k] !== "object") o[k] = {}; o = o[k]; });
    o[ks[ks.length - 1]] = clone(v); root = prune(root) || {};
  }
  const notify = () => listeners.forEach(l => { const v = clone(getAt(l.path)) ?? null; const s = JSON.stringify(v); if (s !== l.last) { l.last = s; l.cb({ val: () => clone(v) }); } });
  return { getAt, setAt, notify, listeners, dump: () => clone(root) };
}
function fakeFirebase(server, email) {
  let online = true;
  const conn = [];
  const db = {};
  const dbm = {
    getDatabase: () => db,
    ref: (_db, path) => ({ path }),
    get: async r => { if (!online) throw { code: "offline" }; return { val: () => clone(server.getAt(r.path)) ?? null }; },
    set: async (r, v) => { if (!online) throw { code: "offline" }; server.setAt(r.path, v); server.notify(); },
    update: async (r, obj) => { if (!online) throw { code: "offline" }; for (const [k, v] of Object.entries(obj)) { if (/\.|#|\$|\[|\]/.test(k)) throw new Error("invalid key " + k); server.setAt(r.path + "/" + k, v); } server.notify(); },
    remove: async r => { server.setAt(r.path, null); server.notify(); },
    onValue: (r, cb) => {
      if (r.path === ".info/connected") { const l = { cb }; conn.push(l); setTimeout(() => cb({ val: () => online }), 0); return () => conn.splice(conn.indexOf(l), 1); }
      const l = { path: r.path, cb, last: undefined }; server.listeners.push(l); setTimeout(() => server.notify(), 0);
      return () => server.listeners.splice(server.listeners.indexOf(l), 1);
    },
    goOnline: () => { if (!online) { online = true; conn.forEach(l => setTimeout(() => l.cb({ val: () => true }), 0)); } },
    goOffline: () => { if (online) { online = false; conn.forEach(l => l.cb({ val: () => false })); } },
  };
  const am = {
    getAuth: () => ({}),
    onAuthStateChanged: (_a, cb) => setTimeout(() => cb({ email }), 0),
    GoogleAuthProvider: class { setCustomParameters() {} },
    signInWithPopup: async () => {}, signOut: async () => {},
  };
  const app = { initializeApp: () => ({}) };
  return { load: async () => [app, dbm, am], get online() { return online; } };
}

// ---- az app részei, amiket a felhőmodul használ ----
const { createCloud, safeKey } = await import("../js/core/cloud.js");
const { createDevice } = await import("../js/core/device.js");
const E = await import("../js/engine.js");
const { migrateUser, migrateFamily } = await import("../js/game/migrate.js");
const { TYPES, makeTask } = await import("../js/pack/types/index.js");
const { makeRng } = await import("../js/pack/util.js");

let fails = 0;
const ok = (c, msg) => { console.log((c ? "✓ " : "✗ ") + msg); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rng = makeRng(5);
const play = (u, n, good = 1) => { for (let i = 0; i < n; i++) { const T = TYPES[i % TYPES.length]; E.record(u, makeTask(T, E.pickSub(u, T, 1, rng), 1, rng), good, 20000, { q: "Mennyi 2+2?", a: "5", c: "4" }); } u.upd = Date.now(); };

const FAM = "ftest000000000000000000";
const server = makeServer();
server.setAt(`families/${FAM}/members/szulo@example,com`, true);
server.setAt(`memberOf/szulo@example,com/${FAM}`, true);

function device(label, users = {}) {
  globalThis.localStorage = mkStorage();   // minden eszköznek saját tárolója
  const store = localStorage;
  const state = { familyCode: FAM, current: Object.keys(users)[0] || "", users, settings: {}, deleted: {} };
  migrateFamily(state);
  Object.keys(users).forEach(n => { users[n] = migrateUser(E.normUser(users[n]), state); });
  const dev = createDevice("t_" + label);
  const fbx = fakeFirebase(server, "szulo@example.com");
  let refreshed = 0, devRec = null;
  const cloud = createCloud({
    state: () => state, persist: () => {}, refresh: () => { refreshed++; },
    normUser: u => migrateUser(E.normUser(u), state), device: dev, storeKey: "t_" + label,
    onDevice: r => { devRec = r; }, firebase: fbx.load,
  });
  return { state, cloud, dev, store, get refreshed() { return refreshed; }, get devRec() { return devRec; } };
}
const waitReady = async c => { for (let i = 0; i < 100 && !(c.ready && c.status().text.startsWith("Szinkronban")); i++) await sleep(20); };

// 1) A eszköz: meglévő helyi adat → első feltöltés
const anna = E.newUser("Anna", "🦊"); play(anna, 40); play(anna, 10, 0);
const A = device("A", { Anna: anna });
await A.cloud.init(); await waitReady(A.cloud); await A.cloud.flush();
const remoteAnna = server.getAt(`families/${FAM}/users/Anna`);
ok(remoteAnna && remoteAnna.pts === A.state.users.Anna.pts && !remoteAnna.log, "A: a játékos felkerült, a hibanapló NÉLKÜL");
ok(Object.keys(server.getAt(`families/${FAM}/logs/Anna`) || {}).length === 10, "A: a 10 hibanapló-bejegyzés külön ágra került");
ok(remoteAnna.hist && remoteAnna.prefs && remoteAnna.id, "A: az új mezők (hist, prefs, id) is fent vannak");

// 2) B eszköz: üres → letölti, a hibanapló csak kérésre jön
const B = device("B");
await B.cloud.init(); await waitReady(B.cloud);
const bA = B.state.users.Anna;
ok(bA && bA.pts === A.state.users.Anna.pts && bA.log.length === 0, "B: Anna letöltve, a hibanapló még nincs letöltve");
await B.cloud.fetchLogs("Anna");
ok(B.state.users.Anna.log.length === 10, "B: a Hibák fül nyitásakor a hibanapló is megjön");

// 3) feladatonkénti feltöltés mérete
const before = A.dev.traffic().up;
play(A.state.users.Anna, 1); A.cloud.queue("Anna"); await A.cloud.flush();
const per = A.dev.traffic().up - before;
ok(per > 0 && per < 2048, `egy feladat után ${per} B feltöltés (< 2 KB)`);

// 4) két eszköz párhuzamosan: A-n játszik a gyerek, B-n a szülő átállítja a napi célt
play(A.state.users.Anna, 3); A.cloud.queue("Anna");
B.state.users.Anna.prefs.goalTasks = 25; B.state.users.Anna.upd = Date.now() + 5; B.cloud.queue("Anna");
await A.cloud.flush(); await B.cloud.flush();
await A.cloud.checkpoint("now"); await B.cloud.checkpoint("now");
const aU = A.state.users.Anna, bU = B.state.users.Anna;
ok(aU.prefs.goalTasks === 25 && bU.total === aU.total && bU.pts === aU.pts, "mindkét eszköz változása megmaradt (A: +3 feladat, B: napi cél 25)");

// 5) régi változatú eszköz: a teljes objektumot írja, hibanaplóval, hist/prefs nélkül
const old = JSON.parse(JSON.stringify(server.getAt(`families/${FAM}/users/Anna`)));
delete old.hist; delete old.prefs; delete old.id; old.pts += 7; old.upd = Date.now() + 50;
old.log = [{ t: 111, T: "T1", s: "x", r: 0, q: "régi", a: "1", c: "2" }];
server.setAt(`families/${FAM}/users/Anna`, old); server.notify();
await A.cloud.checkpoint("now");
const a2 = A.state.users.Anna;
ok(a2.pts === old.pts && a2.hist && a2.prefs && a2.prefs.goalTasks === 25 && a2.id, "a régi eszköz írása után az új mezők megmaradtak, a pontok frissültek");
ok(a2.log.some(l => l.t === 111), "a régi helyen tárolt hibanapló-bejegyzés is átjött");
await A.cloud.flush();
const after = server.getAt(`families/${FAM}/users/Anna`);
ok(!after.log && server.getAt(`families/${FAM}/logs/Anna/111`), "átállás: a régi helyről törölve, a külön ágon megvan");
ok(after.hist && after.prefs, "a felhőbe is visszakerültek az új mezők");

// 5b) folyamatos mód: B élőben látja A változását, letöltés nélkül
B.cloud.setMode("live"); await sleep(50);
play(A.state.users.Anna, 2); A.cloud.queue("Anna"); await A.cloud.flush(); await sleep(50);
ok(B.state.users.Anna.total === A.state.users.Anna.total, "folyamatos mód: B azonnal megkapja A új eredményét");
B.cloud.setMode("task");

// 6) eszköz-hozzárendelés: a szülő B-n állítja be A hozzárendelését
await B.cloud.updateDevice(A.dev.id, { kids: [aU.id], kidsUpd: Date.now() + 1000 });
await A.cloud.checkpoint("now");
ok(A.devRec && A.devRec.kids && A.devRec.kids[0] === aU.id, "A átveszi a máshol beállított hozzárendelést");
const devs = await B.cloud.fetchDevices();
ok(devs && devs[A.dev.id] && devs[B.dev.id] && devs[A.dev.id].traffic, "mindkét eszköz és a forgalma látszik a listában");

// 7) törlés
B.state.deleted.Anna = Date.now() + 2000; delete B.state.users.Anna; B.cloud.markDeleted("Anna", B.state.deleted.Anna);
await sleep(50);
ok(!server.getAt(`families/${FAM}/users/Anna`) && !server.getAt(`families/${FAM}/logs/Anna`), "törlés: a játékos és a hibanaplója is lekerült");
await A.cloud.checkpoint("now");
ok(!A.state.users.Anna, "A-n is törlődött");

// 8) kulcsok: nincs tiltott karakter a felhőben
const bad = []; const walk = (o, p) => { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { if (/[.$#\[\]\/]/.test(k)) bad.push(p + "/" + k); walk(v, p + "/" + k); } };
walk(server.dump(), ""); ok(!bad.length, "nincs tiltott Firebase-kulcs" + (bad.length ? ": " + bad.slice(0, 3) : ""));
void safeKey;

console.log(fails ? `\n✗ ${fails} hiba` : "\n✓ Minden teszt rendben");
process.exit(fails ? 1 : 0);
