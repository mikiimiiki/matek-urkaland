// ===== 🔊 Felolvasó hang választása a szülői menüben (eszközönként) =====
// A hangok listája a böngészőtől függ; a választás ebben a böngészőben tárolódik (nem megy fel a felhőbe).
import { el, btn, escHtml as esc, toast } from "../core/dom.js";
import { voicesFor, voiceGender } from "../core/voices.js";
import { G, speak, voicePref, setVoicePref } from "./ctx.js";

export function voiceSection(box) {
  const wrap = el("div", "voice-box");
  box.append(el("h4", "psub", "🔊 Felolvasó hang – ezen az eszközön"), wrap);
  const draw = () => {
    const lang = G().speechLang || "hu-HU";
    const list = typeof speechSynthesis !== "undefined" ? voicesFor(speechSynthesis.getVoices(), lang) : [];
    wrap.replaceChildren();
    if (!list.length) {
      wrap.append(el("p", "soft small", "Ezen az eszközön a böngésző nem ad magyar felolvasó hangot. Próbáld Chrome-ban, Edge-ben vagy iPaden."));
      return;
    }
    const row = el("div", "set-row");
    const lab = el("label", "set-label", `Hang<span class="set-help">Alapból női hangot választunk, ha van. Női magyar hang pl. iPaden (Mariska), Chrome-ban (Google magyar) és Edge-ben (Noémi) van; Windowson gyakran csak a férfi „Szabolcs”.</span>`);
    const sel = el("select"); sel.id = "set-voice"; lab.htmlFor = sel.id;
    const opt = (value, text) => { const o = el("option"); o.value = value; o.textContent = text; sel.append(o); };
    const females = list.filter(v => voiceGender(v) === "női").length;
    opt("", females ? "Automatikus – női hang" : "Automatikus (itt nincs női hang)");
    list.forEach(v => opt(v.name, `${v.name}${voiceGender(v) ? ` – ${voiceGender(v)}` : ""}`));
    sel.value = list.some(v => v.name === voicePref()) ? voicePref() : "";
    sel.addEventListener("change", () => { setVoicePref(sel.value); toast(`✅ Felolvasó hang: ${esc(sel.value || "automatikus")}`); });
    const ctl = el("div", "set-ctl");
    ctl.append(sel, btn("secondary", "▶ Meghallgatom", () => speak("Szia! Így hangzik a felolvasás. Ügyes vagy!")));
    row.append(lab, ctl); wrap.append(row);
  };
  draw();
  // a hangok listája néha később töltődik be (Chrome)
  if (typeof speechSynthesis !== "undefined" && speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", draw, { once: true });
}
