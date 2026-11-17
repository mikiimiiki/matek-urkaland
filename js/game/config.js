// ===== A Matek Űrkaland konfigurációja a közös kerethez =====
// Ezt cseréli le egy másik játék (pl. német gyakorló): témák, beállítások, feliratok.
import { TYPES } from "../types/index.js";

export const GAME = {
  id: "matek-urkaland",
  title: "Matek Űrkaland",
  settingsTitle: "⚙️ Szülői beállítások",
  topicWord: "bolygó",          // a Fejlődés fülön: „bolygónként”
  pointsIcon: "⛽",
};

// Témák (a Fejlődés fül bolygónkénti sávjaihoz)
export const TOPICS = () => TYPES.map(T => ({ id: T.id, label: T.name, icon: T.planet.emoji, name: T.planet.name }));

// Beállítások leírása (a keret ebből rajzolja az űrlapot)
export const SETTINGS = [
  { key: "goalTasks", scope: "child", type: "number", min: 3, max: 40, default: 10, unit: "feladat", label: "Napi küldetés – feladatok száma", help: "Ennyi feladat után teljesül a napi küldetés (vagy az alábbi idő után, ha az előbb telik le)." },
  { key: "goalMin", scope: "child", type: "number", min: 5, max: 60, default: 15, unit: "perc", label: "Napi küldetés – idő", help: "Ennyi perc gyakorlás után is teljesül a napi küldetés." },
  { key: "freeTasks", scope: "child", type: "select", options: [3, 5, 10], default: 5, unit: "feladat", label: "Szabad gyakorlás egy bolygón", help: "Ennyi feladatból áll egy kör, ha a gyerek egy bolygóra kattint." },
  { key: "tts", scope: "child", type: "toggle", default: false, label: "🔊 Felolvasás alapból bekapcsolva", help: "A feladatot és a magyarázatot a gép felolvassa (a 🔊 gombbal a gyakorlásban is kapcsolható)." },
];
