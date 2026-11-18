// ===== T6 – Kombinatorika: „Sorold fel az összes lehetőséget!” =====
// A felvételin 11 lapból 10-en szerepelt. A gyerek lehetőségeket „épít” (betűket kattint), és felírja
// az összeset – a rossz lehetőségért (a felvételihez hasonlóan) figyelmeztetést kap.
// Altípusok: választás (sorrend nem számít), sorba rendezés feltételekkel, öltöztetés (szorzási szabály),
// útvonalak egy ábrán, számok kártyákból, „hányféleképpen?” (csak a darabszám).
import { svg, txt, line, circle, COLORS, list, esc } from "../util.js";

// ---- Közös segédek ----
const C = k => ({ k, n: COLORS[k].n, c: COLORS[k].c });
const keyOf = (seq, ordered, items) => (ordered ? seq : seq.slice().sort((a, b) => items.findIndex(i => i.k === a) - items.findIndex(i => i.k === b))).join("-");
const show = seq => seq.join(" ");
function combos(arr, k) { const out = []; const rec = (s, cur) => { if (cur.length === k) return out.push(cur.slice()); for (let i = s; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); } }; rec(0, []); return out; }
function seqs(alpha, len) { let out = [[]]; for (let i = 0; i < len; i++) out = out.flatMap(s => alpha.map(a => [...s, a])); return out; }
const legend = items => items.map(i => `${i.c ? `<span class="dot" style="background:${i.c}"></span>` : ""}<b>${esc(i.k)}</b> = ${esc(i.n)}`).join(" &nbsp; ");
const chipsOf = (arr, cls = "") => arr.map(s => `<span class="chip ${cls}">${esc(show(s))}</span>`).join(" ");
const TIP = `<span class="soft">Felvételi tipp: dolgozz rendszerezetten – így semmi nem marad ki, és nem írsz fel semmit kétszer. A rossz lehetőségért pontlevonás jár!</span>`;

// Rendszerezett felsorolás csoportokban (az első elem szerint), a kizárt jelöltek áthúzva, indoklással
function groupedSteps(valid, rejected, groupLabel, depth = 1) {
  const groups = {};
  valid.forEach(s => { const g = s.slice(0, depth).join(" "); (groups[g] = groups[g] || []).push(s); });
  const g = Object.entries(groups).map(([k, arr]) => `<div style="margin:4px 0"><b>${groupLabel(k)}:</b> ${chipsOf(arr)}</div>`).join("");
  // a kizárt példák közül minden okból egyet mutatunk (ne négyszer ugyanazt)
  const seen = new Set(), pick = [];
  rejected.forEach(r => { if (!seen.has(r[1])) { seen.add(r[1]); pick.push(r); } });
  rejected.forEach(r => { if (pick.length < 4 && !pick.includes(r)) pick.push(r); });
  rejected = pick;
  const r = rejected.length ? `<div style="margin-top:8px">Ezek <b>nem jók</b>:<br>${rejected.slice(0, 4).map(([s, why]) => `<span class="chip" style="text-decoration:line-through;opacity:.7">${esc(show(s))}</span> <span class="soft small">– ${esc(why)}</span>`).join("<br>")}</div>` : "";
  return g + r;
}

// A "combos" válasz: lista a helyes lehetőségek kulcsaiból + a lehetőség-építőhöz szükséges adatok
function combosAns({ valid, ordered, items, slots, path }) {
  return { kind: "combos", value: valid.map(s => keyOf(s, ordered, items)), ordered, items, slots, path };
}
// Hibaelemzés: a felesleges (rossz) lehetőségeknél megmondjuk, melyik feltételt sérti
const whyCombos = (rules, ordered, items, validKeys) => entries => {
  const bad = entries.filter(e => !validKeys.includes(keyOf(e, ordered, items)));
  if (!bad.length) return null;
  return bad.slice(0, 3).map(e => { const r = rules.find(r => !r.ok(e)); return `${show(e)}: ${r ? r.why(e) : "ez nem jó lehetőség"}.`; }).join("<br>");
};

