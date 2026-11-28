// ===== T3 – Mértékegységek =====
// Átváltás (hossz, tömeg, űrtartalom, idő), vegyes alak, pótlás, mértékegység becslése.
import { aAz } from "../../core/dom.js";
import { fmt, svg, txt, rect, arrowDefs, article } from "../util.js";

// Mértékegység-családok: a lépcső fentről lefelé (nagyobbtól a kisebbig), alapegységben kifejezve
const FAM = {
  hossz: { name: "hosszúság", units: [["km", 1000000], ["m", 1000], ["dm", 100], ["cm", 10], ["mm", 1]] },
  tomeg: { name: "tömeg", units: [["kg", 1000], ["dkg", 10], ["g", 1]] },
  urtartalom: { name: "űrtartalom", units: [["hl", 100000], ["l", 1000], ["dl", 100], ["cl", 10], ["ml", 1]] },
  ido: { name: "idő", units: [["hét", 10080], ["nap", 1440], ["óra", 60], ["perc", 1]] },
};
const UNIT_FULL = { km: "kilométer", m: "méter", dm: "deciméter", cm: "centiméter", mm: "milliméter", kg: "kilogramm", dkg: "dekagramm", g: "gramm", hl: "hektoliter", l: "liter", dl: "deciliter", cl: "centiliter", ml: "milliliter", hét: "hét", nap: "nap", óra: "óra", perc: "perc" };
const uOf = (fam, u) => FAM[fam].units.find(x => x[0] === u)[1];
const ul = u => u === "l" ? "liter" : u; // a "liter"-t kiírjuk, mert az "l" könnyen összetéveszthető az 1-gyel
// Ragozott alakok: -ra/-re, -ban/-ben, tárgyrag (kiejtés szerint)
const SUF = { km: ["km-re", "km-ben", "km-t"], m: ["m-re", "m-ben", "m-t"], dm: ["dm-re", "dm-ben", "dm-t"], cm: ["cm-re", "cm-ben", "cm-t"], mm: ["mm-re", "mm-ben", "mm-t"],
  kg: ["kg-ra", "kg-ban", "kg-ot"], dkg: ["dkg-ra", "dkg-ban", "dkg-ot"], g: ["g-ra", "g-ban", "g-ot"],
  hl: ["hl-re", "hl-ben", "hl-t"], liter: ["literre", "literben", "litert"], dl: ["dl-re", "dl-ben", "dl-t"], cl: ["cl-re", "cl-ben", "cl-t"], ml: ["ml-re", "ml-ben", "ml-t"],
  perc: ["percre", "percben", "percet"], óra: ["órára", "órában", "órát"], nap: ["napra", "napban", "napot"], hét: ["hétre", "hétben", "hetet"] };
const ra = u => SUF[ul(u)][0], ban = u => SUF[ul(u)][1], acc = u => SUF[ul(u)][2];

// Lépcső-ábra: kiemeli az átváltás útját, és minden lépcsőfokra kiírja a váltószámot
function stairs(fam, from, to) {
  const us = FAM[fam].units, n = us.length;
  const i1 = us.findIndex(x => x[0] === from), i2 = us.findIndex(x => x[0] === to);
  const [a, b] = [Math.min(i1, i2), Math.max(i1, i2)];
  const W = 110 * n + 20, H = 40 * n + 40;
  let body = arrowDefs;
  us.forEach((u, i) => {
    const x = 10 + i * 110, y = 10 + i * 40, on = i >= a && i <= b;
    body += rect(x, y, 96, 34, { fill: on ? "var(--pri)" : "var(--card)", stroke: "var(--pri)", sw: 2 });
    body += txt(x + 48, y + 23, ul(u[0]), { size: 16, w: 800, fill: on ? "#fff" : "var(--ink)" });
    if (i < n - 1) {
      const f = u[1] / us[i + 1][1];
      const seg = i >= a && i < b;
      body += `<path d="M${x + 96} ${y + 17} C${x + 118} ${y + 17} ${x + 118} ${y + 30} ${x + 112} ${y + 46}" fill="none" stroke="${seg ? "var(--pri)" : "var(--line)"}" stroke-width="2.5" ${seg ? 'marker-end="url(#ah)"' : ""}/>`;
      body += txt(x + 128, y + 34, `×${f}`, { size: 13, w: 800, fill: seg ? "var(--pri)" : "var(--soft)", a: "start" });
    }
  });
  body += txt(10, H - 6, i2 > i1 ? "Lefelé a lépcsőn (kisebb egység): SZOROZUNK" : "Felfelé a lépcsőn (nagyobb egység): OSZTUNK", { size: 13, w: 700, a: "start", fill: "var(--soft)" });
  return svg(W + 40, H, body);
}

