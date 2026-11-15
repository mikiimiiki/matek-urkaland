// ===== T4 – Idő és időtartam =====
// Óra leolvasása, eltelt idő, érkezés/indulás kiszámítása, menetrend, naptár.
import { svg, txt, line, circle, arrowDefs, hop, timeStr, timeWords, durWords, folkTime, hm } from "../util.js";

// Időpont kiírása raggal (suf: "kor" | "tól" | "ig"); a 2. szinttől néha népies alakban ("délután fél 3-kor")
const TOL = { 3: "tól", 6: "tól", 8: "tól" };
function sufWords(min, suf) { // 16 órakor, 16 óra 30 perckor, 16 órától, 16 óra 30 perctől, 16 óráig
  const { h, m } = hm(min);
  if (m) return `${h} óra ${m} ${{ kor: "perckor", tól: "perctől", ig: "percig" }[suf]}`;
  return `${h} ${{ kor: "órakor", tól: "órától", ig: "óráig" }[suf]}`;
}
function say(min, rng, lvl, suf) {
  const f = folkTime(min);
  if (lvl >= 2 && f && rng.chance(0.6)) {
    const h = hm(min).h, H = Number(f.split(" ").pop());
    const part = h < 5 ? "hajnali" : h < 10 ? "reggel" : h < 12 ? "délelőtt" : h < 18 ? "délután" : "este";
    return `${part} ${f}-${suf === "tól" ? (TOL[H] || "től") : suf}`;
  }
  return sufWords(min, suf);
}
const durSuf = (d, suf) => { const w = durWords(d); return w.endsWith("perc") ? w + (suf === "ig" ? "ig" : "") : w.replace(/óra$/, suf === "ig" ? "óráig" : "óra"); };

// Időszalag: ugrások a következő egész óráig, egész órákon át, a végéig
function timeline(a, b) {
  const W = 600, H = 120, pad = 46, y = 82;
  const X = v => pad + (v - a) / (b - a) * (W - 2 * pad);
  let s = arrowDefs + line(pad - 10, y, W - pad + 10, y, { sw: 2.5 });
  const pts = [a];
  for (let h = Math.ceil(a / 60) * 60; h < b; h += 60) if (h > a) pts.push(h);
  pts.push(b);
  // túl sok egész óra esetén összevonjuk a közbülsőket
  const merged = pts.length > 6 ? [pts[0], pts[1], pts[pts.length - 2], pts[pts.length - 1]] : pts;
  merged.forEach((p, i) => {
    s += line(X(p), y - 8, X(p), y + 8, { sw: 2.5 }) + txt(X(p), y + 26, timeStr(p), { size: 13, w: i === 0 || i === merged.length - 1 ? 800 : 600 });
    if (i) s += hop(X(merged[i - 1]), X(p), y - 4, durWords(p - merged[i - 1]), { h: 18 });
  });
  s += circle(X(a), y, 6) + circle(X(b), y, 6, { fill: "var(--ok)" });
  return svg(W, H, s);
}
function hopsText(a, b) {
  const parts = [];
  let cur = a;
  const nh = Math.ceil(a / 60) * 60;
  if (nh > a && nh <= b) { parts.push(`${timeStr(a)} → ${timeStr(nh)}: <b>${nh - a} perc</b>`); cur = nh; }
  const fullH = Math.floor((b - cur) / 60);
  if (fullH > 0) { parts.push(`${timeStr(cur)} → ${timeStr(cur + fullH * 60)}: <b>${fullH} óra = ${fullH * 60} perc</b>`); cur += fullH * 60; }
  if (b > cur) parts.push(`${timeStr(cur)} → ${timeStr(b)}: <b>${b - cur} perc</b>`);
  return parts.join("<br>");
}
const dec = m => Math.floor(m / 60) * 100 + m % 60; // "tízes" (hibás) számolás: 16:30 → 1630

