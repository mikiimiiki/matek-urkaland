// ===== Felületleírás: a feladat kód helyett egy rövid leírást ad, a keret választja hozzá a felületet =====
// Példa: answer: { kind: "choice", options: ["der", "die", "das"], correct: "die" }
// Fajták: choice (választós), text (szöveg), number (szám), tiles (Betűkirakó). Saját felülethez a task.render marad.
import { choiceUI, textUI, numberUI } from "./answer-ui.js";
import { tilesUI } from "./tile-ui.js";

// Magánhangzók a Betűkirakó segítségéhez, ha a tananyag nem ad saját szabályt (magyar és német ékezetekkel)
const VOWELS = /[aeiouyáéíóöőúüűäàâèêëîïôûù]/i;
// Szám kiolvasása: szóköz nélkül, tizedesvesszővel is; értelmezhetetlen bevitelnél null (a keret „Írj be egy számot!”-ot mond)
export const readNumber = value => {
  const s = String(value).replace(/\s+/g, "").replace(",", ".");
  return /^[-+]?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
};
// Gyakori különleges betűk a szövegmezők alá (answer: { kind: "text", extraKeys: GERMAN_KEYS })
export const GERMAN_KEYS = ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"];

const KINDS = {
  choice: s => (!Array.isArray(s.options) || s.options.length < 2 ? "options: legalább 2 elemű tömb szükséges" : null),
  text: () => null,
  number: () => null,
  tiles: s => (typeof s.word !== "string" || !s.word.trim() ? "word: nem üres szöveg szükséges" : null),
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
export const specSolution = spec => (spec.correct !== undefined ? spec.correct : spec.kind === "tiles" ? spec.word : undefined);

export function renderAnswerSpec(box, io, spec, rng) {
  const { kind, ...o } = spec;
  if (kind === "choice") return choiceUI(box, io, o);
  if (kind === "text") return textUI(box, io, o);
  if (kind === "number") return numberUI(box, io, { read: readNumber, ...o });
  return tilesUI(box, io, { clueText: "", isVowel: ch => VOWELS.test(ch), arrange: a => (rng ? rng.shuffle(a) : a), ...o });
}
