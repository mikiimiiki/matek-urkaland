import { normalizePack } from "../core/pack-contract.js";
// ===== A közös váz indítása: startShell({ game, pack }) =====
// Az app saját main.js-e csak ezt hívja. Minden más (képernyők, felhő, eszköz, billentyűk) innen indul.
import { $, toast } from "../core/dom.js";
import * as keys from "../core/keys.js";
import { createCloud } from "../core/cloud.js";
import { createDevice } from "../core/device.js";
import { makeRng } from "../core/rng.js";
import { dayNum, dateKey, keyToDay, setToday, isSimulated } from "../core/dates.js";
import { C, cur, persist, applyPrefs, speak } from "./ctx.js";
import { settingsDefs } from "./settings-defs.js";
import { normUser } from "./user.js";
import { show, refreshAll, renderTop, renderHome } from "./home.js";
import { startMission, goHome, homeKeys, round, debugShow } from "./play.js";
import { newPlayer, onUserClick, openGear, enforceDevice, maybeAskDevice, onDeviceRemote } from "./players.js";
import { openCollection } from "./collection.js";
import { checkHolidays } from "./holidays.js";
import { maybeWeekly } from "./weekly-ui.js";
import { openCloud, renderCloudLive, refreshCloud } from "./cloud-ui.js";
import { openHelp } from "./help.js";
import { openGifts, turboGreet, bigInfo } from "./goal-ui.js";
import { localSaveEnabled, initLocalSave } from "./local-save-ui.js";

export function startShell({ game, pack }) {
  pack = normalizePack(pack);
  C.game = game; C.pack = pack; C.defs = settingsDefs(game, pack); C.rng = makeRng();
  C.refreshAll = refreshAll; C.refreshCloud = refreshCloud;
  if (game.bodyClass) document.body.classList.add(game.bodyClass);   // pl. világos téma

  // Teszteléshez: index.html?nap=2026-12-06#debug → a „mai nap” 2026. dec. 6.; ilyenkor külön tesztadatokkal, felhő nélkül fut
  const SIM = location.hash === "#debug" ? new URLSearchParams(location.search).get("nap") : null;
  if (SIM && /^\d{4}-\d{2}-\d{2}$/.test(SIM)) setToday(keyToDay(SIM));
  C.storeKey = isSimulated() ? game.simKey : game.storeKey;

  // ---- állapot (helyben mindig mentünk; a felhő opcionális) ----
  // biztonságos helyi mentés – sérült mentésnél a váz nem indul, a helyreállító panel jelenik meg;
  // ha a böngésző nem engedi a tárolást, a régi egyszerű betöltés fut
  let st;
  if (localSaveEnabled(C.storeKey)) {
    const r = initLocalSave(C.storeKey);
    if (!r.ok) return;
    st = r.state;
  } else st = (() => { try { return JSON.parse(localStorage.getItem(C.storeKey) || "null"); } catch { return null; } })()
    || { familyCode: "", current: "", users: {}, settings: {}, deleted: {} };
  st.settings = Object.assign({ rewards: [], upd: 0 }, st.settings || {});
  st.deleted = st.deleted || {};
  C.state = st;
  const M = game.migrate, normMig = u => M.user(normUser(u, pack), C.state);
  M.family(C.state);
  // a név a kulcs is – régebbi adatnál csak ott szerepel, ezért innen pótoljuk
  Object.keys(st.users).forEach(n => { st.users[n] = normMig({ ...st.users[n], name: st.users[n].name || n }); });

  // ---- eszköz és felhő ----
  C.device = createDevice(C.storeKey);
  C.cloud = createCloud({
    config: game.firebase, state: () => C.state, persist, normUser: normMig, device: C.device, storeKey: C.storeKey,
    onDevice: onDeviceRemote,
    refresh: () => {
      M.family(C.state);
      if (!C.state.users[C.state.current]) C.state.current = Object.keys(C.state.users)[0] || "";
      enforceDevice(); applyPrefs(); refreshAll(); maybeAskDevice();
      // a nyitott ⚙️ ablakot is frissítjük, kivéve ha a szülő épp egy mezőben gépel
      const a = document.activeElement;
      if (C.gearApi && !(a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))) C.gearApi.draw();
    },
    onStatus: s => { $("tb-cloud-ic").textContent = s.icon; $("tb-sync").textContent = s.text; $("tb-cloud").className = "pill btn-pill " + (s.cls || ""); $("tb-cloud").title = s.detail; renderCloudLive(); },
  });

  // ---- felolvasás gomb ----
  C.updTtsBtn = () => { const b = $("play-tts"); b.textContent = C.tts ? "🔊" : "🔇"; b.setAttribute("aria-pressed", C.tts); b.title = C.tts ? "Felolvasás bekapcsolva" : "Felolvasás kikapcsolva"; };

  // ---- események ----
  $("btn-mission").addEventListener("click", startMission);
  $("rankbox").addEventListener("click", () => openCollection("ranks"));
  $("rankbox").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); openCollection("ranks"); } });
  $("tb-user").addEventListener("click", onUserClick);
  $("tb-gear").addEventListener("click", () => openGear());
  $("tb-cloud").addEventListener("click", openCloud);
  $("tb-help").addEventListener("click", openHelp);
  $("tb-big").addEventListener("click", bigInfo);
  $("play-exit").addEventListener("click", goHome);
  $("play-tts").addEventListener("click", () => { C.tts = !C.tts; C.updTtsBtn(); const S = round(); if (C.tts && S && S.task) speak(S.task.speech || S.task.q); else if ("speechSynthesis" in window) speechSynthesis.cancel(); });
  // a sablon játékfüggő szövegei
  $("tb-pts-ic").textContent = game.pointsIcon; $("tb-pts-pill").title = game.pointsName[0].toUpperCase() + game.pointsName.slice(1);
  [["home-tip", "homeTip"], ["play-tip", "playTip"]].forEach(([id, k]) => { const e = $(id); if (e) { e.textContent = game.texts[k] || ""; e.hidden = !game.texts[k]; } });
  const kh = document.querySelector(".keys-hint");
  if (kh) kh.innerHTML = `⌨️ <b>Tab</b> / <b>Shift+Tab</b>: lépés a ${game.topicWord.many} között · <b>Enter</b>: indulás · <b>F1</b>: mi vár itt? · <b>Esc</b>: vissza`;
  keys.setScreen(homeKeys);

  // Tesztelési segéd: a #debug címmel a konzolból elérhető az állapot és az aktuális kör
  if (location.hash === "#debug") window.__urk = { S: round, state: () => C.state, show: (topic, sub, level) => debugShow({ topic, sub, level }), C };

  // ---- indulás ----
  if (!st.users[st.current]) st.current = Object.keys(st.users)[0] || "";
  enforceDevice(); applyPrefs();
  show("scr-home"); renderTop(); renderHome();
  if (!st.current) newPlayer(true);
  if (isSimulated()) setTimeout(() => toast(`🧪 Szimulált nap: <b>${dateKey(dayNum())}</b> – külön tesztadatokkal, felhő nélkül.`, 6000), 500);
  else C.device.ready.then(() => C.cloud.init());
  setTimeout(checkHolidays, 1200);
  setTimeout(() => maybeWeekly(), 2400);   // 📅 az új hét első belépésekor (a többi ablak után)
  setTimeout(maybeAskDevice, 1500);
  setTimeout(() => { const u = cur(); if (u) { turboGreet(); openGifts(); } }, 1800);
  // offline működés: csak ha a játéknak van service workere (GAME.serviceWorker)
  if (game.serviceWorker && "serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register(game.serviceWorker).catch(() => {});
}