// ---- 1. Választás: k dolgot választunk n közül, a sorrend nem számít ----
const PICK_THEMES = [
  { intro: n => `Márton ${n} különböző színű labdával szeretne játszani.`, what: "labda", items: ["P", "K", "S", "Z", "L"].map(C) },
  { intro: n => `Zsuzsi a nyaralásra ${n} plüssállatot visz magával.`, what: "plüssállat", items: [{ k: "B", n: "Brumi" }, { k: "K", n: "Kanga" }, { k: "T", n: "Tigi" }, { k: "L", n: "Leó" }, { k: "M", n: "Morgó" }] },
  { intro: n => `Réka ${n} különböző társasjátékot visz a táborba.`, what: "társasjáték", items: [{ k: "M", n: "Monopoly" }, { k: "U", n: "Uno" }, { k: "G", n: "Gazdálkodj okosan!" }, { k: "D", n: "Dixit" }, { k: "H", n: "Hotel" }] },
  { intro: n => `Dani ${n} különböző gombóc fagyit kér egy tölcsérbe.`, what: "gombóc", items: [{ k: "Cs", n: "csoki" }, { k: "V", n: "vanília" }, { k: "E", n: "eper" }, { k: "P", n: "pisztácia" }, { k: "M", n: "mangó" }] },
];
const NUMW = { 2: "két", 3: "három", 4: "négy", 5: "öt" };
function valasztas(rng, lvl) {
  for (let t = 0; t < 50; t++) {
    const T = rng.pick(PICK_THEMES);
    const n = lvl === 1 ? 4 : 5, k = lvl === 1 ? 2 : rng.pick([2, 3]);
    const items = T.items.slice(0, n), keys = items.map(i => i.k);
    const rules = [];
    let extra = "";
    if (lvl >= 2 && k === 3) { // az egyik biztosan megy
      const must = rng.pick(keys);
      extra = `Az egyik biztosan <b>${items.find(i => i.k === must).n}</b> (${must}) lesz.`;
      rules.push({ ok: s => s.includes(must), why: () => `nincs benne ${items.find(i => i.k === must).n}, pedig az biztosan megy` });
    }
    if (lvl === 3) {
      if (rng.chance(0.5)) { // két dolog nem lehet együtt
        const [a, b] = rng.sample(keys, 2);
        const na = items.find(i => i.k === a).n;
        extra += ` ${na[0].toUpperCase() + na.slice(1)} (${a}) és ${items.find(i => i.k === b).n} (${b}) <b>nem</b> kerülhet egyszerre a választottak közé.`;
        rules.push({ ok: s => !(s.includes(a) && s.includes(b)), why: () => `${a} és ${b} együtt van benne, pedig az nem szabad` });
      } else { // egy csoportból legfeljebb egy
        const grp = rng.sample(keys, 3);
        extra += ` A(z) ${list(grp)} közül <b>legfeljebb egyet</b> választhat.`;
        rules.push({ ok: s => s.filter(x => grp.includes(x)).length <= 1, why: () => `${list(grp)} közül egynél több van benne` });
      }
    }
    const all = combos(keys, k);
    const valid = all.filter(s => rules.every(r => r.ok(s)));
    if (valid.length < 2 || valid.length > 10) continue;
    const rejected = all.filter(s => !rules.every(r => r.ok(s))).map(s => [s, rules.find(r => !r.ok(s)).why(s)]);
    const ans = combosAns({ valid, ordered: false, items, slots: Array.from({ length: k }, (_, i) => ({ label: `${i + 1}.`, opts: keys })) });
    rules.unshift({ ok: s => new Set(s).size === s.length, why: () => "egy dolgot kétszer választottál" });
    return {
      sub: "valasztas",
      q: `${T.intro(NUMW[k])} ${NUMW[n][0].toUpperCase() + NUMW[n].slice(1)} közül választhat. ${extra}<br><b>Írd fel az összes lehetőséget!</b> A sorrend nem számít (pl. ${keys[0]} ${keys[1]} ugyanaz, mint ${keys[1]} ${keys[0]}).<div class="soft small" style="margin-top:6px">${legend(items)}</div>`,
      ans,
      hint: `Rendszerezetten dolgozz: először írd fel az összeset, amiben ${keys[0]} benne van, aztán azokat, amikben ${keys[1]} van (de ${keys[0]} már nincs), és így tovább. Így semmi nem marad ki, és nem írsz fel semmit kétszer.`,
      steps: [
        `<b>Rendszerezett felsorolás:</b> az elsőnek választott dolog szerint csoportosítunk, és mindig csak a „későbbi” betűkkel párosítunk – így nem írunk fel semmit kétszer (${keys[1]} ${keys[0]} = ${keys[0]} ${keys[1]}).`,
        groupedSteps(valid, rejected, g => `${g} + …`),
        `Összesen <b class="big">${valid.length}</b> lehetőség.<br>${TIP}`,
      ],
      why: whyCombos(rules, false, items, ans.value),
    };
  }
  throw new Error("valasztas: nem sikerült feladatot készíteni");
}

