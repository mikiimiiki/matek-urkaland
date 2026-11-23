// ===== Egy aktív lap: mindig az utoljára megnyitott (vagy átvett) lap ír – játékfüggetlen =====
// A tulajdonos a <kulcs>__tab_v1 alatt van: { id, t }. Az új lap induláskor átveszi; a régi lap ezt a
// böngésző „storage” eseményéből (vagy legkésőbb a következő írás előtti ellenőrzésből) észreveszi,
// abbahagyja az írást, és felajánlja: „Átveszem itt”. A localStorage nem zárolható atomikusan, ezért ez
// jó védelem, de nem szerveroldali zár: két, ugyanabban az ezredmásodpercben induló lap közül az utolsó nyer.
export const LEASE = "__tab_v1";
export const newTabId = () => "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function createTabLease({ key, storage, id = newTabId(), now = () => Date.now(), onLost = () => {} }) {
  const k = key + LEASE;
  let lost = false;
  const owner = () => { try { const v = JSON.parse(storage.getItem(k) || "null"); return v && v.id; } catch { return null; } };
  const api = {
    id,
    // átvétel: ettől kezdve ez a lap ír
    claim() { storage.setItem(k, JSON.stringify({ id, t: now() })); lost = false; return owner() === id; },
    // aktív-e még ez a lap (minden írás előtt ellenőrizzük)
    isActive() { const o = owner(); if (o && o !== id) { if (!lost) { lost = true; onLost(o); } return false; } return true; },
    // a böngésző „storage” eseménye: egy másik lap átvette
    onStorage(e) { if (e && e.key === k) api.isActive(); },
    get lost() { return lost; },
  };
  return api;
}
