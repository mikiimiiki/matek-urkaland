// ===== T11 – Kockaépítmények =====
// A felvételi mintái: hány kiskockából áll az építmény, kiegészítés téglatestté / kockává,
// nézetek (szemből, felülről), nagy kocka kiskockákból és a befestett lapok, matricák a felületen.
// Az építményt „oszlopmagasságokkal” írjuk le: H[x][y] = hány kocka áll egymáson az (x, y) helyen.
import { svg, txt, rect, line } from "../util.js";

const S = 40, D = 18; // kocka élhossza a rajzon, mélységi eltolás (ferde nézet)
// Ferde (kavalier) nézetű rajz: elöl a front, felül és jobbra látszik a test
function draw3d(H, o = {}) {
  const X = H.length, Y = H[0].length, Z = Math.max(1, ...H.flat());
  const W = X * S + Y * D + 20, Ht = Z * S + Y * D + 20;
  const px = (x, y) => 10 + x * S + y * D, py = (y, z) => Ht - 10 - z * S - y * D;
  let b = "";
  const face = (pts, fill) => `<polygon points="${pts.map(p => p.join(",")).join(" ")}" fill="${fill}" stroke="#3b2f7a" stroke-width="1.2" stroke-linejoin="round"/>`;
  for (let y = Y - 1; y >= 0; y--) for (let x = 0; x < X; x++) for (let z = 0; z < H[x][y]; z++) {
    const hl = o.hl && o.hl(x, y, z);
    const c = hl || { f: "#c4b5fd", t: "#ede9fe", r: "#a78bfa" };
    const x0 = px(x, y), y0 = py(y, z);
    b += face([[x0, y0], [x0 + S, y0], [x0 + S, y0 - S], [x0, y0 - S]], c.f); // elöl
    b += face([[x0, y0 - S], [x0 + S, y0 - S], [x0 + S + D, y0 - S - D], [x0 + D, y0 - S - D]], c.t); // felül
    b += face([[x0 + S, y0], [x0 + S + D, y0 - D], [x0 + S + D, y0 - S - D], [x0 + S, y0 - S]], c.r); // jobbra
  }
  return svg(W, Ht, b);
}
// Felülnézet számokkal (oszlopmagasságok) – a magyarázatokhoz
function topNums(H) {
  const X = H.length, Y = H[0].length, C = 30;
  let b = "";
  for (let y = Y - 1, r = 0; y >= 0; y--, r++) for (let x = 0; x < X; x++) {
    b += rect(10 + x * C, 10 + r * C, C - 2, C - 2, { rx: 3, fill: H[x][y] ? "var(--pri-soft)" : "#f8fafc", stroke: "var(--line)", sw: 1 });
    if (H[x][y]) b += txt(10 + x * C + C / 2 - 1, 10 + r * C + C / 2 + 5, String(H[x][y]), { size: 14, w: 900 });
  }
  b += txt(10 + X * C / 2, Y * C + 26, "elöl", { size: 12, w: 700, fill: "var(--soft)" });
  return svg(X * C + 20, Y * C + 34, b);
}
// Kis négyzetrács-nézet (szemből vagy felülről)
function view2d(cells, w, h, label) {
  const C = 20; let b = "";
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (cells.has(`${x},${y}`)) b += rect(6 + x * C, 22 + (h - 1 - y) * C, C - 1, C - 1, { rx: 2, fill: "#a78bfa", stroke: "#3b2f7a", sw: 1 });
  b += txt(6, 16, label, { size: 15, w: 900, a: "start", fill: "var(--pri)" });
  return svg(w * C + 14, h * C + 28, b);
}
// Véletlen építmény: hátrafelé magasodó oszlopok, így minden kocka látszik vagy alá van támasztva
function building(rng, X, Y, maxZ, fill = 0.75) {
  for (let t = 0; t < 100; t++) {
    const H = Array.from({ length: X }, () => Array(Y).fill(0));
    for (let x = 0; x < X; x++) for (let y = 0; y < Y; y++) if (rng.chance(fill)) H[x][y] = rng.int(1, maxZ);
    // hátrafelé nem csökkenhet (a hátsó oszlop legalább akkora, mint az előtte lévő), hogy semmi ne bújjon el
    for (let x = 0; x < X; x++) for (let y = 1; y < Y; y++) if (H[x][y] && H[x][y] < H[x][y - 1]) H[x][y] = H[x][y - 1];
    const n = H.flat().reduce((a, b) => a + b, 0);
    if (n >= 3 && H.some(c => c.some(v => v)) && H.every(c => c.some(v => v)) && H[0].length && [...Array(Y).keys()].every(y => H.some(c => c[y]))) return H;
  }
  return [[1, 1], [2, 1]];
}
const total = H => H.flat().reduce((a, b) => a + b, 0);

