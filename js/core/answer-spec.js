// ===== Felületleírás: a feladat kód helyett egy rövid leírást ad, a keret választja hozzá a felületet =====
// Példa: answer: { kind: "choice", options: ["der", "die", "das"], correct: "die" }
// Fajták: choice (választós), text (szöveg), number (szám), tiles (Betűkirakó), gap (hiányzó rész egy szóban).
// Saját felülethez a task.render marad.
import { choiceUI, textUI, numberUI } from "./answer-ui.js";
import { tilesUI } from "./tile-ui.js";
import { gapUI } from "./gap-ui.js";

// Magánhangzók a Betűkirakó segítségéhez, ha a tananyag nem ad saját szabályt (magyar és német ékezetekkel)
const VOWELS = /[aeiouyáéíóöőúüűäàâèêëîïôûù]/i;
// Szám kiolvasása: szóköz nélkül, tizedesvesszővel is; értelmezhetetlen bevitelnél null (a keret „Írj be egy számot!”-ot mond)
export const readNumber = value => {
  const s = String(value).replace(/\s+/g, "").replace(",", ".");
  return /^[-+]?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
};
// Gyakori különleges betűk a szövegmezők alá (answer: { kind: "text", extraKeys: GERMAN_KEYS })
export const GERMAN_KEYS = ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"];
export const HUNGARIAN_KEYS = ["á", "é", "í", "ó", "ö", "ő", "ú", "ü", "ű"];

const KINDS = {
  choice: s => (!Array.isArray(s.options) || s.options.length < 2 ? "options: legalább 2 elemű tömb szükséges" : null),
  text: () => null,
  number: () => null,
  tiles: s => (typeof s.word !== "string" || !s.word.trim() ? "word: nem üres szöveg szükséges" : null),
  gap: s => {
    if (typeof s.word !== "string" || !s.word) return "word: nem üres szöveg szükséges";
    if (typeof s.part !== "string" || !s.part) return "part: nem üres szöveg szükséges (a hiányzó rész)";
    const at = s.start ?? s.word.indexOf(s.part);
    if (!Number.isInteger(at) || at < 0 || s.word.slice(at, at + s.part.length) !== s.part) return "start/part: a hiányzó rész nem ezen a helyen áll a szóban";
    if ((s.input ?? "choice") === "choice" && (!Array.isArray(s.options) || s.options.length < 2 || !s.options.includes(s.part))) return "options: legalább 2 elem, köztük a helyes rész";
    if (s.input !== undefined && !["choice", "text"].includes(s.input)) return 'input: "choice" vagy "text"';
    return null;
  },
};
const FUNCS = ["read", "getValue", "onPick", "filter", "arrange", "isVowel"];

// Hibaüzenet (szöveg), ha a leírás hibás; null, ha rendben van
export function answerSpecProblem(spec) {
  if (spec === null || typeof spec !== "object" || Array.isArray(spec)) return "{ kind, … } objektum szükséges";
  if (!KINDS[spec.kind]) return `ismeretlen kind: ${spec.kind} (lehet: ${Object.keys(KINDS).join(", ")})`;
  for (const f of FUNCS) if (spec[f] !== undefined && typeof spec[f] !== "function") return `${f}: függvény szükséges`;
  if (spec.extraKeys !== undefined && (!Array.isArray(spec.extraKeys) || spec.extraKeys.some(k => typeof k !== "string" || !k))) return "extraKeys: szövegtömb szükséges";
  return KINDS[spec.kind](spec);
}
// A leírás megoldása (a keret ehhez hasonlít, ha a feladatnak nincs saját check-je)
export const specSolution = spec => (spec.correct !== undefined ? spec.correct : spec.kind === "tiles" ? spec.word : spec.kind === "gap" ? spec.part : undefined);

export function renderAnswerSpec(box, io, spec, rng) {
  const { kind, ...o } = spec;
  if (kind === "choice") return choiceUI(box, io, o);
  if (kind === "text") return textUI(box, io, o);
  if (kind === "number") return numberUI(box, io, { read: readNumber, ...o });
  if (kind === "gap") return gapUI(box, io, { ...o, start: o.start ?? o.word.indexOf(o.part) });
  return tilesUI(box, io, { clueText: "", isVowel: ch => VOWELS.test(ch), arrange: a => (rng ? rng.shuffle(a) : a), ...o });
}
