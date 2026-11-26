// ===== Fejlődésjelzés: egy korábban nehéz feladat most elsőre, segítség nélkül sikerült =====
// Mi számít „ugyanannak a feladatnak”: a csomag progressKey(task) függvénye mondja meg (pl. Helyesírás: a szó,
// Matek: a feladattípus és a kezdőérték). Ha nincs ilyen, a pontos egyezés (kérdés, megoldás, válaszlehetőségek).
// A mentésbe és a felhőbe csak rövid ujjlenyomat kerül. Pontot, jelvényt, szintet és napi célt nem változtat.
import { stable } from "./syncdiff.js";
import { dateKey, dayNum } from "./dates.js";

export const FEEDBACK_LIMIT = 100;
export const IMPROVED_TITLE = "🌱 Fejlődtél!";
export const IMPROVED_TEXT = "Ez korábban nehezen ment, most elsőre sikerült!";

// cyrb53: rövid, gyors, nem kriptográfiai ujjlenyomat (két 32 bites hash összefűzve, 36-os számrendszerben)
export function fingerprint(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
// A feladat nyers azonosítója (szöveg), vagy null, ha nem azonosítható
export function rawLearningKey(pack, task) {
  try {
    if (typeof pack.progressKey === "function") {
      const k = pack.progressKey(task);
      return k == null || k === "" ? null : `${pack.id}|${String(k)}`;
    }
    if (task.identityParams == null && !task.answer) return null;
    const spec = task.answer;
    const params = task.identityParams ?? { kind: spec.kind, options: spec.options?.slice().sort(), word: spec.word };
    return stable([pack.id, task.taskVersion ?? "", task.topic, task.sub, task.level, task.q, task.viz, task.correctText, task.solution, params]);
  } catch { return null; } // nem azonosítható feladat miatt nem veszhet el egy válasz
}
export const learningKey = (pack, task) => { const r = rawLearningKey(pack, task); return r == null ? null : fingerprint(r); };

const KEY_RE = /^[0-9a-z]{4,16}$/;
export function normLearning(value) {
  const list = value && typeof value === "object" ? Object.values(value) : [];
  return [...new Set(list.filter(k => typeof k === "string" && KEY_RE.test(k)).reverse())].slice(0, FEEDBACK_LIMIT).reverse();
}
// result: 1 elsőre jó · 2 tipp után jó · 0 hibás; assisted: súgót / segítséget használt. true = fejlődött.
export function noteLearning(u, key, result, assisted, today = dayNum()) {
  if (!key) return false;
  const items = normLearning(u.learningDifficulties), known = items.includes(key);
  if (result !== 1 || assisted) { u.learningDifficulties = normLearning([...items.filter(k => k !== key), key]); return false; }
  if (!known) return false;
  u.learningDifficulties = items.filter(k => k !== key);
  // a szülői fejlődés fülhöz: napi darabszám a meglévő napi összesítőben (u.days)
  const d = (u.days = u.days || {})[dateKey(today)] = u.days[dateKey(today)] || { n: 0, ok: 0, ms: 0, done: false };
  d.imp = (d.imp || 0) + 1;
  return true;
}
// Fejlődések száma egy időszakban (a szülői fülhöz)
export function improvementsIn(u, from, to = dayNum()) {
  let n = 0; for (let d = from; d <= to; d++) n += +((u.days || {})[dateKey(d)]?.imp) || 0; return n;
}