// --- 1. Óra leolvasása (analóg óra) ---
function clock(min) {
  const { h, m } = hm(min), R = 80, cx = 100, cy = 100;
  let s = circle(cx, cy, R + 6, { fill: "var(--card)", stroke: "var(--ink)", sw: 4 });
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * 2 * Math.PI, big = i % 5 === 0;
    s += line(cx + Math.sin(a) * (R - (big ? 12 : 5)), cy - Math.cos(a) * (R - (big ? 12 : 5)), cx + Math.sin(a) * R, cy - Math.cos(a) * R, { sw: big ? 3 : 1 });
    if (big) { const n = i / 5 || 12; s += txt(cx + Math.sin(a) * (R - 26), cy - Math.cos(a) * (R - 26) + 6, String(n), { size: 16, w: 800 }); }
  }
  const ha = ((h % 12) + m / 60) / 12 * 2 * Math.PI, ma = m / 60 * 2 * Math.PI;
  s += line(cx, cy, cx + Math.sin(ha) * 44, cy - Math.cos(ha) * 44, { sw: 7, stroke: "var(--ink)" });
  s += line(cx, cy, cx + Math.sin(ma) * 66, cy - Math.cos(ma) * 66, { sw: 4, stroke: "var(--pri)" });
  s += circle(cx, cy, 6, { fill: "var(--ink)" });
  return svg(200, 200, s, "clock");
}
function oraleolvasas(rng, lvl) {
  const h = rng.int(1, 11), m = lvl === 1 ? rng.pick([0, 15, 30, 45]) : lvl === 2 ? rng.int(0, 11) * 5 : rng.int(0, 59);
  const t = h * 60 + m;
  return {
    sub: "ora",
    q: `Hány óra van délelőtt? Írd be!`,
    viz: clock(t),
    ans: { kind: "time", value: t, mod12: true },
    hint: "A rövid (fekete) mutató az órát, a hosszú (lila) mutató a percet mutatja. A hosszú mutatónál minden nagy szám 5 percet jelent.",
    steps: [
      m ? `A <b>rövid mutató</b> ${as(h)} és ${as(h % 12 + 1)} szám között jár – ${h === 1 || h === 5 ? "az" : "a"} ${ACC[h]} már elhagyta → <b>${h} óra</b>.` : `A <b>rövid mutató</b> pontosan ${as(h)} számon áll → <b>${h} óra</b>.`,
      m % 5 === 0 ? `A <b>hosszú mutató</b> ${as(m / 5 || 12)} számon áll: ${m / 5} · 5 = <b>${m} perc</b>.` : `A <b>hosszú mutató</b> ${as(Math.floor(m / 5) || 12)} szám után ${m % 5} kis vonással jár: ${Math.floor(m / 5)} · 5 + ${m % 5} = <b>${m} perc</b>.`,
      `Az idő: <b class="big">${timeStr(t)}</b>${folkTime(t) ? ` (${folkTime(t)})` : ""}`,
    ],
    why: v => { const w = hm(v); if (w.h % 12 === m / 5 % 12 && w.m === h * 5 % 60) return "Felcserélted a mutatókat: a rövid mutatja az órát, a hosszú a percet!"; if (w.h === h + 1 && w.m === m && m >= 30) return "A rövid mutató még nem érte el a következő számot – az óra még az előző!"; return null; },
  };
}

const AS = { 1: "1-es", 2: "2-es", 3: "3-as", 4: "4-es", 5: "5-ös", 6: "6-os", 7: "7-es", 8: "8-as", 9: "9-es", 10: "10-es", 11: "11-es", 12: "12-es" };
const ACC = { 1: "1-et", 2: "2-t", 3: "3-at", 4: "4-et", 5: "5-öt", 6: "6-ot", 7: "7-et", 8: "8-at", 9: "9-et", 10: "10-et", 11: "11-et", 12: "12-t" };
const as = n => (n === 1 || n === 5 ? "az " : "a ") + AS[n];