// Lépésenkénti lánc: 5 m → 50 dm → 500 cm
function chain(fam, val, from, to) {
  const us = FAM[fam].units;
  const i1 = us.findIndex(x => x[0] === from), i2 = us.findIndex(x => x[0] === to);
  const dir = i2 > i1 ? 1 : -1;
  let v = val, out = [`${fmt(v)} ${ul(from)}`];
  for (let i = i1; i !== i2; i += dir) {
    const f = dir > 0 ? us[i][1] / us[i + 1][1] : us[i - 1][1] / us[i][1];
    v = dir > 0 ? v * f : v / f;
    out.push(`<span class="soft">${dir > 0 ? "×" : ":"}${f}</span> → ${fmt(v)} ${ul(us[i + dir][0])}`);
  }
  return out.join(" ");
}

// --- Átváltás egy családon belül ---
function convert(fam, rng, lvl) {
  const us = FAM[fam].units;
  let pool = us.map(u => u[0]);
  if (fam === "hossz" && lvl < 3) pool = pool.filter(u => u !== "km" || lvl === 2);
  if (fam === "urtartalom" && lvl < 3) pool = pool.filter(u => u !== "hl");
  if (fam === "ido" && lvl === 1) pool = ["óra", "perc", "nap"];
  for (let t = 0; t < 200; t++) {
    const from = rng.pick(pool), to = rng.pick(pool);
    if (from === to) continue;
    const i1 = us.findIndex(x => x[0] === from), i2 = us.findIndex(x => x[0] === to);
    const dist = Math.abs(i1 - i2);
    if (lvl === 1 && (dist > 1 || i2 < i1)) continue;       // 1. szint: egy lépcső lefelé
    if (lvl === 2 && dist > 2) continue;
    const F = uOf(fam, from), T = uOf(fam, to);
    let val;
    // nem 10-es váltószámnál (pl. 24, 60, 7) kisebb számokkal dolgozunk – fejben is számolható legyen
    const r = F > T ? F / T : T / F, tens = /^10*$/.test(String(r));
    if (F > T) { // nagyobból kisebbe: szorzás
      val = rng.int(1, lvl === 1 ? 9 : tens ? 60 : 10);
      if (r >= 1000 && val > 20) val = rng.int(2, 20);
    } else {     // kisebből nagyobba: osztás – csak egész eredmény
      const k = rng.int(1, tens ? (lvl === 2 ? 30 : 90) : 10);
      val = k * r;
    }
    const ans = val * F / T;
    if (!Number.isInteger(ans) || ans > 100000 || val > 100000) continue;
    const mult = F > T;
    return {
      sub: fam,
      q: `Váltsd át!<div class="qbig">${fmt(val)} ${ul(from)} = ? ${ul(to)}</div>`,
      ans: { kind: "num", value: ans, unit: ul(to) },
      hint: mult ? `Kisebb egységre váltasz, ezért nagyobb szám jön ki. Hány ${ul(to)} van 1 ${ban(from)}?` : `Nagyobb egységre váltasz, ezért kisebb szám jön ki. Hány ${ul(from)} van 1 ${ban(to)}?`,
      steps: [
        `Nézzük meg a mértékegység-lépcsőt! ${mult ? "Lefelé" : "Felfelé"} megyünk: ${ul(from)} → ${ul(to)}.` + stairs(fam, from, to),
        `1 ${ul(mult ? from : to)} = <b>${fmt(mult ? F / T : T / F)} ${ul(mult ? to : from)}</b>, ezért ${mult ? "szorzunk" : "osztunk"}.`,
        chain(fam, val, from, to),
        `${fmt(val)} ${ul(from)} = <b class="big">${fmt(ans)} ${ul(to)}</b>`,
      ],
      why: v => whyConv(v, val, ans, mult, F, T),
    };
  }
  return convert(fam, rng, 1);
}
function whyConv(v, val, ans, mult, F, T) {
  const r = F > T ? F / T : T / F;
  if (v === val) return "A mértékegység megváltozik, ezért a mérőszámnak is változnia kell!";
  if (mult && v * r === val) return "Fordítva számoltál: kisebb egységre váltasz, ezért szorozni kell, nem osztani.";
  if (!mult && v === val * r) return "Fordítva számoltál: nagyobb egységre váltasz, ezért osztani kell, nem szorozni.";
  if (v === ans * 10 || v * 10 === ans) return "Egy nullával elszámoltad – nézd meg újra a váltószámot a lépcsőn!";
  if (v === ans * 100 || v * 100 === ans) return "Két nullával elszámoltad – nézd meg újra a lépcsőn, hány lépcsőfokot kell megtenni!";
  return null;
}

