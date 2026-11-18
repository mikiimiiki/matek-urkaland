// ===== T7 – Logika =====
// A felvételi mintái: sorrend állításokból (verseny, magasság), „ki-kicsoda” táblázat (kié melyik kutya,
// mi a neve), mérkőzésgráf (a nyíl a győztes felé mutat).
// Minden feladatnál végigpróbáljuk az összes lehetőséget, és csak olyan állításokat adunk,
// amelyekből PONTOSAN EGY megoldás jön ki.
import { svg, txt, line, circle, list, article } from "../util.js";

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
function perms(arr) { if (arr.length <= 1) return [arr.slice()]; return arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map(p => [x, ...p])); }

// ---- 1. Sorrend állításokból ----
const ORDER_CTX = [
  { intro: ns => `${list(ns)} indult az iskolai futóversenyen.`, names: ["Piri", "Dani", "Edit", "Máté", "Flóra"], before: (a, b) => `${a} ${b} előtt ért célba.`, just: (a, b) => `${a} közvetlenül ${b} után ért célba.`, between: (a, b, c) => `${a} ${b} és ${c} között ért célba.`, notLast: a => `${a} nem az utolsó lett.`, notFirst: a => `${a} nem nyert.`, place: (a, k) => `${a} ${k}. lett.`, first: "Ki nyerte a versenyt?", last: "Ki ért célba utolsóként?", which: a => `Hányadik lett ${a}?`, after: a => `Ki ért célba közvetlenül ${a} után?` },
  { intro: ns => `${list(ns)} magasság szerint áll sorba a tornaórán – elöl a legmagasabb, hátul a legalacsonyabb.`, names: ["Kuka", "Szende", "Tudor", "Vidor", "Hapci"], before: (a, b) => `${a} magasabb, mint ${b}.`, just: (a, b) => `${a} közvetlenül ${b} mögött áll.`, between: (a, b, c) => `${a} ${b} és ${c} között áll.`, notLast: a => `${a} nem a legalacsonyabb.`, notFirst: a => `${a} nem a legmagasabb.`, place: (a, k) => `${a} a sorban ${article(k)} ${k}.`, first: "Ki a legmagasabb?", last: "Ki a legalacsonyabb?", which: a => `Hányadik ${a} a sorban?`, after: a => `Ki áll közvetlenül ${a} mögött?` },
];
function sorrend(rng, lvl) {
  const n = lvl === 1 ? rng.int(3, 4) : lvl === 2 ? 4 : 5;
  for (let t = 0; t < 300; t++) {
    const C = rng.pick(ORDER_CTX), names = rng.sample(C.names, n), sol = rng.shuffle(names);
    const pos = p => sol.indexOf(p);
    // az összes, a megoldásra IGAZ állítás
    const cands = [];
    for (const a of names) for (const b of names) if (a !== b) {
      if (pos(a) < pos(b)) cands.push({ t: C.before(a, b), f: s => s.indexOf(a) < s.indexOf(b), w: 2 });
      if (pos(a) === pos(b) + 1) cands.push({ t: C.just(a, b), f: s => s.indexOf(a) === s.indexOf(b) + 1, w: 1 });
    }
    for (const a of names) for (const b of names) for (const c of names) if (a !== b && b !== c && a !== c && b < c && pos(a) > Math.min(pos(b), pos(c)) && pos(a) < Math.max(pos(b), pos(c))) cands.push({ t: C.between(a, b, c), f: s => s.indexOf(a) > Math.min(s.indexOf(b), s.indexOf(c)) && s.indexOf(a) < Math.max(s.indexOf(b), s.indexOf(c)), w: 1 });
    for (const a of names) { if (pos(a) !== n - 1) cands.push({ t: C.notLast(a), f: s => s.indexOf(a) !== n - 1, w: 1 }); if (pos(a) !== 0) cands.push({ t: C.notFirst(a), f: s => s.indexOf(a) !== 0, w: 1 }); }
    if (lvl === 1) names.forEach(a => cands.push({ t: C.place(a, pos(a) + 1), f: s => s.indexOf(a) === pos(a), w: 1, who: a, at: pos(a) }));
    // állítások hozzáadása, amíg egyetlen megoldás marad; utána a fölöslegesek elhagyása
    const all = perms(names), clues = [];
    let left = all;
    for (const c of rng.shuffle(cands)) { if (left.length === 1) break; const nl = left.filter(c.f); if (nl.length < left.length) { clues.push(c); left = nl; } }
    if (left.length !== 1) continue;
    for (let i = clues.length - 1; i >= 0; i--) { const rest = clues.filter((_, j) => j !== i); if (all.filter(s => rest.every(c => c.f(s))).length === 1) clues.splice(i, 1); }
    if (clues.length > n + 1) continue;
    // kérdés
    const qk = lvl === 1 ? rng.pick(["first", "last"]) : lvl === 2 ? rng.pick(["which", "first", "last"]) : rng.pick(["which", "after"]);
    let q, options, value;
    const told = clues.filter(c => c.who !== undefined); // „X a 3.” – ezt nem kérdezzük vissza
    if (qk === "first" || qk === "last") { const at = qk === "first" ? 0 : n - 1; if (told.some(c => c.at === at)) continue; q = C[qk]; options = names.slice(); value = options.indexOf(sol[at]); }
    else if (qk === "which") { const free = names.filter(a => !told.some(c => c.who === a)); if (!free.length) continue; const a = rng.pick(free); q = C.which(a); options = names.map((_, i) => `${i + 1}.`); value = pos(a); }
    else { const k = rng.int(0, n - 2), a = sol[k]; q = C.after(a); options = names.slice(); value = options.indexOf(sol[k + 1]); }
    const orderPic = (() => { let b = ""; sol.forEach((p, i) => { b += circle(40 + i * 100, 30, 22, { fill: "var(--pri-soft)", stroke: "var(--pri)", sw: 2 }) + txt(40 + i * 100, 36, String(i + 1), { size: 16, w: 900 }) + txt(40 + i * 100, 74, p, { size: 15, w: 800 }); if (i < n - 1) b += line(64 + i * 100, 30, 116 + i * 100, 30, { stroke: "var(--line)", sw: 2 }); }); return svg(n * 100 - 10, 86, b); })();
    return {
      sub: "sorrend",
      q: `${C.intro(names)} Ezt tudjuk:<ul class="conds">${clues.map(c => `<li>${c.t}</li>`).join("")}</ul><p><b>${q}</b></p>`,
      ans: { kind: "choice", options, value },
      hint: "Rajzolj egy sort a füzetedbe! Kezdd azzal az állítással, amelyik a legtöbbet elárul (pl. „közvetlenül”, „között”), és próbáld elhelyezni a neveket. Minden állítást ellenőrizz!",
      steps: [
        `Írjuk fel sorban, és ellenőrizzük mindegyik állítást ezzel a sorrenddel:` + orderPic,
        clues.map(c => `✅ ${c.t}`).join("<br>") + `<br><span class="soft">Minden állítás teljesül – és más sorrend nem jó.</span>`,
        `A válasz: <b class="big">${options[value]}</b>`,
      ],
      why: () => null,
    };
  }
  throw new Error("sorrend: nem sikerült feladatot készíteni");
}

