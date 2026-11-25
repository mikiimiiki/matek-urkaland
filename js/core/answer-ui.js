// Közös válaszadó felületek. Az értelmezés és az elfogadás szabályait a tananyag adja.
import { el, btn } from "./dom.js";

export const isCompositionKey = e => !!(e && (e.isComposing || e.keyCode === 229 || e.key === "Process"));

function lifetime(io) {
  const controller = new AbortController();
  let timer, locked = false, submitting = false;
  const live = () => !controller.signal.aborted && !locked && io.answering();
  const lock = () => { locked = true; clearTimeout(timer); };
  return {
    live, lock,
    listen: (node, event, handler) => node.addEventListener(event, handler, { signal: controller.signal }),
    focus: node => { timer = setTimeout(() => { if (live() && node.isConnected && (io.canFocus?.() ?? true)) node.focus(); }, 30); },
    submit: () => {
      if (!live() || submitting) return;
      submitting = true;
      try { io.submit(); } finally { submitting = false; }
    },
    dispose: () => { lock(); controller.abort(); },
  };
}

// Az alapértelmezett eredmény az opció értéke; a Matek a sorszámát használja (0-tól).
export function choiceUI(box, io, { options, correct, getValue = option => option, onPick,
  className = "opts", shortcuts = true }) {
  const life = lifetime(io), row = el("div", className);
  row.setAttribute("role", "group"); row.setAttribute("aria-label", "Válaszlehetőségek");
  let selected = -1;
  const buttons = options.map((option, index) => {
    const button = btn("opt", "");
    button.textContent = String(option);
    if (shortcuts) button.setAttribute("aria-label", `${index + 1}. ${option}`);
    life.listen(button, "click", () => {
      if (!life.live() || button.disabled) return;
      selected = index;
      onPick?.(option, index);
      life.submit();
    });
    row.append(button);
    return button;
  });
  box.append(row);
  const lock = () => { life.lock(); buttons.forEach(button => { button.disabled = true; }); };
  return {
    auto: true, empty: "Válassz egyet!", read: () => selected < 0 ? null : getValue(options[selected], selected),
    markWrong: () => { const button = buttons[selected]; if (button) { button.classList.add("wrong"); button.disabled = true; } },
    markRight: () => { buttons[selected]?.classList.add("right"); lock(); },
    lock, dispose: life.dispose,
    showCorrect: () => { lock(); buttons.forEach((button, i) => {
      if ([].concat(correct).includes(getValue(options[i], i))) { button.classList.remove("wrong"); button.classList.add("right"); }
    }); },
    onKey: e => {
      if (!shortcuts || !life.live() || e.defaultPrevented || e.repeat || isCompositionKey(e) || e.ctrlKey || e.altKey || e.metaKey || !/^[1-4]$/.test(e.key)) return false;
      const button = buttons[Number(e.key) - 1];
      if (!button || button.disabled) return false;
      button.click(); return true;
    },
  };
}

function inputUI(box, io, opts) {
  const life = lifetime(io), controls = [], input = el("input", opts.className);
  let composing = false;
  input.type = "text"; input.autocomplete = "off";
  input.autocapitalize = "off"; input.spellcheck = false; input.setAttribute("autocorrect", "off");
  input.enterKeyHint = "done";
  if (opts.inputMode) input.inputMode = opts.inputMode;
  if (opts.maxLength != null) input.maxLength = opts.maxLength;
  if (opts.placeholder) input.placeholder = opts.placeholder;
  input.setAttribute("aria-label", opts.label);
  const update = () => {
    if (!life.live() || composing) return;
    if (opts.filter) input.value = opts.filter(input.value);
    input.classList.remove("wrong"); input.removeAttribute("aria-invalid");
  };
  life.listen(input, "input", update);
  life.listen(input, "compositionstart", () => { composing = true; });
  life.listen(input, "compositionend", () => { composing = false; update(); });
  life.listen(input, "keydown", e => {
    if (e.key !== "Enter" || composing || isCompositionKey(e) || e.defaultPrevented) return;
    e.preventDefault();
    if (!e.repeat) life.submit();
  });
  if (opts.unit) {
    const row = el("div", "ans-row"), unit = el("span", "unit"); unit.textContent = opts.unit;
    row.append(input, unit); box.append(row);
  } else if (opts.keypad) { const row = el("div", "ans-row"); row.append(input); box.append(row); }
  else box.append(input);
  if (opts.extraKeys?.length) {
    // különleges betűk (pl. ä ö ü ß): a kurzor helyére szúrja be; a gomb nem veszi el a fókuszt a mezőtől
    const bar = el("div", "xkeys");
    bar.setAttribute("role", "group"); bar.setAttribute("aria-label", "Különleges betűk");
    for (const ch of opts.extraKeys) {
      const button = btn("xkey", ""); button.textContent = ch; controls.push(button);
      button.setAttribute("aria-label", `${ch} beírása`);
      life.listen(button, "mousedown", e => e.preventDefault());
      life.listen(button, "click", () => {
        if (!life.live() || composing) return;
        const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
        const next = input.value.slice(0, a) + ch + input.value.slice(b);
        if (opts.maxLength != null && next.length > opts.maxLength) return;
        input.value = next; input.setSelectionRange?.(a + ch.length, a + ch.length);
        update(); input.focus();
      });
      bar.append(button);
    }
    box.append(bar);
  }
  if (opts.keypad) {
    const pad = el("div", "numpad");
    pad.setAttribute("role", "group"); pad.setAttribute("aria-label", "Számbillentyűzet");
    for (const digit of [..."1234567890", "⌫"]) {
      const button = btn("", digit); controls.push(button);
      if (digit === "⌫") button.setAttribute("aria-label", "Utolsó karakter törlése");
      life.listen(button, "click", () => {
        if (!life.live() || composing) return;
        const next = digit === "⌫" ? input.value.slice(0, -1) : input.value + digit;
        if (opts.maxLength == null || next.length <= opts.maxLength || digit === "⌫") input.value = next;
        update(); input.focus();
      });
      pad.append(button);
    }
    box.append(pad);
  }
  const lock = () => { life.lock(); input.disabled = true; controls.forEach(button => { button.disabled = true; }); };
  const mark = () => { input.classList.remove("wrong"); input.removeAttribute("aria-invalid"); input.classList.add("right"); };
  life.focus(input);
  return {
    auto: false, empty: opts.empty,
    read: () => composing || !input.value.trim() ? null : (opts.read ? opts.read(input.value) : input.value),
    markWrong: () => {
      input.classList.remove("wrong"); void input.offsetWidth; input.classList.add("wrong"); input.setAttribute("aria-invalid", "true");
      if (opts.selectOnWrong !== false) input.select();
    },
    markRight: () => { mark(); lock(); }, lock, dispose: life.dispose,
    showCorrect: () => { input.value = String(opts.correct ?? ""); mark(); lock(); },
  };
}

export const textUI = (box, io, opts = {}) => inputUI(box, io, {
  className: "typeinp", label: "Írd be a választ", empty: "Írd be a választ!", ...opts,
});
// Szöveges vezérlő numerikus mobilbillentyűzettel: nem írja felül a tananyag számformátumát.
export const numberUI = (box, io, opts = {}) => inputUI(box, io, {
  className: "ans-in", inputMode: "numeric", label: "Írd be a számot", empty: "Írj be egy számot!", ...opts,
});
