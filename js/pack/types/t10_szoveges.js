// ===== T10 – Szöveges feladatok =====
// A 2022–2026-os feladatlapok visszatérő mintái: összeg és különbség, „többször annyi”, életkor,
// csomagolási lánc, „fák között eggyel kevesebb köz van”, lépcsőzés, csere, mérleg.
// A magyarázatok szakaszos ábrát (szalagmodellt) és lépésenkénti számolást mutatnak.
import { fmt, svg, txt, rect, line, circle, numVal, article } from "../util.js";

const NAMES = ["Panka", "Zoli", "Peti", "Anna", "Bence", "Lili", "Máté", "Réka", "Sára", "Zoé", "Dani", "Emma", "Kata", "Marci"];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const PRI = "var(--pri2)", EXTRA = "#fcd34d", GREEN = "#86efac";

// ---- Szalagmodell: sorok egymás alatt, a szakaszok hossza arányos az értékkel ----
// rows: [{ label, parts: [{ v, text, fill }], total }]
function tape(rows, o = {}) {
  const max = Math.max(...rows.map(r => r.parts.reduce((a, p) => a + p.v, 0)));
  // keskeny ábra nagy betűkkel, hogy a magyarázat paneljén se zsugorodjon olvashatatlanra
  const LW = 96, PW = Math.min(o.w || 250, 250), RH = 38, H = rows.length * (RH + 12) + 10;
  let b = "";
  rows.forEach((r, i) => {
    const y = 8 + i * (RH + 12);
    b += txt(LW - 8, y + RH / 2 + 6, r.label, { size: 16, a: "end", w: 800 });
    let x = LW;
    r.parts.forEach(p => {
      const w = Math.max(30, p.v / max * PW);
      b += rect(x, y, w - 2, RH, { rx: 6, fill: p.fill || "var(--bar)" });
      if (p.text) b += txt(x + w / 2, y + RH / 2 + 6, p.text, { size: 15, w: 800 });
      x += w;
    });
    if (r.total) b += txt(x + 8, y + RH / 2 + 6, r.total, { size: 16, a: "start", w: 800, fill: "var(--pri)" });
  });
  return svg(LW + PW + 30 * Math.max(...rows.map(r => r.parts.length)) + 80, H, b);
}

// ---- 1. Összeg és különbség ----
const SUMDIFF = [
  { story: (S, D) => `Egy iskolába ${fmt(S)} tanuló jár. ${cap(numVal(D))} több a lány, mint a fiú.`, big: "lány", small: "fiú", unit: "", q: { lány: "Hány lány jár az iskolába?", fiú: "Hány fiú jár az iskolába?" } },
  // valósághű tartomány: újszülött 250–400 dkg (a többi témánál a szint dönt)
  { story: (S, D) => `Janka és Gréti születéskori tömege együtt ${fmt(S)} dkg. Janka ${D} dkg-mal nehezebb volt, mint Gréti.`, big: "Janka", small: "Gréti", unit: "dkg", q: { Janka: "Hány dkg volt Janka születéskor?", Gréti: "Hány dkg volt Gréti születéskor?" }, small2: [125, 190], d2: [5, 30] },
  { story: (S, D) => `Két polcon összesen ${fmt(S)} könyv van. A felső polcon ${numVal(D)} több könyv van, mint az alsón.`, big: "felső polc", small: "alsó polc", unit: "könyv", q: { "felső polc": "Hány könyv van a felső polcon?", "alsó polc": "Hány könyv van az alsó polcon?" } },
  { story: (S, D) => `Két osztály együtt ${fmt(S)} kg papírt gyűjtött. A 4.a ${D} kg-mal több papírt gyűjtött, mint a 4.b.`, big: "4.a", small: "4.b", unit: "kg", q: { "4.a": "Hány kg papírt gyűjtött a 4.a?", "4.b": "Hány kg papírt gyűjtött a 4.b?" } },
];
function osszegkulonbseg(rng, lvl) {
  const T = rng.pick(SUMDIFF);
  // small2/d2: a fél-értékek tartománya (×2 → páros számok, hogy a felezés egész legyen)
  const small = T.small2 ? rng.int(...T.small2) * 2 : lvl === 1 ? rng.int(5, 40) * 2 : lvl === 2 ? rng.int(20, 200) * 2 : rng.int(100, 900) * 2;
  const D = T.d2 ? rng.int(...T.d2) * 2 : lvl === 1 ? rng.int(1, 10) * 2 : rng.int(5, lvl === 2 ? 60 : 150) * 2;
  const big = small + D, S = small + big;
  const askBig = rng.chance(0.5), ans = askBig ? big : small, who = askBig ? T.big : T.small;
  const u = T.unit ? " " + T.unit : "";
  return {
    sub: "osszegkulonbseg",
    q: `${T.story(S, D)}<p><b>${T.q[who]}</b></p>`,
    ans: { kind: "num", value: ans, unit: T.unit },
    hint: `Rajzolj két szalagot! Ha a nagyobbikból elveszed a többletet (${fmt(D)}), a két rész egyforma lesz. Mennyi marad az összegből, és mennyi jut így egy részre?`,
    steps: [
      `Rajzoljuk le! A nagyobbik (${T.big}) szalagja ${numVal(D)} hosszabb:` + tape([{ label: T.small, parts: [{ v: small, text: "?", fill: PRI }] }, { label: T.big, parts: [{ v: small, text: "?", fill: PRI }, { v: D, text: `+${fmt(D)}`, fill: EXTRA }] }]),
      `Vegyük el a többletet az összegből: ${fmt(S)} − ${fmt(D)} = <b>${fmt(S - D)}</b>. Ez már <b>két egyforma</b> rész.`,
      `Egy rész: ${fmt(S - D)} : 2 = <b>${fmt(small)}</b> – ennyi a kisebbik (${T.small}).` + (askBig ? `<br>A nagyobbik (${T.big}): ${fmt(small)} + ${fmt(D)} = <b>${fmt(big)}</b>.` : ""),
      `A válasz: <b class="big">${fmt(ans)}${u}</b><br><span class="soft">Ellenőrzés: ${fmt(small)} + ${fmt(big)} = ${fmt(S)} ✔, és a különbség ${fmt(D)} ✔</span>`,
    ],
    why: v => {
      if (v === S / 2) return `A két rész nem egyforma – az egyik ${numVal(D)} több! Előbb vedd el a többletet.`;
      if (v === S - D) return "Jó úton jársz: elvetted a többletet – de ez még két rész együtt, el kell felezni!";
      if (v === (askBig ? small : big)) return askBig ? `Ez a kisebbik (${T.small}) – a kérdés a nagyobbikra (${T.big}) vonatkozik.` : `Ez a nagyobbik (${T.big}) – a kérdés a kisebbikre (${T.small}) vonatkozik.`;
      return null;
    },
  };
}

