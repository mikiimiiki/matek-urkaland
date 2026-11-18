// ===== Füles felugró ablak =====
// A fülek egy leíró listából jönnek: { id, icon, label, help, child, render(container, ctx) }.
// A "child: true" fülek fölött gyerekválasztó látszik. A legutóbbi fület és gyereket megjegyzi.
// Billentyűk: Tab / Shift+Tab az ablakon belül; ←/→ a fülsoron fület vált; 1–9 közvetlenül a fülre ugrik
// (ha nem beviteli mezőben állunk); Esc bezár; F1 a fül rövid súgóját mutatja.
import { el, btn, escHtml, toast } from "./dom.js";
import { modal } from "./modal.js";

const MEM = "tabs_last_";
const load = k => { try { return JSON.parse(localStorage.getItem(MEM + k) || "null"); } catch { return null; } };
const store = (k, v) => { try { localStorage.setItem(MEM + k, JSON.stringify(v)); } catch { /* privát mód */ } };

// opts: { id, title, tabs, children: () => [{ id, label }], startTab, startChild, ctx: () => objektum a fülek számára }
export function openTabs(opts) {
  const mem = load(opts.id) || {};
  let tabId = opts.startTab || mem.tab || opts.tabs[0].id;
  let childId = opts.startChild || mem.child || null;
  let api = null;
  modal((box, close) => {
    const head = el("div", "tabs-head");
    // üres címnél nincs fejléc-szöveg, csak a bezáró gomb (jobbra igazítva)
    if (opts.title) head.append(el("h3", null, escHtml(opts.title))); else { head.classList.add("notitle"); if (opts.ariaLabel) box.setAttribute("aria-label", opts.ariaLabel); }
    head.append(btn("ghost tabs-x", "✕", () => close()));
    head.lastChild.setAttribute("aria-label", "Bezárás (Esc)");
    const bar = el("div", "tabs-bar"); bar.setAttribute("role", "tablist");
    const kids = el("div", "tabs-kids");
    const body = el("div", "tabs-body"); body.setAttribute("role", "tabpanel");
    box.append(head, bar, kids, body);

    const draw = () => {
      if (!opts.tabs.some(t => t.id === tabId)) tabId = opts.tabs[0].id;
      const T = opts.tabs.find(t => t.id === tabId);
      const children = opts.children ? opts.children() : [];
      if (!children.some(c => c.id === childId)) childId = children[0] ? children[0].id : null;
      store(opts.id, { tab: tabId, child: childId });
      bar.innerHTML = "";
      opts.tabs.forEach((t, i) => {
        const b = btn("tab" + (t.id === tabId ? " on" : ""), `<span class="tab-ic">${t.icon}</span> ${escHtml(t.label)}`, () => { tabId = t.id; draw(); bar.querySelector(".tab.on").focus(); });
        b.setAttribute("role", "tab"); b.setAttribute("aria-selected", t.id === tabId); b.dataset.tab = t.id;
        b.title = `${t.label} (${i + 1})`;
        bar.append(b);
      });
      kids.innerHTML = "";
      kids.hidden = !T.child || children.length < 2;
      if (T.child) children.forEach(c => kids.append(btn("kid" + (c.id === childId ? " on" : ""), c.label, () => { childId = c.id; draw(); })));
      body.innerHTML = "";
      body.scrollTop = 0;
      T.render(body, { ...(opts.ctx ? opts.ctx() : {}), childId, redraw: draw, close });
    };
    const switchTo = i => { const t = opts.tabs[(i + opts.tabs.length) % opts.tabs.length]; tabId = t.id; draw(); };
    api = { draw, switchTo, get tab() { return tabId; } };
    draw();
    setTimeout(() => { const on = bar.querySelector(".tab.on"); if (on) on.focus(); }, 40);
  }, {
    cls: "wide tabs-modal",
    onClose: opts.onClose,
    keyCtx: {
      onKey: e => {
        const a = document.activeElement, inField = a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName);
        const idx = opts.tabs.findIndex(t => t.id === api.tab);
        if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && a && a.classList.contains("tab")) {
          api.switchTo(idx + (e.key === "ArrowRight" ? 1 : -1));
          setTimeout(() => document.querySelector(".tabs-bar .tab.on")?.focus(), 0);
          return true;
        }
        if (!inField && /^[1-9]$/.test(e.key) && +e.key <= opts.tabs.length && !e.ctrlKey && !e.altKey) { api.switchTo(+e.key - 1); setTimeout(() => document.querySelector(".tabs-bar .tab.on")?.focus(), 0); return true; }
        return false;
      },
      onF1: () => { const T = opts.tabs.find(t => t.id === api.tab); toast(`${T.icon} <b>${escHtml(T.label)}</b>: ${escHtml(T.help || "")}<br><span class="small">←/→ vagy 1–${opts.tabs.length}: fülváltás · Esc: bezárás</span>`, 5000); },
    },
  });
  return api;
}
