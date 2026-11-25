// Közös betűlapkák. A sorrend, a magánhangzók és az elfogadás szabályai a csomagból jönnek.
import { el, btn } from "./dom.js";
import { isCompositionKey } from "./answer-ui.js";

export function tilesUI(box, io, { word, clueText, arrange, isVowel }) {
  const letters = [...word.normalize("NFC")];
  if (!letters.length) throw new Error("A Betűkirakóhoz nem üres célszó szükséges.");
  const pool = arrange(letters.map((c, idx) => ({ c, idx }))), slots = new Array(letters.length).fill(null);
  let done = false;
  const life = new AbortController();
  const live = () => !done && !life.signal.aborted && io.answering();
  const listen = (node, fn) => { node.addEventListener("click", fn, { signal: life.signal }); return node; };
  const button = (cls, label, fn) => listen(btn(cls, label), fn);
  const clue = el("div", "clue-box"); clue.textContent = "💡 Jelentés: " + clueText; clue.style.display = "none";
  const row = el("div", "slotrow"), tiles = el("div", "tiles"), tb = new Map();
  pool.forEach(it => { const b = button("tile", "", () => pick(it.idx)); b.textContent = it.c; tb.set(it.idx, b); tiles.append(b); });
  const used = idx => tb.get(idx).classList.contains("used");
  const draw = () => {
    row.innerHTML = "";
    slots.forEach((s, pos) => {
      if (!s) { row.append(el("div", "slot-empty", "•")); return; }
      const b = btn("tile placed" + (s.locked ? " locked" : ""), ""); b.textContent = s.char;
      b.disabled = s.locked || done;
      b.setAttribute("data-pos", String(pos));
      row.append(b);
    });
  };
  listen(row, e => { const pos = e.target.closest?.("button[data-pos]")?.getAttribute("data-pos"); if (pos != null) remove(Number(pos)); });
  const full = () => slots.every(Boolean);
  function pick(idx) {
    if (!live() || used(idx)) return;
    const pos = slots.findIndex(s => s === null); if (pos < 0) return;
    tb.get(idx).classList.add("used");
    slots[pos] = { poolIdx: idx, char: pool.find(x => x.idx === idx).c, locked: false };
    draw(); if (full()) io.submit();
  }
  function remove(pos) { const s = slots[pos]; if (!live() || !s || s.locked) return; tb.get(s.poolIdx).classList.remove("used"); slots[pos] = null; draw(); }
  const clearFree = () => { slots.forEach((s, i) => { if (s && !s.locked) { tb.get(s.poolIdx).classList.remove("used"); slots[i] = null; } }); draw(); };
  function place(pred) {
    for (let pos = 0; pos < letters.length; pos++) {
      if (!pred(pos) || (slots[pos] && slots[pos].locked)) continue;
      const ch = letters[pos];
      if (slots[pos]) { tb.get(slots[pos].poolIdx).classList.remove("used"); slots[pos] = null; }
      let it = pool.find(x => x.c === ch && !used(x.idx));
      if (!it) { const o = slots.findIndex(s => s && !s.locked && s.char === ch); if (o >= 0) { const idx = slots[o].poolIdx; tb.get(idx).classList.remove("used"); slots[o] = null; it = pool.find(x => x.idx === idx); } }
      if (it) { tb.get(it.idx).classList.add("used"); slots[pos] = { poolIdx: it.idx, char: ch, locked: true }; }
    }
    draw(); if (full()) io.submit();
  }
  const bar = el("div", "help-bar");
  const hSyn = button("help-btn", "💡 Jelentés", () => { if (!live()) return; clue.style.display = "block"; hSyn.disabled = true; });
  const hV = button("help-btn pay", "🅰️ Magánhangzók", () => { if (!live()) return; io.useHelp(); hV.disabled = hE.disabled = true; place(p => isVowel(letters[p])); });
  const hE = button("help-btn pay", "↔️ Első és utolsó betű", () => { if (!live()) return; io.useHelp(); hV.disabled = hE.disabled = true; place(p => p === 0 || p === letters.length - 1); });
  hV.title = hE.title = "Segítség – kevesebb pontot ér";
  if (clueText) bar.append(hSyn); else hSyn.disabled = true;
  bar.append(hV, hE);
  const reset = button("secondary", "↺ Szabad betűk törlése", () => { if (live()) clearFree(); });
  box.append(clue, row, tiles, bar, el("div", "tiles-reset")); box.lastChild.append(reset);
  draw();
  const lock = () => { done = true; tiles.querySelectorAll("button").forEach(b => { b.disabled = true; }); bar.querySelectorAll("button").forEach(b => { b.disabled = true; }); reset.disabled = true; row.querySelectorAll("button").forEach(b => { b.disabled = true; }); };
  return {
    read: () => (full() ? slots.map(s => s.char).join("") : null), auto: true, empty: "Rakd ki az összes betűt!",
    // hiba után: a jó betűk zölden maradnak, a többi visszakerül
    markWrong: () => { slots.forEach((s, i) => { if (!s) return; if (s.char === letters[i]) s.locked = true; else { tb.get(s.poolIdx).classList.remove("used"); slots[i] = null; } }); draw(); io.toast("Majdnem! A jó betűk zölden maradtak, próbáld újra!"); },
    markRight: () => { lock(); slots.forEach(s => { if (s) s.locked = true; }); draw(); },
    lock, dispose: () => { lock(); life.abort(); },
    showCorrect: () => { lock(); row.innerHTML = ""; letters.forEach(c => { const b = btn("tile placed locked", ""); b.textContent = c; b.disabled = true; row.append(b); }); },
    onKey: e => {
      if (!live() || e.defaultPrevented || e.repeat || isCompositionKey(e) || e.ctrlKey || e.altKey || e.metaKey) return false;
      if (e.key === "Backspace") { for (let i = slots.length - 1; i >= 0; i--) if (slots[i] && !slots[i].locked) { remove(i); break; } return true; }
      const key = e.key.normalize("NFC");
      if ([...key].length === 1) {
        // 1. a következő üres helyre illő lapka (kis „s” → nagy „S”, ha ott az kell); 2. pontos egyezés; 3. kis-nagybetűtől függetlenül
        const free = pool.filter(x => !used(x.idx)), same = x => x.c.toLowerCase() === key.toLowerCase();
        const pos = slots.findIndex(s => s === null), want = pos >= 0 ? letters[pos] : null;
        const it = (want && want.toLowerCase() === key.toLowerCase() && free.find(x => x.c === want)) || free.find(x => x.c === key) || free.find(same);
        if (it) { pick(it.idx); return true; }
      }
      return false;
    },
  };
}
