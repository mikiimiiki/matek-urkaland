// ===== Matek csomag: válaszadó felületek =====
// Feladatonként egy vezérlőt ad vissza, amin keresztül a váz kiolvassa és jelöli a választ:
//   { read() → érték | null, empty (üzenet, ha nincs válasz), auto (a választás maga az ellenőrzés),
//     markWrong(), markRight(), lock(), showCorrect() }
// io: { submit() – ellenőrzés kérése (Enter), answering() – még válaszolhat-e, toast(üzenet) }
import { choiceUI, numberUI } from "../core/answer-ui.js";
import { el, btn } from "../core/dom.js";
import { esc } from "./util.js";
import { parseNum, comboKey } from "./check.js";

const numericInputFilter = value => value.replace(/[^\d\s]/g, "");

export function renderAnswer(A, box, io) {
  if (A.kind === "num") return numberUI(box, io, {
    correct: A.value, unit: A.unit, maxLength: 7, keypad: true, selectOnWrong: false,
    read: parseNum, filter: numericInputFilter,
  });
  if (A.kind === "choice") return choiceUI(box, io, {
    options: A.options, correct: A.value, getValue: (_, index) => index, shortcuts: false,
  });
  let activeInput = null;
  const numInput = (cls = "") => {
    const i = el("input", "ans-in " + cls); i.inputMode = "numeric"; i.autocomplete = "off"; i.maxLength = 7;
    i.addEventListener("focus", () => { activeInput = i; });
    i.addEventListener("input", () => { i.value = numericInputFilter(i.value); i.classList.remove("wrong"); });
    return i;
  };
  const numpad = () => {
    const p = el("div", "numpad");
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].forEach(d => p.append(btn("", d, () => { if (!io.answering() || !activeInput || activeInput.disabled) return; activeInput.value += d; activeInput.classList.remove("wrong"); activeInput.focus(); })));
    p.append(btn("", "⌫", () => { if (io.answering() && activeInput && !activeInput.disabled) { activeInput.value = activeInput.value.slice(0, -1); activeInput.focus(); } }));
    return p;
  };
  const enter = e => { if (e) e.preventDefault(); io.submit(); };
  const ui = { inputs: [], clicked: null, empty: "Írj be egy számot!", auto: false };
  ui.markWrong = () => {
    ui.inputs.forEach(i => { i.classList.remove("wrong"); void i.offsetWidth; i.classList.add("wrong"); });
    if (ui.clicked) { ui.clicked.classList.add("wrong"); ui.clicked.disabled = true; }
  };
  ui.markRight = () => {
    ui.inputs.forEach(i => { i.classList.remove("wrong"); i.classList.add("right"); i.disabled = true; });
    if (ui.clicked) ui.clicked.classList.add("right");
    if (A.kind === "pick") box.querySelectorAll(".opt.sel").forEach(b => b.classList.add("right"));
  };
  ui.lock = () => { ui.inputs.forEach(i => { i.disabled = true; }); box.querySelectorAll(".opt").forEach(b => { b.disabled = true; }); };

  if (A.kind === "time") {
    const row = el("div", "ans-row"), h = numInput("short"), m = numInput("short");
    h.maxLength = 2; m.maxLength = 2; h.placeholder = "óra"; m.placeholder = "perc";
    row.append(h, el("span", "unit", "óra"), m, el("span", "unit", "perc"));
    box.append(row, numpad());
    h.addEventListener("input", () => { if (h.value.length >= 2) m.focus(); });
    [h, m].forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") enter(e); if (e.key === ":" || e.key === ".") { e.preventDefault(); m.focus(); } }));
    ui.read = () => { const hh = parseNum(h.value), mm = m.value.trim() === "" ? 0 : parseNum(m.value); return hh == null || mm == null || mm > 59 || hh > 24 ? null : hh * 60 + mm; };
    ui.inputs = [h, m]; ui.empty = "Írd be az órát és a percet!";
    ui.showCorrect = () => { h.value = Math.floor(A.value / 60); m.value = String(A.value % 60).padStart(2, "0"); [h, m].forEach(i => { i.classList.remove("wrong"); i.classList.add("right"); }); };
    io.focus?.(h);
  } else if (A.kind === "pick") {
    const o = el("div", "opts"); let sel = [];
    A.options.forEach((txt, k) => { const b = btn("opt", esc(txt), () => { if (!io.answering()) return; b.classList.toggle("sel"); sel = b.classList.contains("sel") ? [...sel, k] : sel.filter(x => x !== k); }); o.append(b); });
    box.append(el("p", "soft small", "Kattints mindegyikre, amelyik jó! (Többet is választhatsz.)"), o);
    ui.read = () => (sel.length ? sel.slice() : null); ui.empty = "Jelölj meg legalább egyet!";
    ui.showCorrect = () => { const want = [].concat(A.value); box.querySelectorAll(".opt").forEach((b, k) => { b.classList.remove("sel"); if (want.includes(k)) b.classList.add("right"); }); };
  } else if (A.kind === "numset") {
    const row = el("div", "ans-row"), i = numInput(), chips = el("div", "chips"); let set = [];
    const drawChips = () => { chips.innerHTML = ""; set.forEach(v => { const c = el("span", "chip", String(v)); c.append(btn("", "✕", () => { set = set.filter(x => x !== v); drawChips(); })); chips.append(c); }); if (!set.length) chips.append(el("span", "soft small", "Ide kerülnek a beírt számok.")); };
    const add = () => { const v = parseNum(i.value); if (v == null) return false; if (!set.includes(v)) set.push(v); i.value = ""; drawChips(); i.focus(); return true; };
    row.append(i, btn("secondary", "➕ Hozzáad", add));
    box.append(el("p", "soft small", "Írj be egy számot, és nyomd meg a Hozzáad gombot (vagy az Entert). Az összes megoldást add meg!"), row, chips, numpad());
    i.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); if (!add()) enter(e); } });
    drawChips();
    ui.read = () => { if (i.value.trim()) add(); return set.length ? set.slice() : null; };
    ui.inputs = [i];
    ui.showCorrect = () => { i.value = ""; i.classList.remove("wrong"); i.classList.add("right"); chips.innerHTML = A.value.map(v => `<span class="chip" style="background:var(--okbg);color:var(--ok)">${v}</span>`).join(""); };
    io.focus?.(i);
  } else if (A.kind === "combos") renderCombos(A, box, io, ui);
  return ui;
}