// ---- 2. Többször annyi ----
const TIMES = [
  { ctx: "A kertet kék és piros lufikkal díszítették.", a: { n: "kék lufi", bol: "kék lufiból", pl: "kék lufik", l: "kék" }, b: { n: "piros lufi", bol: "piros lufiból", pl: "piros lufik", l: "piros" } },
  { ctx: "A piacon almát és körtét vettek.", a: { n: "alma", bol: "almából", pl: "almák", l: "alma" }, b: { n: "körte", bol: "körtéből", pl: "körték", l: "körte" } },
  { ctx: "A virágboltban tulipánt és rózsát árultak.", a: { n: "tulipán", bol: "tulipánból", pl: "tulipánok", l: "tulipán" }, b: { n: "rózsa", bol: "rózsából", pl: "rózsák", l: "rózsa" } },
];
const KW = { 2: "kétszer", 3: "háromszor", 4: "négyszer", 5: "ötször" };
function tobbszor(rng, lvl) {
  const T = rng.pick(TIMES), a = T.a, b = T.b, k = rng.int(2, lvl === 1 ? 3 : 5), base = rng.int(lvl === 1 ? 5 : 12, lvl === 1 ? 40 : lvl === 2 ? 120 : 400);
  const mode = lvl === 1 ? "total" : rng.pick(["total", "part", "diff"]);
  const total = base * (k + 1), big = base * k, kw = KW[k];
  const units = (n, t, fill) => Array.from({ length: n }, () => ({ v: 1, text: t, fill }));
  const pic = tape([{ label: a.l, parts: units(1, mode === "total" ? fmt(base) : "1 rész", PRI) }, { label: b.l, parts: units(k, mode === "total" ? fmt(base) : "1 rész", EXTRA) }], { w: 60 * (k + 1) });
  if (mode === "total") return {
    sub: "tobbszor",
    q: `${T.ctx} ${cap(a.bol)} ${fmt(base)} darab volt, ${b.bol} <b>${kw} annyi</b>.<p><b>Hány darab volt összesen?</b></p>`,
    ans: { kind: "num", value: total, unit: "db" },
    hint: `Először számold ki, hány ${b.n} volt (${kw} annyi), aztán add hozzá a(z) ${a.pl} számát is!`,
    steps: [`${cap(kw)} annyi = ${k} egyforma rész:` + pic, `${cap(b.pl)}: ${fmt(base)} · ${k} = <b>${fmt(big)}</b>`, `Összesen: ${fmt(base)} + ${fmt(big)} = <b class="big">${fmt(total)}</b>`],
    why: v => v === big ? `Ez csak a(z) ${b.pl} száma – a kérdés az összeset kéri, a ${fmt(base)}-t is hozzá kell adni!` : v === base + k ? `A „${kw} annyi” szorzást jelent, nem hozzáadást: ${fmt(base)} · ${k}.` : null,
  };
  if (mode === "part") return {
    sub: "tobbszor",
    q: `${T.ctx} Összesen <b>${fmt(total)}</b> darab volt, és ${b.bol} <b>${kw} annyi</b> volt, mint ${a.bol}.<p><b>Hány ${a.n} volt?</b></p>`,
    ans: { kind: "num", value: base, unit: "db" },
    hint: `Rajzold le: ${a.n} 1 rész, ${b.n} ${k} rész. Hány rész ez összesen?`,
    steps: [`${cap(a.n)}: 1 rész, ${b.n}: ${k} rész → összesen <b>${k + 1} egyforma rész</b>.` + pic, `Egy rész: ${fmt(total)} : ${k + 1} = <b>${fmt(base)}</b>`, `${cap(a.n)}: <b class="big">${fmt(base)}</b> (${b.n}: ${fmt(big)})`],
    why: v => v === total / k ? `Nem ${k}, hanem ${k + 1} részre kell osztani – a(z) ${a.n} is egy rész!` : v === big ? `Ez a(z) ${b.pl} száma.` : null,
  };
  return {
    sub: "tobbszor",
    q: `${T.ctx} ${cap(b.bol)} <b>${kw} annyi</b> volt, mint ${a.bol}, így ${numVal(big - base)} több ${b.n} volt.<p><b>Hány ${a.n} volt?</b></p>`,
    ans: { kind: "num", value: base, unit: "db" },
    hint: `A ${kw} annyi ${k} rész, a kevesebb 1 rész. Hány résszel több az egyik? Ennyi rész ér ${fmt(big - base)}-t.`,
    steps: [`${cap(a.n)}: 1 rész, ${b.n}: ${k} rész. A különbség <b>${k - 1} rész</b>.` + pic, `${k - 1} rész = ${fmt(big - base)}, ezért 1 rész: ${fmt(big - base)} : ${k - 1} = <b>${fmt(base)}</b>`, `${cap(a.n)}: <b class="big">${fmt(base)}</b>`],
    why: v => v === (big - base) / k ? `A különbség nem ${k}, hanem ${k - 1} rész!` : null,
  };
}