// ---- 2. Sorba rendezés: tornyok, zászlók, sorban állás ----
function sorrend(rng, lvl) {
  for (let t = 0; t < 80; t++) {
    let items, len, rules = [], intro, slotLabel, fixed = null;
    if (lvl === 1) {
      const kids = rng.pick([[{ k: "A", n: "Anna" }, { k: "B", n: "Bori" }, { k: "Cs", n: "Csaba" }], [{ k: "D", n: "Dani" }, { k: "E", n: "Emma" }, { k: "F", n: "Fanni" }]]);
      if (rng.chance(0.5)) { items = kids; intro = `${list(items.map(i => i.n))} sorba áll a fényképhez.`; slotLabel = i => `${i + 1}. hely`; }
      else { items = rng.sample(["P", "K", "S", "Z", "L"], 3).map(C); intro = `Egy háromsávos zászlót színezünk ki. Mindhárom színt pontosan egyszer használjuk.`; slotLabel = i => ["felső", "középső", "alsó"][i]; }
      len = 3;
      rules.push({ ok: s => new Set(s).size === 3, why: () => "valami kétszer szerepel benne" });
    } else if (lvl === 2) {
      items = ["P", "K", "S"].map(C); len = 3; fixed = rng.pick(items).k;
      intro = `Peti ${items.map(i => i.n).join(", ")} kockákból 3 elemű tornyot épít. Legalul <b>${COLORS[fixed].n}</b> (${fixed}) kocka van, és a <b>szomszédos kockák különböző színűek</b>.`;
      slotLabel = i => ["alul", "középen", "felül"][i];
      rules.push({ ok: s => s[0] === fixed, why: () => `legalul nem ${COLORS[fixed].n} van` }, { ok: s => s.every((x, i) => i === 0 || x !== s[i - 1]), why: () => "két egyforma színű kocka kerül egymásra" });
    } else {
      if (rng.chance(0.5)) {
        items = ["P", "K", "S"].map(C); len = 4; fixed = rng.pick(items).k;
        intro = `Peti 4 elemű tornyot épít ${items.map(i => i.n).join(", ")} kockákból. Legalul <b>${COLORS[fixed].n}</b> (${fixed}) van, <b>minden szín szerepel</b>, és a <b>szomszédos kockák különböző színűek</b>.`;
        slotLabel = i => ["alul", "2.", "3.", "felül"][i];
        rules.push({ ok: s => s[0] === fixed, why: () => `legalul nem ${COLORS[fixed].n} van` }, { ok: s => s.every((x, i) => i === 0 || x !== s[i - 1]), why: () => "két egyforma színű kocka kerül egymásra" }, { ok: s => items.every(i => s.includes(i.k)), why: () => "nem szerepel benne minden szín" });
      } else {
        items = ["P", "L", "S", "Z"].map(C); len = 3;
        const [a, b] = rng.sample(items.map(i => i.k), 2);
        intro = `Háromsávos zászlót tervezünk a ${list(items.map(i => i.n))} színekből. Minden sáv más színű, és a <b>${COLORS[a].n} és a ${COLORS[b].n} nem szerepelhet egyszerre</b> egy zászlón.`;
        slotLabel = i => ["felső", "középső", "alsó"][i];
        rules.push({ ok: s => new Set(s).size === 3, why: () => "két sáv ugyanolyan színű" }, { ok: s => !(s.includes(a) && s.includes(b)), why: () => `${COLORS[a].n} és ${COLORS[b].n} egyszerre szerepel` });
        // a felső sáv színét megadjuk, hogy ne legyen túl sok lehetőség
        fixed = rng.pick(items.map(i => i.k).filter(k => k !== a && k !== b));
        intro += ` A felső sáv <b>${COLORS[fixed].n}</b>.`;
        rules.unshift({ ok: s => s[0] === fixed, why: () => `a felső sáv nem ${COLORS[fixed].n}` });
      }
    }
    const keys = items.map(i => i.k);
    const all = seqs(keys, len).filter(s => !fixed || s[0] === fixed);
    const valid = all.filter(s => rules.every(r => r.ok(s)));
    if (valid.length < 2 || valid.length > 10) continue;
    const rejected = all.filter(s => !rules.every(r => r.ok(s))).map(s => [s, rules.find(r => !r.ok(s)).why(s)]);
    const slots = Array.from({ length: len }, (_, i) => ({ label: slotLabel(i), opts: i === 0 && fixed ? [fixed] : keys }));
    const ans = combosAns({ valid, ordered: true, items, slots });
    return {
      sub: "sorrend",
      q: `${intro}<br><b>Sorold fel az összes lehetőséget!</b> Itt a sorrend számít.<div class="soft small" style="margin-top:6px">${legend(items)}</div>`,
      ans,
      hint: fixed ? "Az első helyet már tudod. Nézd végig sorban, mi kerülhet a második helyre, és mindegyikhez mi jöhet utána! (Ez egy „fa”: minden ág újabb ágakra bomlik.)" : `Rögzítsd az elsőt (pl. ${keys[0]}), és nézd meg, hányféleképpen folytatható. Aztán jöhet a következő kezdőbetű.`,
      steps: [
        `<b>Fa-módszer:</b> helyről helyre haladunk, és minden lépésnél csak azt írjuk tovább, ami megfelel a feltételeknek.`,
        groupedSteps(valid, rejected, g => `${g} …`, fixed ? 2 : 1),
        `Összesen <b class="big">${valid.length}</b> lehetőség.<br>${TIP}`,
      ],
      why: whyCombos(rules, true, items, ans.value),
    };
  }
  throw new Error("sorrend: nem sikerült feladatot készíteni");
}

