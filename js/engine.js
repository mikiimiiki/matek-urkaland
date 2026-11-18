// ===== A Matek Űrkaland összekötője (régi felület a tesztekhez és az eszközökhöz) =====
// A játék már a közös vázon fut (js/shell + js/core + js/pack); ez a modul csak összefogja a matekos
// csomagot a közös keret függvényeivel, hogy a tesztek egy helyről érjék el őket.
import { PACK } from "./pack/index.js";
import { newUser as baseNew, normUser as baseNorm } from "./shell/user.js";
import { score } from "./core/scoring.js";
import { recordAnswer } from "./core/answers.js";
import { checkBadges as runBadges, COMMON_BADGES } from "./core/badges.js";
import { dayNum, dateKey } from "./core/dates.js";

export { dayNum, dateKey };
export { missionProgress, completeMission, streakNow, shieldAvailable } from "./core/dailygoal.js";
export { typeState, typeLvl, subKey, subState, subAcc, subColor, pickSub, planMission, starsTotal } from "./pack/progress.js";
export { SCORING as POINTS } from "./core/scoring.js";

export const AVATARS = ["🧑‍🚀", "👩‍🚀", "👨‍🚀", "👽"];
export const BADGES = [...COMMON_BADGES, ...PACK.badges];
export const newUser = (name, avatar = AVATARS[0]) => baseNew(name, avatar, PACK);
export const normUser = u => baseNorm(u, PACK);
export const checkBadges = u => runBadges(u, BADGES);

// Egy feladat eredménye (r: 1 elsőre jó, 2 tipp után, 0 magyarázat után) – ugyanaz, amit a váz is csinál
// task: a feladattípus nyers kimenete (type, sub, lvl) vagy a csomag feladata (topic, sub, level)
export function record(u, task, r, ms, opts = {}) {
  const t = { topic: task.topic || task.type, sub: task.sub, level: task.level || task.lvl };
  const { pts } = score({ r, level: t.level, combo: opts.combo || 0, twin: opts.twin, helps: opts.helps || 0 });
  recordAnswer(u, { topic: t.topic, r, ms, pts, twin: opts.twin, log: { s: t.sub, lvl: t.level, q: opts.q || "", a: opts.a || "", c: opts.c || "", w: opts.w || "" } });
  const ev = PACK.record(u, t, r);
  return { pts, star: ev, badges: checkBadges(u) };
}
