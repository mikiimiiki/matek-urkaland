// ===== T9 – Pénz és vásárlás =====
// A felvételi mintái: persely összeszámolása, visszajáró pénz, legkevesebb érme, „legfeljebb hány darab”,
// egységár, „kettő után a harmadik ajándék” akció, parkolási díj, spórolás.
import { fmt, svg, txt, rect, circle, numberLine, list } from "../util.js";

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const COINS = [200, 100, 50, 20, 10, 5];
const NOTES = [20000, 10000, 5000, 2000, 1000, 500];

// ---- Érmék és bankjegyek rajza ----
function money(groups) { // groups: [[érték, darab]]
  let x = 8, b = "";
  const H = 80;
  groups.forEach(([v, n]) => {
    const show = Math.min(n, 6), x0 = x;
    for (let i = 0; i < show; i++) {
      if (v >= 500) { b += rect(x, 10 + i * 4, 74, 40, { rx: 5, fill: v >= 5000 ? "#fde68a" : v >= 1000 ? "#bbf7d0" : "#fecaca", stroke: "#475569", sw: 1.5 }) + txt(x + 37, 36 + i * 4, fmt(v), { size: 13, w: 800 }); }
      else { const r = v >= 100 ? 22 : v >= 20 ? 19 : 16; b += circle(x + r, 32 + i * 3, r, { fill: v >= 100 ? "#fde047" : "#d6d3d1", stroke: "#78716c", sw: 2 }) + txt(x + r, 37 + i * 3, String(v), { size: 12, w: 800 }); }
      x += v >= 500 ? 10 : 7;
    }
    x += v >= 500 ? 74 : 40;
    // darabszám a kupac alatt (6-nál több darabot nem rajzolunk ki, de a szám mindig látszik)
    if (n > 1) b += txt((x0 + x) / 2, 78, `${n} db`, { size: 13, w: 800, fill: "var(--soft)" });
    x += 22;
  });
  return svg(x, H + 4, b);
}

// Termékek reális (10-re kerek) árakkal
const ITEMS = [
  ["kifli", "kiflit", 60], ["tej", "tejet", 420], ["kenyér", "kenyeret", 890], ["csoki", "csokit", 380], ["üdítő", "üdítőt", 450],
  ["radír", "radírt", 150], ["füzet", "füzetet", 290], ["ceruza", "ceruzát", 120], ["gumicukor", "gumicukrot", 330], ["müzliszelet", "müzliszeletet", 210],
  ["joghurt", "joghurtot", 240], ["zsemle", "zsemlét", 70], ["vonalzó", "vonalzót", 350], ["fagyi", "fagyit", 400],
];
// Visszafelé számolás (pótlás) a fizetett összegig, ugrásokkal a számegyenesen
function countUp(price, paid) {
  const hops = [];
  let cur = price;
  for (const step of [10, 100, 1000, 10000]) {
    const next = Math.ceil(cur / step) * step;
    if (next > cur && next <= paid) { hops.push({ from: cur, to: next, label: `+${fmt(next - cur)}` }); cur = next; }
  }
  if (cur < paid) hops.push({ from: cur, to: paid, label: `+${fmt(paid - cur)}` });
  // a számegyenes az árnál kezdődik; keskeny ábra, hogy a magyarázat paneljén is olvasható maradjon
  const lo = price - Math.max(5, (paid - price) * 0.04), ticks = hops.map(h => ({ v: h.to, big: true, label: fmt(h.to) }));
  return { hops, pic: numberLine(lo, paid, [{ v: price, label: fmt(price) }], { ticks, hops, h: 120, w: 420 }) };
}

