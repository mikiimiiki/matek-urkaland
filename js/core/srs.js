// ===== Ismétlés (Leitner-dobozok) – játékfüggetlen =====
// Elem-állapot: { n, ok, box, due, last: [1/0 …] }. A kulcs a csomagé (Matek: altípus, Massalhangzok: szó).
export const REVIEW_DAYS = [1, 3, 7, 21]; // ennyi nap múlva jön vissza (a doboz szerint)
export const LAST_N = 10;                 // ennyi utolsó eredményből számolunk pontosságot

export const newItem = () => ({ n: 0, ok: 0, box: 0, due: 0, last: [] });
// Eredmény rögzítése: jó válasznál egy dobozzal feljebb (ha esedékes volt), rossznál vissza az elejére
export function srsStep(st, ok, today, days = REVIEW_DAYS) {
  st.last = Array.isArray(st.last) ? st.last : Object.values(st.last || {});
  st.n++; if (ok) st.ok++;
  st.last.push(ok ? 1 : 0); if (st.last.length > LAST_N) st.last.shift();
  if (ok) { if (!st.due || st.due <= today) st.box = Math.min(st.box + (st.due ? 1 : 0), days.length - 1); st.due = today + days[st.box]; }
  else { st.box = 0; st.due = today + 1; }
  return st;
}
export const accuracy = st => (st && st.last && st.last.length ? st.last.reduce((a, b) => a + b, 0) / st.last.length : null);
export const isDue = (st, today) => !!(st && st.n && st.due && st.due <= today);
