// ===== A Matek Űrkaland paraméterei a közös vázhoz =====
// Ezt cseréli le egy másik játék (pl. Massalhangzok, német gyakorló): téma, szavak, alapértékek, Firebase.
import { PACK } from "../pack/index.js";
import { settingsDefs } from "../shell/settings-defs.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";
import * as ranks from "./ranks.js";
import * as catalog from "./cosmetics-catalog.js";
import * as events from "./events.js";
import * as gifts from "./gifts.js";
import { migrateFamily, migrateUser, newId } from "./migrate.js";

export const GAME = {
  id: "matek-urkaland",
  title: "Matek Űrkaland",
  settingsTitle: "⚙️ Szülői beállítások",
  storeKey: "matek_urkaland_v1", simKey: "matek_urkaland_sim",
  firebase: FIREBASE_CONFIG,
  // téma és szavak
  logo: "🚀", mascot: "🧑‍🚀",
  pointsIcon: "⛽", pointsName: "üzemanyag",
  topicWord: { one: "bolygó", many: "bolygók", acc: "bolygóra", tab: "🗺️ Bolygók" },
  homeWord: "térkép",
  praise: ["Szuper! 🚀", "Telitalálat! ⭐", "Pontos landolás! 🛬", "Csillagos ötös! 🌟", "Így kell ezt! 💪", "Hibátlan! 🎯"],
  texts: {
    welcome: "Üdv a Matek Űrkalandban! 🚀", pickAvatar: "Hogy hívnak? Válassz egy űrhajóst is!",
    unlockHint: "🎁 Gyakorlással újabb avatarokat, hátteret és rakétát nyithatsz ki!", go: "Indulás! 🚀",
    helloTodo: "Indulhat a mai küldetés?", helloDone: "A mai küldetés kész – szabadon repülhetsz tovább! 🌟",
    start: "🚀 Indítás", cont: "🚀 Folytatás", again: "🚀 Még egy kör", mission: "🚀 Napi küldetés", plus: "🚀 Plusz kör",
    explainTitle: "Nézzük meg együtt! 🧑‍🚀", sideIcon: "🧑‍🚀", helpTitle: "❓ Mi vár a bolygókon?",
  },
  legendLine: "Te vagy a Csillagflotta legendája! 🌟",
  defaults: { goalTasks: 10, goalMin: 15, bigGoal: 30, freeTasks: 5 },
  speechLang: "hu-HU",
  // a játék saját tartalmai, amelyeket a váz megjelenít
  ranks, catalog, events, gifts,
  migrate: { family: migrateFamily, user: migrateUser, newId },
};

// A beállítások leírása (a váz rajzolja ki a ⚙️ ablakban)
export const SETTINGS = settingsDefs(GAME, PACK);
// Témák a Fejlődés fülhöz
export const TOPICS = () => PACK.topics.map(t => ({ id: t.id, label: t.name, icon: t.icon, name: t.place }));
