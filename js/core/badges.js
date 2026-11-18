// ===== Jelvénymotor – játékfüggetlen =====
// Jelvény: { id, ic, n (név), t: u => igaz/hamis }. A váz és a feladatcsomag listája együtt fut.
export function checkBadges(u, list) {
  const got = [];
  u.badges = Array.isArray(u.badges) ? u.badges : Object.values(u.badges || {});
  list.forEach(b => { if (!u.badges.includes(b.id) && b.t(u)) { u.badges.push(b.id); got.push(b); } });
  return got;
}
const doneDays = u => Object.values(u.days || {}).filter(d => d.done).length;
// A váz általános jelvényei (minden játékban)
export const COMMON_BADGES = [
  { id: "first", ic: "🚀", n: "Első küldetés", t: u => doneDays(u) >= 1 },
  { id: "c10", ic: "🌟", n: "10 jó válasz", t: u => (u.correct || 0) >= 10 },
  { id: "c100", ic: "💫", n: "100 jó válasz", t: u => (u.correct || 0) >= 100 },
  { id: "c500", ic: "🌠", n: "500 jó válasz", t: u => (u.correct || 0) >= 500 },
  { id: "s3", ic: "🔥", n: "3 napos sorozat", t: u => (u.streak || {}).best >= 3 },
  { id: "s7", ic: "🌋", n: "7 napos sorozat", t: u => (u.streak || {}).best >= 7 },
  { id: "s14", ic: "☄️", n: "14 napos sorozat", t: u => (u.streak || {}).best >= 14 },
  { id: "learn5", ic: "🧠", n: "Hibából tanultam (5×)", t: u => (u.twins || 0) >= 5 },
  { id: "learn25", ic: "🦉", n: "Hibából tanultam (25×)", t: u => (u.twins || 0) >= 25 },
];