// ---- 1. Hány kiskockából áll? ----
function darab(rng, lvl) {
  const H = lvl === 1 ? building(rng, 3, 1, 3, 0.9) : lvl === 2 ? building(rng, 3, 2, 3) : building(rng, 4, 3, 3, 0.7);
  const n = total(H);
  return {
    sub: "darab", q: `Egyforma kiskockákból építmény készült. A kockák alatt mindig van másik kocka (nincs lebegő kocka). <b>Hány kiskockából áll az építmény?</b>`, viz: draw3d(H),
    ans: { kind: "num", value: n, unit: "kocka" },
    hint: "Számold oszloponként! Nézd meg felülről: minden helyen hány kocka áll egymáson? Ne felejtsd el a hátsó oszlopok alsó, eltakart kockáit!",
    steps: [`Írjuk fel felülről nézve, melyik helyen hány kocka áll egymáson:` + topNums(H), `Összeadjuk: ${H.flat().filter(v => v).join(" + ")} = <b class="big">${n}</b> kiskocka`],
    why: v => v < n ? "Kevesebbet számoltál – a hátul álló oszlopok alsó kockái is ott vannak, csak az elülsők eltakarják őket!" : null,
  };
}

// ---- 2. Kiegészítés téglatestté / kockává ----
function kiegeszit(rng, lvl) {
  const H = lvl === 1 ? building(rng, 2, 2, 2, 0.8) : lvl === 2 ? building(rng, 3, 2, 3) : building(rng, 3, 3, 3, 0.7);
  const X = H.length, Y = H[0].length, Z = Math.max(...H.flat()), n = total(H);
  const toCube = lvl === 3 && rng.chance(0.5), E = Math.max(X, Y, Z);
  const vol = toCube ? E ** 3 : X * Y * Z;
  return {
    sub: "kiegeszit", q: `Az építményt kiskockákkal ${toCube ? "<b>kockává</b>" : "<b>téglatestté</b>"} egészítjük ki – a lehető legkisebbé. <b>Legkevesebb hány kiskocka kell még hozzá?</b>`, viz: draw3d(H),
    ans: { kind: "num", value: vol - n, unit: "kocka" },
    hint: `Mekkora a legkisebb ${toCube ? "kocka" : "téglatest"}, amibe belefér? Hány kiskockából áll? Ebből vond le, ami már megvan!`,
    steps: [
      `Az építményben most <b>${n}</b> kiskocka van:` + topNums(H),
      toCube ? `A legkisebb kocka, amibe belefér: ${E} × ${E} × ${E} → ${E} · ${E} · ${E} = <b>${vol}</b> kiskocka.` : `A legkisebb téglatest: ${X} kocka széles, ${Y} kocka mély, ${Z} kocka magas → ${X} · ${Y} · ${Z} = <b>${vol}</b> kiskocka.`,
      `Hiányzik: ${vol} − ${n} = <b class="big">${vol - n}</b> kiskocka`,
    ],
    why: v => v === vol ? `Ez a teljes ${toCube ? "kocka" : "téglatest"} – vond le belőle a már meglévő ${n} kockát!` : null,
  };
}