// --- „Sorold fel az összes lehetőséget”: lehetőség-építő ---
// A gyerek betűgombokkal rak ki egy lehetőséget (a helyek a feladat szerint: torony szintjei, ruhadarabok,
// útvonal állomásai), felírja a listára, és kezdi a következőt. A listából bármelyiket törölheti.
function renderCombos(A, box, io, ui) {
  let list = [], cur = [];
  const item = k => A.items.find(i => i.k === k) || { k, n: k };
  const dot = k => item(k).c ? `<span class="dot" style="background:${item(k).c}"></span>` : "";
  const prefixLen = () => A.path ? 1 : (() => { let n = 0; while (A.slots[n] && A.slots[n].opts.length === 1) n++; return n; })();
  const reset = () => { cur = A.path ? [A.path.start] : []; while (A.slots && A.slots[cur.length] && A.slots[cur.length].opts.length === 1) cur.push(A.slots[cur.length].opts[0]); };
  const full = () => A.slots ? cur.length === A.slots.length : cur.length > 1 && cur[cur.length - 1] === A.path.end;
  const optsNow = () => {
    if (full()) return [];
    if (A.slots) { const o = A.slots[cur.length].opts; return A.ordered ? o : o.filter(x => !cur.includes(x)); }
    const last = cur[cur.length - 1];
    if (A.path.guided) return A.path.edges.filter(e => e[0] === last).map(e => e[1]);
    return A.items.map(i => i.k).filter(k => k !== A.path.start && !cur.includes(k));
  };
  const wrap = el("div", "combo"); wrap.tabIndex = 0;
  const curRow = el("div", "combo-cur"), optRow = el("div", "opts combo-opts"), ctl = el("div", "ans-row"), chips = el("div", "chips");
  const back = btn("secondary", "⌫ Vissza", () => { if (!io.answering()) return; if (cur.length > prefixLen()) cur.pop(); draw(); });
  const add = () => {
    if (!io.answering()) return false;
    if (!full()) { io.toast(A.path ? "Az útnak F-ben kell véget érnie!" : "Még nincs kész ez a lehetőség – töltsd ki az összes helyet!"); return false; }
    const k = comboKey(A, cur), dup = list.find(x => comboKey(A, x) === k);
    if (dup) { io.toast(A.ordered ? "Ezt már felírtad! 🙂" : `Ezt már felírtad: ${dup.join(" ")} – itt a sorrend nem számít.`); reset(); draw(); return true; }
    list.push(cur.slice()); reset(); draw(); wrap.focus(); return true;
  };
  const addBtn = btn("primary", "➕ Felírom a listára", add);
  function draw() {
    const n = A.slots ? A.slots.length : cur.length + (full() ? 0 : 1);
    curRow.innerHTML = Array.from({ length: n }, (_, i) => {
      const k = cur[i], lab = A.slots ? A.slots[i].label : `${i + 1}.`;
      return `<div class="slotw"><div class="slot ${k ? "filled" : ""} ${i === cur.length ? "next" : ""}">${k ? dot(k) + esc(k) : "?"}</div><div class="slot-l">${esc(lab)}</div></div>`;
    }).join(A.path ? `<span class="slot-arrow">→</span>` : "");
    optRow.innerHTML = "";
    optsNow().forEach(k => optRow.append(btn("opt", `${dot(k)}<b>${esc(k)}</b>${item(k).n ? ` <span class="small">${esc(item(k).n)}</span>` : ""}`, () => { if (!io.answering()) return; cur.push(k); draw(); })));
    if (full()) optRow.append(el("span", "soft small", "Kész ez a lehetőség – írd fel a listára!"));
    addBtn.disabled = !full();
    chips.innerHTML = "";
    list.forEach((x, i) => { const c = el("span", "chip", `${x.map(k => dot(k) + esc(k)).join(" ")}`); c.append(btn("", "✕", () => { if (!io.answering()) return; list.splice(i, 1); draw(); })); chips.append(c); });
    if (!list.length) chips.append(el("span", "soft small", "Itt gyűlnek a felírt lehetőségek."));
  }
  ctl.append(back, addBtn);
  wrap.append(el("p", "soft small", "Kattints a betűkre, így rakd ki az egyik lehetőséget, aztán írd fel a listára. Ha mindet felírtad, nyomd meg az Ellenőrzés gombot!"), curRow, optRow, ctl, el("div", "combo-title", "📝 A listád:"), chips);
  box.append(wrap);
  wrap.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); if (full()) add(); else io.submit(); }
    if (e.key === "Backspace") { e.preventDefault(); back.click(); }
  });
  reset(); draw();
  ui.read = () => (list.length ? list.map(x => x.slice()) : null);
  ui.empty = "Írj fel legalább egy lehetőséget a listára!";
  ui.showCorrect = () => { optRow.innerHTML = ""; addBtn.disabled = true; back.disabled = true; chips.innerHTML = A.value.map(v => `<span class="chip" style="background:var(--okbg);color:var(--ok)">${v.split("-").map(k => dot(k) + esc(k)).join(" ")}</span>`).join(""); };
  io.focus?.(wrap);
}
