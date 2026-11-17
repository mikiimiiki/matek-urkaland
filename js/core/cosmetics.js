// ===== Kinyitható tárgyak – játékfüggetlen segédek =====
// A játék adja: a tárgykatalógust, a rangból kinyílt azonosítókat, és a gyerek saját (pl. ünnepi) tárgyait (u.owned).

// Kinyitott tárgyak halmaza: a rangból jövők + a megszerzett (owned) tárgyak
export function unlockedSet(rankIds, owned) { return new Set([...(rankIds || []), ...(owned || [])]); }

// A felszerelt tárgy egy fajtából; ha nincs kinyitva (vagy nincs ilyen), az alapértelmezés
export function equipped(slotValue, kind, unlocked, defaults) {
  return slotValue && unlocked.has(slotValue) ? slotValue : defaults[kind];
}

// Téma alkalmazása CSS-változókkal a gyökérelemen (pl. { space1: "#000" } → --space1)
export function applyVars(vars, root = typeof document !== "undefined" ? document.documentElement : null) {
  if (!root || !vars) return;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty("--" + k, v));
}
// Egy elem osztályainak cseréje egy előtag szerint (pl. "rk-" → a régi rk-* osztályok le, az új fel)
export function swapClass(elm, prefix, cls) {
  if (!elm) return;
  [...elm.classList].filter(c => c.startsWith(prefix)).forEach(c => elm.classList.remove(c));
  if (cls) elm.classList.add(cls);
}
