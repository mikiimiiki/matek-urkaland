// ===== Feladattípusok nyilvántartása =====
// Új típus felvétele: új fájl a types mappában + egy sor ide. A sorrend = a bolygók sorrendje a térképen.
import T1 from "./t1_szamok.js";
import T3 from "./t3_mertekegyseg.js";
import T5 from "./t5_diagram.js";
import T8 from "./t8_minta.js";
import T4 from "./t4_ido.js";
import T6 from "./t6_kombinatorika.js";
import T10 from "./t10_szoveges.js";
import T9 from "./t9_penz.js";
import T13 from "./t13_szabaly.js";
import T2 from "./t2_muveletek.js";

export const TYPES = [T1, T2, T3, T5, T8, T4, T6, T10, T9, T13];

// Még nem elkészült típusok – a térképen szürke, "hamarosan" bolygóként jelennek meg
export const COMING = [
  { id: "T7", name: "Logika", emoji: "🧩" },
  { id: "T12", name: "Síkidomok", emoji: "📐" },
  { id: "T11", name: "Kockaépítmények", emoji: "🧊" },
];

export const typeById = id => TYPES.find(t => t.id === id);

// Elérhető altípusok egy szinten (minLvl / maxLvl szerint)
export const subsFor = (T, lvl) => T.subs.filter(s => (s.minLvl || 1) <= lvl && (s.maxLvl || 3) >= lvl);

// Feladat készítése: a generátor eredményét kiegészítjük az azonosítókkal
export function makeTask(T, subId, lvl, rng) {
  const s = T.subs.find(x => x.id === subId) || subsFor(T, lvl)[0];
  const task = s.gen(rng, lvl);
  return { ...task, type: T.id, sub: s.id, lvl };
}
