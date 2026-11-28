// ===== Hiányzó rész: egy szóban (vagy rövid szövegben) egy részt kell pótolni – választással vagy beírással =====
// Felületleírás: answer: { kind: "gap", word: "bútor", start: 1, part: "ú", options: ["ú", "u"], input: "choice" | "text" }
// A szó a válaszmezőben látszik, a hiány helyén aláhúzással; a választott / beírt rész azonnal bekerül a hiányba.
// Beírásnál a különleges betűk gombsora is megadható (extraKeys), pl. ä ö ü ß vagy á é í ó ö ő ú ü ű.
import { el } from "./dom.js";
import { choiceUI, textUI } from "./answer-ui.js";

export function gapUI(box, io, { word, start, part, options, input = "choice", extraKeys, placeholder, label }) {
  const before = word.slice(0, start), after = word.slice(start + part.length);
  const show = el("div", "word-display gap-word");
  const a = el("span"), gap = el("span", "gap"), b = el("span");
  a.textContent = before; b.textContent = after;
  // üres hiány: csak egy szaggatott aláhúzás (betűnyi széles hely, nem „_” jelek – azok dupla vonalnak látszanának)
  const n = [...part].length, blank = " ".repeat(n);
  gap.style.minWidth = `${0.75 * n + 0.4}em`;
  const fill = (v, state) => {
    gap.textContent = v ? v : blank;
    gap.classList.toggle("filled", !!v);
    gap.classList.remove("right", "wrong"); if (state) gap.classList.add(state);
  };
  show.append(a, gap, b); box.append(show); fill("");
  show.setAttribute("aria-label", `${before}…${after}`);
  let ui, field = null;
  if (input === "text") {
    ui = textUI(box, io, { correct: part, placeholder: placeholder || "A hiányzó rész…", label: label || "Írd be a hiányzó részt", empty: "Írd be a hiányzó részt!", extraKeys,
      className: "typeinp gap-inp" });
    field = [...box.querySelectorAll("input")].pop();
    field?.addEventListener("input", () => fill(field.value.trim()), { signal: io.signal });
  } else {
    ui = choiceUI(box, io, { options, correct: part, className: "opts word-opts gap-opts", onPick: v => fill(v) });
  }
  return Object.assign(Object.create(ui), {
    markWrong: () => { fill(ui.read?.() || "", "wrong"); ui.markWrong(); },
    markRight: () => { fill(part, "right"); ui.markRight(); },
    showCorrect: () => { fill(part, "right"); ui.showCorrect(); },
  });
}