// ---- 3. Életkor ----
function eletkor(rng, lvl) {
  const [A, B, C] = rng.sample(NAMES, 3);
  const a = rng.int(5, 11), b = a + rng.int(2, 6), c = b + rng.int(1, 5);
  const kind = lvl === 1 ? rng.pick(["mulva", "amikor"]) : rng.pick(["amikor", "osszeg", lvl === 3 ? "osszeg3" : "mulva"]);
  if (kind === "mulva") {
    const n = rng.int(2, 6);
    return {
      sub: "eletkor", q: `${A} most ${a} éves, ${B} ${b} éves.<p><b>Hány évesek lesznek összesen ${n} év múlva?</b></p>`,
      ans: { kind: "num", value: a + b + 2 * n, unit: "év" },
      hint: `${n} év múlva mindketten ${n} évvel lesznek idősebbek!`,
      steps: [`${n} év múlva: ${A} ${a} + ${n} = <b>${a + n}</b>, ${B} ${b} + ${n} = <b>${b + n}</b>.`, `Összesen: ${a + n} + ${b + n} = <b class="big">${a + b + 2 * n}</b> év<br><span class="soft">Rövidebben: most együtt ${a + b} évesek, és mindketten ${n} évet öregszenek: ${a + b} + 2 · ${n}.</span>`],
      why: v => v === a + b + n ? `Nem csak az egyikük öregszik ${n} évet – mindkettőjükhöz hozzá kell adni!` : v === a + b ? "Ez a mostani életkoruk összege – a kérdés a későbbit kéri." : null,
    };
  }
  if (kind === "amikor") {
    const N = b + rng.int(3, 12);
    return {
      sub: "eletkor", q: `${A} ${a} éves, ${B} ${b} éves.<p><b>Hány éves lesz ${A}, amikor ${B} ${N} éves lesz?</b></p>`,
      ans: { kind: "num", value: N - (b - a), unit: "év" },
      hint: "A két gyerek között a korkülönbség mindig ugyanannyi marad!",
      steps: [`A korkülönbség: ${b} − ${a} = <b>${b - a} év</b>. Ez soha nem változik.`, `Amikor ${B} ${N} éves, ${A} ${b - a} évvel fiatalabb: ${N} − ${b - a} = <b class="big">${N - (b - a)}</b> év.`],
      why: v => v === N ? `${A} és ${B} nem egyidős – a korkülönbség ${b - a} év marad.` : v === N + (b - a) ? `${A} a fiatalabb – le kell vonni a korkülönbséget, nem hozzáadni.` : null,
    };
  }
  const three = kind === "osszeg3", now = three ? a + b + c : b + c, per = three ? 3 : 2;
  const n = rng.int(2, 9), target = now + per * n;
  const who = three ? `${A} ${a}, ${B} ${b}, ${C} ${c} éves` : `${B} ${b} éves, ${C} ${c} éves`;
  const perTxt = per === 2 ? "2-vel" : "3-mal";
  return {
    sub: "eletkor", q: `${who}.<p><b>Hány év múlva lesz az életkoruk összege ${target} év?</b></p>`,
    ans: { kind: "num", value: n, unit: "év" },
    hint: `Most együtt ${now} évesek. Minden évben mindegyikük 1 évet öregszik – így az összeg évente mennyivel nő?`,
    steps: [`Most együtt: ${three ? `${a} + ${b} + ${c}` : `${b} + ${c}`} = <b>${now}</b> év.`, `Minden évben ${per} gyerek öregszik 1-1 évet, ezért az összeg <b>évente ${perTxt}</b> nő. Hiányzik: ${target} − ${now} = <b>${target - now}</b>.`, `${target - now} : ${per} = <b class="big">${n}</b> év múlva`],
    why: v => v === target - now ? `Az összeg évente nem 1-gyel nő, hanem ${perTxt}, mert mindenki öregszik!` : null,
  };
}