// ---- 1. Persely: pénz összeszámolása ----
function persely(rng, lvl) {
  const pool = lvl === 1 ? [100, 50, 20, 10] : lvl === 2 ? COINS : [...COINS.slice(0, 4), 1000, 500, 2000];
  const kinds = rng.sample(pool, lvl === 1 ? 2 : 3).sort((a, b) => b - a);
  const g = kinds.map(v => [v, rng.int(1, lvl === 1 ? 6 : 9)]);
  const sum = g.reduce((a, [v, n]) => a + v * n, 0);
  const who = rng.pick(["Panni", "Bence", "Lili", "Máté"]);
  const desc = list(g.map(([v, n]) => `${n} db ${fmt(v)} Ft-os`));
  return {
    sub: "persely", q: `${who} perselyében ${desc} van.<p><b>Mennyi pénz van összesen a perselyben?</b></p>`, viz: money(g),
    ans: { kind: "num", value: sum, unit: "Ft" },
    hint: "Számold ki külön, mennyit ér az egyik fajta érmékből (darab · érték), aztán a többiből, és add össze!",
    steps: [`Fajtánként számolunk (darab · érték):<br>` + g.map(([v, n]) => `${n} · ${fmt(v)} = <b>${fmt(n * v)}</b> Ft`).join("<br>"), `Összeadjuk: ${g.map(([v, n]) => fmt(n * v)).join(" + ")} = <b class="big">${fmt(sum)} Ft</b>`],
    why: v => v === g.reduce((a, [, n]) => a + n, 0) ? "Ez az érmék darabszáma – a kérdés azt kéri, mennyi pénz ez összesen!" : v === g.reduce((a, [x]) => a + x, 0) ? "Minden fajtából csak egyet számoltál – szorozd meg a darabszámmal!" : null,
  };
}

// ---- 2. Visszajáró pénz ----
function visszajaro(rng, lvl) {
  for (let t = 0; t < 50; t++) {
    const n = lvl === 1 ? 1 : lvl === 2 ? 2 : 3;
    const picks = rng.sample(ITEMS, n).map(([nev, acc, p]) => ({ nev, acc, p, db: lvl === 3 ? rng.int(1, 3) : 1 }));
    const total = picks.reduce((a, x) => a + x.p * x.db, 0);
    const paid = [500, 1000, 2000, 5000, 10000].find(v => v > total && (lvl === 1 || v >= total + 50));
    if (!paid || paid - total < 10) continue;
    const back = paid - total, { hops, pic } = countUp(total, paid);
    const desc = list(picks.map(x => `${x.db > 1 ? `${x.db} ` : "egy "}${x.acc} ${x.db > 1 ? `(darabja ${fmt(x.p)} Ft)` : `${fmt(x.p)} Ft-ért`}`));
    return {
      sub: "visszajaro", q: `Anya vett ${desc}. Egy <b>${fmt(paid)} Ft-os</b> bankjeggyel fizetett.<p><b>Mennyi pénzt kapott vissza?</b></p>`,
      ans: { kind: "num", value: back, unit: "Ft" },
      hint: `Először add össze, mennyibe került minden. Aztán számolj felfelé az árból ${fmt(paid)}-ig – a pénztáros is így adja vissza!`,
      steps: [
        n === 1 && picks[0].db === 1 ? `A vásárlás ára: <b>${fmt(total)} Ft</b>.` : `A vásárlás ára: ${picks.map(x => x.db > 1 ? `${x.db} · ${fmt(x.p)}` : fmt(x.p)).join(" + ")} = <b>${fmt(total)} Ft</b>.`,
        `Számoljunk felfelé ${fmt(total)}-tól ${fmt(paid)}-ig, kerek számokon át:` + pic,
        `${hops.length > 1 ? `${hops.map(h => h.label.slice(1)).join(" + ")} = ` : "Visszajár: "}<b class="big">${fmt(back)} Ft</b><br><span class="soft">Ellenőrzés: ${fmt(total)} + ${fmt(back)} = ${fmt(paid)} ✔</span>`,
      ],
      why: v => v === total ? "Ez a vásárlás ára – a kérdés azt kéri, mennyit adnak vissza!" : v === paid + total ? "Itt nem összeadni kell: a visszajáró a fizetett pénz és az ár különbsége." : (n > 1 && picks.some(x => v === paid - (total - x.p * x.db))) ? "Kimaradt az egyik termék ára – előbb add össze az összeset!" : Math.abs(v - back) === 100 || Math.abs(v - back) === 10 ? "Majdnem! Számolj újra felfelé, kerek számokon át (pl. először a következő kerek százasig)." : null,
    };
  }
  return persely(rng, lvl);
}

