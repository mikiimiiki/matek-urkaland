import { TYPES, makeTask } from "../js/types/index.js";
import { makeRng, plain } from "../js/util.js";
import { correctText } from "../js/check.js";
const only = process.argv[2];
for (const T of TYPES) { if (only && T.id !== only) continue; for (const S of T.subs) for (let lvl = 1; lvl <= 3; lvl++) {
  if ((S.minLvl || 1) > lvl || (S.maxLvl || 3) < lvl) continue;
  const t = makeTask(T, S.id, lvl, makeRng(lvl * 31 + S.id.length * 7 + (+process.argv[3] || 0)));
  const strip = h => plain(h.replace(/<svg[\s\S]*?<\/svg>/g, " [ÁBRA] "));
  console.log(`--- ${T.id}.${S.id} L${lvl}\nQ: ${strip(t.q)}\nA: ${correctText(t.ans)}${t.ans.options ? "  opts=" + t.ans.options.join("/") : ""}\nH: ${strip(t.hint)}\nS: ${t.steps.map(strip).join(" ¦ ")}`);
}}
