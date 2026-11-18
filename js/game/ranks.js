// ===== Ranglétra: 12 rang, rangonként kinyíló tárgyak =====
// A rang a ⛽ (u.pts) alapján számolódik, így a meglévő játékos azonnal a pontjainak megfelelő rangra kerül.
import { dayNum, dateKey } from "../core/dates.js";
import { SCORING } from "../core/scoring.js";

export const RANKS = [
  { name: "Űrkadét", pts: 0, unlocks: ["av:🧑‍🚀", "av:👩‍🚀", "av:👨‍🚀", "av:👽", "bg:night", "rocket:purple", "confetti:color", "frame:none"] },
  { name: "Pilóta", pts: 300, unlocks: ["av:🐱", "av:🦊", "av:🐼"] },
  { name: "Navigátor", pts: 700, unlocks: ["bg:nebula-purple"] },
  { name: "Felfedező", pts: 1200, unlocks: ["av:🐶", "av:🦄", "av:🐸"] },
  { name: "Kapitány", pts: 1800, unlocks: ["rocket:gold"] },
  { name: "Bolygójáró", pts: 2500, unlocks: ["bg:emerald"] },
  { name: "Csillagász", pts: 3300, unlocks: ["confetti:stars"] },
  { name: "Parancsnok", pts: 4200, unlocks: ["av:🐲", "av:🦁", "av:🤖", "frame:silver"] },
  { name: "Űrhajós-mester", pts: 5200, unlocks: ["bg:sunrise"] },
  { name: "Galaxis-őr", pts: 6300, unlocks: ["rocket:rainbow"] },
  { name: "Admirális", pts: 7500, unlocks: ["frame:gold", "av:🧑‍🚀👑"] },
  { name: "Csillagflotta-legenda", pts: 9000, unlocks: ["bg:legend"], title: "Legenda" },
];

export function rankIndex(pts) { let i = 0; while (i + 1 < RANKS.length && pts >= RANKS[i + 1].pts) i++; return i; }
export function rankOf(pts) {
  const i = rankIndex(pts), r = RANKS[i], next = RANKS[i + 1] || null;
  return { i, n: i + 1, total: RANKS.length, name: r.name, rank: r, next: next ? next.name : null, nextRank: next,
    pct: next ? (pts - r.pts) / (next.pts - r.pts) : 1, need: next ? next.pts - pts : 0 };
}
// A rangból kinyílt tárgyak
export const rankItems = pts => RANKS.slice(0, rankIndex(pts) + 1).flatMap(r => r.unlocks);
// Melyik rangnál nyílik egy tárgy (null: nem rangból jön, pl. ünnepi)
export function unlockRank(id) { const i = RANKS.findIndex(r => r.unlocks.includes(id)); return i < 0 ? null : RANKS[i]; }

// Egy nap ⛽-je: ha el van tárolva (days[].pts), azt; régebbi napoknál becslés a jó/rossz válaszokból
const dayPts = d => (d ? (d.pts != null ? d.pts : (d.ok || 0) * SCORING.first + ((d.n || 0) - (d.ok || 0)) * 3) : 0);
export const DEFAULT_PER_DAY = 120;
// „kb. Y nap”: az utolsó 7 nap átlagos napi ⛽-je alapján (adat nélkül 120 ⛽/nap)
export function daysTo(u, need, today = dayNum()) {
  if (need <= 0) return 0;
  let sum = 0; for (let d = today - 6; d <= today; d++) sum += dayPts((u.days || {})[dateKey(d)]);
  const per = sum > 0 ? sum / 7 : DEFAULT_PER_DAY;
  return Math.max(1, Math.ceil(need / per));
}