// --- Vegyes alak és törtrészek (3 kg 50 dkg = ? dkg; fél km = ? m; 1 és negyed óra = ? perc) ---
const FRACS = [["fél", 1, 2], ["negyed", 1, 4], ["háromnegyed", 3, 4]];
function compound(rng, lvl) {
  const fam = rng.pick(["hossz", "tomeg", "urtartalom", "ido"]);
  const combos = { hossz: [["m", "dm", "dm"], ["m", "cm", "cm"], ["dm", "cm", "cm"], ["km", "m", "m"], ["cm", "mm", "mm"]], tomeg: [["kg", "dkg", "dkg"], ["dkg", "g", "g"], ["kg", "g", "g"]], urtartalom: [["l", "dl", "dl"], ["l", "ml", "ml"], ["dl", "ml", "ml"]], ido: [["óra", "perc", "perc"], ["nap", "óra", "óra"], ["hét", "nap", "nap"]] };
  if (lvl >= 2 && rng.chance(0.4)) { // törtrész
    const [w, p, q] = rng.pick(FRACS);
    const pairs = { hossz: ["km", "m"], tomeg: ["kg", "dkg"], urtartalom: ["l", "dl"], ido: ["óra", "perc"] }[fam];
    const whole = lvl === 3 && rng.chance(0.5) ? rng.int(1, 3) : 0;
    const [big, small] = pairs, r = uOf(fam, big) / uOf(fam, small);
    if ((r * p) % q) return compound(rng, lvl);
    const part = r * p / q, ans = whole * r + part;
    const label = whole ? `${whole} és ${w} ${ul(big)}` : `${w} ${ul(big)}`;
    return {
      sub: "vegyes",
      q: `Váltsd át!<div class="qbig">${label} = ? ${ul(small)}</div>`,
      ans: { kind: "num", value: ans, unit: ul(small) },
      hint: `Először azt gondold végig: 1 ${ul(big)} hány ${ul(small)}? Aztán vedd ennek a ${w === "fél" ? "felét" : w === "negyed" ? "negyedét" : "háromnegyedét"}!`,
      steps: [
        `1 ${ul(big)} = <b>${fmt(r)} ${ul(small)}</b>.` + stairs(fam, big, small),
        `${w} ${ul(big)} = ${fmt(r)} ${ul(small)} ${q === 2 ? "fele" : p === 1 ? "negyede" : "háromnegyede"}: ${fmt(r)} : ${q}${p > 1 ? ` · ${p}` : ""} = <b>${fmt(part)} ${ul(small)}</b>`,
        whole ? `${whole} ${ul(big)} = ${fmt(whole * r)} ${ul(small)}, és még ${fmt(part)}: ${fmt(whole * r)} + ${fmt(part)} = <b class="big">${fmt(ans)} ${ul(small)}</b>` : `<b class="big">${label} = ${fmt(ans)} ${ul(small)}</b>`,
      ],
      why: v => {
        if (fam === "ido" && v === whole * 100 + part * 100 / r) return "Vigyázz: egy órában 60 perc van, nem 100!";
        if (v === whole * r && whole) return `Ne felejtsd el hozzáadni a ${w} részt is!`;
        if (fam === "ido" && v === whole * 60 + 50 && w === "fél") return "A fél óra 30 perc, nem 50!";
        return null;
      },
    };
  }
  const [A, B, target] = rng.pick(combos[fam]);
  const rA = uOf(fam, A) / uOf(fam, target), rB = uOf(fam, B) / uOf(fam, target);
  const a = rng.int(1, fam === "hossz" && A === "km" ? 9 : 12);
  const maxB = uOf(fam, A) / uOf(fam, B);
  // 3. szinten a második tag "túlcsordulhat" (pl. 5 m 14 dm) – ilyen is volt a felvételin
  const b = lvl === 3 && rng.chance(0.5) ? rng.int(maxB, maxB + Math.min(20, maxB)) : rng.int(1, maxB - 1);
  const ans = a * rA + b * rB;
  if (ans > 100000) return compound(rng, lvl);
  const plus = rng.chance(0.4);
  const lhs = plus ? `${fmt(a)} ${ul(A)} + ${fmt(b)} ${ul(B)}` : `${fmt(a)} ${ul(A)} ${fmt(b)} ${ul(B)}`;
  return {
    sub: "vegyes",
    q: `Váltsd át!<div class="qbig">${lhs} = ? ${ul(target)}</div>`,
    ans: { kind: "num", value: ans, unit: ul(target) },
    hint: `Váltsd át külön mindkét részt ${ra(target)}, aztán add össze őket!`,
    steps: [
      `Bontsuk két részre!` + stairs(fam, A, target),
      `${fmt(a)} ${ul(A)} = ${fmt(a)} · ${fmt(rA)} = <b>${fmt(a * rA)} ${ul(target)}</b>` + (B === target ? "" : `<br>${fmt(b)} ${ul(B)} = ${fmt(b)} · ${fmt(rB)} = <b>${fmt(b * rB)} ${ul(target)}</b>`),
      `Összeadjuk: ${fmt(a * rA)} + ${fmt(b * rB)} = <b class="big">${fmt(ans)} ${ul(target)}</b>`,
    ],
    why: v => {
      if (v === a * rA) return `Ne felejtsd el hozzáadni ${article(b)} ${fmt(b)} ${acc(B)} is!`;
      if (v === a + b) return "Nem lehet csak úgy összeadni a mérőszámokat – előbb ugyanarra a mértékegységre kell váltani!";
      if (v === Number(`${a}${b}`)) return `Nem elég egymás mellé írni a számokat: ${fmt(a)} ${ul(A)} = ${fmt(a * rA)} ${ul(target)}.`;
      if (fam === "ido" && v === a * 100 + b) return "Egy órában 60 perc van, nem 100!";
      return null;
    },
  };
}