// ---- 3. Öltöztetés / menü: minden kategóriából egyet (szorzási szabály) ----
const OUTFITS = [
  { intro: accs => `Sára ${list(accs)} vesz fel.`, cats: [["sapka", "egy sapkát", ["Z", "L"]], ["pulóver", "egy pulóvert", ["S", "F"]], ["nadrág", "egy nadrágot", ["P", "K"]]], color: true },
  { intro: accs => `Az ebédhez ${list(accs)} választunk.`, cats: [["leves", "egy levest", [["Gu", "gulyás"], ["Ba", "bableves"]]], ["főétel", "egy főételt", [["Pö", "pörkölt"], ["Ra", "rántott hús"], ["Tö", "töltött paprika"]]], ["desszert", "egy desszertet", [["Pa", "palacsinta"], ["Fa", "fagyi"]]]], color: false },
];
function oltoztetes(rng, lvl) {
  for (let t = 0; t < 50; t++) {
    const O = rng.pick(OUTFITS);
    let cats = O.cats.map(([name, acc, opts]) => ({ name, acc, items: opts.map(o => O.color ? C(o) : { k: o[0], n: o[1] }) }));
    if (lvl === 1) cats = cats.slice(0, 2).map(c => ({ ...c, items: c.items.slice(0, rng.int(2, 3)) }));
    else if (lvl === 2) cats = cats.map(c => ({ ...c, items: c.items.slice(0, 2) }));
    const items = cats.flatMap(c => c.items);
    const rules = [];
    let extra = "";
    if (lvl === 3) {
      const a = rng.pick(cats[0].items).k, b = rng.pick(cats[cats.length - 1].items).k;
      const na = items.find(i => i.k === a).n, nb = items.find(i => i.k === b).n;
      extra = `<br>Feltétel: <b>${na} (${a}) és ${nb} (${b}) nem kerülhet együtt.</b>`;
      rules.push({ ok: s => !(s.includes(a) && s.includes(b)), why: () => `${a} és ${b} együtt van, pedig azt nem szeretné` });
    }
    let all = [[]];
    cats.forEach(c => { all = all.flatMap(s => c.items.map(i => [...s, i.k])); });
    const valid = all.filter(s => rules.every(r => r.ok(s)));
    if (valid.length < 3 || valid.length > 10) continue;
    const rejected = all.filter(s => !rules.every(r => r.ok(s))).map(s => [s, rules.find(r => !r.ok(s)).why(s)]);
    const slots = cats.map(c => ({ label: c.name, opts: c.items.map(i => i.k) }));
    const ans = combosAns({ valid, ordered: true, items, slots });
    const prod = cats.map(c => c.items.length).join(" · ");
    return {
      sub: "oltoztetes",
      q: `${O.intro(cats.map(c => c.acc))} Ezekből lehet választani:<br>${cats.map(c => `<b>${c.name}:</b> ${c.items.map(i => `${i.c ? `<span class="dot" style="background:${i.c}"></span>` : ""}${i.n} (${i.k})`).join(", ")}`).join("<br>")}${extra}<br><b>Sorold fel az összes lehetőséget!</b>`,
      ans,
      hint: `Rögzítsd az első ${cats[0].name} választást, és nézd meg mellé az összes lehetőséget a többiből. Aztán jöhet a következő ${cats[0].name}.`,
      steps: [
        `<b>Szorzási szabály:</b> minden ${cats[0].name} mellé bármelyik ${cats[1].name} választható${cats[2] ? `, és mindegyik mellé bármelyik ${cats[2].name}` : ""}. Ez ${prod} = <b>${all.length}</b> lehetőség${rules.length ? " (még a feltétel nélkül)" : ""}.`,
        groupedSteps(valid, rejected, g => `${items.find(i => i.k === g).n} ${cats[0].name}`),
        `${rules.length ? `A tiltott párosítások nélkül: ${all.length} − ${rejected.length} = ` : "Összesen "}<b class="big">${valid.length}</b> lehetőség.<br>${TIP}`,
      ],
      why: whyCombos(rules, true, items, ans.value),
    };
  }
  throw new Error("oltoztetes: nem sikerült feladatot készíteni");
}

