// A felhőbe küldött játékosadat kulcsai nem tartalmazhatnak . $ # [ ] / karaktert (Firebase-szabály),
// és a régi, ponttal írt kulcsokat a normUser átalakítja.
import * as E from "../js/engine.js";
import { TYPES, makeTask } from "../js/types/index.js";
import { makeRng } from "../js/util.js";
const rng = makeRng(42), u = E.newUser("Teszt");
for (let i = 0; i < 60; i++) { const T = TYPES[i % TYPES.length]; const t = makeTask(T, E.pickSub(u, T, 1, rng), 1, rng); E.record(u, t, i % 3 === 0 ? 0 : 1, 20000, { q: "kérdés", a: "1", c: "2" }); }
E.completeMission(u);
const bad = [];
const walk = (o, p) => { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { if (/[.$#\[\]\/]/.test(k)) bad.push(p + "/" + k); walk(v, p + "/" + k); } };
walk(JSON.parse(JSON.stringify(u)), "");
const old = E.normUser({ name: "Régi", subs: { "T1.kerekites": { n: 3, ok: 2, box: 0, due: 0, last: { 0: 1, 1: 0 } } } });
const migrated = Object.keys(old.subs).join(",") === "T1:kerekites" && Array.isArray(old.subs["T1:kerekites"].last);
console.log(bad.length ? "✗ Érvénytelen kulcsok: " + bad.slice(0, 5).join(", ") : "✓ Minden kulcs érvényes");
console.log(migrated ? "✓ A régi kulcsok átalakultak" : "✗ Az átalakítás nem működik");
process.exit(bad.length || !migrated ? 1 : 0);
