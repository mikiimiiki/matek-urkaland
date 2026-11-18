// ===== Közös segédfüggvények (DOM nélkül, Node-ban is futnak a tesztekhez) =====

// Véletlenszám-generátor: a közös keretből (magozható, a tesztekhez)
export { makeRng } from "../core/rng.js";

// Magyar számírás: 10 000 felett szóközzel tagolunk (a feladatlapok is így írják)
export const fmt = n => {
  const s = String(Math.abs(n));
  const t = Math.abs(n) >= 10000 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : s;
  return (n < 0 ? "−" : "") + t;
};

export const digits = n => String(n).split("").map(Number);
export const digitSum = n => digits(n).reduce((a, b) => a + b, 0);
export const digitProd = n => digits(n).reduce((a, b) => a * b, 1);
export const roundTo = (n, p) => Math.floor((n + p / 2) / p) * p; // 5-ös számjegytől felfelé
export const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
// Felsorolás: "a, b és c"
export const list = xs => xs.length < 2 ? (xs[0] ?? "") : xs.slice(0, -1).join(", ") + " és " + xs[xs.length - 1];
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const plain = html => String(html).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

// Névelő: a / az (magánhangzóval vagy 1-gyel/5-tel kezdődő számok előtt "az")
export function article(word) {
  const w = String(word).trim().toLowerCase();
  if (/^\d/.test(w)) {
    const n = parseInt(w.replace(/\s/g, ""), 10);
    // az 1, az 5, az 50, az 500, az 1000 ... (kiejtés szerint)
    const s = String(n);
    if (s[0] === "1" && (s.length === 1 || s.length === 4 || s.length === 7)) return "az";
    if (s[0] === "5") return "az";
    return "a";
  }
  return /^[aáeéiíoóöőuúüű]/.test(w) ? "az" : "a";
}
export const Az = w => { const a = article(w); return a[0].toUpperCase() + a.slice(1); };

// -val/-vel rag számokhoz a kiejtett utolsó szó szerint: 5-tel, 10-zel, 65-tel, 100-zal, 2000-rel
export function numVal(n) {
  const s = String(n);
  if (n % 1000 === 0 && n > 0) return s + "-rel";
  if (n % 100 === 0 && n > 0) return s + "-zal";
  if (n % 10 === 0 && n > 0) {
    const t = Math.floor(n / 10) % 10;
    return s + ({ 1: "-zel", 2: "-szal", 3: "-cal", 4: "-nel", 5: "-nel", 6: "-nal", 7: "-nel", 8: "-nal", 9: "-nel" }[t] || "-zel");
  }
  const d = n % 10;
  return s + ({ 1: "-gyel", 2: "-vel", 3: "-mal", 4: "-gyel", 5: "-tel", 6: "-tal", 7: "-tel", 8: "-cal", 9: "-cel" }[d]);
}

// --- Idő ---
export const hm = min => { const m = ((min % 1440) + 1440) % 1440; return { h: Math.floor(m / 60), m: m % 60 }; };
export const timeStr = min => { const t = hm(min); return `${t.h}:${String(t.m).padStart(2, "0")}`; };
export const timeWords = min => { const t = hm(min); return t.m ? `${t.h} óra ${t.m} perc` : `${t.h} óra`; };
export const durWords = min => { const h = Math.floor(min / 60), m = min % 60; return [h ? `${h} óra` : "", m ? `${m} perc` : ""].filter(Boolean).join(" ") || "0 perc"; };
// Népies időmegadás: negyed 4 = 3:15, fél 4 = 3:30, háromnegyed 4 = 3:45
export function folkTime(min) {
  const { h, m } = hm(min);
  const nh = (h % 12) + 1, H = nh === 0 ? 12 : nh;
  if (m === 15) return `negyed ${H}`;
  if (m === 30) return `fél ${H}`;
  if (m === 45) return `háromnegyed ${H}`;
  return null;
}

// --- Kis SVG-segédek a magyarázatokhoz ---
export const svg = (w, h, body, cls = "") => `<svg class="viz ${cls}" viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px" role="img" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
export const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.a || "middle"}" font-size="${o.size || 14}" font-weight="${o.w || 600}" fill="${o.fill || "var(--ink)"}"${o.extra || ""}>${esc(s)}</text>`;
export const line = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke || "var(--ink)"}" stroke-width="${o.sw || 2}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}${o.extra || ""}/>`;
export const rect = (x, y, w, h, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 6}" fill="${o.fill || "var(--card)"}" stroke="${o.stroke || "none"}" stroke-width="${o.sw || 0}"${o.extra || ""}/>`;
export const circle = (x, y, r, o = {}) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${o.fill || "var(--pri)"}" stroke="${o.stroke || "none"}" stroke-width="${o.sw || 0}"/>`;
export const arrowDefs = `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--pri)"/></marker></defs>`;
// Ív két pont között (ugrás a számegyenesen) felirattal
export const hop = (x1, x2, y, label, o = {}) => {
  const mx = (x1 + x2) / 2, hgt = o.h || 26;
  return `<path d="M${x1} ${y} Q${mx} ${y - hgt * 2} ${x2} ${y}" fill="none" stroke="${o.stroke || "var(--pri)"}" stroke-width="2.5" marker-end="url(#ah)"/>` + txt(mx, y - hgt - 6, label, { fill: o.stroke || "var(--pri)", size: 13, w: 800 });
};

// Számegyenes két érték között, jelölt pontokkal
export function numberLine(lo, hi, marks, o = {}) {
  const W = o.w || 560, H = o.h || 110, pad = 40, y = H - 40;
  const X = v => pad + (v - lo) / (hi - lo) * (W - 2 * pad);
  let b = arrowDefs + line(pad - 14, y, W - pad + 14, y, { sw: 2.5 });
  const ticks = o.ticks || [];
  ticks.forEach(t => { b += line(X(t.v), y - (t.big ? 10 : 6), X(t.v), y + (t.big ? 10 : 6), { sw: t.big ? 2.5 : 1.5 }); if (t.label) b += txt(X(t.v), y + 26, t.label, { size: t.big ? 14 : 12, w: t.big ? 800 : 500 }); });
  (o.hops || []).forEach(hp => { b += hop(X(hp.from), X(hp.to), y - 4, hp.label, { stroke: hp.color }); });
  marks.forEach(m => { b += circle(X(m.v), y, 7, { fill: m.color || "var(--pri)" }); if (m.label) b += txt(X(m.v), y - 16, m.label, { fill: m.color || "var(--pri)", w: 800 }); });
  return svg(W, H, b);
}

export const COLORS = {
  P: { n: "piros", c: "#ef4444" }, K: { n: "kék", c: "#3b82f6" }, S: { n: "sárga", c: "#facc15" }, Z: { n: "zöld", c: "#22c55e" },
  L: { n: "lila", c: "#a855f7" }, F: { n: "fehér", c: "#f8fafc" }, N: { n: "narancs", c: "#fb923c" }, B: { n: "barna", c: "#92400e" },
  R: { n: "rózsaszín", c: "#f472b6" }, Sz: { n: "szürke", c: "#94a3b8" },
};
