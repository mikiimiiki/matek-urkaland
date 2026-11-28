// ===== A váz beállításai (leírók) – a játék csak az alapértékeket adja (GAME.defaults) =====
// group: "play" (gyakorlás) · "goal" (🏆 Napi cél és szorzók) · "holiday" (🎄 Ünnepek); scope: child | device
export function settingsDefs(G, P) {
  const d = G.defaults || {}, topic = (G.topicWord || {}).acc || "témára";
  return [
    // gyakorlás
    { key: "freeTasks", group: "play", scope: "child", type: "select", options: [3, 5, 10], default: d.freeTasks ?? 5, unit: "feladat", label: "Szabad gyakorlás egy körben", help: `Ennyi feladatból áll egy kör, ha a gyerek egy ${topic} vagy az 🩹 Ismétlő körre kattint (az ismétlő kör legfeljebb ahány hibás feladat van).` },
    { key: "tts", group: "play", scope: "child", type: "toggle", default: false, label: "🔊 Felolvasás alapból bekapcsolva", help: "A feladatot és a magyarázatot a gép felolvassa (a 🔊 gombbal a gyakorlásban is kapcsolható)." },
    // a helyes alak beírása hibás válasz után: csak olyan játékban látszik, amelynek a csomagja kér beírást (PACK.retype)
    ...(P && P.retype ? [{ key: "retype", group: "play", scope: "child", type: "radio", default: d.retype ?? "must", label: "✍️ Hibás válasz után a helyes alak beírása",
      help: "A magyarázat után középen felugrik egy ablak: a gyerek beírja a helyes alakot (+1 pont), és csak utána léphet tovább.",
      options: [
        { value: "must", label: "Kötelező (ajánlott)", help: "Csak a helyes beírás után lehet továbblépni." },
        { value: "skip", label: "Kihagyható", help: "Egy „Kihagyom” gombbal továbbléphet (akkor nem jár a +1 pont)." },
        { value: "off", label: "Kikapcsolt", help: "Nincs beírás, a magyarázat után rögtön jön a következő lépés." },
      ] }] : []),
    // lépésenkénti súgó feladat közben: csak olyan játékban látszik, amelynek a csomagja kéri (PACK.stepHelp)
    ...(P && P.stepHelp ? [{ key: "stepHelp", group: "play", scope: "child", type: "toggle", default: true, label: "💡 Lépésenkénti súgó feladat közben",
      help: "A ❓ / F1 a megoldás következő lépését mutatja (a végeredményt soha), lépésenként −3 ponttal. Ha két egymás utáni feladatban végignyomja, a következőtől eggyel kevesebb lépés érhető el; 3 súgó nélküli feladat után eggyel több, 5 után minden visszajön." }] : []),
    { key: "sound", group: "play", scope: "child", type: "toggle", default: d.sound ?? true, label: "🔔 Hangjelzések", help: "Halk, rövid dallam jó válaszra, fejlődésre, új tárgyra és a teljesített küldetésre; hibás válaszra egy lágy, nem bántó „hmm” hang." },
    { key: "weekly", group: "play", scope: "child", type: "toggle", default: d.weekly ?? true, label: "📅 Heti összefoglaló a gyereknek", help: "Az új hét első belépésekor egy kis ablak mutatja a múlt hetet: feladatok, elsőre jó arány, teljesített küldetések, fejlődés, sorozat." },
    { key: "dyslexia", group: "play", scope: "child", type: "toggle", default: false, label: "🔤 Diszlexia-barát betűtípus", help: "Jobban tagolt, könnyebben olvasható betűk és nagyobb betűköz." },
    // napi cél és szorzók
    { key: "goalTasks", group: "goal", scope: "child", type: "number", min: 3, max: 40, default: d.goalTasks ?? 10, unit: "feladat", label: "Napi küldetés – feladatok száma", help: "Ennyi feladat után teljesül a napi küldetés (vagy az alábbi idő után, ha az előbb telik le). Ez viszi a napos sorozatot." },
    { key: "goalMin", group: "goal", scope: "child", type: "number", min: 5, max: 60, default: d.goalMin ?? 15, unit: "perc", label: "Napi küldetés – idő", help: "Ennyi perc gyakorlás után is teljesül a napi küldetés." },
    { key: "bigGoal", group: "goal", scope: "child", type: "number", min: 5, max: 300, default: d.bigGoal ?? 30, unit: "helyes válasz", label: "🏆 Napi nagy cél", help: "Ennyi helyes válasz után serlegeső jár, és a kör végén ajándékdobozt választhat. A pontszorzó ezt gyorsítja." },
    { key: "gifts", group: "goal", scope: "child", type: "toggle", default: true, label: "🎁 Ajándékdobozok a nagy cél után", help: "Naponta egyszer választhat egy dobozt (pl. holnapi előleg, puszi, ölelés)." },
    // ünnepek
    { key: "events", group: "holiday", scope: "child", type: "toggle", default: true, label: "🎄 Ünnepi események", help: "Adventi naptár, Mikulás, karácsony, szilveszter – ünnepi jutalmak a napi küldetésért." },
    { key: "snow", group: "holiday", scope: "child", type: "toggle", default: true, label: "❄️ Hóesés, amikor havazik", help: "Ha az alábbi városban aznap havazott vagy havazás várható, egész nap esik a hó a háttérben. Ha nincs időjárás-adat (nincs internet, ismeretlen város), december 1. és január 6. között esik (az ünnepi eseményekkel). Csökkentett mozgás beállításnál magától kikapcsol." },
    { key: "city", group: "holiday", scope: "child", type: "text", default: d.city ?? "Győr", maxLength: 60, placeholder: "pl. Győr", label: "🏙️ Város az időjáráshoz", help: "Naponta egyszer lekérdezzük, hogy itt havazik-e ma (Open-Meteo, ingyenes időjárás-szolgáltatás). Csak a város neve megy ki, pontos helyet nem kérünk." },
    // eszköz
    { key: "syncMode", group: "sync", scope: "device", type: "radio", default: "task", label: "Szinkronmód ezen az eszközön", help: "Mikor menjenek fel az eredmények a felhőbe. A gyerek munkája mindig azonnal mentődik ebben a böngészőben is.",
      options: [
        { value: "live", label: "⚡ Folyamatos", help: "Élő kapcsolat: a másik eszköz változásai azonnal látszanak. A legtöbb forgalom." },
        { value: "task", label: "✅ Minden feladat után (ajánlott)", help: "Minden válasz után felmegy (pár száz bájt). Letöltés induláskor, főmenübe lépéskor és a ⚙️ ablak nyitásakor." },
        { value: "home", label: "🏠 Főmenübe lépéskor", help: "Csak a kör végén, főmenübe lépéskor és az oldal bezárásakor szinkronizál. A legkevesebb forgalom." },
      ] },
    // a csomag saját beállításai
    ...((P && P.settings) || []),
  ];
}
export const GROUPS = [
  { id: "play", title: "🎮 Gyakorlás" },
  { id: "goal", title: "🏆 Napi cél és szorzók" },
  { id: "holiday", title: "🎄 Ünnepek és időjárás" },
];
