// ===== T1 – Számok tulajdonságai =====
// Kerekítés, számszomszédok, helyi érték, számkártyák, "találd ki a számot" feltételekkel.
import { fmt, digits, digitSum, digitProd, roundTo, range, numberLine, svg, txt, rect, Az, article } from "../util.js";

const PLACE = { 10: "tízes", 100: "százas", 1000: "ezres" };
const PLACE_RE = { 10: "tízesre", 100: "százasra", 1000: "ezresre" };
const DECIDER = { 10: "egyesek", 100: "tízesek", 1000: "százasok" };
const PL = { 10: "tízesek", 100: "százasok", 1000: "ezresek" };
const ACC = { 10: "tízest", 100: "százast", 1000: "ezrest" };

// --- 1. Kerekítés ---
function kerekites(rng, lvl) {
  let n, p;
  if (lvl === 1) { p = 10; n = rng.int(101, 989); }
  else if (lvl === 2) { p = rng.pick([100, 100, 10]); n = p === 100 ? rng.int(101, 989) : rng.int(1001, 9989); }
  else { p = rng.pick([100, 1000, 10]); n = rng.int(1001, 9989); }
  // néha "határeset": pont 5-ös a döntő számjegy, vagy átlépi a nagyobb helyi értéket (pl. 296 → 300)
  if (rng.chance(0.3)) n = Math.floor(n / p) * p + p / 2;
  else if (rng.chance(0.15)) n = Math.floor(n / (p * 10)) * p * 10 + p * 9 + rng.int(Math.ceil(p / 2), p - 1);
  if (n % p === 0) n += Math.max(1, p / 10);
  if (n > 9999) n = 9989;
  const lo = Math.floor(n / p) * p, hi = lo + p, ans = roundTo(n, p);
  const dec = Math.floor((n % p) / (p / 10)); // döntő számjegy
  const up = ans === hi;
  const ticks = range(0, 10).map(i => ({ v: lo + i * p / 10, big: i === 0 || i === 10 || i === 5, label: (i === 0 || i === 10) ? fmt(lo + i * p / 10) : (i === 5 ? fmt(lo + p / 2) : "") }));
  const nl = numberLine(lo, hi, [{ v: n, label: fmt(n) }, { v: ans, color: "var(--ok)" }], { ticks, hops: [{ from: n, to: ans, label: up ? "fel" : "le", color: "var(--ok)" }] });
  const nlHelp = numberLine(lo, hi, [{ v: n, label: fmt(n) }], { ticks }); // a súgóba: irány és eredmény nélkül
  return {
    sub: "kerekites",
    // ❓ súgó: ugyanazok a lépések, de a számegyenesen nincs „fel/le” nyíl és eredmény (a döntés a gyereké)
    get help() { return this.steps.map(s => s.replace(nl, nlHelp)); },
    q: `Mennyi ${article(n)} <b>${fmt(n)}</b> <b>${PLACE_RE[p]}</b> kerekített értéke?`,
    ans: { kind: "num", value: ans },
    hint: `Melyik két kerek ${PLACE[p]} között van ${article(n)} ${fmt(n)}? Nézd meg ${article(DECIDER[p])} <b>${DECIDER[p]}</b> helyén álló számjegyet!`,
    steps: [
      `${Az(n)} ${fmt(n)} két szomszédos kerek ${PLACE[p]} között van: <b>${fmt(lo)}</b> és <b>${fmt(hi)}</b>.`,
      `${Az(DECIDER[p])} ${DECIDER[p]} helyén álló számjegy dönt: ez most ${article(dec)} <b>${dec}</b>.` + nl,
      `Szabály: ha a döntő számjegy <b>0, 1, 2, 3 vagy 4</b> → lefelé kerekítünk.<br>Ha <b>5, 6, 7, 8 vagy 9</b> → felfelé kerekítünk.`,
      `Most ${dec} ${up ? "≥ 5, ezért <b>felfelé</b>" : "&lt; 5, ezért <b>lefelé</b>"} kerekítünk: <b class="big">${fmt(ans)}</b>`,
    ],
    why: v => {
      if (v === n) return `Ez maga a szám – még ${PLACE_RE[p]} kell kerekíteni.`;
      if (v === (up ? lo : hi)) return up ? `Lefelé kerekítettél, de a döntő számjegy ${dec}, ami 5 vagy több → felfelé kell.` : `Felfelé kerekítettél, de a döntő számjegy ${dec}, ami 4 vagy kevesebb → lefelé kell.`;
      for (const q of [10, 100, 1000]) if (q !== p && v === roundTo(n, q)) return `Ez a ${PLACE_RE[q]} kerekített érték – most <b>${PLACE_RE[p]}</b> kell kerekíteni.`;
      return null;
    },
  };
}