// --- 2. Eltelt idő ---
function idotartam(rng, lvl) {
  const step = lvl === 1 ? 15 : lvl === 2 ? 5 : 1;
  const a = rng.int(7 * 60 / step, 17 * 60 / step) * step;
  const d = (lvl === 1 ? rng.int(1, 8) * 15 : lvl === 2 ? rng.int(4, 36) * 5 : rng.int(25, 300));
  const b = a + d;
  const ctx = rng.pick([
    [`Nóra ${say(a, rng, lvl, "kor")} fogott hozzá egy karkötő készítéséhez, és ${say(b, rng, lvl, "kor")} fejezte be.`, "Hány percig dolgozott?"],
    [`Csaba lovag ${say(a, rng, lvl, "kor")} indult útnak, és ${say(b, rng, lvl, "kor")} érkezett meg.`, "Hány percig tartott az út?"],
    [`A könyvtár ${sufWords(a, "tól")} ${sufWords(b, "ig")} zárva tart.`, "Hány percig tart zárva a könyvtár?"],
    [`A film ${say(a, rng, lvl, "kor")} kezdődött, és ${say(b, rng, lvl, "kor")} ért véget.`, "Hány perces volt a film?"],
  ]);
  return {
    sub: "idotartam",
    q: `${ctx[0]}<p><b>${ctx[1]}</b></p>`,
    ans: { kind: "num", value: d, unit: "perc" },
    hint: "Ugorj előre a következő egész óráig, aztán egész órákat, végül a maradék perceket! Egy órában 60 perc van.",
    steps: [
      `Kezdés: <b>${timeStr(a)}</b>, vége: <b>${timeStr(b)}</b>.` + timeline(a, b),
      hopsText(a, b),
      `Összesen: <b class="big">${d} perc</b>${d >= 60 ? ` (= ${durWords(d)})` : ""}`,
    ],
    why: v => {
      if (v === dec(b) - dec(a) && v !== d) return "Úgy számoltál, mintha egy órában 100 perc lenne – de csak 60 van!";
      if (v === Math.floor(d / 60) && d >= 60) return "Ez órában van – a kérdés percet kér. 1 óra = 60 perc.";
      if (v === d % 60 && d >= 60) return "Kimaradtak az egész órák! Minden egész óra 60 perc.";
      if (Math.abs(v - d) === 60) return "Egy egész órával elszámoltad – számold meg újra az egész órákat az időszalagon.";
      return null;
    },
  };
}
// --- 3. Érkezés és indulás ---
function erkezes(rng, lvl, backwards) {
  const step = lvl === 1 ? 5 : lvl === 2 ? 5 : 1;
  const a = rng.int(6 * 60 / step, 20 * 60 / step) * step;
  const d = lvl === 1 ? rng.int(2, 10) * 5 : lvl === 2 ? rng.int(5, 30) * 5 : rng.int(20, 240);
  const b = a + d;
  const long = rng.chance(0.5) && d > 60;
  const dIg = long ? durSuf(d, "ig") : `${d} percig`, dPl = long ? durWords(d) : `${d} perc`;
  const q = backwards
    ? rng.pick([
      `Emma ${say(b, rng, lvl, "kor")} ért a könyvtárhoz. Az út ${dIg} tartott. <b>Mikor indult el otthonról?</b>`,
      `A busz ${say(b, rng, lvl, "kor")} érkezett a végállomásra. A menetidő ${dPl} volt. <b>Mikor indult?</b>`,
      `A kenyérnek ${dIg} kell sülnie, és ${say(b, rng, lvl, "kor")} kell kész lennie. <b>Mikor kell betenni a sütőbe?</b>`])
    : rng.pick([
      `Nagymama ${say(a, rng, lvl, "kor")} tette be a tortát a sütőbe, és ${dPl} múlva vette ki. <b>Mennyi idő volt ekkor?</b>`,
      `A vonat ${say(a, rng, lvl, "kor")} indult, és ${dPl} alatt ért célba. <b>Mikor érkezett meg?</b>`,
      `Bécsből ${say(a, rng, lvl, "kor")} indultak, az út ${dIg} tartott. <b>Mikor érkeztek Linzbe?</b>`]);
  const target = backwards ? a : b;
  const from = backwards ? b : a;
  return {
    sub: backwards ? "indulas" : "erkezes",
    q,
    ans: { kind: "time", value: target % 1440, mod12: true },
    hint: backwards ? "Most visszafelé kell számolni az időben: az érkezésből vond le az út idejét!" : "Adj hozzá előbb annyi percet, hogy egész órát kapj, aztán a maradékot!",
    steps: [
      backwards ? `Az érkezéstől (<b>${timeStr(b)}</b>) visszafelé lépünk: <b>${durWords(d)}</b>.` : `Az indulástól (<b>${timeStr(a)}</b>) előre lépünk: <b>${durWords(d)}</b>.`,
      timeline(a, b) + (backwards ? hopsText(a, b).split("<br>").reverse().join("<br>") : hopsText(a, b)),
      `${backwards ? "Indulás" : "Érkezés"}: <b class="big">${timeStr(target)}</b>`,
    ],
    why: v => {
      const t = ((v % 720) + 720) % 720, tt = target % 720;
      if (backwards && t === (from + d) % 720) return "Előre számoltál – de az indulás korábban van, mint az érkezés. Vissza kell számolni!";
      if (!backwards && t === (a - d + 1440) % 720) return "Visszafelé számoltál – az érkezés későbbi időpont, előre kell lépni.";
      if (Math.abs(t - tt) === 60 || Math.abs(t - tt) === 660) return "Egy órával elszámoltad – figyelj, amikor átlépsz egy egész órán!";
      if (Math.abs(t - tt) === 40) return "Egy órában 60 perc van, nem 100!";
      return null;
    },
  };
}

