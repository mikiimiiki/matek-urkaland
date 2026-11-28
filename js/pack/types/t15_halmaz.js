// ===== T15 – Halmazábra (Venn-diagram) =====
// A felvételi mintái: leolvasás pöttyös halmazábráról (kinek van kutyája, macskája – 2025/1 #8),
// számok elhelyezése két tulajdonság szerint (2025/2 #5), szöveges halmazfeladat.
import { aAz } from "../../core/dom.js";
import { svg, txt, circle, rect, digitSum, numVal } from "../util.js";

// Két kör egy téglalapban. regions: { a: csak A, ab: közös, b: csak B, o: kívül } – szám vagy tömb (feliratok)
function venn(A, B, regions, o = {}) {
  const W = 420, H = 240, cx1 = 150, cx2 = 270, cy = 120, r = 95;
  let s = rect(4, 4, W - 8, H - 8, { rx: 12, fill: "var(--card)", stroke: "var(--soft)", sw: 2 });
  s += `<circle cx="${cx1}" cy="${cy}" r="${r}" fill="#c4b5fd" fill-opacity=".45" stroke="#7c3aed" stroke-width="2.5"/><circle cx="${cx2}" cy="${cy}" r="${r}" fill="#fde68a" fill-opacity=".45" stroke="#d97706" stroke-width="2.5"/>`;
  s += txt(cx1 - 40, 26, A, { size: 15, w: 900, fill: "#5b21b6" }) + txt(cx2 + 40, 26, B, { size: 15, w: 900, fill: "#92400e" });
  // a körökön kívüli rész a bal alsó sarokban van, jól elkülönítve a köröktől
  const pos = { a: [cx1 - 50, cy], ab: [(cx1 + cx2) / 2, cy], b: [cx2 + 50, cy], o: [24, H - 24] };
  for (const [k, v] of Object.entries(regions)) {
    const [x, y] = pos[k];
    if (typeof v === "number" && o.dots) { // pöttyök: 1 pötty = 1 tanuló
      if (k === "o") for (let i = 0; i < v; i++) s += circle(x + i * 17, y, 6, { fill: "#1e293b" });
      else { const cols = 3; for (let i = 0; i < v; i++) s += circle(x - 18 + (i % cols) * 18, y - 30 + Math.floor(i / cols) * 18, 6, { fill: "#1e293b" }); }
    } else if (Array.isArray(v) && k === "o") s += txt(x - 8, y + 6, v.join(", "), { size: 16, w: 900, a: "start" });
    else if (Array.isArray(v)) v.forEach((t, i) => { s += txt(x, y - (v.length - 1) * 11 + i * 22, String(t), { size: 16, w: 900 }); });
    else if (v !== null && v !== undefined) s += txt(k === "o" ? x + 6 : x, y + 6, String(v), { size: 20, w: 900, fill: o.hl === k ? "var(--bad)" : "var(--ink)" });
  }
  return svg(W, H, s);
}

