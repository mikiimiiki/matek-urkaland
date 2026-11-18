// ===== Lépésenkénti súgó: a válasz kitakarása a lépésekben =====
// A súgó (❓ / F1) a levezetés lépéseit mutatja, de a végeredményt a gyereknek kell kiszámolnia. Sok lépés
// ugyanis már kimondja az eredményt (pl. „9 dm ×10 → 90 cm”), ezért a súgóban a válasz helyére „?” kerül
// („9 dm ×10 → ? cm”). A hibás válasz utáni teljes magyarázat a kitakarás nélküli lépéseket mutatja.
// Csak a szöveget érinti (a HTML-címkéket és az SVG-attribútumokat nem), és csak akkor takar,
// ha a válasz nem szerepel már a feladat szövegében (ott nem árul el semmit).
import { plain } from "./util.js";

const W = "0-9A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű";                       // „szó” karakterek: ezek nem lehetnek a találat mellett
const SEP = "(?:[\\s\\u00a0\\u202f\\u2009]|&nbsp;|&#160;|&#8239;)?"; // ezres tagolás (10 000 felett szóköz)
const reEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const htmlEsc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Egy szám mintája: hármas csoportokban, opcionális elválasztóval (pl. 80640 → 80( )?640)
function numPattern(v) {
  let s = String(Math.abs(v)); const g = [];
  while (s.length > 3) { g.unshift(s.slice(-3)); s = s.slice(0, -3); }
  g.unshift(s);
  return (v < 0 ? "[−-]" : "") + g.join(SEP);
}
// A válasz szöveges alakjai mintaként
export function answerPatterns(A) {
  if (!A) return [];
  if (A.kind === "num") return [numPattern(A.value)];
  if (A.kind === "time") { const h = Math.floor(A.value / 60), m = A.value % 60; return [`${h}:${String(m).padStart(2, "0")}`]; }
  if (A.kind === "choice") { const o = String(A.options[A.value]); return [...new Set([reEsc(o), reEsc(htmlEsc(o))])]; }
  return []; // több elemű válasz (pick / numset / combos): nem egyetlen szöveg
}
const re = (pats, flags) => new RegExp(`(^|[^${W}])(?:${pats.join("|")})(?![${W}])`, flags);

// A lépés HTML-jében a válasz minden előfordulását „?”-re cseréli (csak a szövegrészekben)
export function maskAnswer(html, A, question = "", { svg = true } = {}) {
  const q = plain(question);
  const pats = answerPatterns(A).filter(p => !re([p], "").test(q));
  if (!pats.length) return html;
  const R = re(pats, "g");
  let inSvg = 0; // svg: false → az ábrákon (pl. sorszámozott minták címkéi) nem takarunk
  return String(html).split(/(<[^>]*>)/).map(part => {
    if (part.startsWith("<")) { if (/^<svg\b/i.test(part)) inSvg++; else if (/^<\/svg>/i.test(part)) inSvg = Math.max(0, inSvg - 1); return part; }
    return !svg && inSvg ? part : part.replace(R, (m, pre) => pre + "?");
  }).join("");
}

// A súgó lépései (a keret task.helpSteps-ként mutatja): az utolsó lépés (a végeredmény) nélkül, kitakart válasszal.
// Több elemű válasznál (felsorolás, több megoldás) az utolsó előtti lépés is kimarad, mert az a teljes listát adja.
// Ahol a lépés szerkezete árulja el a választ (✅/❌ táblázat, kisnégyzetek megszámozása), ott csak a tipp jön.
const ONLY_HINT = new Set(["T13.melyik", "T12.terulet"]);
const MULTI = new Set(["numset", "pick", "combos"]);
// help: a generátor saját, eleve biztonságos súgólépései (kiemelés és eredmény nélkül) – ezeket nem takarjuk ki.
const NO_SVG_MASK = /^T8\./; // mintás feladatok: az ábra sorszámai csak véletlenül egyeznek a válasszal
export function helpSteps(steps, A, question, key = "", help = null) {
  if (ONLY_HINT.has(key)) return [];
  const own = Array.isArray(help), all = (own ? help : steps) || [];
  const keep = MULTI.has(A && A.kind) ? Math.max(1, all.length - 2) : all.length - 1;
  const svg = !NO_SVG_MASK.test(key);
  return all.slice(0, Math.max(0, keep)).filter(s => s).map(s => own ? s : maskAnswer(s, A, question, { svg }));
}