// --- 2. Számszomszédok ---
function szomszed(rng, lvl) {
  const p = lvl === 1 ? 10 : rng.pick([10, 100]);
  let n = lvl === 3 ? rng.int(1001, 9899) : rng.int(101, 899);
  if (lvl >= 2 && rng.chance(0.4)) n = Math.floor(n / p) * p; // kerek szám: a szomszédja nem saját maga!
  if (n % p === 0 && n - p < 100) n += p;
  const smaller = rng.chance(0.5);
  const round = n % p === 0;
  const lo = round ? n - p : Math.floor(n / p) * p, hi = round ? n + p : Math.ceil(n / p) * p;
  const ans = smaller ? lo : hi;
  const word = smaller ? "kisebb" : "nagyobb";
  const ticks = [{ v: lo, big: true, label: fmt(lo) }, { v: hi, big: true, label: fmt(hi) }];
  if (round) ticks.push({ v: n, big: true, label: "" });
  const nl = numberLine(lo, hi, [{ v: n, label: fmt(n) }, { v: ans, color: "var(--ok)" }], { ticks });
  return {
    sub: "szomszed",
    // ❓ súgó: csak a meghatározás (a második lépés a számegyenessel már maga a megoldás)
    get help() { return [this.steps[0], this.steps[this.steps.length - 1]]; },
    q: `Melyik ${article(n)} <b>${fmt(n)}</b> <b>${word} ${PLACE[p]}</b> számszomszédja?`,
    ans: { kind: "num", value: ans },
    hint: `A ${PLACE[p]} számszomszéd mindig kerek ${PLACE[p]}. Keresd meg a számegyenesen ${article(n)} ${fmt(n)} ${smaller ? "előtti" : "utáni"} kerek ${ACC[p]}!`,
    steps: [
      `A ${PLACE[p]} számszomszédok azok a <b>kerek ${PL[p]}</b>, amelyek közrefogják a számot.`,
      round
        ? `Figyelem: ${article(n)} ${fmt(n)} maga is kerek ${PLACE[p]}! A szám nem lehet a saját szomszédja, ezért egy ${PLACE[p]}nyit lépünk ${smaller ? "vissza" : "előre"}.` + nl
        : `${Az(n)} ${fmt(n)} ${article(lo)} <b>${fmt(lo)}</b> és ${article(hi)} <b>${fmt(hi)}</b> között van.` + nl,
      `A ${word} ${PLACE[p]} számszomszéd: <b class="big">${fmt(ans)}</b>`,
    ],
    why: v => {
      if (v === n) return "A szám nem lehet a saját számszomszédja.";
      if (v === (smaller ? hi : lo)) return `Ez a ${smaller ? "nagyobb" : "kisebb"} szomszéd – most a ${word} kell.`;
      if (v === n - 1 || v === n + 1) return `Ez sima számszomszéd – most <b>${PLACE[p]}</b> számszomszéd kell (kerek ${PLACE[p]}).`;
      return null;
    },
  };
}