// ---- 4. Csomagolási lánc ----
// in: "1 tálcán", "1 dobozban" (helyhatározó), pl: többes szám
const CHAINS = [
  { it: ["bonbon", "tálca", "doboz", "láda"], in: [null, "tálcán", "dobozban", "ládában"], pl: [null, "tálcák", "dobozok", "ládák"], t: [null, null, "dobozt", null], ctx: "A csokigyárban a bonbonokat tálcára teszik, a tálcákat dobozokba, a dobozokat ládákba." },
  { it: ["lap", "tekercs", "csomag", "karton"], in: [null, "tekercsen", "csomagban", "kartonban"], pl: [null, "tekercsek", "csomagok", "kartonok"], t: [null, null, "csomagot", null], ctx: "A papírtörlő lapjai tekercsre vannak feltekerve, a tekercseket csomagokba, a csomagokat kartonokba teszik." },
  { it: ["tojás", "tálca", "doboz", "láda"], in: [null, "tálcán", "dobozban", "ládában"], pl: [null, "tálcák", "dobozok", "ládák"], t: [null, null, "dobozt", null], ctx: "A tojásokat tálcákra, a tálcákat dobozokba, a dobozokat ládákba rakják." },
];
function lanc(rng, lvl) {
  const C = rng.pick(CHAINS), it = C.it;
  const f = [rng.int(4, 12), rng.int(2, 6), rng.int(2, lvl === 1 ? 5 : 10)]; // 1 tálca = f0 db, 1 doboz = f1 tálca, 1 láda = f2 doboz
  const facts = `1 ${C.in[1]} ${f[0]} ${it[0]}, 1 ${C.in[2]} ${f[1]} ${it[1]}, 1 ${C.in[3]} ${f[2]} ${it[2]} van.`;
  const per2 = f[0] * f[1], per3 = per2 * f[2];
  const chainSvg = (() => { let b = ""; it.forEach((w, i) => { b += rect(10 + i * 150, 10, 110, 40, { fill: "var(--pri-soft)", stroke: "var(--pri)", sw: 2 }) + txt(65 + i * 150, 36, `1 ${w}`, { size: 14, w: 800 }); if (i < 3) b += txt(140 + i * 150, 22, `×${f[i]}`, { size: 13, w: 800, fill: "var(--pri)" }) + line(122 + i * 150, 30, 158 + i * 150, 30, { stroke: "var(--pri)" }); }); return svg(610, 60, b); })();
  const kind = lvl === 1 ? "egy" : lvl === 2 ? rng.pick(["egy", "sok"]) : rng.pick(["sok", "vissza"]);
  if (kind === "egy") { const top = lvl === 1 ? 2 : 3; return {
    sub: "lanc", q: `${C.ctx} ${facts}<p><b>Hány ${it[0]} van 1 ${C.in[top]}?</b></p>`,
    ans: { kind: "num", value: top === 2 ? per2 : per3, unit: it[0] },
    hint: "Haladj lépésről lépésre: először számold ki, hány darab van a kisebb egységben, aztán szorozz tovább!",
    steps: [`Láncban gondolkodunk – minden lépésnél szorzunk:` + chainSvg, `1 ${C.in[2]}: ${f[1]} · ${f[0]} = <b>${per2}</b> ${it[0]}` + (top === 2 ? "" : `<br>1 ${C.in[3]}: ${f[2]} · ${per2} = <b>${per3}</b> ${it[0]}`), `<b class="big">${top === 2 ? per2 : per3}</b> ${it[0]}`],
    why: v => v === f[0] + f[1] || v === f[0] + f[1] + f[2] ? "Itt nem összeadni kell: minden egységben a kisebbek többszöröse van → szorzás!" : null,
  }; }
  if (kind === "sok") { const m = rng.int(3, 25); return {
    sub: "lanc", q: `${C.ctx} ${facts}<p><b>Hány ${it[1]} van összesen ${m} ${C.in[3]}?</b></p>`,
    ans: { kind: "num", value: m * f[2] * f[1], unit: it[1] },
    hint: `Először: hány ${it[1]} van 1 ${C.in[3]}? Aztán szorozd meg ennyivel: ${m}.`,
    steps: [chainSvg, `1 ${C.in[3]}: ${f[2]} · ${f[1]} = <b>${f[2] * f[1]}</b> ${it[1]}`, `${m} ${C.in[3]}: ${m} · ${f[2] * f[1]} = <b class="big">${fmt(m * f[2] * f[1])}</b> ${it[1]}`],
    why: v => v === m * f[2] ? `Ez még csak a(z) ${C.pl[2]} száma – még egy lépést szorozni kell!` : null,
  }; }
  const boxes = rng.int(2, 9) * f[2];
  return {
    sub: "lanc", q: `${C.ctx} ${facts}<p>Egy bolt <b>${boxes} ${C.t[2]}</b> rendelt. <b>Hány ${C.in[3]} érkezett?</b></p>`,
    ans: { kind: "num", value: boxes / f[2], unit: it[3] },
    hint: `1 ${C.in[3]} ${f[2]} ${it[2]} van. Hány ilyen kell ${boxes} ${it[2]}hoz?`,
    steps: [chainSvg, `Most visszafelé haladunk, ezért osztunk: ${boxes} : ${f[2]} = <b class="big">${boxes / f[2]}</b> ${it[3]}`],
    why: v => v === boxes * f[2] ? "Visszafelé (nagyobb egység felé) osztani kell, nem szorozni!" : null,
  };
}