// ---- 3. Nézetek ----
function nezet(rng, lvl) {
  for (let t = 0; t < 100; t++) {
    const H = lvl === 1 ? building(rng, 3, 2, 3) : building(rng, 3, 3, 3, 0.7);
    const X = H.length, Y = H[0].length, Z = Math.max(...H.flat());
    const front = new Set(), side = new Set(), top = new Set();
    for (let x = 0; x < X; x++) { const h = Math.max(...H[x]); for (let z = 0; z < h; z++) front.add(`${x},${z}`); }
    for (let y = 0; y < Y; y++) { const h = Math.max(...H.map(c => c[y])); for (let z = 0; z < h; z++) side.add(`${Y - 1 - y},${z}`); }
    for (let x = 0; x < X; x++) for (let y = 0; y < Y; y++) if (H[x][y]) top.add(`${x},${y}`);
    const fromTop = lvl >= 2 && rng.chance(0.5);
    const correct = fromTop ? top : front;
    const W = Math.max(X, Y), Hh = fromTop ? Math.max(X, Y) : Z;
    // csalik: tükrözött, oldalnézet, egy kockával több/kevesebb
    const mirror = new Set([...correct].map(s => { const [a, c] = s.split(",").map(Number); return `${X - 1 - a},${c}`; }));
    const tweak = new Set(correct); const extra = `${rng.int(0, X - 1)},${rng.int(0, Hh - 1)}`; if (tweak.has(extra)) tweak.delete(extra); else tweak.add(extra);
    const alt = fromTop ? new Set([...top].map(s => { const [a, c] = s.split(",").map(Number); return `${a},${Y - 1 - c}`; })) : side;
    const opts = [correct, mirror, tweak, alt];
    const sig = o => [...o].sort().join("|");
    if (new Set(opts.map(sig)).size < 4) continue;
    const order = rng.shuffle([0, 1, 2, 3]), labels = ["A", "B", "C", "D"];
    const pics = order.map((oi, i) => view2d(opts[oi], W, Hh, labels[i])).join(" ");
    const value = order.indexOf(0);
    return {
      // előbb az építmény, alatta a négy választható nézet
      sub: "nezet", q: `Melyik ábra mutatja az építményt <b>${fromTop ? "felülről" : "szemből (elölről)"}</b> nézve?`, viz: draw3d(H) + `<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end;margin-top:10px">${pics}</div>`,
      ans: { kind: "choice", options: labels.slice(), value },
      hint: fromTop ? "Felülről csak azt látod, melyik helyen áll kocka – a magasság nem számít. Az ábra alja legyen az építmény eleje!" : "Szemből minden oszlopnál a legmagasabb kockarakást látod (ami mögötte van, azt eltakarja). Vigyázz, ne tükrözd!",
      steps: [fromTop ? `Felülről nézve azokat a helyeket látjuk, ahol áll kocka:` + topNums(H) : `Szemből minden oszlopban a legmagasabb rakás látszik: ${H.map((c, x) => `${x + 1}. oszlop: ${Math.max(...c)}`).join(", ")}.` + topNums(H), `A helyes ábra: <b class="big">${labels[value]}</b>` + view2d(correct, W, Hh, labels[value])],
      why: k => order[k] === 1 ? "Ez a tükörképe – bal és jobb fel van cserélve!" : order[k] === 3 ? (fromTop ? "Ez fejjel lefelé van – az ábra alja az építmény eleje!" : "Ez oldalról nézve látszik így, nem szemből.") : null,
    };
  }
  return darab(rng, lvl);
}

