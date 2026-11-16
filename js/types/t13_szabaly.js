// ===== T13 – Szabálykeresés =====
// A felvételi mintái: X–Y táblázat szabállyal (hiányzó szám pótlása, melyik szabály illik minden oszlophoz,
// szabály kitalálása), „minden nap 3-mal többet” sorozatok (n-edik tag, hányadik, összeg), számsorozatok.
import { fmt, list, numVal, article } from "../util.js";

const DAYS = ["hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat", "vasárnap"];
const ON = ["hétfőn", "kedden", "szerdán", "csütörtökön", "pénteken", "szombaton", "vasárnap"];

// ---- Szabályok ----
// f: a szabály; inv: visszafelé (Y-ból X); txt: kiírás; ok(x): az X-re értelmes-e (egész, nem negatív eredmény)
function makeRule(rng, lvl) {
  const a = rng.int(2, lvl === 1 ? 5 : 9), b = rng.int(3, lvl === 1 ? 20 : 60);
  const kinds = lvl === 1 ? ["add", "sub", "mul"] : lvl === 2 ? ["mul", "div", "muladd", "mulsub", "add"] : ["muladd", "mulsub", "divadd", "addmul"];
  const k = rng.pick(kinds);
  return ({
    add: { txt: `Y = X + ${b}`, f: x => x + b, inv: y => y - b, ok: () => true, steps: x => [`${x} + ${b} = ${x + b}`], invTxt: `X = Y − ${b}` },
    sub: { txt: `Y = X − ${b}`, f: x => x - b, inv: y => y + b, ok: x => x >= b, steps: x => [`${x} − ${b} = ${x - b}`], invTxt: `X = Y + ${b}` },
    mul: { txt: `Y = X · ${a}`, f: x => x * a, inv: y => y / a, ok: () => true, steps: x => [`${x} · ${a} = ${x * a}`], invTxt: `X = Y : ${a}` },
    div: { txt: `Y = X : ${a}`, f: x => x / a, inv: y => y * a, ok: x => x % a === 0, steps: x => [`${x} : ${a} = ${x / a}`], invTxt: `X = Y · ${a}` },
    muladd: { txt: `Y = X · ${a} + ${b}`, f: x => x * a + b, inv: y => (y - b) / a, ok: () => true, steps: x => [`${x} · ${a} = ${x * a}`, `${x * a} + ${b} = ${x * a + b}`], invTxt: `előbb − ${b}, aztán : ${a}`, wrong: x => (x + b) * a },
    mulsub: { txt: `Y = X · ${a} − ${b}`, f: x => x * a - b, inv: y => (y + b) / a, ok: x => x * a >= b, steps: x => [`${x} · ${a} = ${x * a}`, `${x * a} − ${b} = ${x * a - b}`], invTxt: `előbb + ${b}, aztán : ${a}`, wrong: x => (x - b) * a },
    divadd: { txt: `Y = X : ${a} + ${b}`, f: x => x / a + b, inv: y => (y - b) * a, ok: x => x % a === 0, steps: x => [`${x} : ${a} = ${x / a}`, `${x / a} + ${b} = ${x / a + b}`], invTxt: `előbb − ${b}, aztán · ${a}` },
    addmul: { txt: `Y = (X + ${b}) · ${a}`, f: x => (x + b) * a, inv: y => y / a - b, ok: () => true, steps: x => [`${x} + ${b} = ${x + b}`, `${x + b} · ${a} = ${(x + b) * a}`], invTxt: `előbb : ${a}, aztán − ${b}`, wrong: x => x + b * a },
  })[k];
}
// X értékek, amelyekre a szabály értelmes
function xsFor(rule, rng, n, lvl) {
  const out = new Set();
  for (let t = 0; out.size < n && t < 500; t++) { const x = rng.int(1, lvl === 1 ? 30 : 99); if (rule.ok(x) && Number.isInteger(rule.f(x)) && rule.f(x) >= 0) out.add(x); }
  return [...out];
}
// Táblázat: missing = { row: "X" | "Y", i }
function table(rows, missing) {
  return `<table class="tbl"><tbody>${rows.map(([name, vals]) => `<tr><th>${name}</th>${vals.map((v, i) => missing && missing.row === name && missing.i === i ? `<td style="background:var(--warnbg);font-weight:900">?</td>` : `<td>${fmt(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

// ---- 1. Hiányzó szám a táblázatban (a szabály adott) ----
function hianyzo(rng, lvl) {
  const R = makeRule(rng, lvl), xs = xsFor(R, rng, 4, lvl);
  if (xs.length < 4) return hianyzo(rng, lvl);
  const ys = xs.map(R.f), i = rng.int(0, 3);
  const back = lvl >= 2 && rng.chance(0.5) && Number.isInteger(R.inv(ys[i]));
  const ans = back ? xs[i] : ys[i];
  return {
    sub: "hianyzo",
    q: `A táblázat minden oszlopára igaz ez a szabály: <b class="big">${R.txt}</b>${table([["X", xs], ["Y", ys]], { row: back ? "X" : "Y", i })}<p><b>Melyik szám kerül a kérdőjel helyére?</b></p>`,
    ans: { kind: "num", value: ans },
    hint: back ? "Most Y-t ismered, és X-et keresed: visszafelé kell számolni – a fordított műveletekkel, fordított sorrendben!" : "Helyettesítsd be az X értékét a szabályba! Figyelj a műveletek sorrendjére: előbb szorzás/osztás, aztán összeadás/kivonás.",
    steps: back
      ? [`Y ismert: <b>${fmt(ys[i])}</b>. Visszafelé haladunk: ${R.invTxt}.`, `X = <b class="big">${fmt(xs[i])}</b>`, `Ellenőrzés a szabállyal: ${R.steps(xs[i]).join(", ")} ✔`]
      : [`Behelyettesítünk: X = <b>${fmt(xs[i])}</b>.`, R.steps(xs[i]).join("<br>"), `Y = <b class="big">${fmt(ys[i])}</b>`],
    why: v => {
      if (!back && R.wrong && v === R.wrong(xs[i])) return "Figyelj a műveleti sorrendre: előbb a szorzás, csak utána az összeadás/kivonás!";
      if (back && v === R.f(ys[i])) return "Előre számoltál, de most Y-ból kell X-et kiszámolni – visszafelé, a fordított műveletekkel!";
      return null;
    },
  };
}

// ---- 2. Melyik szabály illik minden oszlophoz? ----
function melyik(rng, lvl) {
  if (lvl === 3) return harom(rng);
  for (let t = 0; t < 100; t++) {
    const R = makeRule(rng, lvl), xs = xsFor(R, rng, 4, lvl);
    if (xs.length < 4) continue;
    const ys = xs.map(R.f);
    // csalirányok: az első oszlopra illő, de a többire nem illő szabályok
    const x0 = xs[0], y0 = ys[0], cands = [];
    for (const m of [1, 2, 3, 4, 5, 6]) { const c = y0 - x0 * m; if (c > 0) cands.push({ txt: m === 1 ? `Y = X + ${c}` : `Y = X · ${m} + ${c}`, f: x => x * m + c }); if (c < 0 && -c < x0 * m) cands.push({ txt: m === 1 ? `Y = X − ${-c}` : `Y = X · ${m} − ${-c}`, f: x => x * m + c }); }
    if (y0 % x0 === 0 && y0 / x0 > 1) cands.push({ txt: `Y = X · ${y0 / x0}`, f: x => x * (y0 / x0) });
    // csak olyan csalirány, ami minden oszlopra nem negatív számot ad (4. osztályban nincs negatív szám)
    const wrong = cands.filter(c => c.txt !== R.txt && xs.some((x, i) => c.f(x) !== ys[i]) && xs.every(x => c.f(x) >= 0));
    if (wrong.length < 2) continue;
    const opts = rng.shuffle([R, ...rng.sample(wrong, 2)]);
    const grid = `<table class="tbl"><tr><th>szabály</th>${xs.map(x => `<th>X = ${x}</th>`).join("")}</tr>${opts.map(o => `<tr><td><b>${o.txt}</b></td>${xs.map((x, i) => `<td>${fmt(o.f(x))} ${o.f(x) === ys[i] ? "✅" : "❌"}</td>`).join("")}</tr>`).join("")}</table>`;
    return {
      sub: "melyik",
      q: `Melyik szabály illik a táblázat <b>minden</b> oszlopához?${table([["X", xs], ["Y", ys]])}`,
      ans: { kind: "choice", options: opts.map(o => o.txt), value: opts.indexOf(R) },
      hint: "Ne csak az első oszlopot nézd! Próbáld ki mindegyik szabályt az összes oszlopon – csak az a jó, amelyik mindenhol stimmel.",
      steps: [`Kipróbáljuk mindegyik szabályt minden oszlopra:` + grid, `Csak egy szabály stimmel mindenhol: <b class="big">${R.txt}</b><br><span class="soft">Vigyázz: több szabály is illhet az első oszlopra – mindig ellenőrizd az összeset!</span>`],
      why: k => { const o = opts[k]; return o && o !== R && o.f(xs[0]) === ys[0] ? "Ez a szabály az első oszlopra illik, de a többire nem – mindegyik oszlopot ellenőrizni kell!" : null; },
    };
  }
  return hianyzo(rng, lvl);
}
// 3. szint: A, B, C sorok; több helyes (egyenértékű) szabály is lehet – mint 2026/1 #8
function harom(rng) {
  const k = rng.int(2, 15) * 10;
  const cols = Array.from({ length: 3 }, () => { const A = rng.int(5, 60) * 10, B = rng.int(5, 30) * 10; return [A, B, A + B + k]; });
  const As = cols.map(c => c[0]), Bs = cols.map(c => c[1]), Cs = cols.map(c => c[2]);
  const good = [{ txt: `C = ${k} + A + B`, ok: true }, { txt: `A = C − ${k} − B`, ok: true }, { txt: `B = C − (A + ${k})`, ok: true }];
  const bad = [{ txt: `A = C + ${k} − B`, ok: false }, { txt: `C = A + B − ${k}`, ok: false }, { txt: `B = C − A + ${k}`, ok: false }];
  const opts = rng.shuffle([...rng.sample(good, 2), ...rng.sample(bad, 2)]);
  const correct = opts.map((o, i) => o.ok ? i : -1).filter(i => i >= 0);
  return {
    sub: "melyik",
    q: `Mely szabályok illenek a táblázat minden oszlopához? <b>Jelöld meg az összeset!</b>${table([["A", As], ["B", Bs], ["C", Cs]])}`,
    ans: { kind: "pick", options: opts.map(o => o.txt), value: correct },
    hint: "Egy szabályt többféleképpen is fel lehet írni (pl. ha C = A + B + 10, akkor A = C − 10 − B). Próbáld ki mindegyiket az első oszlopon, és ami stimmel, azt a többin is!",
    steps: [
      `Az első oszlop: A = ${As[0]}, B = ${Bs[0]}, C = ${Cs[0]}. Látszik, hogy C = A + B + <b>${k}</b> (${As[0]} + ${Bs[0]} + ${k} = ${Cs[0]}).`,
      opts.map(o => `${o.ok ? "✅" : "❌"} <b>${o.txt}</b> – ${o.ok ? "ugyanaz a szabály másképp felírva" : "ez nem stimmel (próbáld ki: " + o.txt.split(" = ")[0] + " nem jön ki)"}`).join("<br>"),
      `A jók: <b class="big">${list(correct.map(i => opts[i].txt))}</b>`,
    ],
    why: ks => { const badPick = ks.find(k => !opts[k].ok); return badPick != null ? `A(z) „${opts[badPick].txt}” nem jó: helyettesítsd be az első oszlop számait, és nézd meg!` : "Van még olyan szabály, ami ugyanezt fejezi ki másképp felírva!"; },
  };
}

// ---- 3. Találd ki a szabályt! (a szabály nincs megadva) ----
function kitalal(rng, lvl) {
  const a = rng.int(2, lvl === 1 ? 5 : 9), b = lvl === 1 ? 0 : rng.int(1, 30);
  const sign = lvl === 3 && rng.chance(0.5) ? -1 : 1;
  const f = x => x * a + sign * b;
  const start = rng.int(b + 1, b + 10), xs = [start, start + 1, start + 2, start + 4];
  const ys = xs.map(f), target = rng.int(25, 50);
  const rule = b ? `Y = X · ${a} ${sign > 0 ? "+" : "−"} ${b}` : `Y = X · ${a}`;
  return {
    sub: "kitalal",
    q: `Találd ki a táblázat szabályát!${table([["X", [...xs, target]], ["Y", [...ys, f(target)]]], { row: "Y", i: 4 })}<p><b>Mennyi Y, ha X = ${target}?</b></p>`,
    ans: { kind: "num", value: f(target) },
    hint: "Nézd meg, mennyivel nő Y, amikor X 1-gyel nő! Ez megmutatja, hányszorosát kell venni X-nek. Utána nézd meg, mennyit kell még hozzáadni vagy elvenni.",
    steps: [
      `Amikor X 1-gyel nő (${xs[0]} → ${xs[1]}), Y ${numVal(a)} nő (${ys[0]} → ${ys[1]}). Tehát a szabályban <b>X · ${a}</b> szerepel.`,
      b ? `X · ${a}: ${xs[0]} · ${a} = ${xs[0] * a}, de Y = ${ys[0]} – ez <b>${numVal(b)}</b> ${sign > 0 ? "több, tehát még hozzá kell adni" : "kevesebb, tehát még ki kell vonni"} ennyit. A szabály: <b>${rule}</b>` : `Ellenőrizzük: ${xs[0]} · ${a} = ${ys[0]} ✔ A szabály: <b>${rule}</b>`,
      `X = ${target}: ${target} · ${a}${b ? ` ${sign > 0 ? "+" : "−"} ${b}` : ""} = <b class="big">${fmt(f(target))}</b>`,
    ],
    why: v => v === target * a && b ? `Majdnem! A szorzás jó, de ne felejtsd el a ${sign > 0 ? "hozzáadást" : "kivonást"} (${b}) sem!` : v === ys[ys.length - 1] + (target - xs[xs.length - 1]) ? `Y nem 1-gyel nő, amikor X 1-gyel nő – hanem ${numVal(a)}!` : null,
  };
}

// ---- 4–6. „Minden nap d-vel többet” sorozat ----
const STORIES = [
  { intro: (a, d) => `Panni egy könyvet olvas. Az első napon ${a} oldalt olvasott, és minden nap ${d} oldallal többet olvas, mint az előző napon.`, unit: "oldal", acc: "oldalt", verb: "olvas" },
  { intro: (a, d) => `Linda angol szavakat tanul. Az első napon ${a} új szót tanult meg, és minden nap ${numVal(d)} több szót tanul, mint előző nap.`, unit: "szó", acc: "szót", verb: "tanul meg" },
  { intro: (a, d) => `Bence edz: az első napon ${a} felülést csinált, és minden nap ${numVal(d)} többet csinál, mint előző nap.`, unit: "felülés", acc: "felülést", verb: "csinál" },
];
function seqParams(rng, lvl) { return { a: rng.int(lvl === 1 ? 2 : 5, 15), d: rng.int(1, lvl === 1 ? 3 : 5), S: rng.pick(STORIES) }; }
function seqTable(a, d, n, hl) { const xs = Array.from({ length: n }, (_, i) => i + 1); return `<table class="tbl"><tr><th>nap</th>${xs.map(i => `<td${i === hl ? ' style="background:var(--okbg);font-weight:900"' : ""}>${i}.</td>`).join("")}</tr><tr><th>db</th>${xs.map(i => `<td${i === hl ? ' style="background:var(--okbg);font-weight:900"' : ""}>${a + (i - 1) * d}</td>`).join("")}</tr></table>`; }

function sorNedik(rng, lvl) {
  const { a, d, S } = seqParams(rng, lvl), n = rng.int(lvl === 1 ? 4 : 7, lvl === 1 ? 7 : 20), v = a + (n - 1) * d;
  return {
    sub: "sorozat", q: `${S.intro(a, d)}<p><b>Hány ${S.acc} ${S.verb} ${article(n)} ${n}. napon?</b></p>`,
    ans: { kind: "num", value: v, unit: S.unit },
    hint: `Az első naptól ${article(n)} ${n}. napig hány alkalommal nő a szám? Vigyázz: nem ${n} alkalommal!`,
    steps: [n <= 10 ? `Írjuk fel napról napra:` + seqTable(a, d, n, n) : `Az első napon ${a}, és minden nap ${numVal(d)} több.`, `Az 1. naptól ${article(n)} ${n}. napig <b>${n - 1} alkalommal</b> nő (eggyel kevesebbszer, mint ahány nap van!): ${n - 1} · ${d} = ${(n - 1) * d}.`, `${a} + ${(n - 1) * d} = <b class="big">${v}</b>`],
    why: x => x === a + n * d ? `Az 1. naptól ${article(n)} ${n}. napig csak ${n - 1} alkalommal nő a szám, nem ${n} alkalommal!` : x === n * d ? `Ne felejtsd el az első napi ${a}-t!` : null,
  };
}
function sorHanyadik(rng, lvl) {
  const { a, d, S } = seqParams(rng, lvl), n = rng.int(5, lvl === 1 ? 8 : 20), v = a + (n - 1) * d;
  return {
    sub: "sorozat", q: `${S.intro(a, d)}<p><b>Hányadik napon ${S.verb} pontosan ${v} ${S.acc}?</b></p>`,
    ans: { kind: "num", value: n },
    hint: `Mennyivel több ${v}, mint az első napi ${a}? Ez hány napnyi növekedés? Ne felejtsd el: az első nap is számít!`,
    steps: [`${v} − ${a} = <b>${v - a}</b> – ennyivel több, mint az első napon.`, `Ez ${v - a} : ${d} = <b>${n - 1}</b> nap az első nap után.`, `Az első nap + ${n - 1} nap: ${article(n)} <b class="big">${n}.</b> napon` + (n <= 10 ? seqTable(a, d, n, n) : "")],
    why: x => x === n - 1 ? "Az első napot is számolni kell: az első nap után még ennyi nap telt el, tehát eggyel többedik napon!" : x === v / d ? `Előbb vond le az első napi ${a}-t!` : null,
  };
}
function sorOsszeg(rng, lvl) {
  const { a, d, S } = seqParams(rng, lvl), n = rng.int(3, lvl === 3 ? 7 : 5);
  const terms = Array.from({ length: n }, (_, i) => a + i * d), sum = terms.reduce((x, y) => x + y, 0);
  if (lvl === 3 && rng.chance(0.5)) {
    const startIdx = rng.int(0, 6), total = rng.int(10, 16), endIdx = (startIdx + total - 1) % 7;
    return {
      sub: "sorozat", q: `Panni ${ON[startIdx] === "vasárnap" ? "egy vasárnap" : "egy " + ON[startIdx]} kezdett olvasni egy könyvet, és ${total} nap alatt olvasta ki (az első nap is beleszámít). <b>A hét melyik napján olvasta ki?</b>`,
      ans: { kind: "choice", options: DAYS.slice(), value: endIdx },
      hint: `Az első nap is a ${total} nap közé számít! Minden 7 nap után ugyanaz a nap jön.`,
      steps: [`Az 1. nap: ${DAYS[startIdx]}. A ${total}. nap az első után ${total - 1} nappal van.`, `${total - 1} = ${Math.floor((total - 1) / 7)} · 7 + ${(total - 1) % 7} → ${DAYS[startIdx]} után még ${(total - 1) % 7} nappal.`, `<b class="big">${DAYS[endIdx]}</b>`],
      why: k => k === (startIdx + total) % 7 ? "Eggyel elszámoltad: az első nap is beleszámít!" : null,
    };
  }
  return {
    sub: "sorozat", q: `${S.intro(a, d)}<p><b>Összesen hány ${S.acc} ${S.verb} az első ${n} napon?</b></p>`,
    ans: { kind: "num", value: sum, unit: S.unit },
    hint: "Írd fel napról napra, mennyi volt, aztán add össze!",
    steps: [`Napról napra:` + seqTable(a, d, n, 0), `Összeadva: ${terms.join(" + ")} = <b class="big">${sum}</b>`],
    why: x => x === a + (n - 1) * d ? `Ez csak a ${n}. nap – a kérdés az összeset kéri!` : x === a * n ? "Nem minden nap ugyanannyi – minden nap több lett!" : null,
  };
}

// ---- 7. Számsorozat: mi jön ezután? / mi hiányzik? ----
function szamsor(rng, lvl) {
  let seq, rule, expl;
  const kind = lvl === 1 ? rng.pick(["add", "sub"]) : lvl === 2 ? rng.pick(["add", "alt", "grow"]) : rng.pick(["mul", "alt", "grow", "fib"]);
  const len = 6;
  if (kind === "add" || kind === "sub") { const d = rng.int(2, lvl === 1 ? 9 : 25), s = kind === "add" ? rng.int(1, 50) : rng.int(60, 150); seq = Array.from({ length: len }, (_, i) => s + (kind === "add" ? 1 : -1) * i * d); rule = `mindig ${kind === "add" ? "+" : "−"}${d}`; expl = seq.slice(1).map((x, i) => `${seq[i]} → ${x}: ${kind === "add" ? "+" : "−"}${d}`); }
  else if (kind === "alt") { const p = rng.int(3, 9), q = rng.int(1, p - 1), s = rng.int(1, 30); seq = [s]; for (let i = 1; i < len; i++) seq.push(seq[i - 1] + (i % 2 ? p : -q)); rule = `felváltva +${p}, −${q}`; expl = seq.slice(1).map((x, i) => `${seq[i]} → ${x}: ${i % 2 ? "−" + q : "+" + p}`); }
  else if (kind === "grow") { const s = rng.int(1, 20), d0 = rng.int(1, 3); seq = [s]; for (let i = 1; i < len; i++) seq.push(seq[i - 1] + d0 + i - 1); rule = `a különbség mindig 1-gyel nő (+${d0}, +${d0 + 1}, +${d0 + 2}, …)`; expl = seq.slice(1).map((x, i) => `${seq[i]} → ${x}: +${x - seq[i]}`); }
  else if (kind === "mul") { const m = rng.pick([2, 3]), s = rng.int(1, 5); seq = Array.from({ length: len }, (_, i) => s * m ** i); rule = `mindig ·${m}`; expl = seq.slice(1).map((x, i) => `${seq[i]} → ${x}: ·${m}`); }
  else { const s = rng.int(1, 4), t = rng.int(s, 6); seq = [s, t]; for (let i = 2; i < len; i++) seq.push(seq[i - 1] + seq[i - 2]); rule = "minden szám az előző kettő összege"; expl = seq.slice(2).map((x, i) => `${seq[i]} + ${seq[i + 1]} = ${x}`); }
  const missing = lvl >= 2 && rng.chance(0.4) ? rng.int(1, len - 2) : len - 1;
  const shown = seq.map((x, i) => i === missing ? "?" : fmt(x));
  return {
    sub: "szamsor",
    q: `Folytasd a szabály szerint! Melyik szám kerül a <b>?</b> helyére?<div class="qbig">${shown.join(", &nbsp;")}${missing === len - 1 ? "" : ", …"}</div>`,
    ans: { kind: "num", value: seq[missing] },
    hint: "Nézd meg, mennyi a különbség a szomszédos számok között! Ha nem mindig ugyanannyi, keress mintát a különbségekben (vagy szorzást)!",
    steps: [`Nézzük a szomszédos számokat:<br>${expl.filter((_, i) => i !== missing - 1 && i !== missing).slice(0, 4).join("<br>")}`, `A szabály: <b>${rule}</b>.`, `A hiányzó szám: <b class="big">${fmt(seq[missing])}</b><br><span class="soft">A teljes sor: ${seq.map(fmt).join(", ")}</span>`],
    why: v => (kind === "grow" && v === seq[missing - 1] + (seq[missing - 1] - seq[missing - 2])) ? "A különbség nem állandó – figyeld meg, hogyan változik a különbség is!" : null,
  };
}

export default {
  id: "T13",
  name: "Szabálykeresés",
  planet: { name: "Szabály-szputnyik", emoji: "🛰️", color: "#6366f1" },
  subs: [
    { id: "hianyzo", name: "Hiányzó szám", gen: hianyzo },
    { id: "melyik", name: "Melyik szabály illik?", gen: melyik },
    { id: "kitalal", name: "Találd ki a szabályt!", gen: kitalal },
    { id: "nedik", name: "Hányat az n-edik napon?", gen: sorNedik },
    { id: "hanyadik", name: "Hányadik napon?", gen: sorHanyadik },
    { id: "osszeg", name: "Összesen / melyik napon", gen: sorOsszeg, minLvl: 2 },
    { id: "szamsor", name: "Számsorozat", gen: szamsor },
  ],
};
