// ===== A gyerek adatainak közös váza (a csomag a saját mezőit a pack.newUser / pack.normUser-rel adja) =====
const arr = x => Array.isArray(x) ? x : Object.values(x || {});

export function newUser(name, avatar, P) {
  return { name, avatar, pts: 0, log: [], days: {}, streak: { n: 0, last: -1, best: 0 }, shields: {}, badges: [], claimed: {}, total: 0, correct: 0, twins: 0, goal: {}, upd: 0, ...(P && P.newUser ? P.newUser() : {}) };
}
// Felhőből érkező adatnál a tömbök objektummá alakulhatnak (Firebase) – visszaalakítjuk
export function normUser(u, P) {
  u = Object.assign(newUser(u.name || "Játékos", u.avatar, P), u);
  u.log = arr(u.log); u.badges = arr(u.badges);
  u.streak = Object.assign({ n: 0, last: -1, best: 0 }, u.streak);
  u.goal = u.goal && typeof u.goal === "object" ? u.goal : {};
  if (u.goal.giftLog) u.goal.giftLog = arr(u.goal.giftLog);
  if (u.block && u.block.topics) u.block.topics = arr(u.block.topics);
  return P && P.normUser ? P.normUser(u) : u;
}