// ---- 4. Útvonalak egy ábrán (robot A-ból F-be a nyilak mentén) ----
const POS = { A: [40, 110], B: [160, 40], C: [160, 180], D: [300, 40], E: [300, 180], F: [420, 110] };
const CAND = [["A", "B"], ["A", "C"], ["B", "C"], ["B", "D"], ["B", "E"], ["C", "D"], ["C", "E"], ["D", "E"], ["D", "F"], ["E", "F"], ["C", "F"], ["B", "F"]];
function graphSvg(edges, hl = []) {
  let b = `<defs><marker id="ga" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ink)"/></marker><marker id="gah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ok)"/></marker></defs>`;
  edges.forEach(([u, v]) => {
    const [x1, y1] = POS[u], [x2, y2] = POS[v], d = Math.hypot(x2 - x1, y2 - y1), r = 22;
    const on = hl.some((x, i) => x === u && hl[i + 1] === v);
    b += line(x1 + (x2 - x1) * r / d, y1 + (y2 - y1) * r / d, x2 - (x2 - x1) * (r + 3) / d, y2 - (y2 - y1) * (r + 3) / d, { stroke: on ? "var(--ok)" : "var(--ink)", sw: on ? 4 : 2, extra: ` marker-end="url(#${on ? "gah" : "ga"})"` });
  });
  Object.entries(POS).forEach(([k, [x, y]]) => { b += circle(x, y, 20, { fill: k === "A" || k === "F" ? "var(--pri)" : "var(--card)", stroke: "var(--pri)", sw: 2.5 }) + txt(x, y + 6, k, { size: 17, w: 800, fill: k === "A" || k === "F" ? "#fff" : "var(--ink)" }); });
  return svg(460, 220, b);
}
function paths(edges) { const out = []; const rec = p => { const last = p[p.length - 1]; if (last === "F") return out.push(p); edges.filter(e => e[0] === last).forEach(e => rec([...p, e[1]])); }; rec(["A"]); return out; }
function utvonal(rng, lvl) {
  const [lo, hi] = lvl === 1 ? [3, 4] : lvl === 2 ? [4, 6] : [5, 8];
  for (let t = 0; t < 300; t++) {
    const edges = CAND.filter(() => rng.chance(lvl === 1 ? 0.45 : 0.6));
    const valid = paths(edges);
    if (valid.length < lo || valid.length > hi) continue;
    // minden csúcs legyen benne valamelyik úton (különben zavaró)
    if (!["B", "C", "D", "E"].every(k => valid.some(p => p.includes(k)))) continue;
    const items = Object.keys(POS).map(k => ({ k, n: "" }));
    const rules = [{ ok: s => s[0] === "A" && s[s.length - 1] === "F", why: () => "az útnak A-ból kell indulnia és F-be érkeznie" }, { ok: s => s.every((x, i) => i === 0 || edges.some(e => e[0] === s[i - 1] && e[1] === x)), why: s => { const i = s.findIndex((x, i) => i > 0 && !edges.some(e => e[0] === s[i - 1] && e[1] === x)); return `${s[i - 1]}-ből nem vezet nyíl ${s[i]}-be`; } }];
    const ans = combosAns({ valid, ordered: true, items, path: { start: "A", end: "F", edges, guided: lvl === 1 } });
    const ex = valid[0];
    return {
      sub: "utvonal",
      q: `Robot Robi az <b>A</b> állomásról az <b>F</b> állomásra szeretne eljutni, és csak a <b>nyilak irányában</b> haladhat. <b>Írd le az összes lehetséges utat!</b> (Pl. ${show(ex)})`,
      viz: graphSvg(edges),
      ans,
      hint: "Indulj A-ból, és nézd meg, hová vezet nyíl. Minden elágazásnál írd fel külön mindkét irányt, és kövesd végig F-ig!",
      steps: [
        `<b>Elágazásonként haladunk:</b> A-ból ${list(edges.filter(e => e[0] === "A").map(e => e[1]))} felé indulhatunk. Mindegyik irányt végigkövetjük F-ig.`,
        valid.map(p => `<div style="margin:2px 0">${graphSvg(edges, p).replace('style="max-width:460px"', 'style="max-width:150px"')} <b>${esc(show(p))}</b></div>`).join(""),
        `Összesen <b class="big">${valid.length}</b> út.<br>${TIP}`,
      ],
      why: whyCombos(rules, true, items, ans.value),
    };
  }
  throw new Error("utvonal: nem sikerült feladatot készíteni");
}

