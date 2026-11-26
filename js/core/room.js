// A sorrend mentési szerződés: új helyet csak a végére tegyünk. Az üres hely is mentett érték.
export const ROOM_SLOTS = ["Bal polc", "Középső talapzat", "Jobb polc"];
export function roomLayout(saved, canUse = () => true) {
  const used = new Set();
  return ROOM_SLOTS.map((_, i) => {
    const id = saved && saved[i];
    if (typeof id !== "string" || !id || id.length > 200 || used.has(id) || !canUse(id)) return "";
    used.add(id); return id;
  });
}
export function placeInRoom(saved, slot, id, canUse) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= ROOM_SLOTS.length || typeof id !== "string" || id.length > 200 || (id && !canUse(id))) return null;
  const layout = roomLayout(saved, canUse).map(x => x === id ? "" : x);
  layout[slot] = id;
  return layout;
}