// ---- 1. Leolvasás pöttyös ábráról ----
function olvas(rng, lvl) {
  // témánként kész kérdésmondatok
  const TH = rng.pick([
    { A: "kutya", B: "macska", onlyA: "Hány tanulónak csak kutyája van?", both: "Hány tanulónak van kutyája és macskája is?", none: "Hány tanulónak nincs egyik állata sem?", hasA: "Hány tanulónak van kutyája?", notB: "Hány tanulónak nincs macskája?" },
    { A: "foci", B: "úszás", onlyA: "Hány tanuló csak focizik?", both: "Hány tanuló focizik és úszik is?", none: "Hány tanuló nem focizik és nem is úszik?", hasA: "Hány tanuló focizik?", notB: "Hány tanuló nem úszik?" },
    { A: "gitár", B: "zongora", onlyA: "Hány tanuló csak gitározik?", both: "Hány tanuló gitározik és zongorázik is?", none: "Hány tanuló nem játszik egyik hangszeren sem?", hasA: "Hány tanuló gitározik?", notB: "Hány tanuló nem zongorázik?" },
  ]);
  const A = TH.A, B = TH.B;
  const R = { a: rng.int(1, 6), ab: rng.int(1, 4), b: rng.int(1, 6), o: rng.int(0, 4) };
  const total = R.a + R.ab + R.b + R.o, absent = rng.int(1, 3);
  const qs = [
    { q: TH.onlyA, v: R.a, ex: `Csak a „${A}” körben, a közös részen kívül: <b>${R.a}</b>`, bad: R.a + R.ab, badMsg: "A közös részben lévőknek a másik is megvan – ők nem „csak” ezt az egyet!" },
    { q: TH.both, v: R.ab, ex: `A két kör közös része: <b>${R.ab}</b>` },
    { q: TH.none, v: R.o, ex: `A körökön kívül: <b>${R.o}</b>` },
    ...(lvl >= 2 ? [
      { q: TH.hasA, v: R.a + R.ab, ex: `Az egész „${A}” kör (a közös résszel együtt): ${R.a} + ${R.ab} = <b>${R.a + R.ab}</b>`, bad: R.a, badMsg: "A közös részben lévők is beletartoznak!" },
      { q: TH.notB, v: R.a + R.o, ex: `Akik a „${B}” körön kívül vannak: ${R.a} + ${R.o} = <b>${R.a + R.o}</b>`, bad: R.a, badMsg: "Azokat is számold, akik egyik körben sincsenek benne!" },
      { q: "Hány tanuló válaszolt összesen?", v: total, ex: `Minden pötty: ${R.a} + ${R.ab} + ${R.b} + ${R.o} = <b>${total}</b>`, bad: total - R.o, badMsg: "A körökön kívül lévők is válaszoltak!" },
    ] : []),
    ...(lvl === 3 ? [{ q: `Hány tanuló jár a szakkörre, ha ${absent} tanuló hiányzott a kérdezéskor?`, v: total + absent, ex: `A válaszolók: ${total}, plusz a hiányzók: ${total} + ${absent} = <b>${total + absent}</b>`, bad: total, badMsg: "A hiányzók is a szakkör tagjai – őket is hozzá kell adni!" }] : []),
  ];
  const Q = rng.pick(qs);
  return {
    sub: "olvas",
    q: `A szakkör jelen lévő tanulóit megkérdezték. Az ábrán <b>1 pötty = 1 tanuló</b>.<p><b>${Q.q}</b></p>`, viz: venn(A, B, R, { dots: true }),
    ans: { kind: "num", value: Q.v, unit: "tanuló" },
    hint: "Nézd meg, melyik részre kérdeznek rá: csak az egyik körre, a közös részre, az egész körre, vagy a körökön kívülre!",
    steps: [`Számoljuk meg a pöttyöket részenként:` + venn(A, B, R), Q.ex + `<br>A válasz: <b class="big">${Q.v}</b>`],
    why: v => Q.bad !== undefined && v === Q.bad ? Q.badMsg : null,
  };
}

