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

// Felolvasásra kész szöveg: HTML-jelölés, emojik (📏 🧠 ⭐ 🦉 …), változatjelek és nyilak nélkül – a gép ne mondja ki őket
export const speechClean = s => String(s ?? "").replace(/<[^>]+>/g, " ")
  .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\u{FE0F}\u{FE0E}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}\u{2190}-\u{21FF}\u{2B05}-\u{2B07}\u{25A0}-\u{25FF}]/gu, " ")
  .replace(/\s+([,.!?:;)])/g, "$1").replace(/([(„])\s+/g, "$1").replace(/\s+/g, " ").trim();
