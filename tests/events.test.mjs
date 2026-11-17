// Ünnepi események: dátumtartományok, egyszeri jutalmak, adventi naptár és pótlás.
// Futtatás: node tests/events.test.mjs
import { inRange, activeEvents, claimOnce, adventState, openWindow, adventDay, giveReward } from "../js/core/events.js";
import { EVENTS, PLUS_ROUND } from "../js/game/events.js";
import { keyToDay, dayNum, setToday, dateKey } from "../js/core/dates.js";
import { itemById } from "../js/game/cosmetics-catalog.js";

let fails = 0;
const ok = (c, msg) => { console.log((c ? "✓ " : "✗ ") + msg); if (!c) fails++; };
const D = k => keyToDay(k);
const ids = (k, kind) => activeEvents(EVENTS, D(k), kind).map(e => e.id).sort().join(",");
const ev = id => EVENTS.find(e => e.id === id);

// --- dátumtartományok (hónap- és évváltás)
ok(ids("2026-11-30") === "", "nov. 30.: nincs esemény");
ok(ids("2026-12-01") === "advent2026,winter", "dec. 1.: advent + hóesés");
ok(ids("2026-12-06") === "advent2026,santa2026,winter", "dec. 6.: Mikulás is");
ok(ids("2026-12-24") === "advent2026,winter,xmas2026", "dec. 24.: karácsony + az utolsó adventi ablak");
ok(ids("2026-12-25") === "winter,xmas2026", "dec. 25.: az advent véget ért, karácsony még tart");
ok(ids("2026-12-31") === "newyear2027,winter" && ids("2027-01-01") === "newyear2027,winter", "szilveszter és újév (évváltás)");
ok(ids("2027-01-06") === "winter" && ids("2027-01-07") === "", "a hóesés jan. 6-ig tart");
ok(inRange("12-01", "01-06", D("2027-12-15")), "a hóesés évente ismétlődik");
// a jutalom-tárgyak mind léteznek
ok(EVENTS.flatMap(e => [...(e.reward || []), ...(e.windows || []).flatMap(w => w.reward)]).every(r => r.pts || r.item.startsWith("st:") || itemById(r.item)), "minden ünnepi jutalom-tárgy szerepel a katalógusban");
ok(ev("advent2026").windows.length === 24, "24 adventi ablak");

// --- egyszeri esemény: csak a megfelelő napon, csak küldetés után, csak egyszer
{
  const u = { pts: 0, owned: [] }, S = ev("santa2026");
  ok(!claimOnce(u, S, { missionDone: true }, D("2026-12-05")), "Mikulás: dec. 5-én még nem");
  ok(!claimOnce(u, S, { missionDone: false }, D("2026-12-06")), "Mikulás: küldetés nélkül nem");
  const r = claimOnce(u, S, { missionDone: true }, D("2026-12-06"));
  ok(r && u.owned.includes("av:🎅") && u.pts === 100, "Mikulás: dec. 6-án küldetés után 🎅 + 100 ⛽");
  ok(!claimOnce(u, S, { missionDone: true }, D("2026-12-06")) && u.pts === 100, "Mikulás: csak egyszer");
  const n = { pts: 0, owned: [] };
  ok(claimOnce(n, ev("newyear2027"), { missionDone: true }, D("2027-01-01")) && n.owned.includes("frame:2027"), "újév: jan. 1-jén is megkapható");
  ok(giveReward(n, [{ item: "frame:2027" }]).length === 0, "a meglévő tárgy nem duplázódik");
}

// --- adventi naptár
{
  const A = ev("advent2026"), u = { pts: 0, owned: [] };
  const st = (day, c) => Object.fromEntries(adventState(u, A, c, D(day)).map(w => [w.day, w.state]));
  ok(adventDay(A, D("2026-12-03")) === 3 && adventDay(A, D("2026-12-25")) === 0, "adventi nap sorszáma");
  let s = st("2026-12-03", { todayOk: false, makeupOk: false });
  ok(s[3] === "wait" && s[4] === "future" && s[1] === "missed", "dec. 3., küldetés előtt: a mai vár, a holnapi zárva, a kihagyott „missed”");
  ok(!openWindow(u, A, 3, { todayOk: false, makeupOk: false }, D("2026-12-03")), "küldetés előtt a mai ablak nem nyílik");
  ok(!openWindow(u, A, 4, { todayOk: true, makeupOk: true }, D("2026-12-03")), "jövőbeli ablak nem nyílik");
  const r3 = openWindow(u, A, 3, { todayOk: true, makeupOk: false }, D("2026-12-03"));
  ok(r3 && u.pts === 30 && !r3.makeup, "küldetés után a mai (3.) ablak kinyílik: +30 ⛽");
  ok(!openWindow(u, A, 1, { todayOk: true, makeupOk: false }, D("2026-12-03")), "pótlás plusz kör nélkül nem megy");
  s = st("2026-12-03", { todayOk: true, makeupOk: true });
  ok(s[1] === "makeup" && s[2] === "makeup", "plusz kör után a kihagyott ablakok pótolhatók");
  const r1 = openWindow(u, A, 1, { todayOk: true, makeupOk: true }, D("2026-12-03"));
  ok(r1 && r1.makeup && u.pts === 50, "pótlás: az 1. ablak (+20 ⛽)");
  ok(!openWindow(u, A, 2, { todayOk: true, makeupOk: true }, D("2026-12-03")), "naponta legfeljebb egy pótlás");
  ok(st("2026-12-03", { todayOk: true, makeupOk: true })[2] === "missed", "a 2. ablak ma már nem pótolható");
  // másnap: előbb a mai ablak, utána pótolhat
  ok(!openWindow(u, A, 2, { todayOk: true, makeupOk: true }, D("2026-12-04")), "másnap a pótlás előtt a mai ablakot kell kinyitni");
  openWindow(u, A, 4, { todayOk: true, makeupOk: true }, D("2026-12-04"));
  ok(openWindow(u, A, 2, { todayOk: true, makeupOk: true }, D("2026-12-04")) && u.owned.includes("st:🦌"), "másnap a 2. ablak is pótolható (matrica)");
  ok(u.eventState.advent2026.opened.join() === "1,2,3,4", "a kinyitott ablakok listája");
  // 6. ablak: Mikulás-avatar, 24.: karácsonyi háttér és rakéta
  openWindow(u, A, 6, { todayOk: true }, D("2026-12-06"));
  openWindow(u, A, 24, { todayOk: true }, D("2026-12-24"));
  ok(u.owned.includes("av:🎅") && u.owned.includes("bg:xmas") && u.owned.includes("rocket:xmas"), "a különleges ablakok tárgyai a szekrénybe kerülnek");
  ok(PLUS_ROUND > 0, "a plusz kör mérete beállítva");
}

// --- dátum-felülírás (tesztkapcsoló)
setToday(D("2026-12-06")); ok(dateKey(dayNum()) === "2026-12-06", "a szimulált nap a dayNum()-ra hat"); setToday(null);
ok(dateKey(dayNum()) !== "2026-12-06" || new Date().getMonth() === 11, "a felülírás visszavonható");

console.log(fails ? `\n✗ ${fails} hiba` : "\n✓ Minden teszt rendben");
process.exit(fails ? 1 : 0);