// ---- 5. Fák, oszlopok, vágások (köz = darab − 1) ----
function kerites(rng, lvl) {
  const kind = lvl === 1 ? rng.pick(["vagas", "fak"]) : rng.pick(["fak", "oszlop", "vagas", "korbe"]);
  const trees = (n, d) => { const W = Math.min(560, 40 + (n - 1) * 60); let b = line(20, 60, W - 20, 60, { stroke: "var(--soft)", sw: 2 }); for (let i = 0; i < n; i++) { const x = 20 + i * (W - 40) / (n - 1); b += circle(x, 40, 13, { fill: "#22c55e" }) + line(x, 52, x, 62, { stroke: "#92400e", sw: 4 }); if (i < n - 1) b += txt(x + (W - 40) / (n - 1) / 2, 84, `${d} m`, { size: 11, w: 700, fill: "var(--pri)" }); } return svg(W, 92, b); };
  if (kind === "fak") {
    const n = rng.int(lvl === 1 ? 4 : 6, lvl === 3 ? 30 : 15), d = rng.int(2, 9);
    return {
      sub: "kerites", q: `Egy egyenes út mentén <b>${n} fát</b> ültettek egy sorba, a szomszédos fák <b>${d} méterre</b> vannak egymástól.<p><b>Hány méter van az első és az utolsó fa között?</b></p>`,
      ans: { kind: "num", value: (n - 1) * d, unit: "m" },
      hint: "Rajzolj le kevés fát (pl. 3-at)! Hány köz van közöttük? Mindig eggyel kevesebb köz van, mint fa!",
      steps: [`Nézzük kicsiben: 3 fa között <b>2 köz</b> van, 4 fa között 3. Mindig <b>eggyel kevesebb köz</b> van, mint fa!` + trees(Math.min(n, 6), d), `${n} fa között <b>${n - 1} köz</b> van.`, `${n - 1} · ${d} = <b class="big">${(n - 1) * d}</b> méter`],
      why: v => v === n * d ? `Vigyázz: ${n} fa között nem ${n}, hanem ${n - 1} köz van!` : null,
    };
  }
  if (kind === "oszlop") {
    const gaps = rng.int(4, 20), d = rng.int(2, 5), L = gaps * d;
    return {
      sub: "kerites", q: `Egy <b>${L} méter</b> hosszú, egyenes kerítés oszlopait <b>${d} méterenként</b> állítják fel. Az elején és a végén is van oszlop.<p><b>Hány oszlop kell?</b></p>`,
      ans: { kind: "num", value: gaps + 1, unit: "oszlop" },
      hint: "Hány köz van? És hány oszlop kell ennyi közhöz, ha mindkét végén is van?",
      steps: [`A kerítés ${L} : ${d} = <b>${gaps}</b> közre oszlik.`, `Oszlopból mindig <b>eggyel több</b> kell, mint köz (az elején is van egy):` + trees(5, d), `${gaps} + 1 = <b class="big">${gaps + 1}</b> oszlop`],
      why: v => v === gaps ? "Ez a közök száma – oszlop eggyel több kell, mert az elején és a végén is van!" : null,
    };
  }
  if (kind === "korbe") {
    const n = rng.int(6, 24), d = rng.int(2, 6);
    return {
      sub: "kerites", q: `Egy kör alakú tó körül <b>${n} padot</b> helyeztek el körben, a szomszédos padok <b>${d} méterre</b> vannak egymástól.<p><b>Hány méter hosszú a tó körüli út?</b></p>`,
      ans: { kind: "num", value: n * d, unit: "m" },
      hint: "Körben más a helyzet, mint egy egyenes sorban: az utolsó pad után visszaérünk az elsőhöz!",
      steps: [`Egyenes sorban eggyel kevesebb köz lenne, de <b>körben</b> az utolsó és az első pad között is van egy köz.`, `Ezért körben ugyanannyi köz van, ahány pad: <b>${n}</b>.`, `${n} · ${d} = <b class="big">${n * d}</b> méter`],
      why: v => v === (n - 1) * d ? "Körben az utolsó és az első pad között is van egy köz – itt annyi köz van, ahány pad!" : null,
    };
  }
  const cuts = rng.int(2, lvl === 1 ? 6 : 11), pieceCm = rng.int(1, 6) * 10, L = (cuts + 1) * pieceCm;
  const askPieces = lvl === 1 || rng.chance(0.5);
  return {
    sub: "kerites", q: `Rozi egy <b>${L} cm</b> hosszú szalagot egyforma darabokra vág. <b>${cuts} vágást</b> végez (a szalagot nem hajtja össze).<p><b>${askPieces ? "Hány darab lesz?" : "Hány cm hosszú egy darab?"}</b></p>`,
    ans: { kind: "num", value: askPieces ? cuts + 1 : pieceCm, unit: askPieces ? "darab" : "cm" },
    hint: "Rajzold le! 1 vágással hány darab lesz? És 2 vágással?",
    steps: [`1 vágás → 2 darab, 2 vágás → 3 darab. Mindig <b>eggyel több darab</b> lesz, mint vágás.`, `${cuts} vágás → <b>${cuts + 1} darab</b>.` + (askPieces ? "" : `<br>Egy darab: ${L} : ${cuts + 1} = <b>${pieceCm} cm</b>`), `<b class="big">${askPieces ? `${cuts + 1} darab` : `${pieceCm} cm`}</b>`],
    why: v => (askPieces && v === cuts) ? "A darabok száma eggyel több, mint a vágásoké!" : (!askPieces && v === L / cuts) ? `Nem ${cuts}, hanem ${cuts + 1} darabra kell osztani!` : null,
  };
}