// ---- 2. Számok elhelyezése ----
// t: rövid felirat (ábra, táblázat), n: a kör tartalma mondatban
const PROPS = [
  { t: "páros", n: "a páros számok", f: x => x % 2 === 0 }, { t: "páratlan", n: "a páratlan számok", f: x => x % 2 === 1 },
  { t: "5-tel osztható", n: "az 5-tel osztható számok", f: x => x % 5 === 0 }, { t: "3-mal osztható", n: "a 3-mal osztható számok", f: x => x % 3 === 0 },
  { t: "300-nál nagyobb", n: "a 300-nál nagyobb számok", f: x => x > 300 }, { t: "páratlan számjegyösszeg", n: "a páratlan számjegyösszegű számok", f: x => digitSum(x) % 2 === 1 },
  { t: "10-zel osztható", n: "a 10-zel osztható számok", f: x => x % 10 === 0 }, { t: "200-nál kisebb", n: "a 200-nál kisebb számok", f: x => x < 200 },
];
function szamok(rng, lvl) {
  for (let t = 0; t < 300; t++) {
    const [P, Q] = rng.sample(PROPS, 2);
    if ((P.t === "páros" && Q.t === "páratlan") || (Q.t === "páros" && P.t === "páratlan")) continue;
    const nums = []; while (nums.length < 6) { const x = rng.int(lvl === 1 ? 10 : 100, lvl === 1 ? 99 : 999); if (!nums.includes(x)) nums.push(x); }
    const reg = x => P.f(x) && Q.f(x) ? "ab" : P.f(x) ? "a" : Q.f(x) ? "b" : "o";
    const by = { a: [], ab: [], b: [], o: [] }; nums.forEach(x => by[reg(x)].push(x));
    if (!by.ab.length || !by.a.length || !by.b.length) continue;
    const kind = lvl === 1 ? rng.pick(["kozos", "kivul"]) : rng.pick(["kozos", "kivul", "csakA"]);
    if (kind === "kivul" && by.o.length !== 1) continue;
    const table = `<table class="tbl"><tr><th>szám</th><th>${P.t}</th><th>${Q.t}</th><th>helye</th></tr>${nums.map(x => `<tr><td>${x}</td><td>${P.f(x) ? "✅" : "❌"}</td><td>${Q.f(x) ? "✅" : "❌"}</td><td>${{ a: "csak bal kör", ab: "közös rész", b: "csak jobb kör", o: "kívül" }[reg(x)]}</td></tr>`).join("")}</table>`;
    const filled = venn(P.t, Q.t, { a: by.a, ab: by.ab, b: by.b, o: by.o.length ? by.o : null });
    const base = `A halmazábra bal körébe ${P.n.replace(/^(a|az) /, "$1 <b>")}</b>, jobb körébe ${Q.n.replace(/^(a|az) /, "$1 <b>")}</b> kerülnek. Ezeket a számokat kell elhelyezni: <b>${nums.join(", ")}</b>.`;
    const steps = [`Minden számot megvizsgálunk mindkét tulajdonság szerint:` + table, `Elhelyezve:` + filled];
    if (kind === "kozos") return {
      sub: "szamok", q: `${base}<p><b>Mely számok kerülnek a két kör közös részébe?</b> Jelöld meg az összeset!</p>`, viz: venn(P.t, Q.t, {}),
      ans: { kind: "pick", options: nums.map(String), value: by.ab.map(x => nums.indexOf(x)) },
      hint: "A közös részbe az kerül, amire MINDKÉT tulajdonság igaz!", steps: [...steps, `A közös részben: <b class="big">${by.ab.join(", ")}</b>`],
      why: ks => { const w = ks.map(k => nums[k]).find(x => reg(x) !== "ab"); return w !== undefined ? `${w}: ${P.f(w) ? "" : `nem ${P.t}`}${!P.f(w) && !Q.f(w) ? ", és " : ""}${Q.f(w) ? "" : `nem ${Q.t}`} – nem kerülhet a közös részbe.` : null; },
    };
    if (kind === "kivul") return {
      sub: "szamok", q: `${base}<p><b>Melyik szám marad ki mindkét körből?</b></p>`, viz: venn(P.t, Q.t, {}),
      ans: { kind: "choice", options: nums.map(String), value: nums.indexOf(by.o[0]) },
      hint: "Az marad kívül, amire EGYIK tulajdonság sem igaz.", steps: [...steps, `Kívül marad: <b class="big">${by.o[0]}</b>`], why: () => null,
    };
    return {
      sub: "szamok", q: `${base}<p><b>Hány szám kerül <u>csak</u> a bal körbe</b> (a közös részen kívül)?</p>`, viz: venn(P.t, Q.t, {}),
      ans: { kind: "num", value: by.a.length },
      hint: `Csak a bal körbe az kerül, ami ${P.t}, de NEM ${Q.t}.`, steps: [...steps, `Csak a bal körben: ${by.a.join(", ")} → <b class="big">${by.a.length}</b>`],
      why: v => v === by.a.length + by.ab.length ? "A közös rész nem „csak a bal kör” – azokat ne számold bele!" : null,
    };
  }
  throw new Error("szamok: nem sikerült feladatot készíteni");
}

