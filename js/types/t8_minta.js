// ===== T8 – Ismétlődő minták =====
// "Milyen színű a 39. gyöngy?", "Hány sárga van az első 50 között?", "Hányadik lesz a 8. narancs?"
import { svg, txt, rect, circle, COLORS, list } from "../util.js";

const THEMES = [
  { intro: "Panka gyöngyöket fűz egy szálra. Ezt a mintát ismétli:", one: "gyöngy", re: "gyöngyre", bol: "gyöngyből", whole: "A nyaklánc" },
  { intro: "Egy kerítés léceit színesre festik. Ez a sorrend ismétlődik:", one: "léc", re: "lécre", bol: "lécből", whole: "A kerítés" },
  { intro: "A tengerparton egy sorban napernyők állnak. Ez a sorrend ismétlődik:", one: "napernyő", re: "napernyőre", bol: "napernyőből", whole: "A sor" },
  { intro: "Zénó zászlókat köt egy kötélre. Ez a sorrend ismétlődik:", one: "zászló", re: "zászlóra", bol: "zászlóból", whole: "A zászlósor" },
];
const PALETTE = ["P", "K", "S", "Z", "L", "N", "F", "R"];
const nm = k => COLORS[k].n;
const DARK_TEXT = new Set(["S", "F", "N", "Z", "R"]);

function makePattern(rng, lvl) {
  if (lvl === 1) return rng.sample(PALETTE, rng.int(3, 4));
  const k = rng.int(3, 4), cols = rng.sample(PALETTE, k), out = [];
  const runs = lvl === 2 ? cols.map(() => rng.int(1, 2)) : cols.map(() => rng.int(1, 4));
  if (runs.every(r => r === 1)) runs[0] = 2;
  cols.forEach((c, i) => { for (let j = 0; j < runs[i]; j++) out.push(c); });
  return out;
}

// Gyöngysor rajza: számozással, a csomagok (ismétlődő egységek) bekeretezve
function beads(seq, o = {}) {
  const r = 15, gap = 6, step = 2 * r + gap, L = o.L || seq.length;
  const n = seq.length, W = n * step + 20 + (o.more ? 40 : 0), H = o.nums ? 78 : 50;
  let b = "";
  if (o.boxes) for (let s = 0; s * L < n; s++) { const x = 10 + s * L * step - 3, w = Math.min(L, n - s * L) * step; b += rect(x, 4, w, 2 * r + 12, { rx: 12, fill: s % 2 ? "var(--pri-soft)" : "transparent", stroke: "var(--pri)", sw: 1.5 }); }
  seq.forEach((c, i) => {
    const x = 10 + i * step + r, y = 10 + r;
    const hl = (o.hl || []).includes(i);
    if (c === "?") { b += circle(x, y, r, { fill: "var(--card)", stroke: "var(--pri)", sw: 2.5 }) + txt(x, y + 6, "?", { size: 17, w: 800, fill: "var(--pri)" }); }
    else { b += circle(x, y, r, { fill: COLORS[c].c, stroke: hl ? "var(--ink)" : "rgba(0,0,0,.25)", sw: hl ? 4 : 1.5 }) + txt(x, y + 5, c, { size: 13, w: 800, fill: DARK_TEXT.has(c) ? "#1e293b" : "#fff" }); }
    if (o.nums) b += txt(x, 66, String((o.start || 1) + i), { size: 11, w: hl ? 800 : 500, fill: hl ? "var(--pri)" : "var(--soft)" });
  });
  if (o.more) b += txt(n * step + 30, 30, "…", { size: 22, w: 800 });
  return svg(W, H, b);
}
const legend = pat => [...new Set(pat)].map(c => `<span class="dot" style="background:${COLORS[c].c}"></span>${c} = ${nm(c)}`).join(" &nbsp; ");
const repeatN = (pat, n) => Array.from({ length: n }, (_, i) => pat[i % pat.length]);

function base(rng, lvl) {
  const pat = makePattern(rng, lvl), T = rng.pick(THEMES), L = pat.length;
  return { pat, T, L, intro: `${T.intro}<br>${beads(pat)}<div class="soft small">${legend(pat)}</div>` };
}

