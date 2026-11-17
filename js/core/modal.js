// ===== Felugró ablakok, egymásra rakhatóan =====
// Minden ablak saját réteget kap, így egy ablakból nyitott kérdés (pl. törlés megerősítése, PIN)
// nem írja felül az alatta lévőt. Minden ablak gyorsbillentyű-kontextust is kap:
// Tab / Shift+Tab az ablak elemei között lép körbe (a fókusz nem szökik ki), Esc = Mégse.
import { el, btn, escHtml, focusables } from "./dom.js";
import * as keys from "./keys.js";

let depth = 0;
export const isOpen = () => depth > 0;

// build(box, close) rajzolja a tartalmat. Opciók:
//   esc: false → Esc-kel nem zárható; függvény(close) → saját Esc-viselkedés; alapból: bezárás
//   cls: plusz osztály a dobozra (pl. "wide"); onClose(v); keyCtx: plusz kontextusmezők (pl. onKey, onF1)
export function modal(build, { onClose, esc, cls = "", keyCtx = {} } = {}) {
  const layer = el("div", "modal on");
  layer.setAttribute("role", "dialog"); layer.setAttribute("aria-modal", "true");
  layer.style.zIndex = 50 + depth * 2;
  const box = el("div", "modal-box " + cls);
  layer.append(box);
  document.body.append(layer);
  depth++;
  const prevFocus = document.activeElement;
  let closed = false, pop = null;
  const close = v => {
    if (closed) return; closed = true;
    layer.remove(); depth--; if (pop) pop();
    if (prevFocus && prevFocus.isConnected) prevFocus.focus();
    if (onClose) onClose(v);
  };
  const doEsc = () => { if (esc === false) return; if (typeof esc === "function") esc(close); else close(); };
  build(box, close);
  pop = keys.push({ id: "modal", items: () => focusables(box), onEsc: doEsc, ...keyCtx });
  const f = box.querySelector("[autofocus], input, select, button.primary"); if (f) setTimeout(() => f.focus(), 30);
  return close;
}

export function ask({ title, text = "", value = null, ok = "OK", cancel = "Mégse", secret = false, type = "text" }) {
  return new Promise(res => {
    modal((box, close) => {
      box.append(el("h3", null, escHtml(title)));
      if (text) box.append(el("p", null, text));
      let inp = null;
      if (value !== null) {
        inp = el("input", "minp"); inp.value = value; inp.type = secret ? "password" : type; if (secret) inp.inputMode = "numeric";
        box.append(inp);
        inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); close(); res(inp.value); } });
      }
      const row = el("div", "mbtns");
      if (cancel) row.append(btn("secondary", cancel, () => { close(); res(null); }));
      row.append(btn("primary", ok, () => { close(); res(inp ? inp.value : true); }));
      box.append(row);
    }, { esc: close => { close(); res(null); } });
  });
}