// --- 3. Helyi érték (bontott alak) ---
function helyiertek(rng, lvl) {
  const parts = [];
  if (lvl === 1) { parts.push(["százas", 100, rng.int(1, 9)], ["tízes", 10, rng.int(0, 9)], ["egyes", 1, rng.int(1, 9)]); }
  else if (lvl === 2) { const four = rng.chance(0.5); if (four) parts.push(["ezres", 1000, rng.int(1, 9)]); parts.push(["százas", 100, rng.int(1, 9)], ["tízes", 10, rng.int(1, 9)], ["egyes", 1, rng.int(1, 9)]); }
  else { parts.push(["százas", 100, rng.int(1, 8)], ["tízes", 10, rng.int(10, 19)], ["egyes", 1, rng.chance(0.5) ? rng.int(10, 35) : rng.int(1, 9)]); }
  const use = parts.filter(x => x[2] > 0);
  const shown = lvl === 1 ? use : rng.shuffle(use);
  const ans = use.reduce((a, x) => a + x[1] * x[2], 0);
  const naive = Number(use.map(x => x[2]).join(""));         // számjegyek egymás mellé írva
  const ordered = Number(shown.map(x => x[2]).join(""));     // a látott sorrendben leírva
  const tbl = (() => {
    const cols = use.length, W = 90 * cols + 20;
    let b = "";
    use.forEach((x, i) => { b += rect(10 + i * 90, 6, 84, 30, { fill: "var(--pri-soft)" }) + txt(52 + i * 90, 26, x[0], { size: 13 }) + rect(10 + i * 90, 40, 84, 36, { fill: "var(--card)", stroke: "var(--line)", sw: 2 }) + txt(52 + i * 90, 65, String(x[2] * x[1]), { size: 17, w: 800 }); });
    return svg(W, 82, b);
  })();
  return {
    sub: "helyiertek",
    q: `Írd fel számmal!<div class="qbig">${shown.map(x => `${x[2]} ${x[0]}`).join(" + ")} = ?</div>`,
    ans: { kind: "num", value: ans },
    hint: `Írd át mindegyik tagot számmá (pl. 3 tízes = 30), aztán add össze őket!${lvl > 1 ? " Figyelj a sorrendre!" : ""}`,
    steps: [
      `Minden tagot átírunk számmá:<br>` + use.map(x => `${x[2]} ${x[0]} = <b>${fmt(x[1] * x[2])}</b>`).join("<br>"),
      tbl,
      `Összeadjuk: ${use.map(x => fmt(x[1] * x[2])).join(" + ")} = <b class="big">${fmt(ans)}</b>`,
    ],
    why: v => {
      if (v === naive && naive !== ans) { const big = use.find(x => x[2] > 9); return big ? `Nem elég a számokat egymás mellé írni! ${big[2]} ${big[0]} = ${fmt(big[2] * big[1])} – ezt kell hozzáadni a többihez.` : "Nem elég a számokat egymás mellé írni – minden tagot a helyi értéke szerint kell átírni."; }
      if (v === ordered && ordered !== ans) return "Figyelj a helyi értékek sorrendjére – nem abban a sorrendben vannak, ahogy a szám leírjuk!";
      return null;
    },
  };
}

// --- 4. Számkártyák ---
function perms3(cards) {
  const out = new Set();
  for (let i = 0; i < cards.length; i++) for (let j = 0; j < cards.length; j++) for (let k = 0; k < cards.length; k++) {
    if (i === j || j === k || i === k || cards[i] === 0) continue;
    out.add(cards[i] * 100 + cards[j] * 10 + cards[k]);
  }
  return [...out];
}
function szamkartya(rng, lvl) {
  const nCards = lvl === 1 ? 3 : 4;
  let cards, kind, nums, ans;
  for (let tries = 0; tries < 100; tries++) {
    cards = rng.sample(range(0, 9), nCards);
    if (lvl >= 2 && !cards.includes(0) && rng.chance(0.5)) cards[rng.int(0, nCards - 1)] = 0;
    kind = rng.pick(lvl === 1 ? ["max", "min"] : ["max", "min", "maxEven", "maxOdd", "minEven", "minOdd"]);
    nums = perms3(cards).filter(x => kind.endsWith("Even") ? x % 2 === 0 : kind.endsWith("Odd") ? x % 2 === 1 : true);
    if (nums.length) { ans = kind.startsWith("max") ? Math.max(...nums) : Math.min(...nums); break; }
  }
  const label = { max: "legnagyobb", min: "legkisebb", maxEven: "legnagyobb páros", maxOdd: "legnagyobb páratlan", minEven: "legkisebb páros", minOdd: "legkisebb páratlan" }[kind];
  const isMax = kind.startsWith("max"), par = kind.endsWith("Even") ? 0 : kind.endsWith("Odd") ? 1 : null;
  // Mohó magyarázat: helyről helyre a legjobb olyan kártya, amivel a szám még befejezhető
  const ad = digits(ans), notes = [];
  const names = ["százasok", "tízesek", "egyesek"];
  for (let pos = 0; pos < 3; pos++) {
    const left = cards.filter(c => !ad.slice(0, pos).includes(c)).sort((a, b) => isMax ? b - a : a - b);
    const skipped = left.slice(0, left.indexOf(ad[pos]));
    let reason = "";
    if (skipped.length) {
      const d = skipped[0];
      if (pos === 0 && d === 0) reason = " (a 0 nem állhat elöl, mert akkor nem lenne háromjegyű)";
      else if (pos === 2 && par !== null) reason = ` (${article(d)} ${d} nem jó ide, mert ${par ? "páratlan" : "páros"} számnak ${par ? "páratlan" : "páros"} az utolsó számjegye)`;
      else if (par !== null) reason = ` (${article(d)} ${d}-t a végére tartogatjuk, hogy ${par ? "páratlan" : "páros"} legyen a szám)`;
    }
    notes.push(`${Az(names[pos])} ${names[pos]} helyére: <b>${ad[pos]}</b>${reason}`);
  }
  const cardsSvg = (() => { let b = ""; cards.forEach((c, i) => { b += rect(8 + i * 58, 6, 48, 62, { fill: "var(--card)", stroke: "var(--pri)", sw: 2.5, rx: 8 }) + txt(32 + i * 58, 48, String(c), { size: 28, w: 800 }); }); return svg(cards.length * 58 + 10, 74, b); })();
  return {
    sub: "szamkartya",
    q: `Alkosd meg a kártyákból a <b>${label} háromjegyű</b> számot! Minden kártyát legfeljebb egyszer használhatsz.`,
    viz: cardsSvg,
    ans: { kind: "num", value: ans },
    hint: isMax ? "A legnagyobb helyi értékre (százasok) tedd a lehető legnagyobb számjegyet!" + (par !== null ? ` A végére ${par ? "páratlan" : "páros"} számjegy kell.` : "") : "A százasok helyére a legkisebb számjegy kerüljön – de a 0 nem állhat elöl!" + (par !== null ? ` A végére ${par ? "páratlan" : "páros"} számjegy kell.` : ""),
    steps: [
      `${isMax ? "Legnagyobb" : "Legkisebb"} számhoz a <b>legnagyobb helyi értéken</b> kezdjük: oda a ${isMax ? "lehető legnagyobb" : "lehető legkisebb"} számjegy kerül.` + (par !== null ? `<br>${par ? "Páratlan" : "Páros"} szám: az <b>egyesek helyén</b> ${par ? "1, 3, 5, 7 vagy 9" : "0, 2, 4, 6 vagy 8"} áll.` : ""),
      notes.join("<br>"),
      `A szám: <b class="big">${ans}</b>`,
    ],
    why: v => {
      if (!Number.isInteger(v)) return null;
      if (v < 100) return "Háromjegyű számot kell alkotni – a 0 nem állhat a szám elején.";
      if (v > 999) return "Csak háromjegyű szám kell.";
      const vd = digits(v), pool = cards.slice();
      for (const d of vd) { const i = pool.indexOf(d); if (i === -1) return "Ebben olyan számjegy is van, ami nincs a kártyák között (vagy egy kártyát kétszer használtál)."; pool.splice(i, 1); }
      if (par !== null && v % 2 !== par) return `Ez a szám nem ${par ? "páratlan" : "páros"}: az utolsó számjegye ${v % 10}.`;
      return `${Az(v)} ${v} jó szám a kártyákból, de van ${isMax ? "nagyobb" : "kisebb"} is.`;
    },
  };
}

