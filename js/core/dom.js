// ===== Kis DOM-segédek (a keret és a játék is használja) =====
export const $ = id => document.getElementById(id);
export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
export const btn = (cls, html, fn) => { const b = el("button", cls, html); b.type = "button"; if (fn) b.addEventListener("click", fn); return b; };
export const escHtml = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let toastT;
export function toast(msg, ms = 2800) {
  let t = $("toast");
  if (!t) { t = el("div", "toast"); t.id = "toast"; document.body.append(t); }
  t.innerHTML = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), ms);
}
// Fókuszálható elemek egy tárolón belül (látható, nem letiltott)
export const focusables = root => [...root.querySelectorAll("button, input, select, textarea, [tabindex]:not([tabindex='-1'])")]
  .filter(x => !x.disabled && x.offsetParent !== null);
