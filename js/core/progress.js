// ===== Fejlődés időben – témafüggetlen =====
// u.hist[„ÉÉÉÉ-HH-NN”][témaazonosító] = { ok, n, ms }
//   ok: elsőre jó válaszok, n: összes feladat, ms: gyakorlási idő
// A „_all” kulcs a régi (bontás nélküli) napi összesítést tartalmazza – ez csak az összesítésben számít,
// a témánkénti nézetben nem. Így a bevezetés előtti napok is látszanak a diagramon.
import { dayNum, dateKey } from "./dates.js";

export const HIST_DAYS = 400;
export const MIN_ANSWERS = 5;   // ennél kevesebb válasz: „kevés adat” (▲/▼ nélkül)
export const MIN_POINT = 3;     // ennél kevesebb feladatnál nincs pont a pontossági vonalon

export function histAdd(u, topic, ok, ms = 0, day = dayNum()) {
  const h = (u.hist = u.hist || {}), k = dateKey(day), d = (h[k] = h[k] || {}), s = (d[topic] = d[topic] || { ok: 0, n: 0, ms: 0 });
  s.n++; if (ok) s.ok++; s.ms += Math.max(0, Math.min(ms || 0, 180000));
  const keys = Object.keys(h);
  if (keys.length > HIST_DAYS) keys.sort().slice(0, keys.length - HIST_DAYS).forEach(x => delete h[x]);
  return `hist/${k}/${topic}`;
}
// Összesítés napintervallumra (mindkét vége benne van). topic nélkül: minden téma + „_all”
export function histAgg(u, from, to, topic) {
  const r = { ok: 0, n: 0, ms: 0 }, h = u.hist || {};
  for (let d = from; d <= to; d++) {
    const day = h[dateKey(d)]; if (!day) continue;
    (topic ? [topic] : Object.keys(day)).forEach(k => { const s = day[k]; if (s) { r.ok += +s.ok || 0; r.n += +s.n || 0; r.ms += +s.ms || 0; } });
  }
  return r;
}
export const pctOf = s => (s && s.n ? Math.round(s.ok / s.n * 100) : null);

export const PERIODS = {
  day: { label: "Nap", step: 1, count: 30, len: 1, cur: "ma", prev: "tegnap" },
  week: { label: "Hét", step: 7, count: 12, len: 7, cur: "az utolsó 7 nap", prev: "az előző 7 nap" },
  month: { label: "Hónap", step: 30, count: 6, len: 30, cur: "az utolsó 30 nap", prev: "az előző 30 nap" },
};
// Diagram-pontok: napi (30 nap), heti (12 × 7 nap) vagy havi (6 × 30 nap) – gördülő időszakok
export function series(u, period, today = dayNum()) {
  const P = PERIODS[period];
  return Array.from({ length: P.count }, (_, i) => {
    const to = today - (P.count - 1 - i) * P.step, from = to - P.step + 1, s = histAgg(u, from, to);
    return { from, to, n: s.n, ok: s.ok, ms: s.ms, pct: s.n >= MIN_POINT ? pctOf(s) : null };
  });
}
// Témánkénti összevetés: aktuális időszak az előzővel
export function compare(u, topics, period, today = dayNum()) {
  const L = PERIODS[period].len;
  return topics.map(t => {
    const cur = histAgg(u, today - L + 1, today, t.id), prev = histAgg(u, today - 2 * L + 1, today - L, t.id);
    const pct = pctOf(cur), pp = prev.n >= MIN_ANSWERS ? pctOf(prev) : null;
    const delta = cur.n >= MIN_ANSWERS && pp !== null ? pct - pp : null;
    return { ...t, cur, prev, pct, prevPct: pp, delta, few: cur.n > 0 && cur.n < MIN_ANSWERS };
  }).sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));
}
// Régi napi összesítés átemelése „_all” kulcsra (csak ahol még nincs bontás)
export function backfill(u, daysField = "days") {
  const h = (u.hist = u.hist || {});
  Object.entries(u[daysField] || {}).forEach(([k, d]) => {
    if (!d || !d.n) return;
    const day = (h[k] = h[k] || {});
    const already = Object.entries(day).reduce((a, [t, s]) => a + (t === "_all" ? 0 : s.n || 0), 0);
    const rest = d.n - already;
    if (rest > 0 && !day._all) day._all = { ok: Math.max(0, Math.min(rest, (d.ok || 0) - Object.entries(day).reduce((a, [t, s]) => a + (t === "_all" ? 0 : s.ok || 0), 0))), n: rest, ms: Math.max(0, (d.ms || 0) - Object.entries(day).reduce((a, [t, s]) => a + (t === "_all" ? 0 : s.ms || 0), 0)) };
  });
}
