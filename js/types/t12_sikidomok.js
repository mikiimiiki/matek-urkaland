// ===== T12 – Síkidomok négyzetrácson =====
// A felvételi mintái: alakzat területe (kisnégyzetek) és kerülete (rácsegységek), tengelyes tükrösség,
// útvonal égtájakkal a négyzetrácson, téglalap és négyzet kerülete/oldala (kerítés kapukkal).
import { svg, txt, rect, line, circle, fmt, list } from "../util.js";

const CELL = 28;
// ---- Alakzatok (kisnégyzetek halmaza) ----
const key = (x, y) => `${x},${y}`;
function polyomino(rng, n, W = 8, H = 6) {
  const cells = new Set([key(rng.int(Math.min(2, W - 1), Math.max(Math.min(2, W - 1), W - 3)), rng.int(Math.min(1, H - 1), Math.max(Math.min(1, H - 1), H - 2)))]);
  while (cells.size < n) {
    const [x, y] = [...cells][rng.int(0, cells.size - 1)].split(",").map(Number);
    const [dx, dy] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < W && ny < H) cells.add(key(nx, ny));
  }
  return [...cells].map(s => s.split(",").map(Number));
}
const has = (cells, x, y) => cells.some(c => c[0] === x && c[1] === y);
function perimeter(cells) { let p = 0; cells.forEach(([x, y]) => { [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { if (!has(cells, x + dx, y + dy)) p++; }); }); return p; }
function norm(cells) { const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1])); return cells.map(([x, y]) => [x - mx, y - my]); }
const same = (a, b) => a.length === b.length && a.every(([x, y]) => has(b, x, y));
function symmetric(cells) {
  const c = norm(cells), W = Math.max(...c.map(p => p[0])), H = Math.max(...c.map(p => p[1]));
  if (same(c, c.map(([x, y]) => [W - x, y]))) return "függőleges";
  if (same(c, c.map(([x, y]) => [x, H - y]))) return "vízszintes";
  if (W === H && (same(c, c.map(([x, y]) => [y, x])) || same(c, c.map(([x, y]) => [W - y, W - x])))) return "átlós";
  return null;
}
// Rajz: négyzetrács + kitöltött kisnégyzetek; opció: kiemelt határvonal (kerület), számozott négyzetek
function gridSvg(shapes, o = {}) {
  const W = o.W || 8, H = o.H || 6;
  let b = "";
  for (let i = 0; i <= W; i++) b += line(10 + i * CELL, 10, 10 + i * CELL, 10 + H * CELL, { stroke: "var(--line)", sw: 1 });
  for (let j = 0; j <= H; j++) b += line(10, 10 + j * CELL, 10 + W * CELL, 10 + j * CELL, { stroke: "var(--line)", sw: 1 });
  shapes.forEach(({ cells, fill, label, dx = 0, dy = 0, nums, edge }) => {
    cells.forEach(([x, y], i) => { b += rect(10 + (x + dx) * CELL + 1, 10 + (y + dy) * CELL + 1, CELL - 2, CELL - 2, { rx: 2, fill: fill || "var(--bar)" }); if (nums) b += txt(10 + (x + dx) * CELL + CELL / 2, 10 + (y + dy) * CELL + CELL / 2 + 5, String(i + 1), { size: 11, w: 800 }); });
    if (edge) cells.forEach(([x, y]) => {
      const X = 10 + (x + dx) * CELL, Y = 10 + (y + dy) * CELL, st = { stroke: "var(--bad)", sw: 3.5 };
      if (!has(cells, x, y - 1)) b += line(X, Y, X + CELL, Y, st);
      if (!has(cells, x, y + 1)) b += line(X, Y + CELL, X + CELL, Y + CELL, st);
      if (!has(cells, x - 1, y)) b += line(X, Y, X, Y + CELL, st);
      if (!has(cells, x + 1, y)) b += line(X + CELL, Y, X + CELL, Y + CELL, st);
    });
    if (label) { const mx = Math.min(...cells.map(c => c[0])) + dx, my = Math.min(...cells.map(c => c[1])) + dy; b += txt(10 + mx * CELL - 2, 10 + my * CELL - 3, label, { size: 15, w: 900, a: "start", fill: "var(--pri)" }); }
  });
  return svg(W * CELL + 20, H * CELL + 20, b);
}

