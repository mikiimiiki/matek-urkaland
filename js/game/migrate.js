// ===== Adat-átállás: schema 1 → 2 =====
// - a családi beállítások (napi cél, kör hossza, felolvasás) gyerekenkéntiek lesznek (u.prefs),
//   a régi értékek a családi alapértékbe (state.settings.childDefaults) is bekerülnek;
// - a családi jutalomlista minden gyerekhez átmásolódik (u.rewards); az „átadva” jelölések megmaradnak;
// - a régi napi összesítés bekerül a fejlődés-adatokba (u.hist, „_all” kulcs);
// - az avatar a „szekrénybe” kerül (u.cosmetics, u.owned), hogy a későbbi rangrendszerben is megmaradjon.
// Amit a program nem ismer, azt nem törli. Többször lefuttatva sem változtat semmin.
import { backfill } from "../core/progress.js";
import { defaultsFor } from "../core/settings.js";
import { SETTINGS } from "./config.js";

export const SCHEMA = 2;
const clone = x => JSON.parse(JSON.stringify(x ?? null));

export function migrateFamily(state) {
  const s = (state.settings = state.settings || {});
  if (!s.childDefaults) {
    const d = defaultsFor(SETTINGS, "child");
    Object.keys(d).forEach(k => { if (s[k] !== undefined) d[k] = s[k]; });
    s.childDefaults = d;
  }
  return state;
}
export function migrateUser(u, state) {
  if (!u) return u;
  const fam = (state && state.settings) || {};
  if (!u.prefs) u.prefs = clone(fam.childDefaults || defaultsFor(SETTINGS, "child"));
  if (!Array.isArray(u.rewards)) u.rewards = clone(Array.isArray(fam.rewards) ? fam.rewards : Object.values(fam.rewards || {})) || [];
  if (!u.hist) backfill(u);
  if (!u.cosmetics) u.cosmetics = { avatar: u.avatar };
  if (!Array.isArray(u.owned)) u.owned = u.owned ? Object.values(u.owned) : (u.avatar ? ["av:" + u.avatar] : []);
  if ((u.schema || 1) < SCHEMA) u.schema = SCHEMA;
  return u;
}
