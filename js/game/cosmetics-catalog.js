// ===== A Matek Űrkaland kinyitható tárgyai =====
// Egy tárgy: { id: "fajta:érték", kind, label, show (amit a kártyán mutatunk), ... a megjelenítéshez szükséges adatok }
// A ranglétra (game/ranks.js) mondja meg, melyik rangnál nyílik. Az ünnepi (különleges) tárgyak az u.owned listából jönnek.

export const KINDS = [
  { id: "av", label: "Avatar", icon: "🧑‍🚀", slot: "avatar" },
  { id: "bg", label: "Háttér", icon: "🌌", slot: "bg" },
  { id: "rocket", label: "Rakéta", icon: "🚀", slot: "rocket" },
  { id: "confetti", label: "Konfetti", icon: "🎊", slot: "confetti" },
  { id: "frame", label: "Névkeret", icon: "🏷️", slot: "frame" },
];
// Alapértelmezés minden fajtából (a legelső rangnál nyílik)
export const DEFAULTS = { bg: "bg:night", rocket: "rocket:purple", confetti: "confetti:color", frame: "frame:none" };

const av = (e, label) => ({ id: "av:" + e, kind: "av", label, show: e, value: e });
export const ITEMS = [
  av("🧑‍🚀", "Űrhajós"), av("👩‍🚀", "Űrhajós lány"), av("👨‍🚀", "Űrhajós fiú"), av("👽", "Kis zöld"),
  av("🐱", "Cica"), av("🦊", "Róka"), av("🐼", "Panda"),
  av("🐶", "Kutyus"), av("🦄", "Egyszarvú"), av("🐸", "Béka"),
  av("🐲", "Sárkány"), av("🦁", "Oroszlán"), av("🤖", "Robot"),
  av("🧑‍🚀👑", "Királyi űrhajós"),
  // háttér: CSS-változók
  { id: "bg:night", kind: "bg", label: "Éjkék űr", vars: { space1: "#0b1026", space2: "#1e1b4b", glow: "#3b2a8a" } },
  { id: "bg:nebula-purple", kind: "bg", label: "Lila köd", vars: { space1: "#1a0b2e", space2: "#4c1d95", glow: "#c026d3" } },
  { id: "bg:emerald", kind: "bg", label: "Smaragd galaxis", vars: { space1: "#03201a", space2: "#065f46", glow: "#10b981" } },
  { id: "bg:sunrise", kind: "bg", label: "Napfelkelte-nebula", vars: { space1: "#2a0a12", space2: "#9a3412", glow: "#f59e0b" } },
  { id: "bg:legend", kind: "bg", label: "Legendás aurora", vars: { space1: "#020617", space2: "#1e3a8a", glow: "#22d3ee" } },
  // rakéta: CSS-osztály a kabalán
  { id: "rocket:purple", kind: "rocket", label: "Lila rakéta", show: "🚀", cls: "" },
  { id: "rocket:gold", kind: "rocket", label: "Arany rakéta", show: "🚀", cls: "rk-gold" },
  { id: "rocket:rainbow", kind: "rocket", label: "Szivárvány rakéta", show: "🚀", cls: "rk-rainbow" },
  // konfetti: színek és alak
  { id: "confetti:color", kind: "confetti", label: "Színes konfetti", show: "🎊", colors: ["#7c3aed", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4", "#facc15"], shape: "rect" },
  { id: "confetti:stars", kind: "confetti", label: "Csillageső", show: "🌠", colors: ["#fde68a", "#facc15", "#ffffff", "#c4b5fd"], shape: "star" },
  // névkeret a felső sávban
  { id: "frame:none", kind: "frame", label: "Nincs keret", show: "▫️", cls: "" },
  { id: "frame:silver", kind: "frame", label: "Ezüst keret", show: "🥈", cls: "fr-silver" },
  { id: "frame:gold", kind: "frame", label: "Arany keret", show: "🥇", cls: "fr-gold" },
];
export const itemById = id => ITEMS.find(i => i.id === id);