// ---- 1. Terület ----
function terulet(rng, lvl) {
  if (lvl === 3) { // téglalapból kivágott téglalap – kivonással ügyesebb
    const a = rng.int(5, 8), bb = rng.int(4, 6), ca = rng.int(1, a - 2), cb = rng.int(1, bb - 2);
    const corner = rng.pick([[0, 0], [a - ca, 0], [0, bb - cb], [a - ca, bb - cb]]);
    const cells = [];
    for (let x = 0; x < a; x++) for (let y = 0; y < bb; y++) if (!(x >= corner[0] && x < corner[0] + ca && y >= corner[1] && y < corner[1] + cb)) cells.push([x, y]);
    const n = cells.length;
    return {
      sub: "terulet", q: `Legyen a területegység 1 kisnégyzet. <b>Hány területegység az alakzat területe?</b>`, viz: gridSvg([{ cells }], { W: 9, H: 7 }),
      ans: { kind: "num", value: n, unit: "egység" },
      hint: "Nem kell egyenként megszámolni! Egészítsd ki gondolatban téglalappá, és vond le, ami hiányzik.",
      steps: [`Egészítsük ki téglalappá: ${a} · ${bb} = <b>${a * bb}</b> kisnégyzet.`, `A hiányzó (kivágott) rész: ${ca} · ${cb} = <b>${ca * cb}</b> kisnégyzet.`, `${a * bb} − ${ca * cb} = <b class="big">${n}</b> területegység`],
      why: v => v === a * bb ? "Ez a teljes téglalap – a kivágott részt le kell vonni!" : v === perimeter(cells) ? "Ez a kerület (a szélek hossza) – a terület a kisnégyzetek száma!" : null,
    };
  }
  const n = lvl === 1 ? rng.int(4, 8) : rng.int(8, 14), cells = polyomino(rng, n);
  return {
    sub: "terulet", q: `Legyen a területegység 1 kisnégyzet. <b>Hány területegység az alakzat területe?</b>`, viz: gridSvg([{ cells }]),
    ans: { kind: "num", value: n, unit: "egység" },
    hint: "Számold meg a színes kisnégyzeteket! Haladj soronként, hogy egyet se hagyj ki.",
    steps: [`Megszámozzuk a kisnégyzeteket:` + gridSvg([{ cells, nums: true }]), `<b class="big">${n}</b> kisnégyzet = ${n} területegység`],
    why: v => v === perimeter(cells) ? "Ez a kerület (a körülötte lévő szélek száma) – a terület a kisnégyzetek száma!" : null,
  };
}

// ---- 2. Kerület ----
function kerulet(rng, lvl) {
  if (lvl === 1 || rng.chance(0.3)) {
    const a = rng.int(2, 6), b = rng.int(1, 5), cells = [];
    for (let x = 0; x < a; x++) for (let y = 0; y < b; y++) cells.push([x + 1, y + 1]);
    const P = 2 * (a + b), unitM = lvl === 3 ? rng.pick([2, 5, 10]) : 1;
    return {
      sub: "kerulet", q: `${unitM > 1 ? `A négyzetrács kisnégyzetének oldala <b>${unitM} méter</b>. ` : "Legyen a hosszúságegység egy kisnégyzet oldala. "}<b>${unitM > 1 ? "Hány méter" : "Hány egység"} a téglalap kerülete?</b>`, viz: gridSvg([{ cells }]),
      ans: { kind: "num", value: P * unitM, unit: unitM > 1 ? "m" : "egység" },
      hint: "A kerület a körülötte lévő vonal hossza: járd körbe, és számold a kisnégyzet-oldalakat!",
      steps: [`Körbejárjuk (pirossal):` + gridSvg([{ cells, edge: true }]), unitM > 1 ? `Téglalapnál: ${a} + ${b} + ${a} + ${b} = <b>${P}</b> egység<br>${P} · ${unitM} m = <b class="big">${P * unitM} m</b>` : `Téglalapnál: ${a} + ${b} + ${a} + ${b} = <b class="big">${P}</b> egység`],
      why: v => v === a * b * unitM || v === a * b ? "Ez a terület (a kisnégyzetek száma) – a kerület a körülötte lévő vonal hossza!" : v === (a + b) * unitM ? "Csak két oldalt adtál össze – a téglalapnak négy oldala van!" : null,
    };
  }
  const n = lvl === 2 ? rng.int(5, 9) : rng.int(8, 13), cells = polyomino(rng, n), P = perimeter(cells);
  return {
    sub: "kerulet", q: `Legyen a hosszúságegység egy kisnégyzet oldala. <b>Hány egység az alakzat kerülete?</b>`, viz: gridSvg([{ cells }]),
    ans: { kind: "num", value: P, unit: "egység" },
    hint: "Járd körbe az alakzatot az ujjaddal, és számold a kisnégyzet-oldalakat! A belső vonalak nem számítanak.",
    steps: [`Körbejárjuk az alakzatot (piros vonal) – csak a külső szélek számítanak:` + gridSvg([{ cells, edge: true }]), `A piros szakaszok száma: <b class="big">${P}</b> egység`],
    why: v => v === n ? "Ez a terület (a kisnégyzetek száma) – a kerület a körülötte lévő vonal hossza!" : v === 4 * n ? "Minden kisnégyzet mind a 4 oldalát számoltad – a belső (közös) oldalak nem részei a kerületnek!" : null,
  };
}