// --- 5. Találd ki a számot (feltételek, összes megoldás) ---
const RANGE_PROPS = [
  rng => { const R = rng.int(2, 9) * 100; return { t: `százasra kerekített értéke ${R}`, lo: R - 50, hi: R + 49, f: x => roundTo(x, 100) === R, why: x => `${article(x)} ${x} százasra kerekítve ${roundTo(x, 100)}, nem ${R}` }; },
  rng => { const a = rng.int(11, 85) * 10 + rng.int(0, 9), b = a + rng.int(20, 60); return { t: `nagyobb, mint ${fmt(a)}, de kisebb, mint ${fmt(b)}`, lo: a + 1, hi: b - 1, f: x => x > a && x < b, why: x => `${article(x)} ${x} nincs ${a} és ${b} között` }; },
  rng => { const H = rng.int(2, 9) * 100; return { t: `nagyobb százas számszomszédja ${H}`, lo: H - 100, hi: H - 1, f: x => x >= H - 100 && x < H, why: x => `${article(x)} ${x} nagyobb százas szomszédja nem ${H}` }; },
];
const FILTERS = [
  x => ({ t: `számjegyeinek összege ${digitSum(x)}`, f: y => digitSum(y) === digitSum(x), why: y => `számjegyeinek összege ${digitSum(y)}, nem ${digitSum(x)}` }),
  x => digitProd(x) > 0 ? ({ t: `számjegyeinek szorzata ${digitProd(x)}`, f: y => digitProd(y) === digitProd(x), why: y => `számjegyeinek szorzata ${digitProd(y)}, nem ${digitProd(x)}` }) : ({ t: `számjegyeinek szorzata 0`, f: y => digitProd(y) === 0, why: y => `számjegyeinek szorzata nem 0 (nincs benne 0)` }),
  x => x % 2 === 0 ? ({ t: "páros", f: y => y % 2 === 0, why: () => "nem páros" }) : ({ t: "páratlan", f: y => y % 2 === 1, why: () => "nem páratlan" }),
  x => new Set(digits(x)).size === 3 ? ({ t: "minden számjegye különböző", f: y => new Set(digits(y)).size === 3, why: () => "van benne két egyforma számjegy" }) : null,
  x => { const k = [5, 4, 3, 10, 25, 20].find(k => x % k === 0); return k ? ({ t: `${article(k)} ${k} többszöröse`, f: y => y % k === 0, why: () => `nem ${article(k)} ${k} többszöröse` }) : null; },
  x => { const d = digits(x); return d[0] > d[1] && d[1] > d[2] ? ({ t: "számjegyei balról jobbra csökkennek", f: y => { const e = digits(y); return e[0] > e[1] && e[1] > e[2]; }, why: () => "számjegyei nem csökkennek balról jobbra" }) : null; },
];
function feltetelek(rng, lvl) {
  for (let tries = 0; tries < 400; tries++) {
    const rp = rng.pick(RANGE_PROPS)(rng);
    const lo = Math.max(100, rp.lo), hi = Math.min(999, rp.hi);
    if (hi - lo < 5) continue;
    const x = rng.int(lo, hi);
    const nF = lvl === 1 ? 1 : 2;
    const fs = rng.shuffle(FILTERS).map(F => F(x)).filter(Boolean).slice(0, nF);
    if (fs.length < nF) continue;
    const pool = range(lo, hi).filter(rp.f);
    const sols = pool.filter(y => fs.every(F => F.f(y)));
    const maxN = lvl === 1 ? 2 : 4;
    if (sols.length < 1 || sols.length > maxN) continue;
    // magyarázat: szűkítés lépésenként
    const steps = [`1. feltétel: <b>${rp.t}</b>.<br>Ez azt jelenti, hogy a szám <b>${fmt(lo)}</b> és <b>${fmt(hi)}</b> között van (ezeket is beleértve).` +
      numberLine(lo - (lo % 10), hi + 10 - (hi % 10), [{ v: lo, label: fmt(lo) }, { v: hi, label: fmt(hi) }], { ticks: [] })];
    let cur = pool;
    fs.forEach((F, i) => {
      cur = cur.filter(F.f);
      steps.push(`${i + 2}. feltétel: <b>${F.t}</b>.<br>` + (cur.length <= 18 ? `Ami ennek is megfelel: ${cur.map(c => `<span class="chip">${c}</span>`).join(" ")}` : `${cur.length} ilyen szám maradt, pl. ${cur.slice(0, 6).join(", ")}…`));
    });
    steps.push(`Megoldás${sols.length > 1 ? "ok" : ""}: <b class="big">${sols.join(", ")}</b><br><span class="soft">Felvételi tipp: minden számot ellenőrizz mindegyik feltételre – a rossz számért pontlevonás jár!</span>`);
    const all = [rp, ...fs];
    return {
      sub: "feltetelek",
      q: `Melyik háromjegyű szám${sols.length > 1 || lvl > 1 ? "okra" : "ra"} igaz mindegyik állítás? <b>Írd le az összes megoldást!</b><ul class="conds">${all.map(F => `<li>${F.t}</li>`).join("")}</ul>`,
      ans: { kind: "numset", value: sols },
      hint: "Kezdd azzal a feltétellel, amelyik a legjobban leszűkíti a lehetőségeket (pl. a kerekítés vagy a „között”)! Utána ellenőrizd a többi feltételt egyenként.",
      steps,
      why: vs => {
        const bad = vs.filter(v => !sols.includes(v));
        if (!bad.length) return null;
        return bad.slice(0, 3).map(v => { const F = all.find(F => !F.f(v)); return `${Az(v)} ${v} nem jó: ${F ? F.why(v) : "nem háromjegyű"}.`; }).join("<br>");
      },
    };
  }
  return kerekites(rng, lvl); // végső tartalék (gyakorlatilag nem fordul elő)
}

export default {
  id: "T1",
  name: "Számok tulajdonságai",
  planet: { name: "Számkő", emoji: "🪐", color: "#8b5cf6" },
  subs: [
    { id: "kerekites", name: "Kerekítés", gen: kerekites },
    { id: "szomszed", name: "Számszomszédok", gen: szomszed },
    { id: "helyiertek", name: "Helyi érték", gen: helyiertek },
    { id: "szamkartya", name: "Számkártyák", gen: szamkartya },
    { id: "feltetelek", name: "Találd ki a számot", gen: feltetelek },
  ],
};
