// Ranglétra és kinyitható tárgyak. Futtatás: node tests/ranks.test.mjs
import { RANKS, rankOf, rankIndex, rankItems, unlockRank, daysTo, DEFAULT_PER_DAY } from "../js/game/ranks.js";
import { ITEMS, DEFAULTS, itemById, KINDS } from "../js/game/cosmetics-catalog.js";
import { unlockedSet, equipped } from "../js/core/cosmetics.js";
import { dayNum, dateKey } from "../js/core/dates.js";
import * as E from "../js/engine.js";
import { migrateUser, migrateFamily } from "../js/game/migrate.js";
import { TYPES, makeTask } from "../js/types/index.js";
import { makeRng } from "../js/util.js";

let fails = 0;
const ok = (c, msg) => { console.log((c ? "✓ " : "✗ ") + msg); if (!c) fails++; };

ok(RANKS.length === 12 && RANKS.every((r, i) => !i || r.pts > RANKS[i - 1].pts), "12 rang, növekvő ⛽-határokkal");
ok(RANKS.flatMap(r => r.unlocks).every(id => itemById(id)), "minden rangjutalom szerepel a katalógusban");
ok(ITEMS.every(it => it.special ? !unlockRank(it.id) : unlockRank(it.id)), "minden (nem ünnepi) tárgy valamelyik rangnál nyílik, az ünnepiek nem");
ok(Object.entries(DEFAULTS).every(([k, id]) => RANKS[0].unlocks.includes(id) && itemById(id).kind === k), "az alapértelmezett tárgyak az első rangnál nyílnak");
ok(KINDS.every(K => ITEMS.some(it => it.kind === K.id)), "minden fajtából van tárgy");
ok(rankOf(0).name === "Űrkadét" && rankOf(299).n === 1 && rankOf(300).name === "Pilóta" && rankOf(1786).name === "Felfedező" && rankOf(99999).n === 12 && rankOf(99999).need === 0, "rang a ⛽ alapján");
ok(rankOf(1000).need === 200 && Math.abs(rankOf(1000).pct - 0.6) < 1e-9, "hiányzó ⛽ és sáv a következő rangig");
ok(rankItems(700).includes("bg:nebula-purple") && !rankItems(699).includes("bg:nebula-purple"), "a Navigátor rangnál nyílik a Lila köd");

// meglévő játékos: a régi avatar megmarad akkor is, ha a rang szerint még zárva lenne
{
  const st = { settings: {}, users: {} }; migrateFamily(st);
  const u = migrateUser(E.normUser({ name: "Régi", avatar: "🤖", pts: 50 }), st);
  const un = unlockedSet(rankItems(u.pts), u.owned);
  ok(un.has("av:🤖") && rankIndex(u.pts) === 0, "a régi (rang szerint zárt) avatar a szekrényben marad");
  ok(equipped("bg:sunrise", "bg", un, DEFAULTS) === "bg:night", "zárt háttér nem vehető fel (az alap marad)");
  ok(equipped("frame:gold", "frame", unlockedSet(rankItems(7500), []), DEFAULTS) === "frame:gold", "kinyitott tárgy felvehető");
}
// „kb. Y nap” az utolsó 7 nap átlagából
{
  const t = dayNum(), u = { days: {} };
  ok(daysTo(u, 600, t) === Math.ceil(600 / DEFAULT_PER_DAY), "adat nélkül 120 ⛽/nappal becsül");
  u.days[dateKey(t)] = { n: 10, ok: 10, pts: 140 }; u.days[dateKey(t - 3)] = { n: 10, ok: 10, pts: 140 }; u.days[dateKey(t - 10)] = { n: 99, ok: 99, pts: 9999 };
  ok(daysTo(u, 400, t) === 10, "2 × 140 ⛽ az utolsó 7 napban → 40 ⛽/nap → 400 ⛽ = 10 nap (a 7 napnál régebbi nem számít)");
  u.days[dateKey(t - 1)] = { n: 5, ok: 4 };   // régi nap, pts nélkül: becslés
  ok(daysTo(u, 0, t) === 0 && daysTo(u, 1, t) === 1, "határesetek");
}
// a napi ⛽ rögzítése
{
  const rng = makeRng(2), u = E.newUser("X"); const T = TYPES[0];
  const ev = E.record(u, makeTask(T, T.subs[0].id, 1, rng), 1, 1000, {});
  ok(u.days[dateKey(dayNum())].pts === ev.pts && ev.pts > 0, "a record() a napi ⛽-t is eltárolja");
}

console.log(fails ? `\n✗ ${fails} hiba` : "\n✓ Minden teszt rendben");
process.exit(fails ? 1 : 0);