// --- Pótlás: 7 m 5 dm + ? dm = 100 dm ---
function potlas(rng, lvl) {
  const opts = [["hossz", "m", "dm"], ["hossz", "m", "cm"], ["tomeg", "kg", "dkg"], ["urtartalom", "l", "dl"], ["ido", "óra", "perc"]];
  const [fam, A, B] = rng.pick(lvl === 1 ? opts.slice(0, 1).concat([opts[3]]) : opts);
  const r = uOf(fam, A) / uOf(fam, B);
  const a = rng.int(1, 9), b = rng.int(1, r - 1);
  const have = a * r + b;
  const totalBig = fam === "ido" ? null : rng.int(a + 1, a + (lvl === 1 ? 3 : 9));
  if (fam === "ido") { // 10 óra 30 perc + ? perc = 11 óra 37 perc
    const start = rng.int(7, 18) * 60 + rng.int(0, 11) * 5, add = rng.int(lvl === 1 ? 2 : 7, lvl === 3 ? 30 : 15) * 5 + (lvl === 3 ? rng.int(1, 4) : 0);
    const end = start + add, s = h => `${Math.floor(h / 60)} óra ${h % 60 ? `${h % 60} perc` : ""}`.trim();
    return {
      sub: "potlas",
      q: `Pótold a hiányzó mérőszámot!<div class="qbig">${s(start)} + ? perc = ${s(end)}</div>`,
      ans: { kind: "num", value: add, unit: "perc" },
      hint: "Számolj előre a kezdő időponttól: először a következő egész óráig, aztán tovább!",
      steps: [
        `Számoljunk előre a kezdő időponttól (${s(start)})!`,
        Math.floor(start / 60) === Math.floor(end / 60) ? `Ugyanabban az órában vagyunk: ${end % 60} − ${start % 60} = <b>${add} perc</b>` : `A következő egész óráig: <b>${60 - start % 60} perc</b>` + (Math.floor(end / 60) - Math.floor(start / 60) > 1 ? `, aztán ${Math.floor(end / 60) - Math.floor(start / 60) - 1} egész óra = <b>${(Math.floor(end / 60) - Math.floor(start / 60) - 1) * 60} perc</b>` : "") + (end % 60 ? `, onnan még <b>${end % 60} perc</b>.` : "."),
        `Összesen: <b class="big">${add} perc</b>`,
      ],
      why: v => (v === end - start + 40 || v === (Math.floor(end / 60) * 100 + end % 60) - (Math.floor(start / 60) * 100 + start % 60)) ? "Úgy számoltál, mintha egy órában 100 perc lenne – de csak 60 van!" : null,
    };
  }
  const total = totalBig * r, ans = total - have;
  const tForm = rng.chance(0.5) || lvl === 1 ? `${fmt(total)} ${ul(B)}` : `${fmt(totalBig)} ${ul(A)}`;
  return {
    sub: "potlas",
    q: `Pótold a hiányzó mérőszámot!<div class="qbig">${a} ${ul(A)} ${b} ${ul(B)} + ? ${ul(B)} = ${tForm}</div>`,
    ans: { kind: "num", value: ans, unit: ul(B) },
    hint: `Írj át mindent ${ra(B)}, aztán nézd meg, mennyi hiányzik!`,
    steps: [
      `Mindent ${ra(B)} váltunk. 1 ${ul(A)} = ${fmt(r)} ${ul(B)}.` + stairs(fam, A, B),
      `${a} ${ul(A)} ${b} ${ul(B)} = ${fmt(a * r)} + ${b} = <b>${fmt(have)} ${ul(B)}</b>` + (tForm.includes(ul(A)) ? `<br>${totalBig} ${ul(A)} = <b>${fmt(total)} ${ul(B)}</b>` : ""),
      `Mennyi hiányzik? ${fmt(total)} − ${fmt(have)} = <b class="big">${fmt(ans)} ${ul(B)}</b>`,
    ],
    why: v => {
      if (v === totalBig - a) return `Ez ${ban(A)} van – a kérdés ${acc(B)} kér, és ${article(b)} ${b} ${acc(B)} sem szabad kihagyni.`;
      if (v === total - a * r) return `Ne felejtsd el ${article(b)} ${b} ${acc(B)} is levonni!`;
      if (v === total + have) return "Itt nem összeadni kell: azt keressük, mennyi hiányzik → kivonás.";
      return null;
    },
  };
}

