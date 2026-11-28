// ===== 🔊 Felolvasó hang választása a szülői menüben (eszközönként) =====
// A hangok listája a böngészőtől függ; a választás ebben a böngészőben tárolódik (nem megy fel a felhőbe).
import { el, btn, escHtml as esc, toast } from "../core/dom.js";
import { voicesFor, voiceGender, MALE_AUTO } from "../core/voices.js";
import { G, speak, voicePref, setVoicePref } from "./ctx.js";

// row: a „🔊 Felolvasás alapból bekapcsolva” sor – közvetlenül alá kerül a hangválasztó
export function voiceRow(after) {
  const row = el("div", "set-row voice-box");
  after.after(row);
  const draw = () => {
    const lang = G().speechLang || "hu-HU";
    const list = typeof speechSynthesis !== "undefined" ? voicesFor(speechSynthesis.getVoices(), lang) : [];
    row.replaceChildren();
    const lab = el("label", "set-label", `🗣️ Felolvasó hang – ezen az eszközön<span class="set-help">Női vagy férfi hang, vagy egy konkrét hang a böngésző hangjai közül. Női magyar hang pl. iPaden (Mariska), Chrome-ban (Google magyar), Edge-ben (Noémi) van, férfi pl. Windowson (Szabolcs) és Edge-ben (Tamás). A választás ezen az eszközön marad.</span>`);
    const ctl = el("div", "set-ctl");
    if (!list.length) { ctl.append(el("span", "soft small", "Ezen az eszközön a böngésző nem ad magyar felolvasó hangot.")); row.append(lab, ctl); return; }
    const sel = el("select"); sel.id = "set-voice"; lab.htmlFor = sel.id;
    const opt = (value, text) => { const o = el("option"); o.value = value; o.textContent = text; sel.append(o); };
    const has = g => list.some(v => voiceGender(v) === g);
    opt("", `Női hang (automatikus)${has("női") ? "" : " – itt nincs, a gép hangja szól"}`);
    opt(MALE_AUTO, `Férfi hang (automatikus)${has("férfi") ? "" : " – itt nincs, a gép hangja szól"}`);
    list.forEach(v => opt(v.name, `${v.name}${voiceGender(v) ? ` – ${voiceGender(v)}` : ""}`));
    const cur = voicePref();
    sel.value = cur === MALE_AUTO || list.some(v => v.name === cur) ? cur : "";
    sel.addEventListener("change", () => { setVoicePref(sel.value); toast(`✅ Felolvasó hang: ${esc(sel.options[sel.selectedIndex].textContent)}`); });
    ctl.append(sel, btn("secondary", "▶ Meghallgatom", () => speak("Szia! Így hangzik a felolvasás. Ügyes vagy!")));
    row.append(lab, ctl);
  };
  draw();
  // a hangok listája néha később töltődik be (Chrome)
  if (typeof speechSynthesis !== "undefined" && speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", draw, { once: true });
  return row;
}
