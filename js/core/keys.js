// ===== Gyorsbillentyű-modul (kontextusverem) =====
// Minden képernyő és felugró ablak megad egy "kontextust": mi történjen Tab, Shift+Tab, Enter, Esc, F1
// és egyéb billentyűk hatására. A billentyű mindig a legfelső kontextushoz megy. Így bármilyen tartalommal
// (más játékkal is) ugyanúgy működik – a tartalom csak a kontextust írja le.
//
// Kontextus mezői (mind elhagyható):
//   id            – azonosító (hibakereséshez)
//   items()       – a Tab / Shift+Tab ezek között lép körbe; ha nincs megadva, a böngésző alapviselkedése marad
//   onEnter(el,e) – Enter; true-t ad vissza, ha lekezelte (különben a böngésző alapja: a gomb megnyomása)
//   onEsc(e)      – Esc
//   onF1(el,e)    – F1 (a böngésző saját súgóját letiltjuk)
//   onKey(e)      – minden más billentyű; true, ha lekezelte

const stack = [];      // felugró ablakok kontextusai
let screenCtx = null;  // az aktuális képernyő kontextusa (a verem alja)

export const setScreen = ctx => { screenCtx = ctx; };
export function push(ctx) { stack.push(ctx); return () => { const i = stack.lastIndexOf(ctx); if (i >= 0) stack.splice(i, 1); }; }
export const top = () => stack[stack.length - 1] || screenCtx;
export const hasOverlay = () => stack.length > 0;

function cycle(items, back) {
  if (!items.length) return;
  const i = items.indexOf(document.activeElement);
  const n = i < 0 ? (back ? items.length - 1 : 0) : (i + (back ? -1 : 1) + items.length) % items.length;
  items[n].focus();
  items[n].scrollIntoView({ block: "nearest", behavior: "smooth" });
}

document.addEventListener("keydown", e => {
  const c = top();
  if (!c) return;
  const a = document.activeElement;
  if (e.key === "F1") { e.preventDefault(); if (c.onF1) c.onF1(a, e); return; }
  if (e.key === "Escape") { if (e.repeat) return; e.preventDefault(); if (c.onEsc) c.onEsc(e); return; }
  if (e.key === "Tab" && c.items) { e.preventDefault(); cycle(c.items().filter(Boolean), e.shiftKey); return; }
  if (e.key === "Enter" && c.onEnter && !e.defaultPrevented && !e.repeat) { if (c.onEnter(a, e)) e.preventDefault(); return; }
  if (c.onKey && c.onKey(e)) e.preventDefault();
});
