// ===== T2 – Műveletek =====
// A felvételi mintái: műveleti sorrend (zárójel, szorzás/osztás előbb, azonos szinten balról jobbra),
// műveletek szövegesen („Mennyivel kevesebb…”, „Hányszorosa…”, „kétszeresénél 30-cal több”),
// a műveletek tagjainak neve (kisebbítendő, osztandó…), számpiramis, fejszámolási fogások.
import { fmt, svg, txt, rect, numVal, article, Az } from "../util.js";

// ---- Kifejezések: kis elemző + lépésenkénti kiértékelés ----
// Jelölés a sablonokban: + − · : ( ) és a, b, c… betűk a számok helyén
function parse(src) {
  const toks = src.match(/\d+|[a-z]|[+\-−·:()]/g).map(t => t === "-" ? "−" : t);
  let i = 0;
  const peek = () => toks[i], next = () => toks[i++];
  function atom() {
    const t = next();
    if (t === "(") { const e = expr(); next(); return { ...e, paren: true }; }
    return { num: t };
  }
  function term() { let l = atom(); while (peek() === "·" || peek() === ":") { const op = next(); l = { op, l, r: atom() }; } return l; }
  function expr() { let l = term(); while (peek() === "+" || peek() === "−") { const op = next(); l = { op, l, r: term() }; } return l; }
  return expr();
}
const isNum = n => n.v !== undefined;
const apply = (op, a, b) => op === "+" ? a + b : op === "−" ? a - b : op === "·" ? a * b : (b && a % b === 0 ? a / b : NaN);
const OPN = { "+": "összeadás", "−": "kivonás", "·": "szorzás", ":": "osztás" };
// betűk helyére számok
function fill(n, vals) { if (n.num !== undefined) return { v: vals[n.num] ?? Number(n.num) }; return { op: n.op, l: fill(n.l, vals), r: fill(n.r, vals), paren: n.paren }; }
function show(n, hl) {
  if (isNum(n)) return fmt(n.v);
  const s = `${show(n.l, hl)} ${n.op} ${show(n.r, hl)}`;
  const t = n === hl ? `<u style="text-decoration-color:var(--pri);text-decoration-thickness:3px">${s}</u>` : s;
  return n.paren ? `(${t})` : t;
}
const plainShow = n => show(n).replace(/<[^>]+>/g, "");
// a következő elvégzendő művelet: a bal szélső olyan csúcs, amelynek mindkét gyereke már szám
function nextNode(n) { if (isNum(n)) return null; if (isNum(n.l) && isNum(n.r)) return n; return nextNode(n.l) || nextNode(n.r); }
function reduce(n, target, value) { if (n === target) return { v: value }; if (isNum(n)) return n; return { ...n, l: reduce(n.l, target, value), r: reduce(n.r, target, value) }; }
// teljes kiértékelés lépésekkel; null, ha valamelyik részeredmény nem egész vagy negatív
function evaluate(ast) {
  const steps = [];
  let cur = ast;
  while (!isNum(cur)) {
    const t = nextNode(cur), v = apply(t.op, t.l.v, t.r.v);
    if (!Number.isInteger(v) || v < 0 || v > 100000) return null;
    // fejben/papíron is számolható maradjon (mint a felvételin): szorzásnál az egyik tényező legfeljebb 10,
    // osztásnál az osztó vagy a hányados legfeljebb 10
    if (t.op === "·" && Math.min(t.l.v, t.r.v) > 10) return null;
    if (t.op === ":" && t.r.v > 10 && v > 10) return null;
    steps.push({ before: show(cur, t), op: t.op, calc: `${fmt(t.l.v)} ${t.op} ${fmt(t.r.v)} = ${fmt(v)}`, inParen: !!t.paren });
    cur = reduce(cur, t, v);
  }
  return { value: cur.v, steps };
}
// tipikus hiba: a zárójelet figyelembe veszi, de egyébként balról jobbra számol (nem végzi el előbb a szorzást)
function naive(n) {
  const flat = [];
  (function walk(x) { if (isNum(x)) return flat.push(x.v); if (x.paren) return flat.push(naive({ ...x, paren: false })); walk(x.l); flat.push(x.op); walk(x.r); })(n);
  let acc = flat[0];
  for (let i = 1; i < flat.length; i += 2) acc = apply(flat[i], acc, flat[i + 1]);
  return acc;
}

