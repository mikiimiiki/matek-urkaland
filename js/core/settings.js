// ===== Leíró alapú beállítások =====
// Egy beállítás leírása: { key, scope: "family" | "child" | "device", type: "number" | "select" | "toggle" | "radio" | "text",
//   label, help, default, min, max, options: [érték] vagy [{ value, label, help }], unit, maxLength (szövegnél) }
// A keret ebből rajzolja az űrlapot, és ellenőrzi az értéket. A tárolást a játék adja meg (store objektum),
// így ugyanez a modul más játékhoz is jó.
import { el, escHtml } from "./dom.js";

export function clampValue(def, v) {
  if (def.type === "number") { let n = Math.round(Number(v)); if (!Number.isFinite(n)) n = def.default; if (def.min != null) n = Math.max(def.min, n); if (def.max != null) n = Math.min(def.max, n); return n; }
  if (def.type === "toggle") return !!v;
  if (def.type === "text") return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, def.maxLength || 80) || def.default;
  if (def.type === "select" || def.type === "radio") { const vals = def.options.map(o => typeof o === "object" ? o.value : o); return vals.some(x => String(x) === String(v)) ? vals.find(x => String(x) === String(v)) : def.default; }
  return v;
}
// Alapértékek egy hatókörre
export const defaultsFor = (defs, scope) => Object.fromEntries(defs.filter(d => d.scope === scope).map(d => [d.key, d.default]));
// Érvényes érték: a tárolt, ennek hiányában a tartalék (pl. családi alapérték), végül a leírás alapértéke
export const resolve = (def, stored, fallback) => clampValue(def, stored?.[def.key] ?? fallback?.[def.key] ?? def.default);

// Űrlap rajzolása. get(def) → aktuális érték; set(def, érték) → mentés (azonnal, minden változáskor)
export function renderForm(container, defs, get, set) {
  defs.forEach(def => {
    const row = el("div", "set-row");
    const id = "set-" + def.key;
    const lab = el("label", "set-label", `${escHtml(def.label)}${def.help ? `<span class="set-help">${escHtml(def.help)}</span>` : ""}`);
    lab.htmlFor = id;
    const ctl = el("div", "set-ctl");
    const v = get(def);
    if (def.type === "number") {
      const i = el("input"); i.type = "number"; i.id = id; i.value = v; if (def.min != null) i.min = def.min; if (def.max != null) i.max = def.max;
      i.addEventListener("change", () => { const n = clampValue(def, i.value); i.value = n; set(def, n); });
      ctl.append(i); if (def.unit) ctl.append(el("span", "soft", escHtml(def.unit)));
    } else if (def.type === "select") {
      const s = el("select"); s.id = id;
      def.options.forEach(o => { const val = typeof o === "object" ? o.value : o, op = el("option", null, escHtml(typeof o === "object" ? o.label : `${o}${def.unit ? " " + def.unit : ""}`)); op.value = val; if (String(val) === String(v)) op.selected = true; s.append(op); });
      s.addEventListener("change", () => set(def, clampValue(def, s.value)));
      ctl.append(s);
    } else if (def.type === "toggle") {
      const i = el("input"); i.type = "checkbox"; i.id = id; i.checked = !!v; i.className = "switch";
      i.addEventListener("change", () => set(def, i.checked));
      ctl.append(i);
    } else if (def.type === "text") {
      const i = el("input"); i.type = "text"; i.id = id; i.value = v; i.maxLength = def.maxLength || 80; i.autocomplete = "off";
      if (def.placeholder) i.placeholder = def.placeholder;
      i.addEventListener("change", () => { const t = clampValue(def, i.value); i.value = t; set(def, t); });
      ctl.append(i);
    } else if (def.type === "radio") {
      const g = el("div", "set-radios"); g.setAttribute("role", "radiogroup");
      def.options.forEach((o, k) => {
        const val = typeof o === "object" ? o.value : o, r = el("label", "set-radio" + (String(val) === String(v) ? " on" : ""));
        const i = el("input"); i.type = "radio"; i.name = id; i.value = val; i.checked = String(val) === String(v); if (k === 0) i.id = id;
        i.addEventListener("change", () => { g.querySelectorAll(".set-radio").forEach(x => x.classList.toggle("on", x.contains(i))); set(def, clampValue(def, val)); });
        r.append(i, el("span", null, `<b>${escHtml(typeof o === "object" ? o.label : String(o))}</b>${o.help ? `<br><span class="soft small">${escHtml(o.help)}</span>` : ""}`));
        g.append(r);
      });
      ctl.append(g);
    }
    row.append(lab, ctl);
    container.append(row);
  });
}
