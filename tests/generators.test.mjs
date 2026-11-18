// ===== Generátor-teszt: típusonként, altípusonként és szintenként 1000 feladat =====
// Futtatás:  node tests/generators.test.mjs
// Ellenőrzi: van-e válasz, egész-e, nem negatív-e, a 4. osztályos számkörben marad-e, van-e magyarázat,
// nincs-e "undefined"/"NaN" a szövegben, és a hibaelemző (why) nem dob-e hibát.
import { TYPES, makeTask } from "../js/pack/types/index.js";
import { makeRng, plain } from "../js/pack/util.js";
import { checkAnswer } from "../js/pack/check.js";

const N = Number(process.argv[2] || 1000);
let fails = 0, total = 0;
const errs = {};
const fail = (key, msg, t) => { fails++; (errs[key] = errs[key] || []).length < 3 && errs[key].push(msg + (t ? " | " + plain(t.q).slice(0, 160) : "")); };

for (const T of TYPES) for (const S of T.subs) for (let lvl = 1; lvl <= 3; lvl++) {
  if ((S.minLvl || 1) > lvl || (S.maxLvl || 3) < lvl) continue;
  const key = `${T.id}.${S.id}.L${lvl}`;
  for (let i = 0; i < N; i++) {
    total++;
    const rng = makeRng(i * 7919 + lvl * 104729 + T.id.length);
    let t;
    try { t = makeTask(T, S.id, lvl, rng); } catch (e) { fail(key, "KIVÉTEL: " + e.stack.split("\n").slice(0, 2).join(" ")); continue; }
    const A = t.ans;
    if (!t.q || !A || !t.steps || !t.steps.length || !t.hint) { fail(key, "hiányzó mező", t); continue; }
    const all = [t.q, t.hint, ...t.steps, t.viz || ""].join(" ");
    if (/undefined|NaN|\[object|Infinity/.test(all)) fail(key, "undefined/NaN a szövegben: " + (all.match(/.{0,40}(undefined|NaN|\[object|Infinity).{0,40}/) || [""])[0], t);
    // Névelő-ellenőrzés: "a" magánhangzó előtt, "az" mássalhangzó előtt (szám előtt külön szabály)
    const p = plain(all);
    const m1 = p.match(/(^|[\s(„])a (egy|egyes|ezres|alma|aligátor|elefánt|emlékek|óra|egyesek|ötös)\b/i);
    if (m1) fail(key, "névelőhiba: " + m1[0], t);
    if (A.kind === "num") {
      if (!Number.isInteger(A.value)) fail(key, "nem egész válasz: " + A.value, t);
      else if (A.value < 0) fail(key, "negatív válasz: " + A.value, t);
      else if (A.value > 100000) fail(key, "túl nagy szám: " + A.value, t);
    } else if (A.kind === "time") {
      if (!Number.isInteger(A.value) || A.value < 0 || A.value >= 1440) fail(key, "rossz időpont: " + A.value, t);
    } else if (A.kind === "choice") {
      if (!(A.value >= 0 && A.value < A.options.length)) fail(key, "választás indexe kívül esik", t);
      if (new Set(A.options).size !== A.options.length) fail(key, "ismétlődő opció", t);
    } else if (A.kind === "pick") {
      if (!A.value.length || A.value.some(v => v < 0 || v >= A.options.length)) fail(key, "rossz pick", t);
    } else if (A.kind === "numset") {
      if (!A.value.length || new Set(A.value).size !== A.value.length) fail(key, "üres/ismétlődő megoldáshalmaz", t);
    } else if (A.kind === "combos") {
      if (!A.value.length || new Set(A.value).size !== A.value.length) fail(key, "üres/ismétlődő lehetőséglista", t);
      if (A.value.length > 10) fail(key, "túl sok lehetőség a felsoroláshoz: " + A.value.length, t);
      if (!A.slots && !A.path) fail(key, "nincs lehetőség-építő (slots/path)", t);
      if (A.slots && A.value.some(v => v.split("-").length !== A.slots.length)) fail(key, "a lehetőség hossza nem egyezik a helyek számával", t);
      if (A.slots && A.value.some(v => v.split("-").some((x, i) => !A.slots[i].opts.includes(x)))) fail(key, "a helyes lehetőség nem rakható ki a gombokból", t);
    } else fail(key, "ismeretlen választípus " + A.kind, t);
    // A helyes válasz átmegy az ellenőrzőn
    const correctInput = A.kind === "numset" || A.kind === "pick" ? A.value.slice().reverse()
      : A.kind === "combos" ? A.value.slice().reverse().map(v => (A.ordered ? v.split("-") : v.split("-").reverse())) : A.value;
    const r = checkAnswer(A, correctInput);
    if (!r.ok) fail(key, "a helyes válasz nem megy át az ellenőrzőn", t);
    // A hibaelemző nem dobhat hibát rossz válaszra
    try {
      const wrong = A.kind === "num" ? A.value + 10 : A.kind === "time" ? A.value + 60 : A.kind === "choice" ? (A.value + 1) % A.options.length : A.kind === "pick" ? [0] : A.kind === "combos" ? [["X", "Y"], A.value[0].split("-")] : [100, 999];
      if (t.why) { const w = t.why(wrong); if (w != null && typeof w !== "string") fail(key, "why nem szöveg", t); }
    } catch (e) { fail(key, "why kivétel: " + e.message, t); }
  }
}

for (const [k, v] of Object.entries(errs)) console.log("✗", k, "\n   " + v.join("\n   "));
console.log(`\n${total} feladat ellenőrizve, ${fails} hiba.`);
process.exit(fails ? 1 : 0);