const TEMPLATES = {
  1: ["a + b · c", "a − b · c", "a · b + c", "a : b + c", "a + b : c", "a − b : c", "a · b − c"],
  2: ["(a + b) · c", "(a − b) · c", "a · (b − c)", "(a + b) : c", "a − (b + c)", "a + b · c − d", "a : b · c", "a − b · (c − d)"],
  3: ["(a − b) : (c + d · e)", "a − b · (c − d)", "(a − b · c) · d + e", "a · b + c · d", "(a + b · c) : d", "a − b : c · d", "(a · b − c) : d"],
};
function rngVals(rng, letters, lvl) {
  const o = {};
  letters.forEach(L => { o[L] = rng.chance(0.3) ? rng.int(1, 9) * 10 : rng.int(2, lvl === 1 ? 50 : lvl === 2 ? 99 : 160); });
  return o;
}
function sorrend(rng, lvl) {
  for (let t = 0; t < 2000; t++) {
    const tpl = rng.pick(TEMPLATES[lvl]), ast0 = parse(tpl);
    const letters = [...new Set(tpl.match(/[a-z]/g))];
    const vals = rngVals(rng, letters, lvl);
    // osztásnál kisebb osztó, hogy legyen esély az egész eredményre
    tpl.replace(/: ?\(?([a-z])/g, (m, L) => { vals[L] = rng.int(2, 9); });
    tpl.replace(/· ?\(?([a-z])/g, (m, L) => { if (lvl < 3 || rng.chance(0.5)) vals[L] = rng.int(2, 9); });
    const ast = fill(ast0, vals), ev = evaluate(ast);
    if (!ev || ev.steps.length < 2) continue;
    const nv = naive(ast);
    const hasMul = /[·:]/.test(tpl) && /[+−]/.test(tpl);
    return {
      sub: "sorrend",
      q: `Végezd el a műveleteket! Figyelj a műveleti sorrendre!<div class="qbig">${plainShow(ast)} = ?</div>`,
      ans: { kind: "num", value: ev.value },
      hint: "Műveleti sorrend: 1. a zárójelben lévő műveletek; 2. szorzás és osztás (balról jobbra); 3. összeadás és kivonás (balról jobbra).",
      steps: [
        `<b>A műveleti sorrend:</b> 1. zárójel → 2. szorzás, osztás → 3. összeadás, kivonás. Azonos szinten balról jobbra haladunk.`,
        ev.steps.map(s => `${s.before}<br><span class="soft">${s.inParen ? "zárójel: " : ""}${OPN[s.op]}:</span> <b>${s.calc}</b>`).join(`<div style="margin:6px 0;border-top:1px dashed var(--line)"></div>`),
        `Az eredmény: <b class="big">${fmt(ev.value)}</b>`,
      ],
      why: v => v === nv && nv !== ev.value && hasMul ? "Balról jobbra számoltál – de a szorzást és az osztást előbb kell elvégezni, mint az összeadást és a kivonást!" : null,
    };
  }
  throw new Error("sorrend: nem sikerült feladatot készíteni");
}

// ---- Műveletek szövegesen ----
// -nál/-nél, -nak/-nek a kiejtett szám végződése szerint
function nal(n) {
  const back = n % 1000 === 0 ? false : n % 100 === 0 ? true : n % 10 === 0 ? [false, false, true, true, false, false, true, false, true, false][Math.floor(n / 10) % 10] : [false, false, false, true, false, false, true, false, true, false][n % 10];
  return back ? "nál" : "nél";
}
const NAK = n => nal(n) === "nál" ? "nak" : "nek";
const FR = [["fele", 2], ["harmada", 3], ["negyede", 4], ["ötöde", 5], ["tizede", 10]];
const FR_ACC = { fele: "felét", harmada: "harmadát", negyede: "negyedét", ötöde: "ötödét", tizede: "tizedét" };
const FR_NEK = { fele: "felének", harmada: "harmadának", negyede: "negyedének", ötöde: "ötödének", tizede: "tizedének" };
const MU = [["kétszerese", 2], ["háromszorosa", 3], ["négyszerese", 4], ["ötszöröse", 5]];
const MUN = { 2: "kétszeresénél", 3: "háromszorosánál", 4: "négyszeresénél", 5: "ötszörösénél" };
const FRN = { 2: "felénél", 3: "harmadánál", 4: "negyedénél", 5: "ötödénél", 10: "tizedénél" };
function szoveges(rng, lvl) {
  const kinds = lvl === 1 ? ["kevesebb", "tobb", "fele", "szerese"] : lvl === 2 ? ["kevesebb", "amelynel", "hanyszoros", "fele", "kombi"] : ["amelynel", "hanyszoros", "kombi", "kombi2", "kevesebb"];
  const k = rng.pick(kinds);
  if (k === "kevesebb" || k === "tobb") {
    const B = rng.int(lvl === 1 ? 50 : 200, lvl === 1 ? 300 : 2000), A = rng.int(10, B - 5);
    const q = k === "kevesebb" ? `Mennyivel kevesebb ${article(A)} ${fmt(A)} ${article(B)} ${fmt(B)}-${nal(B)}?` : `Mennyivel több ${article(B)} ${fmt(B)} ${article(A)} ${fmt(A)}-${nal(A)}?`;
    return {
      sub: "szoveges", q: `<div class="qbig" style="font-size:24px">${q}</div>`, ans: { kind: "num", value: B - A },
      hint: "A „mennyivel kevesebb/több” a két szám különbségét kérdezi: a nagyobból vond ki a kisebbet!",
      steps: [`„Mennyivel ${k === "kevesebb" ? "kevesebb" : "több"}” → <b>különbség</b>: a nagyobb számból kivonjuk a kisebbet.`, `${fmt(B)} − ${fmt(A)} = <b class="big">${fmt(B - A)}</b>`],
      why: v => v === A + B ? "Itt nem összeadni kell: a „mennyivel kevesebb/több” különbséget kérdez." : null,
    };
  }
  if (k === "amelynel") {
    const X = rng.int(20, lvl === 3 ? 900 : 300), d = rng.int(5, 99), less = rng.chance(0.5);
    const ans = less ? X + d : X - d;
    if (ans <= 0) return szoveges(rng, lvl);
    return {
      sub: "szoveges", q: `<div class="qbig" style="font-size:24px">Melyik az a szám, amelynél ${numVal(d)} ${less ? "kevesebb" : "több"} ${article(X)} ${fmt(X)}?</div>`, ans: { kind: "num", value: ans },
      hint: `Olvasd el lassan: ${article(X)} ${fmt(X)} ${less ? "kevesebb" : "több"}, mint a keresett szám. Akkor a keresett szám ${less ? "nagyobb" : "kisebb"}!`,
      steps: [`A mondat szerint: <b>keresett szám ${less ? "−" : "+"} ${d} = ${fmt(X)}</b>. ${Az(X)} ${fmt(X)} ${less ? "kevesebb" : "több"}, tehát a keresett szám ${less ? "nagyobb" : "kisebb"}.`, `${fmt(X)} ${less ? "+" : "−"} ${d} = <b class="big">${fmt(ans)}</b><br><span class="soft">Ellenőrzés: ${fmt(ans)} ${less ? "−" : "+"} ${d} = ${fmt(X)} ✔</span>`],
      why: v => v === (less ? X - d : X + d) ? "Fordítva számoltál! Olvasd el újra: melyik a kisebb, a megadott szám vagy a keresett?" : null,
    };
  }
  if (k === "hanyszoros") {
    const A = rng.int(2, 30) * (lvl === 3 ? 10 : 1), m = rng.int(2, 9), B = A * m;
    return {
      sub: "szoveges", q: `<div class="qbig" style="font-size:24px">Hányszorosa ${article(B)} ${fmt(B)} ${article(A)} ${fmt(A)}-${NAK(A)}?</div>`, ans: { kind: "num", value: m },
      hint: "A „hányszorosa” azt kérdezi, hányszor van meg a kisebb szám a nagyobban → osztás.",
      steps: [`Hányszor van meg ${article(A)} ${fmt(A)} ${article(B)} ${fmt(B)} számban? → <b>osztás</b>`, `${fmt(B)} : ${fmt(A)} = <b class="big">${m}</b> → ${fmt(B)} = ${m} · ${fmt(A)}`],
      why: v => v === B - A ? "A „hányszorosa” nem különbséget kérdez – osztani kell!" : null,
    };
  }
  if (k === "fele" || k === "szerese") {
    const [w, d] = k === "fele" ? rng.pick(lvl === 1 ? FR.slice(0, 2) : FR) : rng.pick(MU);
    const X = k === "fele" ? rng.int(5, 200) * d : rng.int(10, 300), ans = k === "fele" ? X / d : X * d;
    return {
      sub: "szoveges", q: `<div class="qbig" style="font-size:24px">Mennyi ${article(X)} ${fmt(X)} ${w}?</div>`, ans: { kind: "num", value: ans },
      hint: k === "fele" ? `A „${w}” azt jelenti: ${d} egyenlő részre osztjuk.` : `A „${w}” azt jelenti: ${d}-szer annyi → szorzás.`.replace(/(\d)-szer/, (m, x) => ({ 2: "kétszer", 3: "háromszor", 4: "négyszer", 5: "ötször" }[x])),
      steps: [`${fmt(X)} ${k === "fele" ? ":" : "·"} ${d} = <b class="big">${fmt(ans)}</b>`],
      why: v => (k === "fele" && v === X * d) || (k !== "fele" && v === X / d) ? "Fordítva: a „fele, harmada…” osztás, a „kétszerese, háromszorosa…” szorzás." : null,
    };
  }
  // kombinált: „200 kétszeresénél 30-cal több”, „160 felének a háromszorosa”
  if (k === "kombi") {
    // a levonandó mindig kisebb, mint a szorzat (ne legyen negatív eredmény)
    const m = rng.int(2, 5), X = rng.int(10, 300), more = rng.chance(0.6), d = rng.int(5, Math.min(90, X * m - 1));
    const ans = more ? X * m + d : X * m - d;
    return {
      sub: "szoveges", q: `<div class="qbig" style="font-size:24px">Mennyi az a szám, amely ${article(X)} ${fmt(X)} ${MUN[m]} ${numVal(d)} ${more ? "több" : "kevesebb"}?</div>`, ans: { kind: "num", value: ans },
      hint: "Két lépésben: először számold ki a „…szörösét”, aztán adj hozzá vagy vegyél el belőle.",
      steps: [`Először: ${fmt(X)} · ${m} = <b>${fmt(X * m)}</b>`, `Aztán ${more ? "hozzáadunk" : "elveszünk"} ${d}-${more ? "et" : "et"}`.replace(/ \d+-et$/, ":") + ` ${fmt(X * m)} ${more ? "+" : "−"} ${d} = <b class="big">${fmt(ans)}</b>`],
      why: v => v === (X + (more ? d : -d)) * m ? "Előbb a szorzás jön (a „…szöröse”), csak utána az összeadás/kivonás!" : v === X * m ? `Ne felejtsd el a ${more ? "hozzáadást" : "kivonást"} (${d}) sem!` : null,
    };
  }
  const [w, dd] = rng.pick(FR.slice(0, 4)), m = rng.int(2, 5), X = rng.int(4, 100) * dd, ans = X / dd * m;
  return {
    sub: "szoveges", q: `<div class="qbig" style="font-size:24px">Mennyi ${article(X)} ${fmt(X)} ${FR_NEK[w]} a ${MU.find(x => x[1] === m)[0]}?</div>`, ans: { kind: "num", value: ans },
    hint: "Két lépésben, sorban: először a rész (osztás), aztán a „…szöröse” (szorzás).",
    steps: [`Először ${article(X)} ${fmt(X)} ${w}: ${fmt(X)} : ${dd} = <b>${fmt(X / dd)}</b>`, `Aztán ennek a ${MU.find(x => x[1] === m)[0]}: ${fmt(X / dd)} · ${m} = <b class="big">${fmt(ans)}</b>`],
    why: v => v === X * m ? `Ne felejtsd el előbb kiszámolni ${article(X)} ${fmt(X)} ${FR_ACC[w]}!` : null,
  };
}

// ---- A műveletek tagjainak neve, hiányzó tag ----
function tagok(rng, lvl) {
  const k = rng.pick(lvl === 1 ? ["kisebbitendo", "kivonando", "osszeadando", "box"] : ["kisebbitendo", "kivonando", "osszeadando", "tenyezo", "osztando", "oszto", "box"]);
  if (k === "box") {
    const op = rng.pick(lvl === 1 ? ["+", "−"] : ["+", "−", "·", ":"]), pos = rng.int(0, 1);
    let a, b, c;
    if (op === "+") { a = rng.int(10, 500); b = rng.int(10, 500); c = a + b; }
    else if (op === "−") { c = rng.int(5, 400); b = rng.int(5, 400); a = b + c; }
    else if (op === "·") { a = rng.int(2, 9); b = rng.int(2, 30); c = a * b; }
    else { b = rng.int(2, 9); c = rng.int(2, 40); a = b * c; }
    const ans = pos === 0 ? a : b;
    const eq = pos === 0 ? `□ ${op} ${fmt(b)} = ${fmt(c)}` : `${fmt(a)} ${op} □ = ${fmt(c)}`;
    const inv = pos === 0 ? { "+": `${fmt(c)} − ${fmt(b)}`, "−": `${fmt(c)} + ${fmt(b)}`, "·": `${fmt(c)} : ${fmt(b)}`, ":": `${fmt(c)} · ${fmt(b)}` }[op] : { "+": `${fmt(c)} − ${fmt(a)}`, "−": `${fmt(a)} − ${fmt(c)}`, "·": `${fmt(c)} : ${fmt(a)}`, ":": `${fmt(a)} : ${fmt(c)}` }[op];
    return {
      sub: "tagok", q: `Melyik szám kerül a <b>□</b> helyére?<div class="qbig">${eq}</div>`, ans: { kind: "num", value: ans },
      hint: "Gondolj a fordított műveletre! Például ha □ + 5 = 12, akkor □ = 12 − 5.",
      steps: [`A fordított művelettel: □ = ${inv} = <b class="big">${fmt(ans)}</b>`, `Ellenőrzés: ${eq.replace("□", fmt(ans))} ✔`],
      why: v => (op === "+" && v === b + c) || (op === "·" && v === b * c) ? "Fordított művelet kell: összeadás helyett kivonás, szorzás helyett osztás." : (op === "−" && pos === 0 && v === c - b) ? "Az ismeretlenből vontunk ki – vissza kell adni: □ = különbség + kivonandó." : null,
    };
  }
  const T = {
    kisebbitendo: () => { const s = rng.int(5, 900), d = rng.int(5, 900); return { q: `Mennyi a <b>kisebbítendő</b>, ha a kivonandó ${fmt(s)}, a különbség pedig ${fmt(d)}?`, ans: s + d, eq: `? − ${fmt(s)} = ${fmt(d)}`, calc: `${fmt(d)} + ${fmt(s)} = ${fmt(s + d)}`, bad: Math.abs(d - s), badMsg: "A kisebbítendőt nem kivonással kapjuk: kisebbítendő = különbség + kivonandó." }; },
    kivonando: () => { const s = rng.int(5, 900), d = rng.int(5, 900); return { q: `Mennyi a <b>kivonandó</b>, ha a kisebbítendő ${fmt(s + d)}, a különbség pedig ${fmt(d)}?`, ans: s, eq: `${fmt(s + d)} − ? = ${fmt(d)}`, calc: `${fmt(s + d)} − ${fmt(d)} = ${fmt(s)}`, bad: s + 2 * d, badMsg: "A kivonandót kivonással kapjuk: kisebbítendő − különbség." }; },
    osszeadando: () => { const a = rng.int(5, 900), b = rng.int(5, 900); return { q: `Az <b>összeg</b> ${fmt(a + b)}, az egyik <b>összeadandó</b> ${fmt(a)}. Mennyi a másik összeadandó?`, ans: b, eq: `${fmt(a)} + ? = ${fmt(a + b)}`, calc: `${fmt(a + b)} − ${fmt(a)} = ${fmt(b)}`, bad: 2 * a + b, badMsg: "A hiányzó összeadandót kivonással kapjuk: összeg − a másik összeadandó." }; },
    tenyezo: () => { const a = rng.int(2, 9), b = rng.int(3, 60); return { q: `A <b>szorzat</b> ${fmt(a * b)}, az egyik <b>tényező</b> ${a}. Mennyi a másik tényező?`, ans: b, eq: `${a} · ? = ${fmt(a * b)}`, calc: `${fmt(a * b)} : ${a} = ${fmt(b)}`, bad: a * a * b, badMsg: "A hiányzó tényezőt osztással kapjuk: szorzat : a másik tényező." }; },
    osztando: () => { const b = rng.int(2, 9), q = rng.int(3, 80); return { q: `Mennyi az <b>osztandó</b>, ha az osztó ${b}, a hányados pedig ${q}?`, ans: b * q, eq: `? : ${b} = ${q}`, calc: `${q} · ${b} = ${fmt(b * q)}`, bad: Math.floor(q / b), badMsg: "Az osztandót szorzással kapjuk: hányados · osztó." }; },
    oszto: () => { const b = rng.int(2, 9), q = rng.int(3, 80); return { q: `Mennyi az <b>osztó</b>, ha az osztandó ${fmt(b * q)}, a hányados pedig ${q}?`, ans: b, eq: `${fmt(b * q)} : ? = ${q}`, calc: `${fmt(b * q)} : ${q} = ${b}`, bad: b * q * q, badMsg: "Az osztót osztással kapjuk: osztandó : hányados." }; },
  }[k]();
  return {
    sub: "tagok", q: T.q, ans: { kind: "num", value: T.ans },
    hint: "Írd fel a műveletet kérdőjellel (pl. ? − 8 = 526), és gondolj a fordított műveletre!",
    steps: [`Írjuk fel: <b>${T.eq}</b>`, `A fordított művelettel: ${T.calc}`, `<b class="big">${fmt(T.ans)}</b><br><span class="soft">Ellenőrzés: ${T.eq.replace("?", fmt(T.ans))} ✔</span>`],
    why: v => v === T.bad ? T.badMsg : null,
  };
}

// ---- Számpiramis: minden szám a közvetlenül alatta lévő kettő összege ----
function piramis(rng, lvl) {
  const n = lvl === 1 ? 3 : 4;
  const base = Array.from({ length: n }, () => rng.int(lvl === 1 ? 2 : 10, lvl === 1 ? 40 : 150));
  const rows = [base];
  while (rows[rows.length - 1].length > 1) { const r = rows[rows.length - 1]; rows.push(r.slice(1).map((x, i) => r[i] + x)); }
  // melyik cella hiányzik: 1. szinten fentebb (összeadás), később alul is (kivonás)
  const cells = [];
  rows.forEach((r, ri) => r.forEach((_, ci) => cells.push([ri, ci])));
  const cand = lvl === 1 ? cells.filter(([ri]) => ri > 0) : cells;
  const [ri, ci] = rng.pick(cand), ans = rows[ri][ci];
  // a megoldáshoz szükséges szomszédok
  const how = ri > 0 ? `${fmt(rows[ri - 1][ci])} + ${fmt(rows[ri - 1][ci + 1])} = ${fmt(ans)} (a két alatta lévő szám összege)`
    : ci < rows[1].length ? `${fmt(rows[1][ci])} − ${fmt(rows[0][ci + 1])} = ${fmt(ans)} (a fölötte lévő számból kivonjuk a mellette lévőt)` : `${fmt(rows[1][ci - 1])} − ${fmt(rows[0][ci - 1])} = ${fmt(ans)} (a fölötte lévő számból kivonjuk a mellette lévőt)`;
  const W = 70, H = 40, total = n * W;
  let b = "";
  rows.forEach((r, k) => r.forEach((v, j) => {
    const x = (total - r.length * W) / 2 + j * W, y = (n - 1 - k) * (H + 4) + 4, miss = k === ri && j === ci;
    b += rect(x + 2, y, W - 4, H, { rx: 6, fill: miss ? "var(--warnbg)" : "var(--pri-soft)", stroke: "var(--pri)", sw: 2 }) + txt(x + W / 2, y + 26, miss ? "?" : fmt(v), { size: 17, w: 800 });
  }));
  return {
    sub: "piramis", q: `A számpiramisban minden szám a <b>közvetlenül alatta lévő két szám összege</b>. Melyik szám kerül a <b>?</b> helyére?` + svg(total + 4, n * (H + 4) + 6, b),
    ans: { kind: "num", value: ans },
    hint: ri > 0 ? "Keresd meg a ? alatti két számot, és add össze őket!" : "A ? fölötti szám a ? és a mellette lévő szám összege. Melyik művelettel kapod meg a ?-et?",
    steps: [how, `<b class="big">${fmt(ans)}</b>`],
    why: v => ri === 0 && ci < rows[1].length && v === rows[1][ci] + rows[0][ci + 1] ? "Alulra nem összeadással kell számolni: a fölötte lévő számból kivonjuk a mellette lévőt!" : null,
  };
}

// ---- Fejszámolási fogások ----
function fejszamolas(rng, lvl) {
  const tricks = {
    1: [
      () => { const a = rng.int(2, 99), m = rng.pick([10, 100]); return { e: `${a} · ${m}`, v: a * m, s: [`10-zel szorzáskor egy 0-t, 100-zal szorzáskor két 0-t írunk a szám végére.`, `${a} · ${m} = <b class="big">${fmt(a * m)}</b>`] }; },
      () => { const a = rng.int(2, 99) * 10; return { e: `${fmt(a)} : 10`, v: a / 10, s: ["10-zel osztáskor a szám végéről elhagyunk egy 0-t.", `${fmt(a)} : 10 = <b class="big">${a / 10}</b>`] }; },
      () => { const a = rng.int(10, 999) * 2; return { e: `${fmt(a)} fele`, v: a / 2, s: [`Bontsuk részekre: ${fmt(Math.floor(a / 100) * 100)} fele ${fmt(Math.floor(a / 100) * 50)}, ${a % 100} fele ${(a % 100) / 2}.`, `${fmt(Math.floor(a / 100) * 50)} + ${(a % 100) / 2} = <b class="big">${fmt(a / 2)}</b>`] }; },
      () => { const a = rng.int(11, 49), b = rng.int(11, 49); return { e: `${a} + ${b}`, v: a + b, s: [`Tízesek: ${a - a % 10} + ${b - b % 10} = ${a - a % 10 + b - b % 10}, egyesek: ${a % 10} + ${b % 10} = ${a % 10 + b % 10}.`, `${a - a % 10 + b - b % 10} + ${a % 10 + b % 10} = <b class="big">${a + b}</b>`] }; },
    ],
    2: [
      () => { const a = rng.int(12, 98) * 2; return { e: `${a} · 5`, v: a * 5, s: [`5-tel szorozni ugyanaz, mint 10-zel szorozni és felezni: ${a} · 10 = ${a * 10}.`, `${fmt(a * 10)} : 2 = <b class="big">${fmt(a * 5)}</b>`] }; },
      () => { const a = rng.int(3, 40) * 4; return { e: `${a} · 25`, v: a * 25, s: [`25 = 100 : 4, ezért ${a} · 25 = ${a} : 4 · 100.`, `${a} : 4 = ${a / 4}, és ${a / 4} · 100 = <b class="big">${fmt(a * 25)}</b>`] }; },
      () => { const b = rng.int(2, 9), q = rng.int(2, 9) * 10 + rng.int(0, 9); return { e: `${fmt(b * q)} : ${b}`, v: q, s: [`Bontsuk: ${fmt(b * (q - q % 10))} : ${b} = ${q - q % 10}, és ${b * (q % 10)} : ${b} = ${q % 10}.`, `${q - q % 10} + ${q % 10} = <b class="big">${q}</b>`] }; },
      () => { const a = rng.int(12, 89), b = rng.pick([99, 199, 299, 98, 198]); return { e: `${a} + ${b}`, v: a + b, s: [`${b} majdnem ${b + (100 - b % 100)}: adjunk hozzá ${b + (100 - b % 100)}-at, aztán vegyük el a különbséget (${100 - b % 100}).`, `${a} + ${b + (100 - b % 100)} − ${100 - b % 100} = <b class="big">${a + b}</b>`] }; },
    ],
    3: [
      () => { const a = rng.int(2, 9) * 8; return { e: `125 · ${a}`, v: 125 * a, s: [`125 · 8 = 1000, ezért ${a} = ${a / 8} · 8 alapján 125 · ${a} = 1000 · ${a / 8}.`, `<b class="big">${fmt(125 * a)}</b>`] }; },
      () => { const b = rng.int(2, 9) * 10, q = rng.int(2, 90); return { e: `${fmt(b * q)} : ${b}`, v: q, s: [`Mindkét számból elhagyunk egy 0-t (10-zel osztjuk mindkettőt): ${fmt(b * q / 10)} : ${b / 10}.`, `${fmt(b * q / 10)} : ${b / 10} = <b class="big">${q}</b>`] }; },
      () => { const a = rng.int(12, 89); return { e: `${a} · 11`, v: a * 11, s: [`11-gyel szorozni = 10-zel szorozni + még egyszer hozzáadni: ${a} · 10 + ${a}.`, `${a * 10} + ${a} = <b class="big">${fmt(a * 11)}</b>`] }; },
      () => { const a = rng.int(120, 900), b = rng.pick([999, 998, 1999]); return { e: `${fmt(a)} + ${fmt(b)}`, v: a + b, s: [`${fmt(b)} majdnem ${fmt(b + (b % 1000 === 999 ? 1 : 2))}: adjuk hozzá azt, és vegyük el a különbséget.`, `${fmt(a)} + ${fmt(b + (b % 1000 === 999 ? 1 : 2))} − ${b % 1000 === 999 ? 1 : 2} = <b class="big">${fmt(a + b)}</b>`] }; },
    ],
  };
  const T = rng.pick(tricks[lvl])();
  return {
    sub: "fejszamolas", q: `Számold ki fejben, ügyes fogással!<div class="qbig">${T.e} = ?</div>`, ans: { kind: "num", value: T.v },
    hint: "Bontsd részekre a számot, vagy keress kerek számot (10, 100, 1000), amivel könnyebb számolni!",
    steps: T.s, why: () => null,
  };
}

export default {
  id: "T2",
  name: "Műveletek",
  planet: { name: "Művelet-meteor", emoji: "☄️", color: "#ef4444" },
  subs: [
    { id: "sorrend", name: "Műveleti sorrend", gen: sorrend },
    { id: "szoveges", name: "Műveletek szövegesen", gen: szoveges },
    { id: "tagok", name: "Hiányzó tag", gen: tagok },
    { id: "piramis", name: "Számpiramis", gen: piramis },
    { id: "fejszamolas", name: "Fejszámolás", gen: fejszamolas },
  ],
};
export { parse, evaluate, fill };
