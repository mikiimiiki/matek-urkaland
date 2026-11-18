// ===== T14 – Biztos, lehetséges, lehetetlen =====
// A felvételi mintái (2026-ban mindkét lapon!): húzás zsákból / kártyákból, letakart számjegyű kártyák,
// állítások életkorról. Minden esetben végigpróbáljuk az ÖSSZES lehetőséget: ha mindegyikben igaz → biztos,
// ha egyikben sem → lehetetlen, különben lehetséges, de nem biztos. A magyarázat példát és ellenpéldát mutat.
import { svg, circle, txt, rect, list, COLORS } from "../util.js";

const OPTS = ["biztos", "lehetséges, de nem biztos", "lehetetlen"];
const verdict = (all, ok) => { const n = all.filter(ok).length; return n === all.length ? 0 : n === 0 ? 2 : 1; };
const VERB = ["Mindegyik esetben igaz, ezért <b>biztos</b>.", "Van, amikor igaz, és van, amikor nem, ezért <b>lehetséges, de nem biztos</b>.", "Egyik esetben sem igaz, ezért <b>lehetetlen</b>."];
const pickAns = (rng, wanted, gen) => { for (let t = 0; t < 60; t++) { const g = gen(); if (g && (wanted === null || g.v === wanted)) return g; } return null; };

// ---- 1. Húzás zsákból ----
// a kihúzható „színösszetételek” (hány darab jön az egyes színekből)
function draws(counts, k) {
  const out = [];
  const rec = (i, left, cur) => { if (i === counts.length) { if (left === 0) out.push(cur.slice()); return; } for (let c = 0; c <= Math.min(counts[i], left); c++) { cur.push(c); rec(i + 1, left - c, cur); cur.pop(); } };
  rec(0, k, []);
  return out;
}
const THEMES = [
  { bag: "Egy zsákban golyók vannak", one: "golyó", acc: "golyót", cols: ["P", "K", "S", "Z"] },
  { bag: "Egy dobozban színes zoknik vannak", one: "zokni", acc: "zoknit", cols: ["P", "K", "F", "Z"] },
];
function huzas(rng, lvl) {
  const T = rng.pick(THEMES), m = lvl === 1 ? 2 : 3;
  const cols = rng.sample(T.cols, m), counts = cols.map(() => rng.int(lvl === 1 ? 1 : 2, lvl === 1 ? 4 : 5)), total = counts.reduce((a, b) => a + b, 0);
  const wanted = rng.int(0, 2);
  const g = pickAns(rng, wanted, () => {
    const k = rng.int(1, Math.min(total, lvl === 1 ? 4 : 7)), ci = rng.int(0, m - 1), c = COLORS[cols[ci]].n;
    const kinds = [
      { t: `lesz köztük ${c}`, ok: d => d[ci] > 0 },
      { t: `mind ${c} lesz`, ok: d => d[ci] === k },
      { t: `egyik sem lesz ${c}`, ok: d => d[ci] === 0 },
      ...(lvl >= 2 ? [{ t: "lesz köztük két egyforma színű", ok: d => d.some(x => x >= 2) }, { t: `mindegyik szín lesz köztük`, ok: d => d.every(x => x > 0) }] : []),
      ...(lvl === 3 ? [{ t: `több ${c} lesz köztük, mint bármilyen más színű`, ok: d => d.every((x, j) => j === ci || d[ci] > x) }] : []),
    ];
    const K = rng.pick(kinds), all = draws(counts, k), v = verdict(all, K.ok);
    return { k, K, all, v };
  });
  if (!g) return huzas(rng, lvl);
  const { k, K, all, v } = g;
  const show = d => d.map((x, j) => x ? `${x} ${COLORS[cols[j]].n}` : "").filter(Boolean).join(" + ");
  const yes = all.find(K.ok), no = all.find(d => !K.ok(d));
  let b = ""; let x = 14;
  cols.forEach((cc, j) => { for (let i = 0; i < counts[j]; i++) { b += circle(x, 20, 11, { fill: COLORS[cc].c, stroke: "#334155", sw: 1.5 }) + txt(x, 25, cc, { size: 11, w: 800, fill: ["S", "F", "Z"].includes(cc) ? "#1e293b" : "#fff" }); x += 26; } x += 10; });
  return {
    sub: "huzas",
    q: `${T.bag}: ${list(cols.map((cc, j) => `${counts[j]} ${COLORS[cc].n}`))}. Bekötött szemmel kihúzunk <b>${k}</b> ${T.acc}.<p>Állítás: <b>„${k} ${T.acc} húzva ${K.t}.”</b> Ez biztos, lehetséges vagy lehetetlen?</p>`,
    viz: svg(x, 40, b),
    ans: { kind: "choice", options: OPTS.slice(), value: v },
    hint: "Gondold végig a legrosszabb és a legjobb esetet! Ha még a legrosszabb esetben is igaz → biztos. Ha még a legjobb esetben sem → lehetetlen.",
    steps: [
      yes ? `Egy eset, amikor <b>igaz</b>: ${show(yes)}.` : `Nincs olyan húzás, amikor igaz lenne.`,
      no ? `Egy eset, amikor <b>nem igaz</b>: ${show(no)}.` : `Nincs olyan húzás, amikor ne lenne igaz – akármit húzunk, teljesül.`,
      VERB[v] + `<br>A válasz: <b class="big">${OPTS[v]}</b>`,
    ],
    why: i => v === 0 && i === 1 ? "Próbáld ki a legrosszabb esetet is – ha még akkor is igaz, akkor biztos!" : v === 1 && i === 0 ? `Van olyan húzás is, amikor nem igaz: ${show(no)}.` : v === 1 && i === 2 ? `Van olyan húzás, amikor igaz: ${show(yes)}.` : v === 2 && i === 1 ? "Keress egy esetet, amikor igaz – nem fogsz találni!" : null,
  };
}