// ---- 3. Tengelyes tükrösség ----
function tukros(rng, lvl) {
  for (let t = 0; t < 200; t++) {
    const shapes = [];
    const nSym = rng.int(1, lvl === 1 ? 1 : 2);
    for (let k = 0; k < 4; k++) {
      let cells;
      if (k < nSym) { // fél alakzat + tükörképe (függőleges vagy vízszintes tengellyel)
        const vertical = rng.chance(0.6);
        const half = norm(polyomino(rng, rng.int(2, 4), vertical ? 2 : 4, vertical ? 4 : 2));
        const W = Math.max(...half.map(c => c[0])), H = Math.max(...half.map(c => c[1]));
        cells = vertical ? [...half, ...half.map(([x, y]) => [2 * W + 1 - x, y])] : [...half, ...half.map(([x, y]) => [x, 2 * H + 1 - y])];
        cells = norm([...new Map(cells.map(c => [key(...c), c])).values()]);
      } else { do { cells = norm(polyomino(rng, rng.int(4, 6), 4, 4)); } while (symmetric(cells)); }
      shapes.push(cells);
    }
    if (shapes.some(s => Math.max(...s.map(c => c[0])) > 4 || Math.max(...s.map(c => c[1])) > 4)) continue;
    const order = rng.shuffle([0, 1, 2, 3]), labels = ["A", "B", "C", "D"];
    const placed = order.map((si, i) => ({ cells: shapes[si], dx: 1 + (i % 2) * 6, dy: 1 + Math.floor(i / 2) * 6, label: labels[i], fill: "var(--bar)" }));
    const sol = order.map((si, i) => si < nSym ? i : -1).filter(i => i >= 0);
    return {
      sub: "tukros", q: `Melyik alakzat <b>tengelyesen tükrös</b>? <b>Jelöld meg az összeset!</b>`, viz: gridSvg(placed, { W: 12, H: 12 }),
      ans: { kind: "pick", options: labels.slice(), value: sol },
      hint: "Tengelyesen tükrös az alakzat, ha egy egyenes mentén „összehajtva” a két fele pontosan fedi egymást. Keress ilyen egyenest (függőleges, vízszintes vagy átlós)!",
      steps: [`Képzeljük el, hogy minden alakzatot összehajtunk egy egyenes mentén. Ha a két fél pontosan fedi egymást, az alakzat tükrös.`, placed.map((p, i) => `<b>${labels[i]}</b>: ${symmetric(p.cells) ? `✅ tükrös (${symmetric(p.cells)} tengely)` : "❌ nincs olyan egyenes, amely mentén összehajtva fedné egymást"}`).join("<br>"), `A tükrös alakzat${sol.length > 1 ? "ok" : ""}: <b class="big">${list(sol.map(i => labels[i]))}</b>`],
      why: () => null,
    };
  }
  return terulet(rng, lvl);
}