// ---- 4. Nagy kocka kiskockákból, festett lapok ----
function nagykocka(rng, lvl) {
  const n = lvl === 1 ? rng.int(2, 3) : rng.int(3, lvl === 2 ? 4 : 5);
  const kind = lvl === 1 ? rng.pick(["darab", "el"]) : rng.pick(lvl === 2 ? ["darab", "harom", "el", "ketto"] : ["harom", "ketto", "egy", "nulla", "el"]);
  const cube = Array.from({ length: n }, () => Array(n).fill(n));
  const counts = { harom: 8, ketto: 12 * (n - 2), egy: 6 * (n - 2) ** 2, nulla: (n - 2) ** 3 };
  const cat = (x, y, z) => [x, y, z].filter(v => v === 0 || v === n - 1).length; // hány külső lapon van rajta
  const COL = { 3: { f: "#f87171", t: "#fca5a5", r: "#ef4444" }, 2: { f: "#fbbf24", t: "#fde68a", r: "#f59e0b" }, 1: { f: "#60a5fa", t: "#93c5fd", r: "#3b82f6" } };
  if (kind === "darab") return {
    sub: "nagykocka", q: `${n} cm élű tömör kockát építünk 1 cm élű kiskockákból. <b>Hány kiskocka kell hozzá?</b>`, viz: draw3d(cube),
    ans: { kind: "num", value: n ** 3, unit: "kocka" },
    hint: `Egy réteg ${n} × ${n} kiskocka, és ${n} réteg van egymáson.`,
    steps: [`Egy réteg: ${n} · ${n} = <b>${n * n}</b> kiskocka.`, `${n} réteg: ${n * n} · ${n} = <b class="big">${n ** 3}</b> kiskocka`],
    why: v => v === n * n ? "Ez csak egy réteg – a kocka " + n + " réteg magas!" : v === 6 * n * n ? "Ez a felületen látszó kis négyzetek száma, nem a kiskockáké." : null,
  };
  if (kind === "el") { const e = rng.int(2, 5); return {
    sub: "nagykocka", q: `Gábor <b>${n ** 3}</b> darab egyforma kiskockából egy nagyobb tömör kockát épít. Egy kiskocka éle <b>${e} cm</b>. <b>Hány cm a nagy kocka éle?</b>`,
    ans: { kind: "num", value: n * e, unit: "cm" },
    hint: `Hány kiskocka kerül a nagy kocka egy élére? (Gondold végig: 2 · 2 · 2 = 8, 3 · 3 · 3 = 27, 4 · 4 · 4 = 64…)`,
    steps: [`${n} · ${n} · ${n} = ${n ** 3}, tehát egy élen <b>${n}</b> kiskocka van.`, `${n} · ${e} cm = <b class="big">${n * e} cm</b>`],
    why: v => v === n ** 3 * e ? "Nem az összes kocka kerül egy élre – csak annyi, ahányszor ahány szorzatként kijön a darabszám!" : v === n ** 3 / e ? null : null,
  }; }
  const k = { harom: 3, ketto: 2, egy: 1, nulla: 0 }[kind];
  const hl = (x, y, z) => { const c = [x === 0 || x === n - 1, y === 0 || y === n - 1, z === 0 || z === n - 1].filter(Boolean).length; return c === k && COL[k] ? COL[k] : null; };
  const where = { 3: "a kocka 8 csúcsánál (sarkánál)", 2: `az élek mentén, a sarkok között (élenként ${n - 2}, és 12 él van)`, 1: `a lapok közepén (laponként ${n - 2} · ${n - 2}, és 6 lap van)`, 0: `belül, kívülről nem látszanak (${n - 2} · ${n - 2} · ${n - 2})` }[k];
  void cat;
  return {
    sub: "nagykocka", q: `1 cm élű kiskockákból ${n} cm élű tömör kockát építettünk, majd a nagy kocka <b>minden lapját befestettük</b>. <b>Hány olyan kiskocka van, amelynek ${k === 0 ? "egyik lapja sem lett festett" : `pontosan ${k} lapja lett festett`}?</b>`, viz: draw3d(cube),
    ans: { kind: "num", value: counts[kind], unit: "kocka" },
    hint: k === 3 ? "Melyik kiskockák vannak egyszerre három külső lapon? (Sarkok!)" : k === 2 ? "Két festett lapja az él menti kockáknak van – de a sarkokat ne számold bele!" : k === 1 ? "Egy festett lapja a lapok közepén lévő kockáknak van." : "Melyik kockák nem érnek ki a felszínre? Vedd le gondolatban a külső réteget!",
    steps: [`Ezek a kiskockák ${where} vannak (kiszínezve):` + draw3d(cube, { hl }), `<b class="big">${counts[kind]}</b> kiskocka` + (k === 2 ? ` (12 · ${n - 2})` : k === 1 ? ` (6 · ${(n - 2) ** 2})` : k === 0 ? ` (${n - 2} · ${n - 2} · ${n - 2})` : "")],
    why: v => k === 2 && v === 12 * n ? "A sarkokat ne számold bele – azoknak 3 festett lapjuk van!" : k === 1 && v === 6 * n * n ? "Ez az összes kis négyzet a felületen – az élek és sarkok kockáinak több festett lapja van!" : null,
  };
}