// ---- 2. Ki-kicsoda táblázat ----
const PEOPLE = [["Ákos", "Leó", "Misi"], ["Gergő", "Marci", "Ádám"], ["Anna", "Bori", "Cili"]];
const ATTRS = {
  fajta: { vals: ["tacskó", "puli", "vizsla"], title: "kutya fajtája", neg: (p, v) => `${p} kutyája nem ${v}.`, pos: (p, v) => `${p} kutyája ${v}.`, q: v => `Kinek a kutyája a ${v}?`, q2: p => `Milyen fajta ${p} kutyája?` },
  nev: { vals: ["Lédi", "Bogáncs", "Picur"], title: "kutya neve", neg: (p, v) => `${p} kutyáját nem ${v}nek hívják.`.replace("Bogáncsnek", "Bogáncsnak").replace("Picurnek", "Picurnak"), pos: (p, v) => `${p} kutyája ${v}.`, q: v => `Kinek a kutyája ${v}?`, q2: p => `Mi a neve ${p} kutyájának?` },
  haj: { vals: ["szőke", "barna", "fekete"], title: "hajszín", neg: (p, v) => `${p} haja nem ${v}.`, pos: (p, v) => `${p} ${v} hajú.`, q: v => `Ki a ${v} hajú?`, q2: p => `Milyen színű ${p} haja?` },
  hangszer: { vals: ["zongora", "gitár", "furulya"], title: "hangszer", neg: (p, v) => `${p} hangszere nem a ${v}.`, pos: (p, v) => `${p} hangszere a ${v}.`, q: v => `Ki játszik ${v === "zongora" ? "zongorán" : v === "gitár" ? "gitáron" : "furulyán"}?`, q2: p => `Min játszik ${p}?` },
};
// két tulajdonság összekapcsolása (pl. „A puli neve Bogáncs.”)
const LINK = { pos: (v1, v2) => `A ${v1} neve ${v2}.`, neg: (v1, v2) => `A ${v1} neve nem ${v2}.` };
function grid(people, vals, sol, title) {
  return `<table class="tbl"><tr><th></th>${vals.map(v => `<th>${v}</th>`).join("")}</tr>${people.map((p, i) => `<tr><th>${p}</th>${vals.map(v => `<td>${sol[i] === v ? "✅" : "❌"}</td>`).join("")}</tr>`).join("")}</table><div class="soft small">${title}</div>`;
}
function kikicsoda(rng, lvl) {
  for (let t = 0; t < 300; t++) {
    const people = rng.pick(PEOPLE);
    const two = lvl === 3;
    const A1 = two ? ATTRS.fajta : ATTRS[rng.pick(["fajta", "haj", "hangszer"])], A2 = two ? ATTRS.nev : null;
    const s1 = rng.shuffle(A1.vals), s2 = two ? rng.shuffle(A2.vals) : null;
    const cands = [];
    people.forEach((p, i) => {
      A1.vals.forEach(v => { if (s1[i] !== v) cands.push({ t: A1.neg(p, v), f: (a) => a[i] !== v }); else if (lvl === 1) cands.push({ t: A1.pos(p, v), f: (a) => a[i] === v, told: i }); });
      if (two) A2.vals.forEach(v => { if (s2[i] !== v) cands.push({ t: A2.neg(p, v), f: (a, b) => b[i] !== v }); });
    });
    if (two) A1.vals.forEach(v1 => A2.vals.forEach(v2 => {
      const owner = s1.indexOf(v1), match = s2[owner] === v2;
      cands.push({ t: match ? LINK.pos(v1, v2) : LINK.neg(v1, v2), f: (a, b) => (b[a.indexOf(v1)] === v2) === match });
    }));
    const P1 = perms(A1.vals), P2 = two ? perms(A2.vals) : [null];
    const all = P1.flatMap(a => P2.map(b => [a, b]));
    let left = all; const clues = [];
    for (const c of rng.shuffle(cands)) { if (left.length === 1) break; const nl = left.filter(([a, b]) => c.f(a, b)); if (nl.length < left.length) { clues.push(c); left = nl; } }
    if (left.length !== 1) continue;
    for (let i = clues.length - 1; i >= 0; i--) { const rest = clues.filter((_, j) => j !== i); if (all.filter(([a, b]) => rest.every(c => c.f(a, b))).length === 1) clues.splice(i, 1); }
    if (clues.length < 2) continue;
    // kérdés
    let q, options, value;
    const askAttr = two && rng.chance(0.5) ? A2 : A1, sol = askAttr === A1 ? s1 : s2;
    // csak olyan gyerekről kérdezünk, akiről nincs kimondva a válasz (különben nem kellene gondolkodni)
    const toldIdx = askAttr === A1 ? clues.filter(c => c.told !== undefined).map(c => c.told) : [];
    const free = [0, 1, 2].filter(i => !toldIdx.includes(i));
    if (!free.length) continue;
    const i = rng.pick(free);
    if (rng.chance(0.5)) { const v = sol[i]; q = askAttr.q(v); options = people.slice(); value = i; }
    else { q = askAttr.q2(people[i]); options = askAttr.vals.slice(); value = options.indexOf(sol[i]); }
    return {
      sub: "kikicsoda",
      q: `${list(people)} ${two ? "mindegyikének van egy kutyája: egy tacskó, egy puli és egy vizsla. A kutyák neve: Lédi, Bogáncs és Picur." : `– mindegyiküknél más a ${A1.title}: ${list(A1.vals)}.`}<br>Ezt tudjuk:<ul class="conds">${rng.shuffle(clues).map(c => `<li>${c.t}</li>`).join("")}</ul><p><b>${q}</b></p>`,
      ans: { kind: "choice", options, value },
      hint: "Készíts táblázatot: sorokban a gyerekek, oszlopokban a lehetőségek. Minden „nem” állításnál tegyél X-et a megfelelő helyre! Ahol egy sorban csak egy hely marad, oda kerül a pipa.",
      steps: [
        `Táblázatba írjuk: minden „nem” állítás egy ❌. Ha egy sorban (vagy oszlopban) csak egy üres hely marad, az a jó ✅.`,
        grid(people, A1.vals, s1, A1.title) + (two ? grid(people, A2.vals, s2, A2.title) : ""),
        `A válasz: <b class="big">${options[value]}</b>`,
      ],
      why: () => null,
    };
  }
  throw new Error("kikicsoda: nem sikerült feladatot készíteni");
}