// ---- 6. Lépcsőzés ----
const KESEVEL = { 2: "kettesével", 3: "hármasával", 4: "négyesével", 5: "ötösével" };
function lepcso(rng, lvl) {
  const kind = lvl === 1 ? rng.pick(["fok", "lepes"]) : lvl === 2 ? rng.pick(["fok", "lepes", "hanyasaval"]) : rng.pick(["minta", "hanyasaval"]);
  const who = rng.pick(["Törpicur", "Tréfi", "Okoska", "Hami"]);
  if (kind === "fok") {
    const k = rng.int(2, 4), s = rng.int(8, 40);
    return {
      sub: "lepcso", q: `${who} mindig <b>${KESEVEL[k]}</b> lépked a lépcsőn, és <b>${s} lépéssel</b> ért fel.<p><b>Hány lépcsőfok vezet fel?</b></p>`,
      ans: { kind: "num", value: k * s, unit: "fok" }, hint: `Minden lépéssel ${k} fokot tesz meg.`,
      steps: [`1 lépés = ${k} fok.`, `${s} lépés: ${s} · ${k} = <b class="big">${k * s}</b> fok`], why: v => v === s + k ? `Szorozni kell: minden lépés ${k} fok.` : null,
    };
  }
  if (kind === "lepes") {
    const k = rng.int(2, 4), s = rng.int(8, 40);
    return {
      sub: "lepcso", q: `Egy lépcsőn <b>${k * s} fok</b> van. ${who} mindig <b>${KESEVEL[k]}</b> lépked.<p><b>Hány lépéssel ér fel?</b></p>`,
      ans: { kind: "num", value: s, unit: "lépés" }, hint: `Egy lépés ${k} fok. Hány ilyen lépés kell ${k * s} fokhoz?`,
      steps: [`Minden lépés ${k} fok, ezért osztunk.`, `${k * s} : ${k} = <b class="big">${s}</b> lépés`], why: v => v === k * s * k ? "Itt osztani kell, nem szorozni." : null,
    };
  }
  if (kind === "hanyasaval") {
    const k = rng.int(2, 5), s = rng.int(10, 50);
    return {
      sub: "lepcso", q: `Egy lépcsőn <b>${k * s} fok</b> van. ${who} mindig ugyanannyi fokot lép egyszerre, és <b>${s} lépéssel</b> ért fel.<p><b>Hány fokot lép egyszerre?</b></p>`,
      ans: { kind: "num", value: k, unit: "fok" }, hint: `${s} egyforma lépés = ${k * s} fok. Mennyi egy lépés?`,
      steps: [`${s} egyforma lépés összesen ${k * s} fok.`, `${k * s} : ${s} = <b class="big">${k}</b> → ${KESEVEL[k]} lépked.`], why: () => null,
    };
  }
  // ismétlődő lépésminta, pl. 3, 2, 1 fok
  const pat = rng.pick([[3, 2, 1], [1, 2], [2, 1], [3, 1]]), per = pat.reduce((a, b) => a + b, 0), cycles = rng.int(5, 25), F = per * cycles;
  return {
    sub: "lepcso", q: `${who} egy <b>${F} fokos</b> lépcsőn úgy megy fel, hogy egymás után ${pat.join(", ")} fokot lép, majd ezt ismétli újra és újra.<p><b>Hány lépéssel ér fel?</b></p>`,
    ans: { kind: "num", value: cycles * pat.length, unit: "lépés" },
    hint: `Egy „kör” ${pat.length} lépés. Hány fokot tesz meg egy kör alatt?`,
    steps: [`Egy kör: ${pat.join(" + ")} = <b>${per} fok</b>, ez <b>${pat.length} lépés</b>.`, `${F} : ${per} = <b>${cycles}</b> kör.`, `${cycles} · ${pat.length} = <b class="big">${cycles * pat.length}</b> lépés`],
    why: v => v === cycles ? `Ez a körök száma – egy kör ${pat.length} lépés!` : null,
  };
}

