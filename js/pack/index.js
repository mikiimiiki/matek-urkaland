// ===== Matek csomag: a Matek Űrkaland feladatai a közös vázhoz =====
// A váz (js/shell) csak ezen az objektumon keresztül éri el a feladatokat. A szerződés leírása:
// docs/terv-kozos-vaz.md, 3. fejezet.
import { TYPES, COMING, typeById, makeTask as makeRaw } from "./types/index.js";
import { checkAnswer, answerText, correctText } from "./check.js";
import { plain } from "./util.js";
import { helpSteps } from "./helpmask.js";
import { PLANET_INFO } from "./planet-info.js";
import { renderAnswer } from "./answer-ui.js";
import { typeState, typeLvl, subKey, subAcc, subColor, pickSub, planMission, recordProgress, starsTotal, PACK_BADGES } from "./progress.js";
import { el, escHtml } from "../core/dom.js";

const speechText = html => plain(String(html).replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<table[\s\S]*?<\/table>/g, " "))
  .replace(/·/g, " szorozva ").replace(/ : /g, " osztva ").replace(/−/g, " mínusz ").replace(/→/g, ", ").replace(/≥/g, " nagyobb vagy egyenlő ").replace(/&lt;|</g, " kisebb ");

export const PACK = {
  id: "matek",
  stepHelp: true, // ❓ / F1 feladat közben: a levezetés következő lépése (a végeredményt soha)
  // a kezdőlap témakártyái (itt: bolygók)
  topics: TYPES.map(T => ({ id: T.id, name: T.name, icon: T.planet.emoji, color: T.planet.color, place: T.planet.name })),
  coming: COMING.map(c => ({ icon: c.emoji, place: c.name })),
  levels: { count: 3, mode: "auto" },

  // ---- a gyerek csomag-saját adatai ----
  newUser: () => ({ types: {}, subs: {} }),
  normUser(u) {
    const arr = x => Array.isArray(x) ? x : Object.values(x || {});
    u.types = u.types || {}; u.subs = u.subs || {};
    // régi, ponttal írt kulcsok átalakítása ("T1.kerekites" → "T1:kerekites")
    Object.keys(u.subs).forEach(k => { if (k.includes(".")) { u.subs[k.replace(".", ":")] = u.subs[k]; delete u.subs[k]; } });
    Object.values(u.subs).forEach(s => { s.last = arr(s.last); });
    return u;
  },

  // ---- haladás egy témában (kártya, Gyűjtemény) ----
  status(u, id) {
    const ts = typeState(u, id), lvl = typeLvl(u, id);
    return { stars: ts.stars, level: lvl, label: ts.stars >= 3 ? "Mester! 👑" : `${lvl}. szint · még ${3 - ts.run} jó válasz a csillagig` };
  },
  levelOf: (u, id) => typeLvl(u, id),

  // ---- feladatok ----
  plan: (u, n, rng, allowed) => planMission(u, rng, n, allowed),
  makeTask(item, rng, u) {
    const T = typeById(item.topic), level = item.level || typeLvl(u, T.id);
    const sub = item.sub || pickSub(u, T, level, rng);
    const t = makeRaw(T, sub, level, rng), S = T.subs.find(s => s.id === sub);
    const A = t.ans, multi = A.kind === "numset" || A.kind === "pick" || A.kind === "combos";
    return {
      topic: T.id, sub, level, raw: t,
      meta: `${T.planet.emoji} ${T.name} · ${S.name} · ${level}. szint`,
      q: t.q, viz: t.viz || "",
      render: (box, io) => renderAnswer(A, box, io),
      check(v) {
        const r = checkAnswer(A, v);
        const feedback = multi && !r.ok ? `<p>${r.good ? `${r.good} jót már megtaláltál. ` : ""}${r.missing ? `Még hiányzik ${r.missing}. ` : ""}${r.extra ? `${r.extra} olyan is van köztük, ami nem jó – a felvételin ezért pontlevonás jár!` : ""}</p>` : "";
        return { ok: r.ok, feedback };
      },
      hint: t.hint, steps: t.steps,
      helpSteps: helpSteps(t.steps, A, t.q + " " + (t.viz || ""), T.id + "." + sub, t.help), // a ❓ súgó: a végeredmény nélkül, kitakarva
      why: v => { try { return t.why ? t.why(v) : null; } catch { return null; } },
      answerText: v => answerText(A, v), correctText: correctText(A),
      speech: t.q, plainQ: speechText(t.q).slice(0, 220),
    };
  },
  record: (u, task, r) => {
    const star = recordProgress(u, task, r);
    if (!star) return null;
    const T = typeById(star.topic);
    return { confetti: true, text: `⭐ Új csillag: ${T.planet.name}! ${star.stars < 3 ? "Mostantól nehezebb feladatok jönnek." : "Mester lettél! 👑"}` };
  },
  speechText,

  // ---- jelvények és jutalom-mérőszámok ----
  badges: PACK_BADGES,
  metrics: { stars: { label: "⭐ csillag", value: starsTotal } },

  // ---- súgó (F1) ----
  help(id) {
    const T = typeById(id), I = PLANET_INFO[id] || {};
    return { title: `${T.planet.emoji} ${T.planet.name}`, subtitle: T.name, about: I.about || "", items: T.subs.map(s => s.name), example: I.example, tip: I.tip };
  },
  topicLabel: id => { const T = typeById(id); return T ? `${T.planet.emoji} ${T.name}` : id; },
  subLabel: (id, sub) => { const T = typeById(id), s = T && T.subs.find(x => x.id === sub); return s ? s.name : sub; },

  // ---- ⚙️ Bolygók fül: altípusok állapota ----
  parentTopics(box, u) {
    const rows = TYPES.map(T => {
      const ts = typeState(u, T.id);
      const chips = T.subs.map(s => { const st = u.subs[subKey(T.id, s.id)], a = st ? subAcc(st) : null; return `<span class="sc ${subColor(u, T.id, s.id)}" title="${st ? `${st.n} feladat, az utolsó ${st.last.length}-ból ${Math.round((a || 0) * 100)}% jó` : "még nem próbálta"}">${escHtml(s.name)}${st ? ` · ${Math.round((a || 0) * 100)}%` : ""}</span>`; }).join("");
      return `<tr><td><b>${T.planet.emoji} ${escHtml(T.name)}</b><br><span class="soft small">${"⭐".repeat(ts.stars) || "–"} · ${typeLvl(u, T.id)}. szint</span></td><td>${chips}</td></tr>`;
    }).join("");
    box.append(el("div", null, `<table class="tmap">${rows}</table><p class="legend"><span class="sc green">megy</span> <span class="sc yellow">bizonytalan</span> <span class="sc red">gyenge – érdemes együtt átnézni</span> <span class="sc grey">még nem próbálta</span><br>A százalék az utolsó (legfeljebb 10) feladat elsőre jó aránya.</p>`));
  },

  // ---- 🎒 Gyűjtemény: a csomag saját füle ----
  collectionTabs: [{
    id: "stars", icon: "⭐", label: "Csillagok", help: "Bolygónként a megszerzett csillagok.",
    render(box, { user: u }) {
      box.append(el("p", "soft small", `Összesen: <b>${starsTotal(u)} / ${TYPES.length * 3}</b> ⭐ – három jó válasz egymás után a bolygó szintjén ad egy csillagot.`));
      const g = el("div", "starlist");
      TYPES.forEach(T => { const ts = typeState(u, T.id); g.append(el("div", "staritem", `<span class="si-ic">${T.planet.emoji}</span><span class="si-n">${escHtml(T.planet.name)}<br><span class="soft small">${escHtml(T.name)}</span></span><span class="si-s">${[1, 2, 3].map(i => `<span class="${ts.stars >= i ? "" : "off"}">⭐</span>`).join("")}</span>`)); });
      box.append(g);
    },
  }],
};