// ---- 5. Számok kártyákból ----
function kartyak(rng, lvl) {
  for (let t = 0; t < 100; t++) {
    const n = lvl === 3 ? 4 : 3;
    const cards = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], n);
    if (lvl === 1 && cards.includes(0)) continue;
    if (lvl >= 2 && !cards.includes(0) && rng.chance(0.6)) cards[0] = 0;
    let cond = null;
    if (lvl === 3 || (lvl === 2 && rng.chance(0.5))) cond = rng.pick([["páros", x => x % 2 === 0], ["páratlan", x => x % 2 === 1], ["500-nál nagyobb", x => x > 500], ["300-nál kisebb", x => x < 300]]);
    const all = [];
    for (const a of cards) for (const b of cards) for (const c of cards) { if (a === b || b === c || a === c) continue; all.push([a, b, c]); }
    const nums = all.filter(d => d[0] !== 0).map(d => d[0] * 100 + d[1] * 10 + d[2]);
    const valid = [...new Set(nums.filter(x => !cond || cond[1](x)))].sort((a, b) => a - b);
    if (valid.length < 2 || valid.length > 10) continue;
    const zeroLead = all.filter(d => d[0] === 0).map(d => d.join(""));
    const byH = {}; valid.forEach(v => { (byH[Math.floor(v / 100)] = byH[Math.floor(v / 100)] || []).push(v); });
    return {
      sub: "kartyak",
      q: `Ezekből a számkártyákból háromjegyű számokat rakunk ki: <b class="big">${cards.join(" &nbsp; ")}</b><br>Egy kártyát egy számban csak egyszer használhatunk.${cond ? ` Csak a <b>${cond[0]}</b> számok kellenek.` : ""}<br><b>Írd fel az összes ilyen számot!</b>`,
      ans: { kind: "numset", value: valid },
      hint: `Rendezd a százasok helyén álló számjegy szerint: először a legkisebb lehetséges kezdő számjeggyel írd fel az összeset, aztán jöhet a következő.${cards.includes(0) ? " A 0 nem állhat elöl!" : ""}`,
      steps: [
        `<b>Százasok szerint csoportosítunk.</b>${cards.includes(0) ? " A 0 nem állhat a szám elején (akkor nem lenne háromjegyű" + (zeroLead.length ? `, pl. ${zeroLead[0]}` : "") + ")." : ""}${cond ? ` Csak a ${cond[0]} számokat tartjuk meg.` : ""}`,
        Object.entries(byH).map(([h, arr]) => `<div style="margin:3px 0"><b>${h}-${h === "1" || h === "2" || h === "4" || h === "7" || h === "9" ? "es" : h === "5" ? "ös" : h === "6" ? "os" : "as"} kezdetű:</b> ${arr.map(v => `<span class="chip">${v}</span>`).join(" ")}</div>`).join(""),
        `Összesen <b class="big">${valid.length}</b> szám.<br>${TIP}`,
      ],
      why: vs => {
        const bad = vs.filter(v => !valid.includes(v));
        if (!bad.length) return null;
        return bad.slice(0, 3).map(v => {
          const d = String(v).split("").map(Number), pool = cards.slice();
          if (d.length !== 3) return `${v}: nem háromjegyű.`;
          for (const x of d) { const i = pool.indexOf(x); if (i < 0) return `${v}: olyan számjegy van benne, ami nincs a kártyák között (vagy egy kártyát kétszer használtál).`; pool.splice(i, 1); }
          return `${v}: nem ${cond ? cond[0] : "jó"}.`;
        }).join("<br>");
      },
    };
  }
  throw new Error("kartyak: nem sikerült feladatot készíteni");
}

