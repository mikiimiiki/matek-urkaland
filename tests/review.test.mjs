// ===== 🩹 Ismétlő kör: az elrontott feladat pontosan ugyanúgy jön újra =====
// Futtatás: node tests/review.test.mjs
globalThis.document = { querySelector: () => null };
const { PACK } = await import("../js/pack/index.js");
const { TYPES } = await import("../js/pack/types/index.js");
const { makeRng } = await import("../js/core/rng.js");
const { newUser, normUser } = await import("../js/shell/user.js");
const { REVIEW_MAX } = await import("../js/pack/progress.js");

let fails = 0;
const ok = (c, msg) => { console.log((c ? "✓ " : "✗ ") + msg); if (!c) fails++; };
const fresh = () => normUser(newUser("A", "🦊", PACK), PACK);

// minden típus és altípus: a magból ugyanaz a feladat (kérdés, ábra, válasz)
const bad = [];
for (const T of TYPES) for (const S of T.subs) for (let lvl = 1; lvl <= 3; lvl++) {
  if ((S.minLvl || 1) > lvl || (S.maxLvl || 3) < lvl) continue;
  const u = fresh(), rng = makeRng(lvl * 31 + T.id.length);
  for (let i = 0; i < 20; i++) {
    const t = PACK.makeTask({ topic: T.id, sub: S.id, level: lvl }, rng, u);
    const again = PACK.makeTask({ topic: T.id, sub: t.sub, level: t.level, seed: t.seed }, makeRng(12345), u);
    if (again.q !== t.q || again.viz !== t.viz || again.correctText !== t.correctText) { bad.push(`${T.id}.${S.id}.L${lvl}`); break; }
  }
}
ok(!bad.length, "minden altípusnál ugyanaz a feladat jön vissza a magból" + (bad.length ? ": " + bad.join(", ") : ""));

// hiba → a listára kerül; ismétlő kör → ugyanaz; elsőre jó → lekerül
{
  const u = fresh(), rng = makeRng(7);
  const t = PACK.makeTask({ topic: "T1", sub: null }, rng, u);
  PACK.record(u, t, 0);
  ok(PACK.review.count(u) === 1, "hibás válasz után 1 ismétlendő feladat");
  PACK.record(u, t, 0);
  ok(PACK.review.count(u) === 1, "ugyanaz a hiba kétszer nem kerül fel");
  const [it] = PACK.review.plan(u, 10, rng, null), t2 = PACK.makeTask(it, makeRng(1), u);
  ok(t2.q === t.q && t2.correctText === t.correctText, "az ismétlő kör ugyanazt a feladatot adja");
  PACK.record(u, t2, 2);
  ok(PACK.review.count(u) === 1, "tipp után jó: még marad ismétlésre");
  PACK.record(u, t2, 1);
  ok(PACK.review.count(u) === 0, "elsőre jó: lekerül a listáról");
}
{
  const u = fresh(), rng = makeRng(9);
  for (let i = 0; i < REVIEW_MAX + 10; i++) PACK.record(u, PACK.makeTask({ topic: "T2", sub: null }, rng, u), 0);
  ok(PACK.review.count(u) === REVIEW_MAX, `legfeljebb ${REVIEW_MAX} elrontott feladatot tart meg (a legújabbakat)`);
  ok(PACK.review.plan(u, 10, rng, ["T5"]).length === 0 && PACK.review.plan(u, 10, rng, null).length === 10, "a lezárt témák feladatai nem jönnek; a kör hossza a kért szám");
}

console.log(fails ? `\n✗ ${fails} hiba` : "\n✓ Minden teszt rendben");
process.exit(fails ? 1 : 0);
