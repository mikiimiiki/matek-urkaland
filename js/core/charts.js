// ===== Fejlődés-diagram: oszlop (feladatszám) + vonal (pontosság) =====
// points: [{ from, to, n, pct }] – a core/progress.js series() kimenete. SVG szöveget ad vissza.
import { dateKey, shortDate } from "./dates.js";

export function trendChart(points, { step = 1, w = 640, h = 220 } = {}) {
  const L = 40, R = 44, T = 14, B = 30, cnt = points.length;
  const maxN = Math.max(5, ...points.map(p => p.n));
  const slot = (w - L - R) / cnt, x = i => L + slot * (i + 0.5);
  const yN = n => T + (1 - n / maxN) * (h - T - B), yP = p => T + (100 - p) / 100 * (h - T - B);
  let s = "";
  // rácsvonalak a pontossághoz (jobb oldali tengely)
  [[100, ""], [90, "g"], [70, "r"], [50, ""], [0, ""]].forEach(([p, c]) => {
    s += `<line x1="${L}" x2="${w - R}" y1="${yP(p)}" y2="${yP(p)}" class="tg ${c}"/><text x="${w - R + 6}" y="${yP(p) + 4}" class="tl">${p}%</text>`;
  });
  s += `<text x="${L - 6}" y="${T + 4}" class="tl" text-anchor="end">${maxN}</text><text x="${L - 6}" y="${h - B + 4}" class="tl" text-anchor="end">0</text>`;
  // oszlopok: feladatszám
  points.forEach((p, i) => {
    if (p.n) s += `<rect x="${x(i) - slot * 0.32}" y="${yN(p.n)}" width="${slot * 0.64}" height="${h - B - yN(p.n)}" rx="3" class="tbar"><title>${dateKey(p.from)}${step > 1 ? " – " + dateKey(p.to) : ""}: ${p.n} feladat</title></rect>`;
  });
  // vonal: pontosság (megszakad, ahol kevés az adat)
  let seg = [];
  const flush = () => { if (seg.length > 1) s += `<polyline points="${seg.join(" ")}" class="tline"/>`; seg = []; };
  points.forEach((p, i) => { if (p.pct === null) { flush(); return; } seg.push(`${x(i)},${yP(p.pct)}`); });
  flush();
  points.forEach((p, i) => {
    if (p.pct !== null) s += `<circle cx="${x(i)}" cy="${yP(p.pct)}" r="4.5" class="tdot${p.pct < 70 ? " r" : p.pct >= 90 ? " g" : ""}"><title>${dateKey(p.from)}${step > 1 ? " – " + dateKey(p.to) : ""}: ${p.pct}% elsőre jó (${p.n} feladat)</title></circle>`;
    const every = cnt > 20 ? 5 : cnt > 8 ? 2 : 1;
    if ((cnt - 1 - i) % every === 0) s += `<text x="${x(i)}" y="${h - 10}" class="tl" text-anchor="middle">${shortDate(p.to)}</text>`;
  });
  return `<svg class="trend-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Feladatok száma és pontosság időben">${s}</svg>`;
}