// ---- 3. Legkevesebb érme ----
function legkevesebb(rng, lvl) {
  const sets = lvl === 1 ? [[100, 50, 20, 10]] : lvl === 2 ? [[200, 100, 50, 20, 10]] : [[200, 100, 50, 20, 10, 5], [200, 100], [100, 20, 10]];
  const coins = rng.pick(sets);
  const unit = coins[coins.length - 1];
  // csak két nagy érménél (200, 100) kisebb összeg, hogy ne legyen 90+ érme
  const amount = coins.length === 2 ? rng.int(3, 25) * 100 : rng.int(lvl === 1 ? 6 : 15, lvl === 1 ? 30 : 99) * unit + (coins.includes(5) && rng.chance(0.5) ? 5 : 0);
  let rest = amount; const use = [];
  coins.forEach(c => { const k = Math.floor(rest / c); if (k) use.push([c, k]); rest -= k * c; });
  if (rest) return legkevesebb(rng, lvl);
  const total = use.reduce((a, [, k]) => a + k, 0);
  return {
    sub: "legkevesebb", q: `Csak ${list(coins.map(c => `${c} Ft-os`))} érméim vannak (mindegyikből bőven).<p><b>Legkevesebb hány érmével tudok pontosan ${fmt(amount)} Ft-ot fizetni?</b></p>`,
    ans: { kind: "num", value: total, unit: "db" },
    hint: "Kezdd a legnagyobb érmével: abból tégy oda annyit, amennyit csak lehet, aztán a maradékot fizesd a következő legnagyobbal!",
    steps: [`<b>A legnagyobbal kezdünk</b>, így kell a legkevesebb érme:`, use.map(([c, k], i) => `${fmt(c)} Ft-os: <b>${k} db</b> (${k} · ${c} = ${fmt(k * c)} Ft)${i < use.length - 1 ? "" : ""}`).join("<br>") + money(use), `${use.length > 1 ? `${use.map(([, k]) => k).join(" + ")} = ` : "Összesen "}<b class="big">${total}</b> érme` + (use.length > 1 ? `<br><span class="soft">Ellenőrzés: ${use.map(([c, k]) => fmt(c * k)).join(" + ")} = ${fmt(amount)} Ft ✔</span>` : "")],
    why: v => v === amount / unit ? `Ennyi érme kellene, ha csak ${unit} Ft-osokkal fizetnél – a nagyobb érmékkel sokkal kevesebb kell!` : v < total ? "Ennyi érmével nem jön ki pontosan az összeg – ellenőrizd összeadással!" : null,
  };
}

// ---- 4. Legfeljebb hány darab? ----
function legfeljebb(rng, lvl) {
  const [who, whoDat] = rng.pick([["Panni", "Panninak"], ["Dani", "Daninak"], ["Emma", "Emmának"], ["Zoli", "Zolinak"]]);
  if (lvl < 3) {
    const [nev, acc, p] = rng.pick(ITEMS.filter(i => i[2] >= 100));
    const budget = [500, 1000, 2000, 5000][rng.int(lvl === 1 ? 0 : 1, lvl === 1 ? 1 : 3)];
    if (budget < p * 2) return legfeljebb(rng, lvl);
    const k = Math.floor(budget / p), rest = budget - k * p;
    return {
      sub: "legfeljebb", q: `${whoDat} ${fmt(budget)} Ft-ja van. Egy ${nev} ${fmt(p)} Ft-ba kerül.<p><b>Legfeljebb hány ${acc} vehet?</b></p>`,
      ans: { kind: "num", value: k, unit: "db" },
      hint: `Hányszor fér bele ${fmt(p)} a ${fmt(budget)}-be? Ha marad pénz, az nem elég még egyre!`,
      steps: [`Osztunk: ${fmt(budget)} : ${fmt(p)} = <b>${k}</b>, maradék <b>${fmt(rest)} Ft</b>.`, `${k} darab ${k} · ${fmt(p)} = ${fmt(k * p)} Ft, a maradék ${fmt(rest)} Ft már nem elég még egyre.<br>Legfeljebb <b class="big">${k}</b> darabot vehet.`],
      why: v => v === k + 1 ? `${k + 1} darab már ${fmt((k + 1) * p)} Ft lenne – arra nincs elég pénz! Lefelé kell kerekíteni.` : null,
    };
  }
  // 3. szint: több féle áru, legfeljebb hány darab (a legolcsóbból érdemes)
  const goods = rng.sample(ITEMS.filter(i => i[2] >= 60 && i[2] <= 450), 3).sort((a, b) => b[2] - a[2]);
  const budget = rng.int(6, 20) * 100;
  const cheap = goods[2], k = Math.floor(budget / cheap[2]);
  return {
    sub: "legfeljebb", q: `${who} ${fmt(budget)} Ft-tal megy a büfébe. Ezek közül válogathat: ${goods.map(g => `${g[0]} ${fmt(g[2])} Ft`).join(", ")}.<p><b>Legfeljebb hány darab árut vehet összesen?</b></p>`,
    ans: { kind: "num", value: k, unit: "db" },
    hint: "Ha minél több darabot szeretne, melyikből érdemes venni?",
    steps: [`A legtöbb darabot úgy kapja, ha <b>a legolcsóbból</b> vesz: ${cheap[0]} ${fmt(cheap[2])} Ft.`, `${fmt(budget)} : ${fmt(cheap[2])} = <b>${k}</b>, maradék ${fmt(budget - k * cheap[2])} Ft.`, `Legfeljebb <b class="big">${k}</b> darab.`],
    why: v => v === Math.floor(budget / goods[0][2]) ? "Ez a legdrágábbal számolva jött ki – a legtöbb darabhoz a legolcsóbbat kell venni!" : v === k + 1 ? "Arra már nem lenne elég pénz – lefelé kell kerekíteni." : null,
  };
}

