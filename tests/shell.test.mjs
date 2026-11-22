// A közös váz: egységes pontozás, kétszintű napi cél, témazár, és hogy a váz/keret játékfüggetlen-e.
// Futtatás: node tests/shell.test.mjs
import { readFileSync, readdirSync } from "fs";
import { score, SCORING } from "../js/core/scoring.js";
import { missionProgress, completeMission, streakNow, addCorrect, bigProgress, setMult, multOf, giftPending, pickGift } from "../js/core/dailygoal.js";
import { recordAnswer } from "../js/core/answers.js";
import { srsStep, newItem } from "../js/core/srs.js";
import { setToday, keyToDay, dateKey, dayNum } from "../js/core/dates.js";
import { PACK } from "../js/pack/index.js";
import { newUser, normUser } from "../js/shell/user.js";
import { makeRng } from "../js/core/rng.js";

let fails = 0;
const ok = (c, msg) => { console.log((c ? "✓ " : "✗ ") + msg); if (!c) fails++; };

// --- pontozás: a tábla minden sora
ok(score({ r: 1, level: 1 }).pts === 10, "elsőre jó, 1. szint: 10");
ok(score({ r: 1, level: 2 }).pts === 12 && score({ r: 1, level: 3 }).pts === 15, "szintbónusz: 2. szint +2, 3. szint +5");
ok(score({ r: 2, level: 3 }).pts === 5, "tipp után jó: 5 (szintbónusz nélkül)");
ok(score({ r: 0, level: 3 }).pts === 2, "hibás, de végignézte a magyarázatot: 2");
ok(score({ r: 1, level: 1, combo: 2 }).pts === 10 && score({ r: 1, level: 1, combo: 3 }).pts === 13, "sorozatbónusz a 3. egymást követő elsőre jótól: +3");
ok(score({ r: 2, level: 1, twin: true }).pts === 8 && score({ r: 0, twin: true }).pts === 2, "hibából tanulás (ikerfeladat jó): +3");
ok(score({ r: 1, level: 1, helps: 2 }).pts === 4 && score({ r: 1, level: 1, helps: 5 }).pts === SCORING.helpMin, "segítség: −3/db, de legalább 2");

// --- napi küldetés és sorozat
const D = k => keyToDay(k), P = { goalTasks: 10, goalMin: 15, bigGoal: 30 };
{
  const u = newUser("A", "🦊", PACK);
  setToday(D("2026-11-16"));
  for (let i = 0; i < 10; i++) recordAnswer(u, { topic: "T1", r: 1, ms: 20000, pts: 10 });
  ok(missionProgress(u, P).pct === 1 && completeMission(u).streak === 1, "10 feladat → küldetés kész, sorozat 1");
  ok(completeMission(u) === null, "aznap másodszor nem számít");
  setToday(D("2026-11-18"));   // 1 nap kimaradt: a heti pajzs megvédi
  ok(streakNow(u) === 1, "egy kihagyott nap: a sorozat még él (pajzs)");
  for (let i = 0; i < 10; i++) recordAnswer(u, { topic: "T1", r: 1, ms: 20000, pts: 10 });
  const me = completeMission(u);
  ok(me.streak === 2 && me.shieldUsed, "a pajzs elhasználva, a sorozat 2");
  ok(u.days["2026-11-18"].pts === 100 && u.pts === 200, "a napi és az összes pont");
}
// --- napi nagy cél: szorzó, előleg, napváltás, ajándék naponta egyszer
{
  const u = newUser("B", "🦊", PACK);
  setToday(D("2026-11-18"));
  for (let i = 0; i < 29; i++) addCorrect(u, 30);
  ok(!bigProgress(u, 30).done && !giftPending(u), "29 helyes válasz: még nincs meg");
  ok(addCorrect(u, 30) === true && giftPending(u), "a 30. helyes válasznál megvan, ajándék jár");
  ok(addCorrect(u, 30) === false, "a cél felett már nem „lesz meg” újra");
  pickGift(u, { id: "b5", bonus: 5 });
  ok(!giftPending(u), "ajándék naponta egyszer");
  setToday(D("2026-11-19"));
  ok(bigProgress(u, 30).have === 5 && bigProgress(u, 30).bonus === 5, "másnap: +5 előleg az ajándékból");
  setMult(u, 3);
  ok(multOf(u) === 3, "a szülő ×3 szorzót állít");
  for (let i = 0; i < 9; i++) addCorrect(u, 30);
  ok(bigProgress(u, 30).have === 32 && bigProgress(u, 30).done, "×3-mal 9 helyes válasz + 5 előleg = 32");
  setToday(D("2026-11-20"));
  ok(multOf(u) === 1 && bigProgress(u, 30).have === 0, "napváltáskor a szorzó ×1, a számláló 0");
  setToday(null);
}
// --- témazár: a küldetésterv csak a nyitott témákból válogat
{
  const u = PACK.normUser(newUser("C", "🦊", PACK)), rng = makeRng(3);
  const plan = PACK.plan(u, 30, rng, ["T1", "T2"]);
  ok(plan.length === 30 && plan.every(x => ["T1", "T2"].includes(x.topic)), "lezárt témák nélkül készül a küldetés");
  ok(normUser({ name: "D", block: { topics: { 0: "T3" } } }, PACK).block.topics[0] === "T3", "a felhőből objektumként jövő témazár listává alakul");
}
// --- ismétlés (Leitner)
{
  const st = newItem(), t = 100;
  srsStep(st, true, t); ok(st.box === 0 && st.due === t + 1, "első jó válasz: holnap jön vissza");
  srsStep(st, true, t + 1); ok(st.box === 1 && st.due === t + 4, "esedékesen jó: egy dobozzal feljebb (3 nap)");
  srsStep(st, false, t + 4); ok(st.box === 0 && st.due === t + 5, "rossz válasz: vissza az elejére");
}
// --- a váz és a keret játékfüggetlen (nincs matekos fogalom a kódban)
{
  const FORBID = /bolyg|⛽|planet|Matek|matek|üzemanyag|"T\d+"|types\/|\.\.\/pack\/|\.\.\/game\//;
  const bad = [];
  ["js/core", "js/shell"].forEach(dir => readdirSync(new URL("../" + dir, import.meta.url)).filter(f => f.endsWith(".js")).forEach(f => {
    readFileSync(new URL(`../${dir}/${f}`, import.meta.url), "utf8").split("\n").forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, "");
      if (FORBID.test(code)) bad.push(`${dir}/${f}:${i + 1}: ${line.trim().slice(0, 80)}`);
    });
  }));
  ok(!bad.length, "a js/core és js/shell nem hivatkozik matekos fogalomra" + (bad.length ? "\n   " + bad.slice(0, 8).join("\n   ") : ""));
}

// a service worker (sw.js) minden saját JS-fájlt gyorsítótáraz – különben frissítés után offline hiányozhat egy fájl
{
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const walk = d => readdirSync(new URL("../" + d, import.meta.url), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + "/" + e.name) : e.name.endsWith(".js") ? [d + "/" + e.name] : []);
  const missing = walk("js").filter(f => !sw.includes(`"${f}"`));
  ok(!missing.length, "a sw.js minden JS-fájlt tartalmaz" + (missing.length ? ": hiányzik " + missing.join(", ") : ""));
}

console.log(fails ? `\n✗ ${fails} hiba` : "\n✓ Minden teszt rendben");
process.exit(fails ? 1 : 0);