// ---- 3. Szöveges halmazfeladat ----
function szoveges(rng, lvl) {
  const [A, B, vA, vB] = rng.pick([["úszás", "foci", "úszásra", "focira"], ["rajz", "ének", "rajzszakkörre", "énekkarra"], ["angol", "német", "angolra", "németre"]]);
  const both = rng.int(2, 8), a = both + rng.int(2, 10), b = both + rng.int(2, 10), none = rng.int(0, 8), N = a + b - both + none;
  const kinds = lvl === 1 ? ["csakA", "egyiksem"] : lvl === 2 ? ["egyiksem", "legalabb", "csakA"] : ["egyiksem", "mindketto", "legalabb"];
  const k = rng.pick(kinds);
  const R = { a: a - both, ab: both, b: b - both, o: none };
  const intro = k === "mindketto"
    ? `Egy ${N} fős osztályban ${a} tanuló jár ${vA}, ${b} tanuló ${vB}, és ${none} tanuló egyikre sem jár.`
    : `Egy ${N} fős osztályban ${a} tanuló jár ${vA}, ${b} tanuló ${vB}, és ${both} tanuló mindkettőre jár.`;
  const Q = {
    csakA: { q: `Hány tanuló jár csak ${vA}?`, v: a - both, ex: [`${aAz(A, true)} „${A}” körben ${a} tanuló van, de ebből ${both} mindkettőre jár.`, `Csak ${vA}: ${a} − ${both} = <b class="big">${a - both}</b>`], bad: a, badMsg: `Ebben a ${a} tanulóban benne vannak azok is, akik mindkettőre járnak – őket le kell vonni!` },
    egyiksem: { q: "Hány tanuló nem jár egyikre sem?", v: none, ex: [`Legalább az egyikre jár: ${a} + ${b} − ${both} = <b>${a + b - both}</b> (a mindkettőre járókat egyszer kell számolni!).`, `Egyikre sem: ${N} − ${a + b - both} = <b class="big">${none}</b>`], bad: N - a - b, badMsg: `A mindkettőre járó ${both} tanulót kétszer vontad le – őket csak egyszer kell számolni!` },
    legalabb: { q: "Hány tanuló jár legalább az egyikre?", v: a + b - both, ex: [`${a} + ${b} = ${a + b}, de így a mindkettőre járó ${both} tanulót kétszer számoltuk.`, `${a + b} − ${both} = <b class="big">${a + b - both}</b>`], bad: a + b, badMsg: "A mindkettőre járókat kétszer számoltad – egyszer le kell vonni őket!" },
    mindketto: { q: "Hány tanuló jár mindkettőre?", v: both, ex: [`Legalább az egyikre jár: ${N} − ${none} = <b>${N - none}</b>.`, `${a} + ${b} = ${a + b}, ez ${numVal(a + b - (N - none))} több, mint ${N - none} – ennyi tanulót számoltunk kétszer, ők járnak mindkettőre: <b class="big">${both}</b>`] },
  }[k];
  return {
    sub: "szoveges", q: `${intro}<p><b>${Q.q}</b></p>`,
    ans: { kind: "num", value: Q.v, unit: "tanuló" },
    hint: "Rajzolj halmazábrát! Először a közös részbe írd be, akik mindkettőre járnak, aztán töltsd ki a többit.",
    steps: [`Halmazábrával:` + venn(A, B, { a: R.a, ab: R.ab, b: R.b, o: R.o }, { hl: { csakA: "a", egyiksem: "o", mindketto: "ab" }[k] }), ...Q.ex],
    why: v => Q.bad !== undefined && v === Q.bad ? Q.badMsg : null,
  };
}

export default {
  id: "T15",
  name: "Halmazábra",
  planet: { name: "Halmaz-holdak", emoji: "⭕", color: "#0d9488" },
  subs: [
    { id: "olvas", name: "Leolvasás", gen: olvas },
    { id: "szamok", name: "Számok elhelyezése", gen: szamok },
    { id: "szoveges", name: "Szöveges feladat", gen: szoveges },
  ],
};