// ---- 7. Csere ----
// n: alapalak, t: tárgyrag, ert: -ért, ra: -ra/-re
const W = {
  kokusz: { n: "kókuszgolyó", t: "kókuszgolyót", ert: "kókuszgolyóért", ra: "kókuszgolyóra" },
  retes: { n: "rétes", t: "rétest", ert: "rétesért", ra: "rétesre" },
  fank: { n: "fánk", t: "fánkot", ert: "fánkért", ra: "fánkra" },
  matrica: { n: "matrica", t: "matricát", ert: "matricáért", ra: "matricára" },
  radir: { n: "radír", t: "radírt", ert: "radírért", ra: "radírra" },
  ceruza: { n: "ceruza", t: "ceruzát", ert: "ceruzáért", ra: "ceruzára" },
  golyo: { n: "üveggolyó", t: "üveggolyót", ert: "üveggolyóért", ra: "üveggolyóra" },
  kartya: { n: "kártya", t: "kártyát", ert: "kártyáért", ra: "kártyára" },
  auto: { n: "kisautó", t: "kisautót", ert: "kisautóért", ra: "kisautóra" },
};
const SWAP = [[W.kokusz, W.retes, W.fank], [W.matrica, W.radir, W.ceruza], [W.golyo, W.kartya, W.auto]];
function csere(rng, lvl) {
  const [A, B, Cc] = rng.pick(SWAP);
  const r = rng.int(2, 4), a = rng.int(2, 5), b = a * r; // a db A = b db B → 1 A = r B
  if (lvl === 1 || (lvl === 2 && rng.chance(0.5))) {
    const m = rng.int(2, 10) * r * (lvl === 1 ? 1 : 2);
    return {
      sub: "csere", q: `A vásáron <b>${a} ${A.ert} ${b} ${B.t}</b> adnak.<p><b>Hány ${A.ert} adnak ${m} ${B.t}?</b></p>`,
      ans: { kind: "num", value: m / r, unit: A.n },
      hint: `Először azt számold ki, 1 ${A.ert} hány ${B.t} adnak!`,
      steps: [`${a} ${A.n} = ${b} ${B.n} → 1 ${A.n} = ${b} : ${a} = <b>${r} ${B.n}</b>.`, `${m} ${B.n}: ${m} : ${r} = <b class="big">${m / r}</b> ${A.n}`],
      why: v => v === m * r ? `Fordítva számoltál: 1 ${A.n} ${r} ${B.t} ér, ezért kevesebb kell belőle → osztás.` : null,
    };
  }
  // két lépés: 2 C = cA db A + dB db B → 1 C hány B-t ér?
  const cA = rng.int(1, 3), dB = rng.int(1, 4) * 2, two = cA * r + dB;
  if (two % 2) return csere(rng, lvl);
  const perC = two / 2;
  return {
    sub: "csere", q: `A vásáron <b>${a} ${A.ert} ${b} ${B.t}</b> adnak, és <b>2 ${Cc.ert} ${cA} ${A.t} és ${dB} ${B.t}</b>.<p><b>Hány ${B.t} ér 1 ${Cc.n}?</b></p>`,
    ans: { kind: "num", value: perC, unit: B.n },
    hint: `Váltsd át ${A.t.startsWith("ü") ? "az" : "a"} ${A.t} is ${B.ra}! Mennyit ér így 2 ${Cc.n}? És 1?`,
    steps: [`1 ${A.n} = ${b} : ${a} = <b>${r} ${B.n}</b>.`, `2 ${Cc.n} = ${cA} ${A.n} + ${dB} ${B.n} = ${cA} · ${r} + ${dB} = <b>${two} ${B.n}</b>.`, `1 ${Cc.n} = ${two} : 2 = <b class="big">${perC}</b> ${B.n}`],
    why: v => v === two ? `Ez 2 ${Cc.n} értéke – a kérdés 1 ${Cc.ra} vonatkozik, még felezni kell!` : v === (cA + dB) / 2 ? `${A.t.startsWith("ü") ? "Az" : "A"} ${A.t} előbb át kell váltani ${B.ra}!` : null,
  };
}