// ---- 5. Egységár ----
function egysegar(rng, lvl) {
  const kind = lvl === 1 ? "csomag" : rng.pick(["csomag", "visszajaro"]);
  if (kind === "csomag") {
    // termékenként valósághű darabár (tízesekben)
    const [nev, per, lo, hi] = rng.pick([["tekercs papírtörlő", 4, 15, 40], ["joghurt", 4, 12, 30], ["tojás", 10, 4, 9], ["ceruza", 6, 8, 20], ["müzliszelet", 5, 15, 25]]);
    const unitP = rng.int(lo, hi) * 10, price = unitP * per;
    return {
      sub: "egysegar", q: `Egy csomagban ${per} ${nev} van, a csomag ára <b>${fmt(price)} Ft</b>.<p><b>Mennyibe kerül 1 ${nev}?</b></p>`,
      ans: { kind: "num", value: unitP, unit: "Ft" },
      hint: `${per} darab ára ${fmt(price)} Ft. Oszd el egyenlően ${per} felé!`,
      steps: [`${per} darab = ${fmt(price)} Ft, ezért 1 darab ára: ${fmt(price)} : ${per}.`, `<b class="big">${fmt(unitP)} Ft</b><br><span class="soft">Ellenőrzés: ${per} · ${fmt(unitP)} = ${fmt(price)} ✔</span>`],
      why: v => v === price * per ? "Itt osztani kell: egy darab olcsóbb, mint az egész csomag!" : null,
    };
  }
  const kg = rng.int(2, 5), unitP = rng.int(15, 60) * 10, total = kg * unitP;
  const paid = [1000, 2000, 5000].find(v => v > total), back = paid - total;
  const [nev, acc] = rng.pick([["hagyma", "hagymát"], ["alma", "almát"], ["krumpli", "krumplit"], ["szilva", "szilvát"]]);
  return {
    sub: "egysegar", q: `Anya ${kg} kg ${acc} vett a piacon. Egy ${fmt(paid)} Ft-ossal fizetett, és ${fmt(back)} Ft-ot kapott vissza.<p><b>Mennyibe került 1 kg ${nev}?</b></p>`,
    ans: { kind: "num", value: unitP, unit: "Ft" },
    hint: "Először számold ki, mennyit fizetett valójában (a visszajárót le kell vonni), aztán oszd el a kilók számával!",
    steps: [`Valójában ennyit fizetett: ${fmt(paid)} − ${fmt(back)} = <b>${fmt(total)} Ft</b>.`, `Ez ${kg} kg ára, ezért 1 kg: ${fmt(total)} : ${kg} = <b class="big">${fmt(unitP)} Ft</b>`],
    why: v => v === paid / kg ? "Előbb vond le a visszakapott pénzt – az nem a hagyma ára!".replace("hagyma", nev) : v === total ? `Ez ${kg} kg ára – a kérdés 1 kg-ra vonatkozik, még osztani kell!` : null,
  };
}

