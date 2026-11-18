// ===== Egy válasz rögzítése – játékfüggetlen rész =====
// Pont, napi összesítő (u.days), fejlődés-adat (u.hist), hibanapló (u.log), számlálók. A feladatcsomag a saját
// haladását (pl. csillagok, szókártyák) külön, a pack.record()-ban rögzíti.
import { dayNum, dateKey } from "./dates.js";
import { histAdd } from "./progress.js";

export const LOG_MAX = 120;
// o: { topic, r (1/2/0), ms, pts, twin, log: { s, lvl, q, a, c, w } }
export function recordAnswer(u, o, today = dayNum()) {
  const ok = o.r === 1;
  u.pts = (u.pts || 0) + o.pts;
  u.total = (u.total || 0) + 1; if (ok) u.correct = (u.correct || 0) + 1;
  if (o.twin && o.r >= 1) u.twins = (u.twins || 0) + 1;
  const d = (u.days[dateKey(today)] = u.days[dateKey(today)] || { n: 0, ok: 0, ms: 0, done: false });
  d.n++; if (ok) d.ok++; d.ms += Math.min(o.ms || 0, 180000);
  d.pts = (d.pts || 0) + o.pts;
  histAdd(u, o.topic, ok, o.ms, today);
  if (!ok && o.log) {
    // az időbélyeg a bejegyzés kulcsa a felhőben → mindig egyedi
    u.log.push({ t: Math.max(Date.now(), u.log.length ? (u.log[u.log.length - 1].t || 0) + 1 : 0), T: o.topic, r: o.r, ...o.log });
    if (u.log.length > LOG_MAX) u.log.splice(0, u.log.length - LOG_MAX);
  }
  u.upd = Date.now();
}
