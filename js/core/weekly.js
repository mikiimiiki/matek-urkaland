// ===== 📅 Heti összefoglaló a gyereknek: a múlt hét számai a napi összesítőből (u.days) =====
// Játékfüggetlen, csak a meglévő adatokból számol (n: feladat, ok: elsőre jó, ms: idő, done: küldetés, imp: fejlődés).
// A hét hétfőn kezdődik. Az ablak az új hét első belépésekor jelenik meg, egyszer (u.weekly.seen = a hét első napja).
import { dateKey } from "./dates.js";

export const DAY_NAMES = ["hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat", "vasárnap"];
const DAY_ON = ["hétfőn", "kedden", "szerdán", "csütörtökön", "pénteken", "szombaton", "vasárnap"];
// a napsorszám (dates.js) a helyi naptári nap; a hét napja ebből: 0 = hétfő … 6 = vasárnap
export const weekdayOf = d => (new Date(d * 864e5).getUTCDay() + 6) % 7;
export const weekStart = d => d - weekdayOf(d);

export function weekStats(u, start) {
  const s = { n: 0, ok: 0, ms: 0, missions: 0, imp: 0, activeDays: 0, best: null };
  for (let i = 0; i < 7; i++) {
    const day = (u.days || {})[dateKey(start + i)]; if (!day) continue;
    const n = +day.n || 0;
    s.n += n; s.ok += +day.ok || 0; s.ms += +day.ms || 0; s.imp += +day.imp || 0;
    if (day.done) s.missions++;
    if (n) s.activeDays++;
    if (n && (!s.best || n > s.best.n)) s.best = { i, n, on: DAY_ON[i] };
  }
  s.pct = s.n ? Math.round(s.ok / s.n * 100) : null;
  s.min = Math.round(s.ms / 60000);
  return s;
}
// Mutatni kell-e most (az új hét első belépésekor, ha a múlt héten volt gyakorlás)? { last, prev } vagy null
export function weeklyDue(u, today) {
  const ws = weekStart(today);
  if (!u || (u.weekly && u.weekly.seen >= ws)) return null;
  const last = weekStats(u, ws - 7);
  if (!last.n) return null;
  return { week: ws, last, prev: weekStats(u, ws - 14) };
}
export const markWeeklySeen = (u, week) => { u.weekly = { seen: week }; };