// ---- 4. Útvonal égtájakkal ----
const DIRS = { É: [0, -1], K: [1, 0], D: [0, 1], Ny: [-1, 0] };
function utvonal(rng, lvl) {
  for (let t = 0; t < 200; t++) {
    const W = 10, H = 8, unit = rng.pick([10, 5, 2]);
    let x = rng.int(1, W - 2), y = rng.int(1, H - 2);
    const start = [x, y], segs = [];
    const nSeg = lvl === 1 ? 2 : lvl === 2 ? 3 : 4;
    let last = null, ok = true;
    for (let i = 0; i < nSeg; i++) {
      const d = rng.pick(Object.keys(DIRS).filter(k => k !== last && !(last && DIRS[k][0] === -DIRS[last][0] && DIRS[k][1] === -DIRS[last][1])));
      const len = rng.int(1, 4), nx = x + DIRS[d][0] * len, ny = y + DIRS[d][1] * len;
      if (nx < 0 || ny < 0 || nx > W || ny > H) { ok = false; break; }
      segs.push([d, len]); x = nx; y = ny; last = d;
    }
    if (!ok) continue;
    const total = segs.reduce((a, s) => a + s[1], 0) * unit;
    const ask = lvl === 1 ? "hossz" : rng.pick(["hossz", "hova"]);
    // jelölt pontok: a cél + 3 csali
    const cands = new Set([key(x, y)]);
    while (cands.size < 4) { const px = Math.max(0, Math.min(W, x + rng.int(-3, 3))), py = Math.max(0, Math.min(H, y + rng.int(-3, 3))); if (!(px === start[0] && py === start[1])) cands.add(key(px, py)); }
    const pts = rng.shuffle([...cands].map(s => s.split(",").map(Number))), labels = ["A", "B", "C", "D"];
    const draw = (withPath) => {
      let b = "";
      for (let i = 0; i <= W; i++) b += line(10 + i * CELL, 10, 10 + i * CELL, 10 + H * CELL, { stroke: "var(--line)", sw: 1 });
      for (let j = 0; j <= H; j++) b += line(10, 10 + j * CELL, 10 + W * CELL, 10 + j * CELL, { stroke: "var(--line)", sw: 1 });
      if (withPath) { let cx = start[0], cy = start[1]; segs.forEach(([d, l]) => { const nx = cx + DIRS[d][0] * l, ny = cy + DIRS[d][1] * l; b += line(10 + cx * CELL, 10 + cy * CELL, 10 + nx * CELL, 10 + ny * CELL, { stroke: "var(--pri)", sw: 4 }); cx = nx; cy = ny; }); }
      b += circle(10 + start[0] * CELL, 10 + start[1] * CELL, 8, { fill: "var(--ok)" }) + txt(10 + start[0] * CELL, 10 + start[1] * CELL - 12, "Start", { size: 12, w: 800, fill: "var(--ok)" });
      if (ask === "hova") pts.forEach(([px, py], i) => { b += circle(10 + px * CELL, 10 + py * CELL, 7, { fill: "var(--bad)" }) + txt(10 + px * CELL + 12, 10 + py * CELL - 6, labels[i], { size: 14, w: 900, fill: "var(--bad)", a: "start" }); });
      b += txt(W * CELL + 40, 30, "É", { size: 14, w: 900 }) + txt(W * CELL + 40, 80, "D", { size: 14, w: 900 }) + txt(W * CELL + 18, 56, "Ny", { size: 13, w: 900 }) + txt(W * CELL + 62, 56, "K", { size: 14, w: 900 }) + line(W * CELL + 40, 36, W * CELL + 40, 66, { sw: 1.5 }) + line(W * CELL + 28, 51, W * CELL + 54, 51, { sw: 1.5 });
      return svg(W * CELL + 80, H * CELL + 20, b);
    };
    const route = segs.map(([d, l]) => `${d} ${l * unit} m`).join(", ");
    const answerIdx = pts.findIndex(p => p[0] === x && p[1] === y);
    return {
      sub: "utvonal",
      q: `A négyzetrács kisnégyzetének oldala <b>${unit} méter</b>. Peti a Start pontból indul, és ezt az utat járja be: <b>${route}</b>.<p><b>${ask === "hossz" ? "Hány méter utat tett meg?" : "Melyik pontba érkezett?"}</b></p>`,
      viz: draw(false),
      ans: ask === "hossz" ? { kind: "num", value: total, unit: "m" } : { kind: "choice", options: labels.slice(), value: answerIdx },
      hint: ask === "hossz" ? "Az út hossza a szakaszok hosszának összege – az irány itt nem számít." : `Rajzold be lépésről lépésre! Egy kisnégyzet ${unit} m, tehát pl. ${2 * unit} m = 2 kisnégyzet.`,
      steps: [`Berajzoljuk az utat (${unit} m = 1 kisnégyzet):` + draw(true), ask === "hossz" ? `${segs.map(s => s[1] * unit).join(" + ")} = <b class="big">${total} m</b>` : `Az út vége a <b class="big">${labels[answerIdx]}</b> pont.`],
      why: v => ask === "hossz" && v === segs.reduce((a, s) => a + s[1], 0) ? `Ez a kisnégyzetek száma – egy kisnégyzet ${unit} méter, ezért szorozni kell!` : null,
    };
  }
  return kerulet(rng, lvl);
}