// --- 1. Milyen színű az n-edik? ---
function nedik(rng, lvl) {
  const { pat, T, L, intro } = base(rng, lvl);
  const N = lvl === 1 ? rng.int(L + 2, 30) : lvl === 2 ? rng.int(20, 80) : rng.int(60, 150);
  const q = Math.floor(N / L), r = N % L, c = pat[(N - 1) % L];
  const opts = [...new Set(pat)];
  const ex = r === 0
    ? `${N} : ${L} = ${q}, maradék <b>0</b>. Ez azt jelenti, hogy a ${N}. ${T.one} éppen egy csomag <b>utolsó</b> eleme.`
    : `${N} : ${L} = ${q}, maradék <b>${r}</b>. Tehát ${q} teljes csomag után a következő csomag <b>${r}.</b> eleme kell.`;
  return {
    sub: "nedik",
    q: `${intro}<p>Milyen színű a <b>${N}.</b> ${T.one}?</p>`,
    ans: { kind: "choice", options: opts.map(nm), value: opts.indexOf(c) },
    hint: `Egy „csomag” (ismétlődő rész) ${L} elemből áll. Hány teljes csomag fér bele ${N}-be, és mennyi marad?`,
    steps: [
      `Az ismétlődő rész („csomag”) <b>${L}</b> elemű. Rakjuk csomagokba a sort:` + beads(repeatN(pat, Math.min(L * 3, 27)), { L, boxes: true, nums: true, more: true }),
      `Osszuk el: ${ex}`,
      `${r === 0 ? "A csomag utolsó eleme" : `A csomag ${r}. eleme`}:` + beads(pat, { nums: true, hl: [(N - 1) % L] }) + `<b class="big">${nm(c)}</b>`,
    ],
    why: i => {
      const g = opts[i];
      if (r === 0 && g === pat[0] && pat[0] !== c) return "Ha a maradék 0, akkor a csomag UTOLSÓ eleme a jó, nem az első!";
      if (g === pat[r % L] && g !== c) return "Eggyel elcsúsztál: a maradék a csomagon belüli sorszámot adja meg (1-től számolva).";
      return null;
    },
  };
}

// --- 2. Hány darab egy színből az első N között? ---
function hanydb(rng, lvl) {
  const { pat, T, L, intro } = base(rng, lvl);
  const N = lvl === 1 ? rng.int(2, 5) * L + rng.int(0, L - 1) : lvl === 2 ? rng.int(20, 60) : rng.int(50, 140);
  const col = rng.pick([...new Set(pat)]);
  const per = pat.filter(x => x === col).length, q = Math.floor(N / L), r = N % L;
  const rest = pat.slice(0, r).filter(x => x === col).length, ans = q * per + rest;
  return {
    sub: "hanydb",
    q: `${intro}<p>Hány <b>${nm(col)}</b> ${T.one} van az első <b>${N}</b> ${T.one} között?</p>`,
    ans: { kind: "num", value: ans },
    hint: `Hány ${nm(col)} van egy csomagban? Hány teljes csomag van az első ${N}-ben? És a maradékban?`,
    steps: [
      `Egy csomag ${L} elemű, és benne <b>${per}</b> ${nm(col)} van.` + beads(pat, { nums: true, hl: pat.map((x, i) => x === col ? i : -1).filter(i => i >= 0) }),
      `${N} : ${L} = <b>${q}</b>, maradék <b>${r}</b>.<br>${q} teljes csomagban: ${q} · ${per} = <b>${q * per}</b> ${nm(col)}.`,
      r ? `A maradék ${r} elem a csomag eleje:` + beads(pat.slice(0, r), { nums: true, start: q * L + 1, hl: pat.slice(0, r).map((x, i) => x === col ? i : -1).filter(i => i >= 0) }) + `Ebben még <b>${rest}</b> ${nm(col)} van.` : `Nincs maradék, így nem kell semmit hozzáadni.`,
      `Összesen: ${q * per} + ${rest} = <b class="big">${ans}</b>`,
    ],
    why: v => {
      if (v === q * per && rest) return `Ne felejtsd el a maradék ${r} elemet! Abban is van ${rest} ${nm(col)}.`;
      if (v === q + (rest ? 1 : 0) && per > 1) return `Egy csomagban nem 1, hanem ${per} ${nm(col)} van!`;
      if (v === Math.round(N / [...new Set(pat)].length)) return "Nem egyformán sok van mindegyik színből – nézd meg, hányszor szerepel a szín egy csomagban!";
      return null;
    },
  };
}

// --- 3. Mennyivel több az egyik színből? ---
function kulonbseg(rng, lvl) {
  const { pat, T, L, intro } = base(rng, Math.max(2, lvl));
  const cs = [...new Set(pat)].map(c => [c, pat.filter(x => x === c).length]).sort((a, b) => b[1] - a[1]);
  if (cs[0][1] === cs[cs.length - 1][1]) return hanydb(rng, lvl);
  const N = rng.int(25, 90), q = Math.floor(N / L), r = N % L;
  const cnt = c => q * pat.filter(x => x === c).length + pat.slice(0, r).filter(x => x === c).length;
  let [A, B] = rng.sample(cs.map(x => x[0]), 2);
  if (cnt(A) < cnt(B)) [A, B] = [B, A];
  if (cnt(A) === cnt(B)) return hanydb(rng, lvl);
  const ans = cnt(A) - cnt(B);
  return {
    sub: "kulonbseg",
    q: `${intro}<p>Mennyivel több <b>${nm(A)}</b> ${T.one} van az első <b>${N}</b> között, mint <b>${nm(B)}</b>?</p>`,
    ans: { kind: "num", value: ans },
    hint: "Számold meg külön mindkét színt (teljes csomagok + maradék), aztán vond ki őket egymásból!",
    steps: [
      `${N} : ${L} = <b>${q}</b>, maradék <b>${r}</b>.` + beads(pat, { nums: true }),
      `${nm(A)}: ${q} · ${pat.filter(x => x === A).length} + ${pat.slice(0, r).filter(x => x === A).length} = <b>${cnt(A)}</b><br>${nm(B)}: ${q} · ${pat.filter(x => x === B).length} + ${pat.slice(0, r).filter(x => x === B).length} = <b>${cnt(B)}</b>`,
      `Különbség: ${cnt(A)} − ${cnt(B)} = <b class="big">${ans}</b>`,
    ],
    why: v => v === cnt(A) + cnt(B) ? "A „mennyivel több” különbséget kérdez → kivonás kell." : (v === cnt(A) || v === cnt(B)) ? "Ez csak az egyik szín darabszáma – a kettő különbségét kérdezzük." : null,
  };
}