// ---- 3. Mérkőzésgráf: a nyíl mindig a győztes felé mutat ----
function graph(teams, games) {
  const n = teams.length, R = 90, cx = 130, cy = 115;
  const P = teams.map((_, i) => [cx + R * Math.sin(2 * Math.PI * i / n), cy - R * Math.cos(2 * Math.PI * i / n)]);
  let b = `<defs><marker id="lg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ink)"/></marker></defs>`;
  games.forEach(([w, l]) => { const [x1, y1] = P[l], [x2, y2] = P[w], d = Math.hypot(x2 - x1, y2 - y1), r = 22; b += line(x1 + (x2 - x1) * r / d, y1 + (y2 - y1) * r / d, x2 - (x2 - x1) * (r + 2) / d, y2 - (y2 - y1) * (r + 2) / d, { sw: 2.5, extra: ' marker-end="url(#lg)"' }); });
  teams.forEach((t, i) => { b += circle(P[i][0], P[i][1], 20, { fill: "var(--pri-soft)", stroke: "var(--pri)", sw: 2.5 }) + txt(P[i][0], P[i][1] + 6, t, { size: 17, w: 900 }); });
  return svg(260, 230, b);
}
function merkozes(rng, lvl) {
  for (let t = 0; t < 400; t++) {
    const n = lvl === 1 ? 4 : 5, teams = "ABCDE".slice(0, n).split("");
    const pairs = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
    const k = lvl === 1 ? rng.int(3, 5) : lvl === 2 ? rng.int(5, 7) : rng.int(6, 9);
    const games = rng.sample(pairs, k).map(([i, j]) => rng.chance(0.5) ? [i, j] : [j, i]); // [győztes, vesztes]
    const st = teams.map((_, i) => ({ w: games.filter(g => g[0] === i).length, l: games.filter(g => g[1] === i).length }));
    st.forEach(s => { s.p = s.w + s.l; });
    const uniq = (f, best) => { const vals = st.map(f), m = best(...vals); return vals.filter(v => v === m).length === 1 ? vals.indexOf(m) : -1; };
    const qs = [
      { lv: 1, q: "Összesen hány mérkőzés volt eddig?", ans: { kind: "num", value: k }, ex: `Minden nyíl egy mérkőzés: <b class="big">${k}</b>`, why: v => v === 2 * k ? "Minden mérkőzést kétszer számoltál – egy nyíl egy mérkőzés!" : null },
      { lv: 1, q: "Melyik csapat nyert a legtöbbször?", pick: uniq(s => s.w, Math.max), key: "w" },
      { lv: 1, q: "Melyik csapat játszotta eddig a legkevesebb mérkőzést?", pick: uniq(s => s.p, Math.min), key: "p" },
      { lv: 2, q: `Minden csapat mindegyikkel egyszer játszik. Hány mérkőzés van még hátra?`, ans: { kind: "num", value: n * (n - 1) / 2 - k }, ex: `Összesen ${n} csapat: ${Array.from({ length: n - 1 }, (_, i) => n - 1 - i).join(" + ")} = ${n * (n - 1) / 2} mérkőzés lesz. Eddig ${k} volt, hátra van: ${n * (n - 1) / 2} − ${k} = <b class="big">${n * (n - 1) / 2 - k}</b>`, why: v => v === n * (n - 1) - k ? "Az A–B és a B–A ugyanaz a mérkőzés – ne számold kétszer!" : v === n * (n - 1) / 2 ? "Ez az összes mérkőzés – le kell vonni a már lejátszottakat!" : null },
      { lv: 2, q: "Melyik csapat vesztett a legtöbbször?", pick: uniq(s => s.l, Math.max), key: "l" },
      { lv: 3, q: "Hány csapat vesztett pontosan 2 mérkőzést?", ans: { kind: "num", value: st.filter(s => s.l === 2).length }, ex: `Akikbe 2 nyíl indul ki (vesztes): ${teams.filter((_, i) => st[i].l === 2).join(", ") || "senki"} → <b class="big">${st.filter(s => s.l === 2).length}</b>`, why: () => null },
    ].filter(x => x.lv <= lvl && (x.pick === undefined || x.pick >= 0));
    if (!qs.length) continue;
    const Q = rng.pick(qs.filter(x => lvl === 1 || x.lv >= lvl - 1));
    if (!Q) continue;
    const table = `<table class="tbl"><tr><th>csapat</th>${teams.map(x => `<th>${x}</th>`).join("")}</tr><tr><td>játszott</td>${st.map(s => `<td>${s.p}</td>`).join("")}</tr><tr><td>győzelem (ide mutat nyíl)</td>${st.map(s => `<td>${s.w}</td>`).join("")}</tr><tr><td>vereség (innen indul nyíl)</td>${st.map(s => `<td>${s.l}</td>`).join("")}</tr></table>`;
    const base = `Egy bajnokságon ${n} csapat vesz részt: ${list(teams)}. Az ábra az eddigi mérkőzéseket mutatja: <b>a nyíl mindig a nyertes csapat felé mutat</b>.<p><b>${Q.q}</b></p>`;
    const steps = [`Számoljuk össze csapatonként (a csapatból kiinduló nyíl: vereség, a csapatba mutató nyíl: győzelem):` + table];
    if (Q.pick !== undefined) return {
      sub: "merkozes", q: base, viz: graph(teams, games), ans: { kind: "choice", options: teams.slice(), value: Q.pick },
      hint: "Minden nyíl egy mérkőzés. A nyíl hegye a győztesnél van. Számold meg csapatonként!",
      steps: [...steps, `A válasz: <b class="big">${teams[Q.pick]}</b>`], why: () => null,
    };
    return { sub: "merkozes", q: base, viz: graph(teams, games), ans: Q.ans, hint: "Minden nyíl egy mérkőzés. A nyíl hegye a győztesnél van.", steps: [...steps, Q.ex], why: Q.why };
  }
  throw new Error("merkozes: nem sikerült feladatot készíteni");
}

export default {
  id: "T7",
  name: "Logika",
  planet: { name: "Logika-labirintus", emoji: "🧩", color: "#0ea5e9" },
  subs: [
    { id: "sorrend", name: "Sorrend állításokból", gen: sorrend },
    { id: "kikicsoda", name: "Ki-kicsoda táblázat", gen: kikicsoda },
    { id: "merkozes", name: "Mérkőzések", gen: merkozes },
  ],
};
