// ===== T5 – Diagram leolvasása =====
// Oszlopdiagram különféle témákkal: leolvasás, különbség, összeg, legnagyobb/legkisebb,
// szűrés ("több mint…, de kevesebb mint…"), hányszor annyi, középső elem, igaz/hamis.
import { fmt, svg, txt, rect, line, esc, numVal, list, article } from "../util.js";

// -nál/-nél rag a kiejtett szám végződése szerint (pl. 80-nál, 140-nél, 2000-nél)
function nal(n) {
  const s = String(n);
  if (n % 1000 === 0) return s + "-nél";
  if (n % 100 === 0) return s + "-nál";
  if (n % 10 === 0) return s + ({ 1: "-nél", 2: "-nál", 3: "-nál", 4: "-nél", 5: "-nél", 6: "-nál", 7: "-nél", 8: "-nál", 9: "-nél" }[Math.floor(n / 10) % 10]);
  return s + ({ 1: "-nél", 2: "-nél", 3: "-nál", 4: "-nél", 5: "-nél", 6: "-nál", 7: "-nél", 8: "-nál", 9: "-nél" }[n % 10]);
}

// Témák. the(c): névelővel; minden kérdés ragozva, hogy természetes magyar mondat legyen.
const CTX = {
  leves: {
    title: "Levesek ára", axis: "ár (Ft)", unit: "Ft", base: 0, step: 100, grid: [200, 200, 500], min: 800, max: 4500,
    cats: ["sajtkrémleves", "halászlé", "gulyásleves", "frankfurti leves", "paradicsomleves", "bableves", "tyúkhúsleves", "gombaleves"],
    the: c => (/^[aáeéiíoóöőuúüű]/.test(c) ? "az " : "a ") + c,
    val: c => `Mennyibe kerül ${CTX.leves.the(c)}?`,
    diff: (x, y) => `Hány forinttal drágább ${CTX.leves.the(x)}, mint ${CTX.leves.the(y)}?`,
    sum: xs => `Mennyibe kerül együtt ${list(xs.map(CTX.leves.the))}?`,
    most: ["Melyik a legdrágább leves?", "Melyik a legolcsóbb leves?"],
    filt: (a, b) => `Mely levesek kerülnek többe ${fmt(a)} Ft-nál, de kevesebbe ${fmt(b)} Ft-nál?`,
    times: (x, y) => `Hányszor annyiba kerül ${CTX.leves.the(x)}, mint ${CTX.leves.the(y)}?`,
    mid: "Ha ár szerint sorba rendezzük a leveseket, melyik lesz középen?",
    more: (x, y, n) => `${cap(CTX.leves.the(x))} több mint ${fmt(n)} Ft-tal drágább, mint ${CTX.leves.the(y)}.`,
    dbl: (x, y) => `${cap(CTX.leves.the(x))} kétszer annyiba kerül, mint ${CTX.leves.the(y)}.`,
  },
  magassag: {
    title: "A lányok magassága", axis: "magasság (cm)", unit: "cm", base: 120, step: 2, grid: [2, 2, 4], min: 124, max: 152,
    cats: ["Andrea", "Bíborka", "Csenge", "Dia", "Emma", "Fanni", "Gerda", "Hanna"],
    the: c => c,
    val: c => `Hány cm magas ${c}?`,
    diff: (x, y) => `Hány cm-rel magasabb ${x}, mint ${y}?`,
    most: ["Ki a legmagasabb?", "Ki a legalacsonyabb?"],
    filt: (a, b) => `Kik magasabbak ${a} cm-nél, de alacsonyabbak ${b} cm-nél?`,
    mid: "Ha magasság szerint sorba állnak a lányok, ki áll középen?",
    more: (x, y, n) => `${x} több mint ${n} cm-rel magasabb, mint ${y}.`,
  },
  allat: {
    title: "Az állatkert állatainak életkora", axis: "életkor (év)", unit: "év", base: 0, step: 2, grid: [2, 2, 4], min: 2, max: 40,
    cats: ["víziló", "aligátor", "fóka", "gorilla", "strucc", "zsiráf", "elefánt", "teknős"],
    the: c => (/^[aáeéiíoóöőuúüű]/.test(c) ? "az " : "a ") + c,
    val: c => `Hány éves ${CTX.allat.the(c)}?`,
    diff: (x, y) => `Hány évvel idősebb ${CTX.allat.the(x)}, mint ${CTX.allat.the(y)}?`,
    sum: xs => `Hány évesek összesen: ${list(xs.map(CTX.allat.the))}?`,
    most: ["Melyik a legidősebb állat?", "Melyik a legfiatalabb állat?"],
    filt: (a, b) => `Mely állatok idősebbek ${a} évnél, de fiatalabbak ${b} évnél?`,
    times: (x, y) => `Hányszor annyi idős ${CTX.allat.the(x)}, mint ${CTX.allat.the(y)}?`,
    mid: "Ha életkor szerint sorba állítjuk az állatokat, melyik lesz középen?",
    more: (x, y, n) => `${cap(CTX.allat.the(x))} több mint ${n} évvel idősebb, mint ${CTX.allat.the(y)}.`,
    dbl: (x, y) => `${cap(CTX.allat.the(x))} kétszer annyi idős, mint ${CTX.allat.the(y)}.`,
  },
  konyv: {
    title: "Erika nyári olvasmányai", axis: "oldalszám", unit: "oldal", base: 0, step: 50, grid: [50, 50, 100], min: 50, max: 450,
    cats: ["Az emlékek őre", "Csí", "Harry Potter", "Kalandok a Balatonon", "Varázslóiskola", "Szeleburdi család", "Vuk", "Pál utcai fiúk"],
    the: c => `${/^(Az|A) /.test(c) ? "" : (/^[AÁEÉIÍOÓÖŐUÚÜŰ]/.test(c) ? "az " : "a ")}„${c}”`,
    val: c => `Hány oldalas ${CTX.konyv.the(c)}?`,
    diff: (x, y) => `Hány oldallal hosszabb ${CTX.konyv.the(x)}, mint ${CTX.konyv.the(y)}?`,
    sum: xs => `Hány oldal összesen ${list(xs.map(CTX.konyv.the))}?`,
    most: ["Melyik a leghosszabb könyv?", "Melyik a legrövidebb könyv?"],
    filt: (a, b) => `Mely könyvek hosszabbak ${a} oldalnál, de rövidebbek ${b} oldalnál?`,
    times: (x, y) => `Hányszor annyi oldalas ${CTX.konyv.the(x)}, mint ${CTX.konyv.the(y)}?`,
    mid: "Ha oldalszám szerint sorba rendezzük a könyveket, melyik lesz középen?",
    more: (x, y, n) => `${cap(CTX.konyv.the(x))} több mint ${n} oldallal hosszabb, mint ${CTX.konyv.the(y)}.`,
    dbl: (x, y) => `${cap(CTX.konyv.the(x))} kétszer annyi oldalas, mint ${CTX.konyv.the(y)}.`,
  },
  otos: {
    title: "Az osztályok ötöseinek száma", axis: "ötösök száma", unit: "", base: 0, step: 20, grid: [20, 20, 40], min: 20, max: 280,
    cats: ["3.a", "3.b", "3.c", "4.a", "4.b", "4.c"],
    the: c => (c[0] === "1" || c[0] === "5" ? "az " : "a ") + c,
    val: c => `Hány ötöst gyűjtött ${CTX.otos.the(c)} osztály?`,
    diff: (x, y) => `Mennyivel több ötöst gyűjtött ${CTX.otos.the(x)}, mint ${CTX.otos.the(y)}?`,
    sum: xs => `Hány ötöst gyűjtött összesen ${list(xs.map(CTX.otos.the))}?`,
    most: ["Melyik osztály gyűjtötte a legtöbb ötöst?", "Melyik osztály gyűjtötte a legkevesebb ötöst?"],
    filt: (a, b) => `Mely osztályok gyűjtöttek ${nal(a)} több, de ${nal(b)} kevesebb ötöst?`,
    times: (x, y) => `Hányszor annyi ötöst gyűjtött ${CTX.otos.the(x)}, mint ${CTX.otos.the(y)}?`,
    mid: null,
    more: (x, y, n) => `${cap(CTX.otos.the(x))} több mint ${numVal(n)} több ötöst gyűjtött, mint ${CTX.otos.the(y)}.`,
    dbl: (x, y) => `${cap(CTX.otos.the(x))} kétszer annyi ötöst gyűjtött, mint ${CTX.otos.the(y)}.`,
  },
  kozlekedes: {
    title: "Hogyan járnak iskolába a 4.b tanulói?", axis: "tanulók száma (fő)", unit: "fő", base: 0, step: 1, grid: [1, 1, 2], min: 1, max: 14,
    cats: ["gyalog", "kerékpárral", "rollerrel", "autóval", "busszal", "villamossal"],
    the: c => c,
    val: c => `Hány tanuló jár iskolába ${c}?`,
    diff: (x, y) => `Hányan járnak többen ${x}, mint ${y}?`,
    sum: xs => `Hány tanuló jár iskolába ${xs.slice(0, -1).join(", ")} vagy ${xs[xs.length - 1]}?`,
    most: ["Melyik módon járnak a legtöbben iskolába?", "Melyik módon járnak a legkevesebben iskolába?"],
    filt: (a, b) => `Melyik módon járnak ${nal(a)} többen, de ${nal(b)} kevesebben?`,
    times: (x, y) => `Hányszor annyian járnak ${x}, mint ${y}?`,
    mid: null,
    more: (x, y, n) => `${numVal(n)} többen járnak ${x}, mint ${y}.`.replace(/^/, "Több mint "),
    dbl: (x, y) => `Kétszer annyian járnak ${x}, mint ${y}.`,
  },
};
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// --- Oszlopdiagram (vízszintes oszlopok) ---
function chart(C, cats, vals, o = {}) {
  const gridStep = o.grid, base = C.base;
  const top = Math.ceil((Math.max(...vals) + C.step) / gridStep) * gridStep;
  const LW = 150, PW = 400, BH = 26, GAP = 12, T = 30;
  const H = T + cats.length * (BH + GAP) + 50;
  const X = v => LW + (v - base) / (top - base) * PW;
  let b = txt(LW + PW / 2, 18, C.title, { size: 15, w: 800 });
  const nT = (top - base) / gridStep, every = nT > 12 ? 2 : 1;
  for (let i = 0; i <= nT; i++) {
    const v = base + i * gridStep, x = X(v);
    b += line(x, T - 4, x, H - 44, { stroke: "var(--line)", sw: 1 });
    if (i % every === 0) b += txt(x, H - 28, fmt(v), { size: 11, w: 600, fill: "var(--soft)" });
  }
  if (base > 0) b += txt(LW - 4, H - 28, "≈", { size: 12, a: "end", fill: "var(--soft)" });
  b += txt(LW + PW / 2, H - 8, C.axis, { size: 12, w: 700, fill: "var(--soft)" });
  cats.forEach((c, i) => {
    const y = T + i * (BH + GAP), hl = (o.hl || []).includes(i);
    b += txt(LW - 8, y + BH / 2 + 5, c, { size: 13, a: "end", w: hl ? 800 : 600, fill: hl ? "var(--pri)" : "var(--ink)" });
    b += rect(LW, y, X(vals[i]) - LW, BH, { rx: 4, fill: hl ? "var(--pri)" : "var(--bar)" });
    if ((o.show || []).includes(i)) {
      b += line(X(vals[i]), y + BH, X(vals[i]), H - 44, { stroke: "var(--pri)", sw: 2, dash: "5 4" });
      b += `<rect x="${X(vals[i]) + 4}" y="${y + 3}" width="${String(fmt(vals[i])).length * 8 + 12}" height="20" rx="5" fill="var(--card)" stroke="var(--pri)" stroke-width="1.5"/>` + txt(X(vals[i]) + 10, y + 18, fmt(vals[i]), { size: 13, w: 800, a: "start", fill: "var(--pri)" });
    }
  });
  (o.marks || []).forEach(m => { b += line(X(m), T - 8, X(m), H - 44, { stroke: "var(--bad)", sw: 2.5, dash: "7 4" }) + txt(X(m), T - 10, fmt(m), { size: 12, w: 800, fill: "var(--bad)" }); });
  return svg(LW + PW + 70, H, b, "chart");
}