// ---- 8. Mérleg: három ismeretlen ----
function merleg(rng) {
  const [A, B, C] = rng.sample(["Réka", "Sára", "Zoé", "Anna", "Lili", "Bori"], 3);
  const a = rng.int(20, 40), b = rng.int(20, 40), c = rng.int(20, 40), S = a + b + c;
  const ask = rng.pick(["a", "b", "c"]), ans = { a, b, c }[ask], who = { a: A, b: B, c: C }[ask];
  return {
    sub: "merleg", q: `${A}, ${B} és ${C} együtt ráállt a mérlegre: <b>${S} kg</b>. ${B} és ${C} együtt <b>${b + c} kg</b>, ${A} és ${B} együtt <b>${a + b} kg</b>.<p><b>Hány kilogramm ${who}?</b></p>`,
    ans: { kind: "num", value: ans, unit: "kg" },
    hint: "Hasonlítsd össze a hármójuk tömegét azzal, amikor csak ketten álltak a mérlegen! Ki hiányzik?",
    steps: [
      tape([{ label: "mind a 3", parts: [{ v: a, text: A, fill: PRI }, { v: b, text: B, fill: EXTRA }, { v: c, text: C, fill: GREEN }], total: `${S} kg` }, { label: `${B}+${C}`, parts: [{ v: b, text: B, fill: EXTRA }, { v: c, text: C, fill: GREEN }], total: `${b + c} kg` }, { label: `${A}+${B}`, parts: [{ v: a, text: A, fill: PRI }, { v: b, text: B, fill: EXTRA }], total: `${a + b} kg` }]),
      `A hármójukból elvéve ${B} és ${C} tömegét, ${A} marad: ${S} − ${b + c} = <b>${a} kg</b>.<br>Ugyanígy ${C}: ${S} − ${a + b} = <b>${c} kg</b>.`,
      `${B}: ${S} − ${a} − ${c} = <b>${b} kg</b>.<br>${who}: <b class="big">${ans} kg</b>`,
    ],
    why: v => [a, b, c].includes(v) && v !== ans ? `Ez nem ${who} tömege – nézd meg újra, melyik pár kit tartalmaz!` : null,
  };
}

export default {
  id: "T10",
  name: "Szöveges feladatok",
  planet: { name: "Mesemondó-hold", emoji: "📖", color: "#14b8a6" },
  subs: [
    { id: "osszegkulonbseg", name: "Összeg és különbség", gen: osszegkulonbseg },
    { id: "tobbszor", name: "Többször annyi", gen: tobbszor },
    { id: "eletkor", name: "Életkor", gen: eletkor },
    { id: "lanc", name: "Csomagolás", gen: lanc },
    { id: "kerites", name: "Fák, oszlopok, vágások", gen: kerites },
    { id: "lepcso", name: "Lépcsőzés", gen: lepcso },
    { id: "csere", name: "Csere", gen: csere },
    { id: "merleg", name: "Mérleg", gen: merleg, minLvl: 2 },
  ],
};