// ---- 2. Letakart számjegyek ----
function fills(pattern) { // pattern: tömb, null = letakart számjegy
  const idx = pattern.map((d, i) => d === null ? i : -1).filter(i => i >= 0), out = [];
  const rec = (j, cur) => { if (j === idx.length) { if (cur[0] !== 0) out.push(Number(cur.join(""))); return; } for (let d = 0; d <= 9; d++) { cur[idx[j]] = d; rec(j + 1, cur); } };
  rec(0, pattern.slice());
  return out;
}
const showPat = p => p.map(d => d === null ? "□" : d).join(" ");
function kartya(rng, lvl) {
  const len = lvl === 1 ? 3 : 4, wanted = rng.int(0, 2);
  const g = pickAns(rng, wanted, () => {
    const mk = h => { const p = Array.from({ length: len }, (_, i) => rng.int(i === 0 ? 1 : 0, 9)); rng.sample([...Array(len).keys()], h).forEach(i => { p[i] = null; }); return p; };
    const kind = rng.pick(lvl === 1 ? ["paros", "kerekit", "nagyobb"] : ["osszehas", "kerekit", "paros", "legnagyobb"]);
    if (kind === "osszehas") {
      const A = mk(rng.int(1, 2)), B = mk(rng.int(1, 2)), fa = fills(A), fb = fills(B);
      if (fa.length * fb.length > 20000) return null;
      const pairs = []; fa.forEach(a => fb.forEach(b => pairs.push([a, b])));
      const v = verdict(pairs, ([a, b]) => a > b), y = pairs.find(([a, b]) => a > b), n = pairs.find(([a, b]) => !(a > b));
      return { v, t: `${showPat(A)} &nbsp;&gt;&nbsp; ${showPat(B)}`, yes: y && `${y[0]} > ${y[1]}`, no: n && `${n[0]} nem nagyobb, mint ${n[1]}` };
    }
    const P = mk(lvl === 1 ? 1 : rng.int(1, 2)), all = fills(P);
    if (!all.length) return null;
    if (kind === "paros") { const v = verdict(all, x => x % 2 === 0), y = all.find(x => x % 2 === 0), n = all.find(x => x % 2); return { v, t: `${showPat(P)} &nbsp;páros szám`, yes: y, no: n }; }
    if (kind === "nagyobb") { const L = rng.int(1, 9) * 10 ** (len - 1) + rng.int(0, 9) * 10 ** (len - 2); const v = verdict(all, x => x > L), y = all.find(x => x > L), n = all.find(x => x <= L); return { v, t: `${showPat(P)} &nbsp;&gt;&nbsp; ${L}`, yes: y, no: n }; }
    if (kind === "legnagyobb") { const M = 10 ** len - 1; const v = verdict(all, x => x === M); return { v, t: `${showPat(P)} &nbsp;a legnagyobb ${len === 4 ? "négy" : "három"}jegyű szám`, yes: all.includes(M) ? M : null, no: all.find(x => x !== M) }; }
    const p = len === 4 ? 100 : 10, R = Math.floor(all[rng.int(0, all.length - 1)] / p + rng.int(-1, 1) * 0.5 + 0.5) * p;
    const v = verdict(all, x => Math.floor((x + p / 2) / p) * p === R), y = all.find(x => Math.floor((x + p / 2) / p) * p === R), n = all.find(x => Math.floor((x + p / 2) / p) * p !== R);
    return { v, t: `${showPat(P)} &nbsp;${p === 100 ? "százasra" : "tízesre"} kerekített értéke ${R}`, yes: y, no: n };
  });
  if (!g) return kartya(rng, lvl);
  return {
    sub: "kartya",
    q: `Luca számokat írt a kártyákra, Dóri néhány számjegyet letakart (□). A letakart helyen bármelyik számjegy (0–9) lehet, de a szám nem kezdődhet 0-val.<div class="qbig" style="font-size:26px">${g.t}</div>Ez biztos, lehetséges vagy lehetetlen?`,
    ans: { kind: "choice", options: OPTS.slice(), value: g.v },
    hint: "Próbáld ki a letakart helyre a legkisebb (0) és a legnagyobb (9) számjegyet! Mi lesz akkor?",
    steps: [g.yes != null ? `Egy eset, amikor <b>igaz</b>: ${g.yes}.` : "Nincs olyan számjegy, amivel igaz lenne.", g.no != null ? `Egy eset, amikor <b>nem igaz</b>: ${g.no}.` : "Bármelyik számjegyet írjuk a □ helyére, mindig igaz.", VERB[g.v] + `<br>A válasz: <b class="big">${OPTS[g.v]}</b>`],
    why: () => null,
  };
}