// ---- 5. Matricák a felületen ----
function matrica(rng, lvl) {
  const a = rng.int(2, lvl === 1 ? 3 : 5), b = rng.int(1, lvl === 1 ? 3 : 4), c = rng.int(1, 3);
  const isCube = lvl === 1 && rng.chance(0.5);
  const [A, B, C] = isCube ? [a, a, a] : [a, b, c];
  const H = Array.from({ length: A }, () => Array(B).fill(C));
  const S2 = 2 * (A * B + B * C + A * C);
  const onTable = lvl === 3 && rng.chance(0.5);
  const val = onTable ? S2 - A * B : S2;
  return {
    sub: "matrica", q: `Peti egy ${isCube ? `${A} kiskocka élű kockát` : `${A} × ${B} × ${C} kiskockából álló téglatestet`} épített. ${onTable ? "Az asztalon áll, és a <b>látható</b> (nem az asztalon fekvő) lapokon" : "A test <b>minden</b> lapján"} minden kis négyzetre ragaszt egy matricát. <b>Hány matrica kell?</b>`, viz: draw3d(H),
    ans: { kind: "num", value: val, unit: "matrica" },
    hint: "Számold meg lapról lapra a kis négyzeteket! A szemközti lapok egyformák.",
    steps: [`A téglatestnek 6 lapja van, a szemközti lapok egyformák:<br>elöl és hátul: 2 · (${A} · ${C}) = ${2 * A * C}<br>felül és alul: 2 · (${A} · ${B}) = ${2 * A * B}<br>jobbra és balra: 2 · (${B} · ${C}) = ${2 * B * C}`, `Összesen: ${2 * A * C} + ${2 * A * B} + ${2 * B * C} = <b>${S2}</b>` + (onTable ? `<br>Az alsó lap az asztalon fekszik, oda nem kell: ${S2} − ${A * B} = <b class="big">${val}</b>` : ` → <b class="big">${val}</b> matrica`)],
    why: v => v === A * B * C ? "Ez a kiskockák száma – a matricák a felület kis négyzeteire kellenek!" : onTable && v === S2 ? "Az asztalon fekvő alsó lapra nem kell matrica!" : null,
  };
}

export default {
  id: "T11",
  name: "Kockaépítmények",
  planet: { name: "Kocka-kristály", emoji: "🧊", color: "#a855f7" },
  subs: [
    { id: "darab", name: "Hány kiskocka?", gen: darab },
    { id: "kiegeszit", name: "Kiegészítés", gen: kiegeszit },
    { id: "nezet", name: "Nézetek", gen: nezet },
    { id: "nagykocka", name: "Nagy kocka, festett lapok", gen: nagykocka },
    { id: "matrica", name: "Matricák a felületen", gen: matrica },
  ],
};
