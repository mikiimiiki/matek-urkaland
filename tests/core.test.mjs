// A közös keret (fejlődés-adatok, beállítások) és az adat-átállás (schema 1 → 2) tesztje.
// Futtatás: node tests/core.test.mjs
import * as E from "../js/engine.js";
import { histAdd, histAgg, series, compare, backfill, PERIODS } from "../js/core/progress.js";
import { clampValue, defaultsFor, resolve } from "../js/core/settings.js";
import { dayNum, dateKey, keyToDay } from "../js/core/dates.js";
import { SETTINGS, TOPICS } from "../js/game/config.js";
import { migrateFamily, migrateUser, SCHEMA } from "../js/game/migrate.js";
import { TYPES, makeTask } from "../js/types/index.js";
import { makeRng } from "../js/util.js";

let fails = 0;
const ok = (c, msg) => { console.log((c ? "✓ " : "✗ ") + msg); if (!c) fails++; };

// --- dátumok
const t = dayNum();
ok(keyToDay(dateKey(t)) === t, "dateKey ↔ keyToDay oda-vissza egyezik");

// --- hist gyűjtés
{
  const u = { hist: {} };
  histAdd(u, "T1", true, 30000, t); histAdd(u, "T1", false, 999999, t); histAdd(u, "T2", true, 1000, t - 8);
  const d = u.hist[dateKey(t)].T1;
  ok(d.n === 2 && d.ok === 1 && d.ms === 30000 + 180000, "histAdd számol, és 3 percnél levágja az időt");
  ok(histAgg(u, t - 6, t).n === 2 && histAgg(u, t - 13, t).n === 3, "histAgg időszakra összegez");
  ok(histAgg(u, t - 13, t, "T2").n === 1, "histAgg témára szűr");
  for (let i = 0; i < 420; i++) histAdd(u, "T1", true, 0, t - 1000 + i);
  ok(Object.keys(u.hist).length <= 400, "400 napnál régebbi adat törlődik");
}
// --- sorozatok és összevetés
{
  const u = { hist: {} };
  for (let i = 0; i < 10; i++) histAdd(u, "T1", i < 9, 0, t);          // most 90%
  for (let i = 0; i < 10; i++) histAdd(u, "T1", i < 5, 0, t - 8);      // előző hét 50%
  histAdd(u, "T2", true, 0, t);                                         // kevés adat
  Object.entries(PERIODS).forEach(([id, P]) => {
    const s = series(u, id, t);
    ok(s.length === P.count && s[s.length - 1].to === t, `series(${id}): ${P.count} pont, az utolsó ma végződik`);
  });
  const w = series(u, "week", t);
  ok(w[w.length - 1].pct === Math.round(10 / 11 * 100) && w[w.length - 2].pct === 50, "heti pontosság helyes");
  const c = compare(u, [{ id: "T1" }, { id: "T2" }, { id: "T3" }], "week", t);
  const c1 = c.find(x => x.id === "T1"), c2 = c.find(x => x.id === "T2");
  ok(c1.delta === 40, "T1: +40% az előző héthez képest");
  ok(c2.delta === null && c2.few, "T2: kevés adat, nincs ▲/▼");
  ok(c[c.length - 1].id === "T3", "adat nélküli téma a lista végére kerül");
}
// --- visszamenőleges kitöltés: nincs dupla számolás
{
  const k = dateKey(t - 3);
  const u = { days: { [k]: { n: 10, ok: 7, ms: 600000 } }, hist: { [k]: { T1: { n: 4, ok: 3, ms: 100000 } } } };
  backfill(u); backfill(u);
  ok(u.hist[k]._all.n === 6 && u.hist[k]._all.ok === 4 && histAgg(u, t - 3, t - 3).n === 10, "backfill csak a bontás nélküli részt teszi _all-ba, és idempotens");
}
// --- beállítások
{
  const g = SETTINGS.find(d => d.key === "goalTasks"), f = SETTINGS.find(d => d.key === "freeTasks");
  ok(clampValue(g, 99) === 40 && clampValue(g, "x") === 10, "number: határok és hibás érték");
  ok(clampValue(f, "10") === 10 && clampValue(f, 7) === 5, "select: csak a megengedett érték");
  ok(resolve(g, {}, { goalTasks: 12 }) === 12 && resolve(g, { goalTasks: 20 }, { goalTasks: 12 }) === 20 && resolve(g, null, null) === 10, "resolve: gyerek → család → alap");
  ok(Object.keys(defaultsFor(SETTINGS, "child")).length === 6, "6 gyerekenkénti beállítás");
  ok(TOPICS().length === TYPES.length, "minden bolygó téma a Fejlődés fülön");
}
// --- adat-átállás
{
  const rng = makeRng(7);
  const state = { settings: { goalTasks: 14, goalMin: 20, freeTasks: 10, tts: true, rewards: [{ id: "r1", text: "Mozi", kind: "pts", need: 100 }] }, users: {} };
  const u = E.newUser("Anna", "🦊");
  for (let i = 0; i < 5; i++) { const T = TYPES[i]; E.record(u, makeTask(T, T.subs[0].id, 1, rng), 1, 1000, { q: "", a: "", c: "" }); }
  delete u.hist; delete u.prefs; delete u.rewards;                 // régi (schema 1) adat
  migrateFamily(state);
  ok(state.settings.childDefaults.goalTasks === 14 && state.settings.childDefaults.tts === true, "a régi családi beállítás lett a családi alapérték");
  migrateUser(u, state);
  ok(u.prefs.goalTasks === 14 && u.prefs.freeTasks === 10, "a gyerek megkapja a beállításokat");
  ok(u.rewards.length === 1 && u.rewards !== state.settings.rewards, "a jutalmak másolatként kerülnek a gyerekhez");
  ok(histAgg(u, t, t).n === 5, "a mai feladatok átkerültek a fejlődés-adatokba");
  ok(u.schema === SCHEMA && u.cosmetics.avatar === "🦊" && u.owned.includes("av:🦊"), "schema 2, az avatar a szekrényben");
  const snap = JSON.stringify(u); migrateUser(u, state); migrateFamily(state);
  ok(JSON.stringify(u) === snap, "többször futtatva sem változik");
  // a migrált adat is érvényes Firebase-kulcsokat használ
  const bad = []; const walk = (o, p) => { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { if (/[.$#\[\]\/]/.test(k)) bad.push(p + "/" + k); walk(v, p + "/" + k); } };
  walk(JSON.parse(JSON.stringify(u)), "");
  ok(!bad.length, "a migrált adatban nincs tiltott Firebase-kulcs" + (bad.length ? ": " + bad.slice(0, 3).join(", ") : ""));
}

console.log(fails ? `\n✗ ${fails} hiba` : "\n✓ Minden teszt rendben");
process.exit(fails ? 1 : 0);