// ---- 3. Életkor / sorrend részleges információból ----
function kor(rng, lvl) {
  const names = rng.sample(["Kristóf", "Ádám", "Samu", "Panni", "Zénó", "Lili"], lvl === 1 ? 3 : 4);
  const perms = a => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p]));
  const all = perms(names); // index 0 = legidősebb
  const wanted = rng.int(0, 2);
  for (let t = 0; t < 200; t++) {
    const sol = rng.pick(all), older = (a, b) => s => s.indexOf(a) < s.indexOf(b);
    const facts = [];
    for (let f = 0; f < (lvl === 1 ? 1 : 2); f++) { const [a, b] = rng.sample(names, 2); const [o, y] = sol.indexOf(a) < sol.indexOf(b) ? [a, b] : [b, a]; facts.push({ t: `${o} idősebb, mint ${y}.`, f: older(o, y) }); }
    const cons = all.filter(s => facts.every(F => F.f(s)));
    const [a, b] = rng.sample(names, 2);
    const v = verdict(cons, older(a, b));
    if (v !== wanted && t < 150) continue;
    const yes = cons.find(older(a, b)), no = cons.find(s => !older(a, b)(s));
    const ord = s => s.join(" > ");
    return {
      sub: "kor",
      q: `${list(names)} különböző idősek. Ezt tudjuk:<ul class="conds">${facts.map(F => `<li>${F.t}</li>`).join("")}</ul>Állítás: <b>„${a} idősebb, mint ${b}.”</b> Ez biztos, lehetséges vagy lehetetlen?`,
      ans: { kind: "choice", options: OPTS.slice(), value: v },
      hint: "Írd fel a lehetséges sorrendeket (a legidősebbtől a legfiatalabbig), amelyek megfelelnek az állításoknak! Mindegyikben igaz az állítás?",
      steps: [yes ? `Lehetséges sorrend, amikor <b>igaz</b>: ${ord(yes)}` : "Nincs olyan sorrend, amikor igaz lenne.", no ? `Lehetséges sorrend, amikor <b>nem igaz</b>: ${ord(no)}` : "Minden lehetséges sorrendben igaz.", VERB[v] + `<br>A válasz: <b class="big">${OPTS[v]}</b>`],
      why: () => null,
    };
  }
  return huzas(rng, lvl);
}

export default {
  id: "T14",
  name: "Biztos, lehetséges, lehetetlen",
  planet: { name: "Esély-üstökös", emoji: "🎯", color: "#f43f5e" },
  subs: [
    { id: "huzas", name: "Húzás", gen: huzas },
    { id: "kartya", name: "Letakart számjegyek", gen: kartya },
    { id: "kor", name: "Ki idősebb?", gen: kor },
  ],
};
