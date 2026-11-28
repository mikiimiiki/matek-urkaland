// ===== 🔊 Felolvasó hang kiválasztása =====
// A böngésző hangjai eszközönként mások (pl. iPad: Mariska, Chrome: Google magyar, Edge: Noémi, Windows: Szabolcs).
// Alapból női hangot keresünk; a szülő eszközönként választhat (a választás a böngészőben tárolódik, nem a felhőben).
const FEMALE = /noémi|noemi|mariska|tünde|tunde|krisztina|zsófia|zsofia|eszter|google magyar|katja|anna|petra|marlene|vicki|helena|hedda|female|\bnő\b|woman/i;
const MALE = /szabolcs|tamás|tamas|stefan|markus|conrad|hans|yannick|male|\bférfi\b|\bman\b/i;

export const voiceGender = v => { const n = `${v && v.name}`; return FEMALE.test(n) && !/\bmale\b/i.test(n.replace(/female/i, "")) ? "női" : MALE.test(n) ? "férfi" : ""; };
// Az adott nyelv hangjai (pl. "hu-HU" → minden hu-*), a kért nem (alapból női) elöl
export const MALE_AUTO = "@male";
export function voicesFor(voices, lang, want = "női") {
  const base = String(lang || "hu").slice(0, 2).toLowerCase();
  const list = (voices || []).filter(v => v && v.lang && v.lang.toLowerCase().startsWith(base));
  const rank = v => (voiceGender(v) === want ? 0 : voiceGender(v) === "" ? 1 : 2);
  return list.slice().sort((a, b) => rank(a) - rank(b) || (b.localService === true) - (a.localService === true));
}
// A felolvasáshoz használt hang: a választott (ha ezen az eszközön megvan), különben az első női (vagy „@male”: férfi), különben bármelyik
export function pickVoice(voices, lang, preferredName) {
  const list = voicesFor(voices, lang, preferredName === MALE_AUTO ? "férfi" : "női");
  return (preferredName && list.find(v => v.name === preferredName)) || list[0] || null;
}