// ---- 6. Akció: kettő után a harmadik ajándék ----
function akcio(rng, lvl) {
  const [nev, acc, p] = rng.pick(ITEMS.filter(i => i[2] <= 400));
  const pay = rng.pick([2, 3]), free = 1, group = pay + free;
  const askHome = lvl === 3 || rng.chance(0.5);
  const groups = rng.int(2, 6), paidPcs = groups * pay, money = paidPcs * p, home = groups * group;
  return {
    sub: "akcio", q: askHome
      ? `Akció: <b>${pay} ${nev} vásárlásakor a ${group}. ajándék</b>. Egy ${nev} ${fmt(p)} Ft. Anya ${fmt(money)} Ft-ot fizetett, és csak akciós ${acc.replace(/^/, "")} vett.<p><b>Hány darabot vitt haza?</b></p>`
      : `Akció: <b>${pay} ${nev} vásárlásakor a ${group}. ajándék</b>. Egy ${nev} ${fmt(p)} Ft. Anya <b>${home} darabot</b> szeretne hazavinni.<p><b>Mennyit kell fizetnie?</b></p>`,
    ans: { kind: "num", value: askHome ? home : money, unit: askHome ? "db" : "Ft" },
    hint: `Gondolj „csomagokban”: ${pay} darabot kifizet, és ${group} darabot visz haza. Hány ilyen csomag van?`,
    steps: askHome
      ? [`Kifizetett darabok: ${fmt(money)} : ${fmt(p)} = <b>${paidPcs}</b> db.`, `Minden ${pay} kifizetett mellé jár 1 ajándék: ${paidPcs} : ${pay} = <b>${groups}</b> csomag, mindegyikben ${group} darab.`, `Hazavitt: ${groups} · ${group} = <b class="big">${home}</b> darab`]
      : [`${home} darab = ${home} : ${group} = <b>${groups}</b> csomag (${pay} fizetős + 1 ajándék).`, `Kifizetendő darab: ${groups} · ${pay} = <b>${paidPcs}</b>.`, `${paidPcs} · ${fmt(p)} = <b class="big">${fmt(money)} Ft</b>`],
    why: v => askHome ? (v === paidPcs ? "Ezeket fizette ki – de az ajándékokat is hazavitte!" : null) : (v === home * p ? "Az ajándék darabokért nem kell fizetni!" : null),
  };
}

// ---- 7. Parkolás: az első órák ingyenesek, minden megkezdett óra fizetős ----
function parkolas(rng, lvl) {
  const freeH = rng.int(1, 2), fee = rng.int(4, 9) * 10 + (lvl === 3 ? 5 : 0);
  const arr = rng.int(8, 14) * 60 + rng.int(0, 11) * 5, dur = rng.int(freeH * 60 + 10, 6 * 60);
  const dep = arr + dur, t = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  const paidMin = Math.max(0, dur - freeH * 60), hours = Math.ceil(paidMin / 60), cost = hours * fee;
  return {
    sub: "parkolas", q: `Egy parkolóban az első <b>${freeH} óra ingyenes</b>, utána <b>minden megkezdett óra ${fmt(fee)} Ft</b>.<br>Egy autó <b>${t(arr)}</b>-kor érkezett és <b>${t(dep)}</b>-kor távozott.<p><b>Mennyit kell fizetni?</b></p>`,
    ans: { kind: "num", value: cost, unit: "Ft" },
    hint: "Számold ki, mennyi ideig állt ott. Vond le az ingyenes órákat, és a maradékban minden megkezdett óra egész órának számít!",
    steps: [`Parkolás: ${t(arr)} → ${t(dep)} = <b>${Math.floor(dur / 60)} óra ${dur % 60} perc</b>.`, `Ingyenes ${freeH} óra után marad: <b>${Math.floor(paidMin / 60)} óra ${paidMin % 60} perc</b>. A megkezdett óra is egésznek számít → <b>${hours} óra</b> fizetős.`, `${hours} · ${fmt(fee)} = <b class="big">${fmt(cost)} Ft</b>`],
    why: v => v === Math.floor(paidMin / 60) * fee ? "A megkezdett órát is ki kell fizetni – felfelé kell kerekíteni!" : v === Math.ceil(dur / 60) * fee ? `Az első ${freeH} óra ingyenes – azt nem kell kifizetni!` : null,
  };
}

