// ===== A ❓ lépésenkénti súgó nem árulhatja el a választ =====
// Futtatás:  node tests/helpmask.test.mjs [N]
// Minden típusnál, altípusnál és szintnél N feladatot generál, és ellenőrzi, hogy a súgóban mutatható lépésekben
// (a csomag task.helpSteps listája; ha üres, a tipp) nem szerepel a válasz – kivéve, ha a feladat szövege is tartalmazza.
import { TYPES, makeTask } from "../js/pack/types/index.js";
import { makeRng, plain } from "../js/pack/util.js";
import { helpSteps, maskAnswer } from "../js/pack/helpmask.js";

const N = Number(process.argv[2] || 150);
let fails = 0;
const ok = (c, msg) => { console.log((c ? "✓ " : "✗ ") + msg); if (!c) fails++; };
const W = "0-9a-záéíóöőúüű", esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = s => plain(String(s)).replace(/ /g, " ").replace(/\s+/g, " ").toLowerCase();
const has = (text, f) => new RegExp(`(^|[^${W}])${esc(norm(f))}($|[^${W}])`, "i").test(norm(text));
function forms(A) {
  if (A.kind === "num") { const v = A.value, f = [String(v)]; if (v >= 1000) f.push(String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ")); return f; }
  if (A.kind === "time") return [`${Math.floor(A.value / 60)}:${String(A.value % 60).padStart(2, "0")}`];
  if (A.kind === "choice") return [String(A.options[A.value])];
  return [];
}

// a kitakarás alapesetei
ok(maskAnswer("9 dm ×10 → <b>90</b> cm", { kind: "num", value: 90 }, "Váltsd át! 9 dm = ? cm") === "9 dm ×10 → <b>?</b> cm", "kitakarás: a szám helyén ?");
ok(maskAnswer("8 hét → 80 640 perc", { kind: "num", value: 80640 }, "8 hét = ? perc") === "8 hét → ? perc", "kitakarás: ezres tagolású szám");
ok(maskAnswer('<text x="680">680</text> és 1680', { kind: "num", value: 680 }, "") === '<text x="680">?</text> és 1680', "kitakarás: a HTML-attribútum és a hosszabb szám marad");
ok(maskAnswer("A 618 a 610 és a 620 között van.", { kind: "num", value: 618 }, "Melyik a 618 szomszédja?") === "A 618 a 610 és a 620 között van.", "kitakarás: ha a feladat szövegében is ott van, nem takar");
ok(maskAnswer("15:05 → 15:20", { kind: "time", value: 920 }, "Mikor érkezett?") === "15:05 → ?", "kitakarás: időpont");

// minden altípus és szint
// ahol mindkét jelölt szándékosan látszik (a döntés – fel vagy le – a feladat lényege)
const BOTH_SHOWN = new Set(["T1.kerekites"]);
// ezeknél a súgó ábráján nem lehet kiemelve a helyes oszlop / eredmény
const NO_HL = { "T5.szelso": /fill="var\(--pri\)"/, "T5.szures": /fill="var\(--pri\)"/, "T5.kozepso": /fill="var\(--pri\)"/, "T1.kerekites": /var\(--ok\)/, "T1.szomszed": /var\(--ok\)/ };
const bad = [];
let checked = 0;
for (const T of TYPES) for (const S of T.subs) for (let lvl = 1; lvl <= 3; lvl++) {
  if ((S.minLvl || 1) > lvl || (S.maxLvl || 3) < lvl) continue;
  for (let i = 0; i < N; i++) {
    const t = makeTask(T, S.id, lvl, makeRng(i * 7919 + lvl * 104729 + 17));
    const q = t.q + " " + (t.viz || "");
    const key = T.id + "." + S.id, hs = helpSteps(t.steps, t.ans, q, key, t.help);
    if (hs.length >= t.steps.length) { bad.push(`${T.id}.${S.id}.L${lvl}: a súgó az utolsó lépést is mutatná`); break; }
    // mintás feladatok (T8): az ábra sorszámai csak véletlenül egyeznek a válasszal, azokat nem nézzük
    const vis = (hs.length ? hs : [t.hint]).join(" ").replace(/^T8\./.test(key) ? /<svg[\s\S]*?<\/svg>/g : /$^/, " ");
    const hit = BOTH_SHOWN.has(key) ? null : forms(t.ans).find(f => has(vis, f) && !has(q, f));
    checked++;
    if (NO_HL[key] && NO_HL[key].test(hs.join(""))) { bad.push(`${key}.L${lvl}: a súgó ábráján ki van emelve a válasz`); break; }
    if (BOTH_SHOWN.has(key) && /\?/.test(plain(hs[0] || ""))) { bad.push(`${key}.L${lvl}: a kitakarás „?”-lel árulja el, melyik a válasz`); break; }
    if (hit) { bad.push(`${T.id}.${S.id}.L${lvl}: „${hit}” látszik a súgóban – ${plain(t.q).slice(0, 80)}`); break; }
  }
}
ok(!bad.length, `a súgó egyik altípusnál sem árulja el a választ (${checked} feladat)` + (bad.length ? ":\n  " + bad.slice(0, 8).join("\n  ") : ""));
ok(helpSteps(["a", "b"], { kind: "choice", options: ["x", "y"], value: 0 }, "", "T13.melyik").length === 0, "a ✅/❌ táblázatos „melyik szabály” feladatnál csak a tipp jön");
ok(helpSteps(["módszer", "lista", "válasz"], { kind: "combos", value: ["A-B"] }, "").length === 1, "felsorolós feladatnál a teljes listát adó lépés is kimarad");

console.log(fails ? `\n✗ ${fails} hiba` : "\n✓ Minden teszt rendben");
process.exit(fails ? 1 : 0);
