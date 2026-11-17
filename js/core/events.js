// ===== Időszakos események motorja – játékfüggetlen =====
// Eseményleíró: { id, kind: "once" | "advent" | "ambient", from, to, ... }
//   from/to: "ÉÉÉÉ-HH-NN" (egyszeri) vagy "HH-NN" (évente ismétlődik; átnyúlhat az évfordulón, pl. 12-01 → 01-06)
//   once:    when (feltétel neve), reward: [{ item } | { pts } ...], title, text
//   advent:  windows: [{ day: 1..24, reward: [...] }]
//   ambient: effect (pl. "snow")
// A gyerek eseményállapota: u.eventState[id]; a megszerzett tárgyak: u.owned.
import { dayNum, dateKey, keyToDay } from "./dates.js";

const mmdd = n => dateKey(n).slice(5);
export function inRange(from, to, day = dayNum()) {
  if (from.length === 10) return day >= keyToDay(from) && day <= keyToDay(to);
  const d = mmdd(day);
  return from <= to ? d >= from && d <= to : d >= from || d <= to;   // évfordulón átnyúló tartomány
}
export const activeEvents = (events, day = dayNum(), kind) => events.filter(e => (!kind || e.kind === kind) && inRange(e.from, e.to, day));

// Jutalom jóváírása: tárgy → u.owned (ismétlés nélkül), ⛽ → u.pts. Visszaadja, mi lett ténylegesen új.
export function giveReward(u, reward) {
  const got = [];
  (reward || []).forEach(r => {
    if (r.item) { u.owned = Array.isArray(u.owned) ? u.owned : []; if (!u.owned.includes(r.item)) { u.owned.push(r.item); got.push(r); } }
    if (r.pts) { u.pts = (u.pts || 0) + r.pts; got.push(r); }
  });
  return got;
}
const st = (u, id) => { u.eventState = u.eventState || {}; return (u.eventState[id] = u.eventState[id] || {}); };

// Egyszeri esemény: ha aktív, a feltétel teljesül, és még nem kapta meg → jóváírás. Visszaadja az eseményt, vagy null-t.
export function claimOnce(u, ev, conds, day = dayNum()) {
  if (ev.kind !== "once" || !inRange(ev.from, ev.to, day)) return null;
  const s = st(u, ev.id);
  if (s.done) return null;
  if (ev.when && !conds[ev.when]) return null;
  s.done = dateKey(day);
  return { ev, got: giveReward(u, ev.reward) };
}

// ---- Adventi naptár ----
// Ablak állapotai: open (kinyitva) · today (ma nyitható) · wait (ma, de még nincs teljesítve a feltétel)
//                  makeup (korábbi, kihagyott – most pótolható) · missed (kihagyott, most nem pótolható) · future (zárva)
export function adventDay(ev, day = dayNum()) { return inRange(ev.from, ev.to, day) ? day - keyToDay(ev.from) + 1 : 0; }
export function adventState(u, ev, { todayOk, makeupOk }, day = dayNum()) {
  const s = st(u, ev.id), opened = new Set(s.opened || []), n = adventDay(ev, day), usedToday = !!(s.makeup || {})[dateKey(day)];
  return ev.windows.map(w => {
    let state;
    if (opened.has(w.day)) state = "open";
    else if (w.day > n) state = "future";
    else if (w.day === n) state = todayOk ? "today" : "wait";
    else state = makeupOk && !usedToday && opened.has(n) ? "makeup" : "missed";
    return { ...w, state };
  });
}
// Ablak kinyitása (csak ha az állapota today vagy makeup). Pótlásnál naponta legfeljebb egy.
export function openWindow(u, ev, no, conds, day = dayNum()) {
  const w = adventState(u, ev, conds, day).find(x => x.day === no);
  if (!w || (w.state !== "today" && w.state !== "makeup")) return null;
  const s = st(u, ev.id);
  s.opened = [...new Set([...(s.opened || []), no])].sort((a, b) => a - b);
  if (w.state === "makeup") { s.makeup = s.makeup || {}; s.makeup[dateKey(day)] = no; }
  return { w, got: giveReward(u, w.reward), makeup: w.state === "makeup" };
}