function makeData(C, rng, lvl) {
  const n = Math.min(C.cats.length, lvl === 1 ? 4 : lvl === 2 ? 5 : rng.int(6, 7));
  const cats = rng.sample(C.cats, n);
  const opts = [];
  for (let v = C.min; v <= C.max; v += C.step) opts.push(v);
  const vals = rng.sample(opts, n); // különböző értékek
  return { cats, vals };
}

const SUBS = ["leolvasas", "kulonbseg", "osszeg", "szelso", "szures", "hanyszor", "kozepso", "igazhamis"];
function gen(sub, rng, lvl) {
  const keys = Object.keys(CTX).filter(k => {
    const C = CTX[k];
    if (sub === "osszeg") return !!C.sum;
    if (sub === "hanyszor") return !!C.times;
    if (sub === "kozepso") return !!C.mid;
    return true;
  });
  // Az értékek mindig leolvashatók: rácsvonalra esnek (3. szinten két rácsvonal közé, félútra is)
  const C0 = CTX[rng.pick(keys)], grid = C0.grid[lvl - 1];
  const C = { ...C0, step: lvl < 3 ? grid : grid / 2 };
  C.min = Math.ceil(C0.min / C.step) * C.step;
  let { cats, vals } = makeData(C, rng, lvl);
  const n = cats.length, idx = [...Array(n).keys()];
  const u = C.unit ? " " + C.unit : "";
  const read = (is) => `Olvassuk le a diagramról: ` + is.map(i => `${cats[i]}: <b>${fmt(vals[i])}${u}</b>`).join(", ") + ".";
  const base = { viz: null, hint: "Keresd meg a diagramon a kérdezett oszlopo(ka)t, és kövesd a végüket lefelé a számegyenesig!" };
  const why = (v, ans) => {
    const other = vals.indexOf(v);
    if (other >= 0 && v !== ans) return `Ez ${C.the(cats[other])} értéke – figyelj, melyik sort kell nézni!`;
    if (Math.abs(v - ans) === grid || Math.abs(v - ans) === C.step) return "Majdnem! Egy rácsvonallal elcsúsztál – vonalzóval kövesd az oszlop végét lefelé.";
    return null;
  };

  if (sub === "leolvasas") {
    const i = rng.int(0, n - 1);
    return { ...base, sub, q: C.val(cats[i]), viz: chart(C, cats, vals, { grid }), ans: { kind: "num", value: vals[i], unit: C.unit },
      steps: [`Keressük meg a diagramon ezt a sort: <b>${cats[i]}</b>!` + chart(C, cats, vals, { grid, hl: [i] }), `Kövessük az oszlop végét lefelé a tengelyig:` + chart(C, cats, vals, { grid, hl: [i], show: [i] }), `A válasz: <b class="big">${fmt(vals[i])}${u}</b>`],
      why: v => why(v, vals[i]) };
  }
  if (sub === "kulonbseg") {
    let [i, j] = rng.sample(idx, 2); if (vals[i] < vals[j]) [i, j] = [j, i];
    const d = vals[i] - vals[j];
    return { ...base, sub, q: C.diff(cats[i], cats[j]), viz: chart(C, cats, vals, { grid }), ans: { kind: "num", value: d, unit: C.unit },
      steps: [read([i, j]) + chart(C, cats, vals, { grid, hl: [i, j], show: [i, j] }), `A „mennyivel több” kérdésre <b>kivonással</b> felelünk:`, `${fmt(vals[i])} − ${fmt(vals[j])} = <b class="big">${fmt(d)}${u}</b>`],
      why: v => v === vals[i] + vals[j] ? "Itt nem összeadni kell: a „mennyivel több” különbséget kérdez → kivonás." : why(v, d) };
  }
  if (sub === "osszeg") {
    const k = lvl === 3 ? 3 : 2, is = rng.sample(idx, k), s = is.reduce((a, i) => a + vals[i], 0);
    return { ...base, sub, q: C.sum(is.map(i => cats[i])), viz: chart(C, cats, vals, { grid }), ans: { kind: "num", value: s, unit: C.unit },
      steps: [read(is) + chart(C, cats, vals, { grid, hl: is, show: is }), `Összeadjuk: ${is.map(i => fmt(vals[i])).join(" + ")} = <b class="big">${fmt(s)}${u}</b>`],
      why: v => why(v, s) };
  }
  if (sub === "szelso") {
    const max = rng.chance(0.5), t = max ? Math.max(...vals) : Math.min(...vals), i = vals.indexOf(t);
    return { ...base, sub, q: C.most[max ? 0 : 1], viz: chart(C, cats, vals, { grid }), ans: { kind: "choice", options: cats.slice(), value: i },
      steps: [`${max ? "A leghosszabb" : "A legrövidebb"} oszlopot keressük.` + chart(C, cats, vals, { grid, hl: [i], show: [i] }), `A válasz: <b class="big">${cats[i]}</b> (${fmt(t)}${u})`],
      help: [`${max ? "A leghosszabb" : "A legrövidebb"} oszlopot keressük: melyik oszlop vége van ${max ? "a legmesszebb jobbra" : "a legközelebb a nullához"}?` + chart(C, cats, vals, { grid }), ""],
      why: k => { const w = vals[k]; return w === (max ? Math.min(...vals) : Math.max(...vals)) ? `Ez éppen a ${max ? "legkisebb" : "legnagyobb"} – a kérdés a ${max ? "legnagyobbat" : "legkisebbet"} kéri.` : null; } };
  }
  if (sub === "szures") {
    // két határ, egyik sem esik egybe oszlopértékkel (3. szinten egybeeshet – ott figyelni kell a "több mint" szigorúságára)
    for (let t = 0; t < 100; t++) {
      const a = Math.round(rng.int(C.min, C.max) / grid) * grid, b = a + rng.int(2, 6) * grid;
      if (b > C.max + grid) continue;
      if (lvl < 3 && (vals.includes(a) || vals.includes(b))) continue;
      const sol = idx.filter(i => vals[i] > a && vals[i] < b);
      if (!sol.length || sol.length === n) continue;
      return { ...base, sub, q: C.filt(a, b) + ` <b>Jelöld meg az összeset!</b>`, viz: chart(C, cats, vals, { grid }), ans: { kind: "pick", options: cats.slice(), value: sol },
        hint: `Húzz gondolatban két függőleges vonalat ${article(a)} ${fmt(a)} és ${article(b)} ${fmt(b)} értéknél! Mely oszlopok vége esik a kettő közé?`,
        help: [`Húzzunk két vonalat: ${fmt(a)}${u} és ${fmt(b)}${u}. Azok az oszlopok jók, amelyeknek a vége a két vonal <b>közé</b> esik.` + chart(C, cats, vals, { grid, marks: [a, b] }), "", ""],
        steps: [`Húzzunk két vonalat: ${fmt(a)}${u} és ${fmt(b)}${u}.` + chart(C, cats, vals, { grid, marks: [a, b], hl: sol }), `Azok az oszlopok jók, amelyeknek a vége a két vonal <b>közé</b> esik.` + (lvl === 3 && (vals.includes(a) || vals.includes(b)) ? " Figyelj: ami pontosan a vonalon van, az nem „több” és nem „kevesebb”!" : ""), `A megoldás: <b class="big">${sol.map(i => cats[i]).join(", ")}</b>`],
        why: ks => { const bad = ks.filter(k => !sol.includes(k)); return bad.length ? bad.map(k => `${cap(C.the(cats[k]))}: ${fmt(vals[k])}${u} – ez nincs ${fmt(a)} és ${fmt(b)} között.`).join("<br>") : null; } };
    }
    return gen("leolvasas", rng, lvl);
  }
  if (sub === "hanyszor") {
    const k = rng.int(2, lvl === 1 ? 3 : 5);
    const ys = []; for (let v = C.min; v * k <= C.max; v += C.step) ys.push(v);
    if (!ys.length) return gen("kulonbseg", rng, lvl);
    const y = rng.pick(ys), [i, j] = rng.sample(idx, 2);
    vals = vals.slice(); vals[j] = y; vals[i] = y * k;
    if (new Set(vals).size !== n) { for (let q = 0; q < n; q++) if (q !== i && q !== j && (vals[q] === y || vals[q] === y * k)) vals[q] = vals[q] + C.step <= C.max ? vals[q] + C.step : vals[q] - C.step; }
    if (new Set(vals).size !== n) return gen("kulonbseg", rng, lvl);
    return { ...base, sub, q: C.times(cats[i], cats[j]), viz: chart(C, cats, vals, { grid }), ans: { kind: "num", value: k },
      steps: [read([i, j]) + chart(C, cats, vals, { grid, hl: [i, j], show: [i, j] }), `A „hányszor annyi” kérdésre <b>osztással</b> felelünk: hányszor van meg a kisebb a nagyobban?`, `${fmt(vals[i])} : ${fmt(vals[j])} = <b class="big">${k}</b> – vagyis ${k}-szer annyi.`],
      why: v => v === vals[i] - vals[j] ? "A „hányszor annyi” nem különbséget kérdez – osztani kell, nem kivonni." : null };
  }
  if (sub === "kozepso") {
    if (n % 2 === 0) { cats = cats.slice(0, n - 1); vals = vals.slice(0, n - 1); }
    const m = cats.length, order = [...Array(m).keys()].sort((a, b) => vals[a] - vals[b]), mid = order[(m - 1) / 2];
    return { ...base, sub, q: C.mid, viz: chart(C, cats, vals, { grid }), ans: { kind: "choice", options: cats.slice(), value: mid },
      hint: "Rendezd sorba az oszlopokat a legrövidebbtől a leghosszabbig! Középen az áll, akitől mindkét irányban ugyanannyian vannak.",
      help: [`Rendezzük sorba az oszlopokat a legrövidebbtől a leghosszabbig!` + chart(C, cats, vals, { grid }), `${m} elem van, a középső a <b>${(m + 1) / 2}.</b> – előtte is, utána is ${(m - 1) / 2} van.`, ""],
      steps: [`Rendezzük sorba a legkisebbtől a legnagyobbig:<br>` + order.map(i => `${cats[i]} (${fmt(vals[i])})`).join(" &lt; "), `${m} elem van, a középső a <b>${(m + 1) / 2}.</b> – előtte is, utána is ${(m - 1) / 2} van.` + chart(C, cats, vals, { grid, hl: [mid], show: [mid] }), `A válasz: <b class="big">${cats[mid]}</b>`],
      why: k => k === order[0] || k === order[m - 1] ? "Ez a sor egyik szélén áll, nem középen." : null };
  }
  // igazhamis
  const [i, j] = (() => { let [a, b] = rng.sample(idx, 2); if (vals[a] < vals[b]) [a, b] = [b, a]; return [a, b]; })();
  const useDbl = C.dbl && rng.chance(0.35);
  let st, truth, expl;
  if (useDbl) {
    if (rng.chance(0.5) && vals[j] * 2 <= C.max) { vals = vals.slice(); vals[i] = vals[j] * 2; if (new Set(vals).size !== n) return gen("igazhamis", rng, lvl); }
    st = C.dbl(cats[i], cats[j]); truth = vals[i] === 2 * vals[j];
    expl = `${fmt(vals[j])} kétszerese: ${fmt(vals[j])} · 2 = ${fmt(vals[j] * 2)}. ${cap(C.the(cats[i]))} értéke ${fmt(vals[i])}${u}, tehát ez ${truth ? "<b>IGAZ</b>" : "<b>HAMIS</b>"}.`;
  } else {
    const d = vals[i] - vals[j];
    const N = Math.max(C.step, Math.round((d + (rng.chance(0.5) ? -1 : 1) * rng.int(1, 3) * C.step) / C.step) * C.step);
    st = C.more(cats[i], cats[j], N); truth = d > N;
    expl = `A különbség: ${fmt(vals[i])} − ${fmt(vals[j])} = ${fmt(d)}${u}. Ez ${truth ? "több" : "nem több"}, mint ${fmt(N)}, tehát az állítás ${truth ? "<b>IGAZ</b>" : "<b>HAMIS</b>"}.`;
  }
  const options = ["IGAZ", "HAMIS"];
  return { ...base, sub: "igazhamis", q: `IGAZ vagy HAMIS?<div class="qbig">${esc(st)}</div>`, viz: chart(C, cats, vals, { grid }), ans: { kind: "choice", options, value: truth ? 0 : 1 },
    hint: "Olvasd le a két értéket, és számold ki pontosan – ne csak ránézésre dönts!",
    steps: [read([i, j]) + chart(C, cats, vals, { grid, hl: [i, j], show: [i, j] }), expl], why: () => null };
}

export default {
  id: "T5",
  name: "Diagramok",
  planet: { name: "Diagram-domb", emoji: "📊", color: "#06b6d4" },
  subs: [
    { id: "leolvasas", name: "Leolvasás", gen: (r, l) => gen("leolvasas", r, l) },
    { id: "kulonbseg", name: "Mennyivel több?", gen: (r, l) => gen("kulonbseg", r, l) },
    { id: "osszeg", name: "Összesen", gen: (r, l) => gen("osszeg", r, l) },
    { id: "szelso", name: "Legnagyobb, legkisebb", gen: (r, l) => gen("szelso", r, l) },
    { id: "szures", name: "Között van", gen: (r, l) => gen("szures", r, l), minLvl: 2 },
    { id: "hanyszor", name: "Hányszor annyi?", gen: (r, l) => gen("hanyszor", r, l), minLvl: 2 },
    { id: "kozepso", name: "Ki áll középen?", gen: (r, l) => gen("kozepso", r, l) },
    { id: "igazhamis", name: "Igaz vagy hamis?", gen: (r, l) => gen("igazhamis", r, l), minLvl: 2 },
  ],
};
export { SUBS };
