// ===== Súgó (F1): mi vár egy témában? (a tartalom a csomagé: pack.help) =====
import { $, el, btn, escHtml as esc } from "../core/dom.js";
import { modal } from "../core/modal.js";
import { C, G } from "./ctx.js";
import { round, startFree, stepHelpPress, markLearningAid } from "./play.js";
import { freeSize } from "./home.js";

export const openTopicHelp = id => topicHelp(id, false);
function topicHelp(id, fromHome) {
  const H = C.pack.help(id);
  modal((box, close) => {
    box.classList.add("help-info");
    box.append(el("h3", null, esc(H.title)), el("p", "soft", `<b>${esc(H.subtitle || "")}</b>`));
    if (H.about) box.append(el("p", null, esc(H.about)));
    if (H.items && H.items.length) box.append(el("p", null, `<b>Ilyen feladatok várnak:</b> ${H.items.map(esc).join(" · ")}`));
    if (H.example) box.append(el("p", "ex", `Például: ${esc(H.example)}`));
    if (H.tip) box.append(el("p", null, `💡 <b>Tipp:</b> ${esc(H.tip)}`));
    const row = el("div", "mbtns");
    row.append(btn("secondary", "Bezár", () => close()));
    if (fromHome) row.append(btn("primary", `${G().logo} Indulás (${freeSize()} feladat)`, () => { close(); startFree(id); }));
    box.append(row);
  });
}
function overviewHelp() {
  const g = G();
  modal((box, close) => {
    box.append(el("h3", null, g.texts.helpTitle || "❓ Mi vár itt?"));
    box.append(el("p", "soft small", `Kattints egy ${g.topicWord.acc} (vagy lépj rá Tab-bal, és nyomd meg az Entert), hogy megtudd, milyen feladatok várnak ott!`));
    const list = el("div", "help-list");
    C.pack.topics.forEach(t => list.append(btn("", `<span style="font-size:24px">${t.icon}</span><span>${esc(t.place || t.name)}<br><span class="soft small">${esc(t.name)}</span></span>`, () => { close(); topicHelp(t.id, $("scr-home").classList.contains("on")); })));
    box.append(list);
    box.append(el("p", "small", "⌨️ <b>Tab</b> / <b>Shift+Tab</b>: lépés · <b>Enter</b>: indulás · <b>F1</b>: súgó · <b>Esc</b>: vissza a főmenübe"));
    const row = el("div", "mbtns"); row.append(btn("primary", "Bezár", () => close())); box.append(row);
  });
}
export function openHelp() {
  const S = round();
  if ($("scr-play").classList.contains("on") && S && S.task) { if (stepHelpPress()) return; markLearningAid(); return topicHelp(S.task.topic, false); }
  const a = document.activeElement, t = a && a.dataset && a.dataset.type;
  if ($("scr-home").classList.contains("on") && t) return topicHelp(t, true);
  overviewHelp();
}
