// Részleges szinkron (core/syncdiff.js) és a feladatonkénti feltöltés mérete.
// Futtatás: node tests/sync.test.mjs
import { diff, merge, apply, stable, flatten, bytes } from "../js/core/syncdiff.js";
import { guessName } from "../js/core/device.js";
import { forSync, mergeLogs, clean } from "../js/core/cloud.js";
import * as E from "../js/engine.js";
import { TYPES, makeTask } from "../js/pack/types/index.js";
import { makeRng } from "../js/pack/util.js";
import { migrateUser, migrateFamily } from "../js/game/migrate.js";

let fails = 0;
const ok = (c, msg) => { console.log((c ? "✓ " : "✗ ") + msg); if (!c) fails++; };
const copy = x => JSON.parse(JSON.stringify(x));
// a Firebase így adja vissza: kulcsok ábécérendben, üres tömb/objektum nélkül
const viaFirebase = x => JSON.parse(stable(x).replace(/,?"[^"]+":(\[\]|\{\})/g, "").replace(/\{,/g, "{"));

ok(stable({ b: 1, a: { d: 2, c: 3 } }) === stable({ a: { c: 3, d: 2 }, b: 1 }), "stable: a kulcssorrend nem számít");
ok(flatten({ hist: { "2026-11-17": { T1: { ok: 1, n: 2 } } } }).has("hist/2026-11-17/T1"), "flatten: legfeljebb 3 szint mélyre bont");

// --- diff + apply oda-vissza
{
  const base = { a: 1, b: { x: 1, y: 2 }, c: [1, 2], gone: 5 };
  const local = { a: 2, b: { x: 1, y: 3, z: 4 }, c: [1, 2], e: [] };
  const d = diff(local, base);
  ok(stable(d) === stable({ a: 2, "b/y": 3, "b/z": 4, gone: null }), "diff: csak a változás és a törlés");
  ok(stable(apply(base, d)) === stable({ a: 2, b: { x: 1, y: 3, z: 4 }, c: [1, 2] }), "apply: a változás ráírva a felhőállapotra");
  ok(!Object.keys(diff(local, apply(base, d))).length, "feltöltés után nincs több eltérés");
  ok(stable(diff({ s: { a: 1 } }, { s: 5 })) === stable({ "s/a": 1 }) && stable(diff({ s: 5 }, { s: { a: 1 } })) === stable({ s: 5 }), "diff: típusváltásnál nincs egymásba ágyazott útvonal");
}
// --- háromutas összefésülés
{
  const base = { pts: 10, days: { d1: { n: 1 } }, prefs: { goal: 10 } };
  const remote = { pts: 10, days: { d1: { n: 1 }, d2: { n: 5 } }, prefs: { goal: 12 } };          // másik eszköz: új nap + szülő állított
  const local = { pts: 15, days: { d1: { n: 3 } }, prefs: { goal: 10 }, hist: { h: { T1: { n: 2 } } } }; // itt: játék + új mező
  const m = merge(base, remote, local, true);
  ok(m.pts === 15 && m.days.d1.n === 3 && m.days.d2.n === 5 && m.prefs.goal === 12 && m.hist.h.T1.n === 2, "merge: mindkét eszköz változása megmarad");
  const old = { pts: 20, days: { d1: { n: 4 } } };   // régi változatú eszköz: nem ismeri a hist és prefs mezőt
  const m2 = merge(remote, old, local, false);
  ok(m2.hist && m2.prefs && m2.prefs.goal === 10 && m2.days.d2 === undefined && m2.pts === 20, "merge: a régi eszköz írása nem törli az új mezőket");
  const m3 = merge(base, { ...base, pts: 30 }, { ...base, pts: 25 }, true);
  ok(m3.pts === 25, "merge: ütközésnél a frissebb (itt a helyi) nyer");
  const m4 = merge(base, { ...base, pts: 30 }, { ...base, pts: 25 }, false);
  ok(m4.pts === 30, "merge: ütközésnél a frissebb (itt a felhő) nyer");
}
// --- egy feladat után a feltöltés mérete (átvételi feltétel: < 2 KB)
{
  const rng = makeRng(11), st = { settings: {}, users: {} }; migrateFamily(st);
  const u = migrateUser(E.newUser("Anna", "🦊"), st);
  for (let i = 0; i < 300; i++) { const T = TYPES[i % TYPES.length]; E.record(u, makeTask(T, E.pickSub(u, T, 1, rng), 1, rng), i % 4 ? 1 : 0, 30000, { q: "Mennyi 3 + 4?", a: "6", c: "7", w: "" }); }
  const remote = viaFirebase(forSync({ ...u, name: u.name }));
  const before = copy(u);
  const T = TYPES[3]; E.record(u, makeTask(T, E.pickSub(u, T, 1, rng), 1, rng), 1, 30000, {});
  const d = diff(forSync({ ...u, name: u.name }), remote);
  const full = bytes(forSync(u)), part = bytes(d);
  ok(part < 2048, `egy jó válasz után ${part} B megy fel (a teljes játékos ${(full / 1024).toFixed(1)} KB)`);
  E.record(u, makeTask(T, E.pickSub(u, T, 1, rng), 1, rng), 0, 30000, { q: "Mennyi 3 + 4?", a: "6", c: "7" });
  const d2 = diff(forSync({ ...u, name: u.name }), remote), newLog = u.log[u.log.length - 1];
  ok(bytes(d2) + bytes(clean(newLog)) < 2048, `egy hibás válasz után ${bytes(d2) + bytes(clean(newLog))} B (hibanapló-bejegyzéssel együtt)`);
  ok(!("log" in forSync(before)), "a hibanapló nem kerül a játékos objektumába");
}
// --- hibanapló egyesítése
{
  const a = [{ t: 1, q: "a" }, { t: 3, q: "c" }], b = { x: { t: 2, q: "b" }, y: { t: 3, q: "c" } };
  const m = mergeLogs(a, b);
  ok(m.map(l => l.t).join() === "1,2,3", "mergeLogs: időrendben, ismétlés nélkül");
  ok(mergeLogs(Array.from({ length: 150 }, (_, i) => ({ t: i + 1 })), []).length === 120 && mergeLogs(Array.from({ length: 150 }, (_, i) => ({ t: i + 1 })), [])[0].t === 31, "mergeLogs: a legújabb 120 marad");
}
// --- eszköznév
ok(guessName("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36") === "Windows – Chrome", "eszköznév: Windows – Chrome");
ok(guessName("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1") === "iPhone – Safari", "eszköznév: iPhone – Safari");
ok(guessName("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0") === "Windows – Edge", "eszköznév: Windows – Edge");

console.log(fails ? `\n✗ ${fails} hiba` : "\n✓ Minden teszt rendben");
process.exit(fails ? 1 : 0);