// --- 4. Menetrend ---
const STOPS = ["Barát utca", "Cimbora utca", "Drusza utca", "Szövetséges utca", "Atyafi utca", "Játékos utca", "Bohóc utca"];
function menetrend(rng, lvl) {
  const n = 5, stops = STOPS.slice(0, n);
  const cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + rng.int(2, 7));
  const tbl = `<table class="tbl"><tr><th>Megálló</th>${stops.map(s => `<td>${s}</td>`).join("")}</tr><tr><th>Menetidő (perc)</th>${cum.map(c => `<td>${c}</td>`).join("")}</tr></table><div class="soft small">A menetidő a Barát utcai végállomástól számítva értendő.</div>`;
  const i = rng.int(0, 1), j = rng.int(i + 2, n - 1);
  const dep = rng.int(5 * 12, 23 * 12) * 5 + (lvl === 3 ? rng.int(0, 4) : 0);
  const t1 = dep + cum[i], t2 = dep + cum[j];
  const back = lvl >= 2 && rng.chance(0.5);
  const q = back
    ? `A busz ${timeStr(t2)}-kor ért a <b>${stops[j]}</b> megállóba. <b>Mikor indult a ${stops[i]} megállóból</b>, ha tartotta a menetidőt?`
    : `A busz ${timeStr(t1)}-kor indul a <b>${stops[i]}</b> megállóból. <b>Mikor ér a ${stops[j]} megállóba?</b>`;
  const d = cum[j] - cum[i];
  return {
    sub: "menetrend",
    q: tbl + `<p>${q}</p>`,
    ans: { kind: "time", value: (back ? t1 : t2) % 1440, mod12: true },
    hint: "A két megálló közötti menetidő a két szám különbsége a táblázatban!",
    steps: [
      `A két megálló között: ${cum[j]} − ${cum[i]} = <b>${d} perc</b> a menetidő.`,
      back ? `Visszafelé: ${timeStr(t2)} − ${d} perc` + timeline(t1, t2) : `Előre: ${timeStr(t1)} + ${d} perc` + timeline(t1, t2),
      `<b class="big">${timeStr(back ? t1 : t2)}</b>`,
    ],
    why: v => {
      const t = v % 720;
      if (!back && t === (t1 + cum[j]) % 720) return "Nem a végállomástól indul a busz – csak a két megálló közötti menetidőt kell hozzáadni (a két szám különbségét).";
      if (back && t === (t2 - cum[j] + 1440) % 720) return "A két megálló közötti menetidőt kell levonni (a két szám különbségét), nem a teljes menetidőt.";
      return null;
    },
  };
}