// --- Becslés: melyik mértékegység illik? ---
const EST = [
  ["A játékmackó 45 … magas.", "cm", "45 m egy 15 emeletes ház magassága lenne – a mackó ennél jóval kisebb."],
  ["Egy alma tömege kb. 20 ….", "dkg", "20 kg annyi, mint egy nagy zsák krumpli – egy alma ennél sokkal könnyebb."],
  ["Egy vödörbe kb. 10 … víz fér.", "liter", "Egy vödör nagyjából 10 nagy, literes üveg vizet tart."],
  ["Egy pohárba 2 … üdítő fér.", "dl", "Egy pohár kb. 2 dl – 2 liter egy nagy palack lenne."],
  ["Budapest és Debrecen távolsága kb. 230 ….", "km", "Két város között kilométerben mérjük a távolságot."],
  ["Az osztályterem hossza kb. 9 ….", "m", "Egy nagy lépés kb. 1 m – a terem kb. 9 nagy lépés hosszú."],
  ["Egy tanóra 45 … hosszú.", "perc", "Egy tanóra kevesebb, mint egy óra: 45 perc."],
  ["A nyári szünet kb. 11 … hosszú.", "hét", "A nyári szünet június közepétől augusztus végéig tart, ez kb. 11 hét."],
  ["Egy személyautó tömege kb. 1000 ….", "kg", "Egy autó nagyon nehéz: kb. 1000 kg (1 tonna)."],
  ["Egy radír hossza kb. 4 ….", "cm", "Egy radír elfér a tenyeredben: néhány centiméter."],
  ["Egy hangya hossza kb. 5 ….", "mm", "A hangya pici: a vonalzón a legkisebb beosztás 1 mm."],
  ["Egy tábla csoki tömege 10 ….", "dkg", "Egy tábla csoki 10 dkg (100 g)."],
  ["Egy éjszaka kb. 9 … alszunk.", "óra", "Este 9-től reggel 6-ig 9 óra telik el."],
  ["Egy kanál orvosság kb. 5 ….", "ml", "Egy kávéskanálnyi folyadék nagyon kevés: 5 milliliter."],
  ["A fürdőkádba kb. 150 … víz fér.", "liter", "Egy fürdőkád nagyon sok vizet tart: kb. 150 liter."],
  ["Az ajtó magassága kb. 2 ….", "m", "Egy felnőtt kb. 1 m 80 cm – az ajtó ennél kicsit magasabb, kb. 2 m."],
  ["Egy 4. osztályos gyerek tömege kb. 35 ….", "kg", "A gyerekek tömegét kilogrammban mérjük."],
  ["Egy focimeccs 90 … hosszú.", "perc", "Két félidő, mindkettő 45 perc: összesen 90 perc."],
  ["Egy füzet hosszabbik oldala kb. 3 ….", "dm", "3 dm = 30 cm – nagyjából egy hosszú vonalzó."],
  ["Egy zsák liszt tömege 1 ….", "kg", "A boltban a lisztet 1 kg-os zacskóban árulják."],
  ["Egy bögre tea kb. 3 ….", "dl", "Egy bögre kicsit nagyobb, mint egy pohár: kb. 3 dl."],
  ["A Duna hossza kb. 2850 ….", "km", "A Duna Németországtól a Fekete-tengerig folyik – nagyon hosszú."],
  ["Egy ceruza hossza kb. 18 ….", "cm", "Egy új ceruza kicsit rövidebb, mint egy 20 cm-es vonalzó."],
  ["Egy elefánt tömege kb. 5000 ….", "kg", "Az elefánt a legnehezebb szárazföldi állat: kb. 5000 kg."],
];
const ALL_UNITS = ["mm", "cm", "dm", "m", "km", "g", "dkg", "kg", "ml", "dl", "liter", "perc", "óra", "nap", "hét"];
const UNIT_FAMILY = { mm: "h", cm: "h", dm: "h", m: "h", km: "h", g: "t", dkg: "t", kg: "t", ml: "u", dl: "u", liter: "u", perc: "i", óra: "i", nap: "i", hét: "i" };
function becsles(rng, lvl) {
  const [s, u, expl] = rng.pick(EST);
  // nehezebb szinten a rossz válaszok ugyanabból a családból jönnek (cm–m–dm)
  const same = ALL_UNITS.filter(x => x !== u && UNIT_FAMILY[x] === UNIT_FAMILY[u]);
  const other = ALL_UNITS.filter(x => x !== u && UNIT_FAMILY[x] !== UNIT_FAMILY[u]);
  const wrong = lvl === 1 ? rng.sample(other, 2).concat(rng.sample(same, 1)) : rng.sample(same, Math.min(3, same.length)).concat(rng.sample(other, Math.max(0, 3 - same.length)));
  const options = rng.shuffle([u, ...wrong]);
  return {
    sub: "becsles",
    q: `Melyik mértékegység illik a mondatba?<div class="qbig">${s.replace("…", "<u>&nbsp;?&nbsp;</u>")}</div>`,
    ans: { kind: "choice", options, value: options.indexOf(u) },
    hint: "Képzeld el a tárgyat! Mekkora 1 cm (kb. a kisujjad szélessége), 1 m (egy nagy lépés), 1 kg (egy zacskó liszt)?",
    steps: [
      `Gondoljuk végig, mit jelentene a szám az egyes mértékegységekkel!`,
      expl,
      `A jó válasz: <b class="big">${s.replace("…", u)}</b>`,
    ],
    why: i => { const w = options[i]; return w && UNIT_FAMILY[w] !== UNIT_FAMILY[u] ? `${aAz(w, true)} ${w} nem ${{ h: "hosszúság", t: "tömeg", u: "űrtartalom", i: "idő" }[UNIT_FAMILY[u]]}mérték – itt ${{ h: "hosszúságot", t: "tömeget", u: "űrtartalmat", i: "időt" }[UNIT_FAMILY[u]]} mérünk.` : null; },
  };
}

export default {
  id: "T3",
  name: "Mértékegységek",
  planet: { name: "Mérő-hold", emoji: "🌕", color: "#f59e0b" },
  subs: [
    { id: "hossz", name: "Hosszúság", gen: (r, l) => convert("hossz", r, l) },
    { id: "tomeg", name: "Tömeg", gen: (r, l) => convert("tomeg", r, l) },
    { id: "urtartalom", name: "Űrtartalom", gen: (r, l) => convert("urtartalom", r, l) },
    { id: "ido", name: "Időegységek", gen: (r, l) => convert("ido", r, l) },
    { id: "vegyes", name: "Vegyes alak, törtrész", gen: compound, minLvl: 2 },
    { id: "potlas", name: "Pótlás", gen: potlas },
    { id: "becsles", name: "Melyik mértékegység?", gen: becsles },
  ],
};
export { UNIT_FULL };
