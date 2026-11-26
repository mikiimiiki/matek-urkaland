// ===== A gyerek adatainak közös váza (a csomag a saját mezőit a pack.newUser / pack.normUser-rel adja) =====
import { roomLayout } from "../core/room.js";
import { normLearning } from "../core/learning-feedback.js";

const arr = x => Array.isArray(x) ? x : Object.values(x || {});

export function newUser(name, avatar, P) {
  return { name, avatar, pts: 0, log: [], days: {}, streak: { n: 0, last: -1, best: 0 }, shields: {}, badges: [], claimed: {}, total: 0, correct: 0, twins: 0, goal: {}, upd: 0, ...(P && P.newUser ? P.newUser() : {}) };
}
// Felhőből érkező adatnál a tömbök objektummá alakulhatnak (Firebase) – visszaalakítjuk
export function normUser(u, P) {
  u = Object.assign(newUser(u.name || "Játékos", u.avatar, P), u);
  if (u.room != null) u.room = roomLayout(u.room);
  if (u.learningDifficulties != null) u.learningDifficulties = normLearning(u.learningDifficulties);
  // félbehagyott kör (play.js): a felhőből a tömbök objektumként jöhetnek vissza
  if (u.resume && typeof u.resume === "object") { u.resume.plan = arr(u.resume.plan); u.resume.res = arr(u.resume.res); } else if (u.resume !== undefined) u.resume = null;
  u.log = arr(u.log); u.badges = arr(u.badges);
  u.streak = Object.assign({ n: 0, last: -1, best: 0 }, u.streak);
  u.goal = u.goal && typeof u.goal === "object" ? u.goal : {};
  if (u.goal.giftLog) u.goal.giftLog = arr(u.goal.giftLog);
  if (u.block && u.block.topics) u.block.topics = arr(u.block.topics);
  return P && P.normUser ? P.normUser(u) : u;
}