// --- 4. Hányadik lesz a k-adik X? / Hány elemből áll a sor? ---
function hanyadik(rng, lvl) {
  const { pat, T, L, intro } = base(rng, lvl);
  const col = rng.pick([...new Set(pat)]);
  const pos = pat.map((x, i) => x === col ? i : -1).filter(i => i >= 0), per = pos.length;
  const k = lvl === 1 ? rng.int(2, 4) : rng.int(4, 12);
  const full = Math.floor((k - 1) / per), j = (k - 1) % per;
  const ans = full * L + pos[j] + 1;
  const ending = lvl >= 2 && j === per - 1 && rng.chance(0.6);
  const qtext = ending
    ? `<p>${T.whole} egy <b>${nm(col)}</b> ${T.re} végződik, és összesen <b>${k}</b> ${nm(col)} ${T.one} van benne. Hány ${T.bol} áll?</p>`
    : `<p>Hányadik ${T.one} lesz a <b>${k}.</b> ${nm(col)}?</p>`;
  return {
    sub: "hanyadik",
    q: intro + qtext,
    ans: { kind: "num", value: ans },
    hint: `Egy csomagban ${per} ${nm(col)} van. Hány teljes csomag kell, hogy meglegyen ${k - (j + 1)} ${nm(col)}, és utána hányadik helyen van a következő?`,
    steps: [
      `Egy csomag ${L} elemű, benne ${per} ${nm(col)}: ${list(pos.map(p => `a ${p + 1}.`))} helyen.` + beads(pat, { nums: true, hl: pos }),
      `${k} = ${full} · ${per} + ${j + 1}. Tehát <b>${full} teljes csomag</b> (${full * L} elem) után a következő csomag <b>${j + 1}.</b> ${nm(col)} elemét keressük.`,
      `Ez a csomagon belül a <b>${pos[j] + 1}.</b> hely. Így: ${full * L} + ${pos[j] + 1} = <b class="big">${ans}</b>`,
    ],
    why: v => {
      if (v === k * L) return "Nem minden csomag végén van ez a szín – nézd meg, hányadik helyen áll a csomagon belül!";
      if (v === full * L) return "Ez csak a teljes csomagok hossza – még hozzá kell adni a következő csomagban a helyét.";
      return null;
    },
  };
}

// --- 5. Melyik hiányzik? (1. szint) ---
function hianyzo(rng, lvl) {
  const { pat, T, L } = base(rng, lvl);
  const n = L * 3, seq = repeatN(pat, n);
  const gap = rng.int(L, n - 1), c = seq[gap];
  const shown = seq.slice(); shown[gap] = "?";
  const opts = [...new Set(pat)];
  return {
    sub: "hianyzo",
    q: `${T.intro.replace(" Ez a sorrend ismétlődik:", "").replace(" Ezt a mintát ismétli:", "")} Melyik szín hiányzik a <b>?</b> helyéről?<br>${beads(shown, { nums: true })}<div class="soft small">${legend(pat)}</div>`,
    ans: { kind: "choice", options: opts.map(nm), value: opts.indexOf(c) },
    hint: "Keresd meg, melyik rész ismétlődik! Hol kezdődik újra a minta?",
    steps: [
      `Az ismétlődő csomag: ${L} elem.` + beads(seq, { L, boxes: true, nums: true, hl: [gap] }),
      `A ? a ${gap + 1}. helyen van. Minden csomag ugyanúgy néz ki, így ugyanaz kerül oda, ami a csomag ${(gap % L) + 1}. helyén áll: <b class="big">${nm(c)}</b>`,
    ],
    why: () => null,
  };
}

export default {
  id: "T8",
  name: "Ismétlődő minták",
  planet: { name: "Minta-köd", emoji: "🌀", color: "#ec4899" },
  subs: [
    { id: "hianyzo", name: "Mi hiányzik?", gen: hianyzo, maxLvl: 1 },
    { id: "nedik", name: "Milyen az n-edik?", gen: nedik },
    { id: "hanydb", name: "Hány darab?", gen: hanydb },
    { id: "kulonbseg", name: "Mennyivel több?", gen: kulonbseg, minLvl: 2 },
    { id: "hanyadik", name: "Hányadik lesz?", gen: hanyadik },
  ],
};