// --- 5. Naptár ---
const DAYS = ["hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat", "vasárnap"];
const MONTHS = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
const MLEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function naptar(rng, lvl) {
  if (lvl === 3 && rng.chance(0.5)) { // az év hányadik napja → melyik hónap
    const n = rng.int(20, 360);
    let rest = n, mi = 0; while (rest > MLEN[mi]) { rest -= MLEN[mi]; mi++; }
    const cum = []; let s = 0; MLEN.forEach((l, i) => { s += l; cum.push(`${MONTHS[i]}: ${s}`); });
    return {
      sub: "naptar",
      q: `Lili az év <b>${n}.</b> napján született (nem szökőévben). <b>Melyik hónapban van a születésnapja?</b>`,
      ans: { kind: "choice", options: MONTHS.slice(), value: mi },
      hint: "Add össze a hónapok napjait januártól, amíg el nem éred vagy át nem lépi a számot! (január 31, február 28, március 31, április 30 …)",
      steps: [`Hónapok hossza: ${MONTHS.map((m, i) => `${m} ${MLEN[i]}`).join(", ")}.`, `Összeadva, hányadik napig tart az egyes hónap:<br>${cum.slice(0, mi + 1).join("<br>")}`, `${n} ${mi ? `nagyobb, mint ${cum[mi - 1].split(": ")[1]}, de` : ""} legfeljebb ${cum[mi].split(": ")[1]}, ezért a hónap: <b class="big">${MONTHS[mi]}</b> (${rest}.)`],
      why: k => k === mi + 1 || k === mi - 1 ? "A szomszédos hónapot jelölted – számold újra a hónapok hosszát!" : null,
    };
  }
  const mi = rng.int(0, 11), d0 = rng.int(1, 10), w0 = rng.int(0, 6);
  const add = lvl === 1 ? rng.int(2, 14) : rng.int(8, 25);
  const d1 = d0 + add, w1 = (w0 + add) % 7;
  const crosses = d1 > MLEN[mi];
  const label = crosses ? `${MONTHS[(mi + 1) % 12]} ${d1 - MLEN[mi]}.` : `${MONTHS[mi]} ${d1}.`;
  return {
    sub: "naptar",
    q: `${MONTHS[mi].replace(/^./, c => c.toUpperCase())} ${d0}. ${DAYS[w0]}re esik. <b>A hét melyik napjára esik ${label}?</b>`.replace(/(hétfő|kedd|szerda|csütörtök|péntek|szombat|vasárnap)re/, (m, d) => ({ hétfő: "hétfőre", kedd: "keddre", szerda: "szerdára", csütörtök: "csütörtökre", péntek: "péntekre", szombat: "szombatra", vasárnap: "vasárnapra" }[d])),
    ans: { kind: "choice", options: DAYS.slice(), value: w1 },
    hint: "Hány nap telik el a két dátum között? Egy hét 7 nap – minden 7 nap után ugyanaz a nap jön.",
    steps: [
      crosses ? `${MONTHS[mi]} ${MLEN[mi]} napos, ezért a két dátum között ${MLEN[mi] - d0} + ${d1 - MLEN[mi]} = <b>${add}</b> nap telik el.` : `${d1} − ${d0} = <b>${add}</b> nap telik el.`,
      `${add} = ${Math.floor(add / 7)} · 7 + <b>${add % 7}</b>. A teljes hetek után ugyanaz a nap jön (${DAYS[w0]}), aztán még ${add % 7} napot lépünk tovább.`,
      `${DAYS[w0]}${Array.from({ length: add % 7 }, (_, i) => " → " + DAYS[(w0 + i + 1) % 7]).join("")}: <b class="big">${DAYS[w1]}</b>`,
    ],
    why: k => k === (w1 + 6) % 7 ? "Eggyel elszámoltad – a kezdőnapot ne számold bele a lépésekbe!" : k === (w1 + 1) % 7 ? "Eggyel túlléptél – a kezdőnaptól kell lépni, nem utána." : null,
  };
}

export default {
  id: "T4",
  name: "Idő és naptár",
  planet: { name: "Óra-csillag", emoji: "⏰", color: "#22c55e" },
  subs: [
    { id: "ora", name: "Óra leolvasása", gen: oraleolvasas },
    { id: "idotartam", name: "Eltelt idő", gen: idotartam },
    { id: "erkezes", name: "Mikor ér oda?", gen: (r, l) => erkezes(r, l, false) },
    { id: "indulas", name: "Mikor indult?", gen: (r, l) => erkezes(r, l, true), minLvl: 2 },
    { id: "menetrend", name: "Menetrend", gen: menetrend, minLvl: 2 },
    { id: "naptar", name: "Naptár", gen: naptar },
  ],
};