// ---- 6. Hányféleképpen? (csak a darabszám) ----
function hanyfele(rng, lvl) {
  const kind = lvl === 1 ? "szorzas" : rng.pick(["szorzas", "szorzas3", "merkozes"]);
  if (kind === "merkozes") {
    const n = rng.int(4, lvl === 3 ? 8 : 6), ans = n * (n - 1) / 2;
    const names = "ABCDEFGH".slice(0, n).split("");
    return {
      sub: "hanyfele",
      q: `Egy bajnokságon <b>${n} csapat</b> vesz részt. Minden csapat <b>mindegyik másikkal pontosan egyszer</b> játszik. <b>Hány mérkőzést játszanak összesen?</b>`,
      ans: { kind: "num", value: ans, unit: "mérkőzés" },
      hint: "Minden csapat hány másik ellen játszik? Vigyázz: az A–B és a B–A ugyanaz a mérkőzés!",
      steps: [
        `Írjuk fel rendszerezetten! Az <b>A</b> csapat ${n - 1} ellenfele: ${names.slice(1).map(x => "A–" + x).join(", ")}.`,
        names.slice(0, -1).map((a, i) => `${a}: ${names.slice(i + 1).map(b => `<span class="chip">${a}–${b}</span>`).join(" ")} → <b>${n - 1 - i}</b>`).join("<br>") + `<br><span class="soft">A B–A meccset már nem írjuk fel újra, mert az ugyanaz, mint az A–B.</span>`,
        `${Array.from({ length: n - 1 }, (_, i) => n - 1 - i).join(" + ")} = <b class="big">${ans}</b> mérkőzés`,
      ],
      why: v => v === n * (n - 1) ? "Minden meccset kétszer számoltál (A–B és B–A ugyanaz)! Ezért a felét kell venni." : v === n * n ? "Egy csapat nem játszik saját magával, és az A–B ugyanaz, mint a B–A." : null,
    };
  }
  const sets = kind === "szorzas3"
    ? [["sapka", rng.int(2, 3)], ["sál", rng.int(2, 3)], ["kesztyű", rng.int(2, 3)]]
    : rng.pick([[["póló", rng.int(3, 5)], ["nadrág", rng.int(2, 4)]], [["leves", rng.int(2, 4)], ["főétel", rng.int(3, 5)]], [["fagyi íz", rng.int(3, 6)], ["tölcsér", rng.int(2, 3)]]]);
  const ans = sets.reduce((a, s) => a * s[1], 1);
  const sum = sets.reduce((a, s) => a + s[1], 0);
  let grid = "";
  if (sets.length === 2) {
    const [a, b] = sets, W = 46 * b[1] + 90, H = 30 * a[1] + 40;
    let g = txt(10, 22, `${a[0]} \\ ${b[0]}`, { size: 11, a: "start", fill: "var(--soft)" });
    for (let j = 0; j < b[1]; j++) g += txt(110 + j * 46, 24, `${j + 1}.`, { size: 13 });
    for (let i = 0; i < a[1]; i++) { g += txt(40, 52 + i * 30, `${i + 1}.`, { size: 13 }); for (let j = 0; j < b[1]; j++) g += circle(110 + j * 46, 47 + i * 30, 9, { fill: "var(--pri2)" }); }
    grid = svg(W, H, g);
  }
  return {
    sub: "hanyfele",
    q: `${sets.map(s => `${s[1]} féle <b>${s[0]}</b>`).join(", ").replace(/, ([^,]*)$/, " és $1")} közül választhatunk, mindegyikből <b>pontosan egyet</b>. <b>Hányféleképpen választhatunk?</b>`,
    ans: { kind: "num", value: ans, unit: "féle" },
    hint: `Vegyél egy ${sets[0][0]}${sets[0][0] === "sapka" ? "" : ""}t: hány ${sets[1][0]} mehet mellé? És a következő mellé? Rajzolj táblázatot vagy fát!`.replace("sapkat", "sapkát").replace("fagyi ízt", "fagyi ízt"),
    steps: [
      `Minden ${sets[0][0]} mellé <b>bármelyik</b> ${sets[1][0]} választható${sets[2] ? `, és mindegyik pár mellé bármelyik ${sets[2][0]}` : ""}.` + grid,
      `Ezért <b>szorozni</b> kell (nem összeadni): ${sets.map(s => s[1]).join(" · ")} = <b class="big">${ans}</b>`,
    ],
    why: v => v === sum ? "Összeadtad a lehetőségeket – de minden választás mellé az összes többi párosítható, ezért szorozni kell!" : null,
  };
}

export default {
  id: "T6",
  name: "Kombinatorika",
  planet: { name: "Kombi-kisbolygó", emoji: "🎲", color: "#f97316" },
  subs: [
    { id: "valasztas", name: "Válassz ki néhányat", gen: valasztas },
    { id: "sorrend", name: "Sorba rendezés", gen: sorrend },
    { id: "oltoztetes", name: "Öltöztetés, menü", gen: oltoztetes },
    { id: "utvonal", name: "Útvonalak", gen: utvonal },
    { id: "kartyak", name: "Számok kártyákból", gen: kartyak },
    { id: "hanyfele", name: "Hányféleképpen?", gen: hanyfele },
  ],
};