// ---- 8. Spórolás ----
function sporolas(rng, lvl) {
  const who = rng.pick(["Panka", "Bence", "Lili", "Marci"]);
  const weekly = rng.int(1, 6) * 100, weeks = rng.int(4, 15);
  if (lvl === 1) return {
    sub: "sporolas", q: `${who} minden héten <b>${fmt(weekly)} Ft-ot</b> tesz félre a zsebpénzéből.<p><b>Mennyi pénze gyűlik össze ${weeks} hét alatt?</b></p>`,
    ans: { kind: "num", value: weekly * weeks, unit: "Ft" }, hint: `Minden héten ${fmt(weekly)} Ft, és ez ${weeks} héten át így megy.`,
    steps: [`${weeks} hét · ${fmt(weekly)} Ft = <b class="big">${fmt(weekly * weeks)} Ft</b>`], why: v => v === weekly + weeks ? "Szorozni kell: minden héten ugyanannyit tesz félre." : null,
  };
  const loan = rng.int(1, 8) * 100, price = weekly * weeks + loan;
  if (rng.chance(0.5)) return {
    sub: "sporolas", q: `${who} egy ajándékra gyűjt. Minden héten <b>${fmt(weekly)} Ft-ot</b> tesz félre, ${weeks} hétig gyűjtött, és a testvérétől még <b>${fmt(loan)} Ft-ot</b> kapott kölcsön.<p><b>Mennyibe került az ajándék?</b></p>`,
    ans: { kind: "num", value: price, unit: "Ft" }, hint: "Először számold ki, mennyit gyűjtött össze, aztán add hozzá a kölcsönt!",
    steps: [`Gyűjtött: ${weeks} · ${fmt(weekly)} = <b>${fmt(weekly * weeks)} Ft</b>.`, `Kölcsönnel együtt: ${fmt(weekly * weeks)} + ${fmt(loan)} = <b class="big">${fmt(price)} Ft</b>`], why: v => v === weekly * weeks ? "Ne felejtsd el hozzáadni a kölcsönt is!" : null,
  };
  const target = weekly * weeks - rng.int(0, weekly / 100 - 1) * 100;
  return {
    sub: "sporolas", q: `${who} minden héten <b>${fmt(weekly)} Ft-ot</b> tesz félre. Egy <b>${fmt(target)} Ft-os</b> társasjátékra gyűjt.<p><b>Legalább hány hétig kell gyűjtenie?</b></p>`,
    ans: { kind: "num", value: weeks, unit: "hét" }, hint: `Hányszor ${fmt(weekly)} Ft kell, hogy meglegyen legalább ${fmt(target)} Ft? Ha nem jön ki pontosan, még egy hét kell!`,
    steps: [`${fmt(target)} : ${fmt(weekly)} = ${Math.floor(target / weekly)}${target % weekly ? `, maradék ${fmt(target % weekly)}` : ""}.`, target % weekly ? `${Math.floor(target / weekly)} hét alatt csak ${fmt(Math.floor(target / weekly) * weekly)} Ft gyűlik – még egy hét kell.<br><b class="big">${weeks}</b> hét` : `Pontosan kijön: <b class="big">${weeks}</b> hét`],
    why: v => v === Math.floor(target / weekly) && target % weekly ? "Annyi idő alatt még nem gyűlik össze az egész összeg – felfelé kell kerekíteni!" : null,
  };
}

export default {
  id: "T9",
  name: "Pénz és vásárlás",
  planet: { name: "Kincses-üstökös", emoji: "💰", color: "#eab308" },
  subs: [
    { id: "persely", name: "Persely", gen: persely },
    { id: "visszajaro", name: "Visszajáró pénz", gen: visszajaro },
    { id: "legkevesebb", name: "Legkevesebb érme", gen: legkevesebb },
    { id: "legfeljebb", name: "Legfeljebb hány darab?", gen: legfeljebb },
    { id: "egysegar", name: "Egy darab ára", gen: egysegar },
    { id: "akcio", name: "Akció", gen: akcio, minLvl: 2 },
    { id: "parkolas", name: "Parkolás", gen: parkolas, minLvl: 2 },
    { id: "sporolas", name: "Spórolás", gen: sporolas },
  ],
};