// ---- 5. Téglalap és négyzet: kerület, oldal, kerítés ----
function teglalap(rng, lvl) {
  const k = rng.pick(lvl === 1 ? ["negyzetK", "teglaK"] : lvl === 2 ? ["negyzetOldal", "teglaOldal", "teglaK"] : ["kapu", "teglaOldal", "negyzetOldal"]);
  if (k === "negyzetK") { const a = rng.int(3, 50); return { sub: "teglalap", q: `Egy négyzet alakú kert oldala <b>${a} m</b>. <b>Hány méter a kerülete?</b>`, ans: { kind: "num", value: 4 * a, unit: "m" }, hint: "A négyzetnek 4 egyforma oldala van.", steps: [`${a} + ${a} + ${a} + ${a} = 4 · ${a} = <b class="big">${4 * a} m</b>`], why: v => v === a * a ? "Ez a terület – a kerület a körülötte lévő kerítés hossza!" : v === 2 * a ? "A négyzetnek négy oldala van, nem kettő!" : null }; }
  if (k === "teglaK") { const a = rng.int(3, 40), b = rng.int(2, a - 1); return { sub: "teglalap", q: `Egy téglalap alakú udvar <b>${a} m</b> hosszú és <b>${b} m</b> széles. <b>Hány méter kerítés kell körbe?</b>`, ans: { kind: "num", value: 2 * (a + b), unit: "m" }, hint: "A téglalapnak két hosszabb és két rövidebb oldala van.", steps: [`${a} + ${b} + ${a} + ${b} = <b class="big">${2 * (a + b)} m</b>`], why: v => v === a + b ? "Csak két oldalt adtál össze – a téglalap kerülete mind a négy oldal!" : v === a * b ? "Ez a terület – itt a körbe kerítés hosszát kérdezik." : null }; }
  if (k === "negyzetOldal") { const a = rng.int(5, 150), K = 4 * a; return { sub: "teglalap", q: `Egy négyzet alakú virágoskert kerülete <b>${K} m</b>. <b>Hány méter egy oldala?</b>`, ans: { kind: "num", value: a, unit: "m" }, hint: "A kerület a 4 egyforma oldal összege – oszd el 4 felé!", steps: [`${K} : 4 = <b class="big">${a} m</b>`], why: v => v === K / 2 ? "A négyzetnek 4 oldala van – néggyel kell osztani!" : null }; }
  if (k === "teglaOldal") { const a = rng.int(5, 60), b = rng.int(3, 50), K = 2 * (a + b); return { sub: "teglalap", q: `Egy téglalap kerülete <b>${K} cm</b>, az egyik oldala <b>${a} cm</b>. <b>Hány cm a másik oldala?</b>`, ans: { kind: "num", value: b, unit: "cm" }, hint: "A kerület fele egy hosszabb és egy rövidebb oldal összege!", steps: [`A kerület fele: ${K} : 2 = <b>${a + b}</b> cm – ez egy hosszabb és egy rövidebb oldal együtt.`, `${a + b} − ${a} = <b class="big">${b} cm</b>`], why: v => v === K - a ? "A kerületben mindkét oldal kétszer szerepel – előbb felezz!" : v === K - 2 * a ? "Jó úton jársz: levontad a két ismert oldalt – most még felezni kell!" : null }; }
  const a = rng.int(10, 120), gates = 4, g = rng.int(1, 3), K = 4 * a;
  return { sub: "teglalap", q: `Egy négyzet alakú kert kerülete <b>${K} m</b>. Körbekerítik, de mind a 4 oldalon kihagynak egy-egy <b>${g} m széles kaput</b>.<p><b>Hány méter hosszú a kerítés?</b></p>`, ans: { kind: "num", value: K - gates * g, unit: "m" }, hint: "A kerület egész hosszából vond le a kapuk helyét – négy kapu van!", steps: [`A kapuk összesen: 4 · ${g} = <b>${4 * g} m</b>.`, `${K} − ${4 * g} = <b class="big">${K - 4 * g} m</b>`], why: v => v === K - g ? "Négy kapu van, mindegyik oldalon egy – mind a négyet le kell vonni!" : v === K ? "A kapuk helyét ki kell hagyni a kerítésből!" : null };
}

export default {
  id: "T12",
  name: "Síkidomok",
  planet: { name: "Síkidom-sziget", emoji: "📐", color: "#84cc16" },
  subs: [
    { id: "terulet", name: "Terület", gen: terulet },
    { id: "kerulet", name: "Kerület", gen: kerulet },
    { id: "tukros", name: "Tengelyes tükrösség", gen: tukros },
    { id: "utvonal", name: "Útvonal égtájakkal", gen: utvonal },
    { id: "teglalap", name: "Téglalap, négyzet", gen: teglalap },
  ],
};
export { symmetric, perimeter };
