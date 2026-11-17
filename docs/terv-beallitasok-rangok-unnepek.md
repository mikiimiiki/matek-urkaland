# Részletes terv: beállítások, fejlődés, szinkron, eszközök, rangok, ünnepek

Készült: 2026-11-17 · Állapot: jóváhagyásra vár · Kapcsolódó: [feladattipusok.md](feladattipusok.md)

## Tartalom

1. [Célok és hatókör](#1-célok-és-hatókör)
2. [Moduláris felépítés](#2-moduláris-felépítés)
3. [Adatszerkezet és átállás](#3-adatszerkezet-és-átállás)
4. [Felület](#4-felület)
5. [Szinkron és forgalom](#5-szinkron-és-forgalom)
6. [Eszközfelismerés és hozzárendelés](#6-eszközfelismerés-és-hozzárendelés)
7. [Ranglétra és kinyitható tárgyak](#7-ranglétra-és-kinyitható-tárgyak)
8. [Ünnepi események](#8-ünnepi-események)
9. [Gyorsbillentyű-modul](#9-gyorsbillentyű-modul)
10. [Ütemek, átvételi feltételek](#10-ütemek-átvételi-feltételek)
11. [Tesztelés](#11-tesztelés)
12. [Kockázatok](#12-kockázatok)

---

## 1. Célok és hatókör

**Célok**

- A szülői felület átlátható, **6 fülös felugró ablakba** kerül, a felső sávban **⚙️ fogaskerékkel**.
- A szülő **napi, heti és havi** szinten lássa a fejlődést, bolygónként is (a nyelvtangyakorló mintájára).
- A **szinkron kapcsolható** legyen (3 mód), a forgalom csökkenjen és mérhető legyen.
- Az app **felismerje az eszközt**, és a szülő gyereket rendelhessen hozzá.
- **12 rangos ranglétra** kinyitható tárgyakkal, plusz **ünnepi események** (advent, Mikulás, karácsony, szilveszter).
- A felépítés **moduláris** legyen: a keret (fülek, beállítások, fejlődés, gyorsbillentyűk, események) egy későbbi német gyakorlóhoz is használható.

**Nem része ennek a tervnek**

- A német gyakorló megírása. Csak úgy készítjük elő a keretet, hogy később könnyű legyen.
- A hibanapló rövidítése (120 → 60 bejegyzés): egyelőre elhalasztva.
- A próbafelvételi mód.

---

## 2. Moduláris felépítés

### 2.1 Alapelv

A **keret** (`js/core/`) nem tud semmit a matekról. A **játék** (`js/game/`) egy konfigurációval adja meg:

- a témákat (bolygókat),
- a fület,
- a beállításokat,
- a rangokat,
- a kinyitható tárgyakat,
- az eseményeket,
- a feliratokat.

Egy német gyakorlónak elég új `js/game/` mappát írnia.

### 2.2 Fájlok

| Fájl | Új / módosul | Feladat |
|---|---|---|
| `js/core/keys.js` | új | Gyorsbillentyű-modul, kontextusveremmel (9. fejezet) |
| `js/core/modal.js` | új (az `app.js`-ből kiemelve) | Felugró ablak: `modal()`, `ask()`, Esc-kezelés |
| `js/core/tabs.js` | új | Füles ablak: fülsor, lusta tartalomrajzolás, gyerekválasztó, ←/→ |
| `js/core/settings.js` | új | Beállításleírók értelmezése, űrlap rajzolása, érték olvasása/írása hatókör szerint |
| `js/core/progress.js` | új | Napi témánkénti statisztika (`hist`), összesítés időszakra, trendadatok |
| `js/core/charts.js` | új | SVG diagram: oszlop (feladatszám) és vonal (pontosság) |
| `js/core/devices.js` | új | Eszközazonosító, javasolt név, eszközlista, hozzárendelés |
| `js/core/cosmetics.js` | új | Kinyitható tárgyak (avatar, háttér, rakéta, konfetti, névkeret) alkalmazása |
| `js/core/events.js` | új | Időszakos események motorja (dátumtartomány, feltétel, jutalom) |
| `js/core/strings.js` | új | Feliratok kulcs szerint (`t("settings.goal")`) – fokozatos átállás |
| `js/cloud.js` | módosul | Szinkronmódok, részleges mentés, külön hibanapló-ág, forgalomszámláló, tétlenségi bontás |
| `js/engine.js` | módosul | `record()` a `hist`-be is ír, és visszaadja a megváltozott útvonalakat |
| `js/game/config.js` | új | A matek játék konfigurációja: témák (`TYPES`-ból), fülek, beállítások |
| `js/game/ranks.js` | új | 12 rang és a hozzájuk tartozó tárgyak |
| `js/game/cosmetics-catalog.js` | új | Avatarok, hátterek, rakéták, konfettik, névkeretek leírása |
| `js/game/events.js` | új | Advent, Mikulás, karácsony, szilveszter, téli hangulat |
| `js/parent/*.js` | új | A 6 fül tartalma: `progress-tab.js`, `planets-tab.js`, `mistakes-tab.js`, `settings-tab.js`, `family-tab.js`, `cloud-tab.js` |
| `js/app.js` | módosul (kisebb lesz) | Kezdőlap, gyakorlás, összekötés |
| `css/style.css` | módosul | Fülek, csempék, diagram, rangablak, adventi naptár, hóesés, témák |
| `sw.js` | módosul | Új fájlok a gyorsítótár-listába, verziószám |

### 2.3 Beállításleíró (példa)

```js
// js/game/config.js
export const SETTINGS = [
  { key: "goalTasks", scope: "child", type: "number", min: 3, max: 40, default: 10,
    label: "Napi küldetés – feladat", help: "Ennyi feladat után teljesül a napi küldetés." },
  { key: "goalMin", scope: "child", type: "number", min: 5, max: 60, default: 15, label: "Napi küldetés – perc" },
  { key: "freeTasks", scope: "child", type: "select", options: [3, 5, 10], default: 5, label: "Szabad gyakorlás egy körben" },
  { key: "tts", scope: "child", type: "toggle", default: false, label: "🔊 Felolvasás alapból" },
  { key: "events", scope: "child", type: "toggle", default: true, label: "🎄 Ünnepi események" },
  { key: "snow", scope: "child", type: "toggle", default: true, label: "❄️ Hóesés decemberben" },
  { key: "syncMode", scope: "device", type: "radio", options: ["live", "task", "home"], default: "task", label: "Szinkronmód" },
];
```

**Hatókörök**

- `family`: családi, `state.family`.
- `child`: gyerekenkénti, `u.prefs`. Ha nincs megadva, a családi alapérték (`state.family.childDefaults`) érvényes.
- `device`: eszközönkénti. A böngészőben (localStorage) tárolódik, és a felhőben az eszközlista bejegyzésébe is bekerül, hogy a szülő a telefonjáról is lássa és állíthassa.

### 2.4 Fülleíró (példa)

```js
export const PARENT_TABS = [
  { id: "progress", icon: "📊", label: "Fejlődés", child: true,  render: renderProgressTab },
  { id: "planets",  icon: "🗺️", label: "Bolygók",  child: true,  render: renderPlanetsTab },
  { id: "mistakes", icon: "📝", label: "Hibák",    child: true,  render: renderMistakesTab, lazyData: "logs" },
  { id: "settings", icon: "⚙️", label: "Beállítások", child: true, render: renderSettingsTab },
  { id: "family",   icon: "👪", label: "Család",   child: false, render: renderFamilyTab },
  { id: "cloud",    icon: "☁️", label: "Felhő",    child: false, render: renderCloudTab },
];
```

A `child: true` fülek fölött a gyerekválasztó látszik. A `lazyData` csak megnyitáskor tölt le adatot (pl. a hibanaplót).

---

## 3. Adatszerkezet és átállás

### 3.1 Gyerek (felhasználó) – új mezők

```js
u = {
  // … meglévő mezők (pts, types, subs, days, streak, badges, claimed, …)
  hist: { "2026-11-17": { T1: { ok: 7, n: 9, ms: 310000 }, T2: { … } } }, // napi, bolygónkénti; 400 napig
  prefs: { goalTasks: 10, goalMin: 15, freeTasks: 5, tts: false, events: true, snow: true },
  rewards: [ { id, text, kind, need } ],          // eddig családi volt → gyerekenként
  cosmetics: { avatar: "🦊", bg: "nebula-purple", rocket: "gold", confetti: "stars", frame: null },
  owned: ["av:🦊", "bg:nebula-purple", "ev:santa-2026", …], // ünnepi és egyéb, örökre megmaradó tárgyak
  eventState: { advent2026: { opened: [1, 2, 4], makeupUsed: { "2026-12-05": true } } },
  schema: 2,
};
```

- **`hist`:** a Fejlődés fül alapja. 400 napig tároljuk (ez kb. 20–40 KB 400 nap alatt). A régebbi napok törlődnek.
- **`owned`:** csak a nem rangból jövő tárgyak (pl. ünnepiek). A rangból jövők a ⛽-ből mindig kiszámolhatók.

### 3.2 Felhő (Realtime Database) – új szerkezet

```
families/{fam}/
  users/{gyerek}            ← a gyerek adatai, a hibanapló NÉLKÜL (részleges frissítéssel)
  logs/{gyerek}/{bejegyzés} ← hibanapló külön ágon, csak a Hibák fül nyitásakor töltődik
  family                    ← családi beállítások és alapértékek (eddig: settings)
  devices/{eszközId}        ← { name, ua, firstSeen, lastSeen, kids: ["Bence"], syncMode, traffic: { "2026-11": { up, down, syncs } } }
  parent, deleted, members  ← változatlan
```

A meglévő `database.rules.json` a `families/$fam` alatt mindent a családtagoknak enged, így **szabálymódosítás nem kell**.

### 3.3 Átállás (migráció) – `schema: 1 → 2`

Az app indításkor és a felhőből érkező adatnál is lefuttatja:

1. `state.settings.goalTasks / goalMin / freeTasks / tts` → **minden gyerek** `u.prefs`-ébe kerül. Az értékek a családi `childDefaults`-ba is bekerülnek.
2. `state.settings.rewards` → **minden gyerek** `u.rewards`-ába átmásolva. Az eddigi `u.claimed` (átadva jelölés) megmarad.
3. `u.log` → feltöltés a `logs/{gyerek}` ágra, utána törlés a felhasználói objektumból.
4. `u.hist` létrehozása. Visszamenőleg csak a `u.days` összesítése tölthető ki, „összes bolygó” témakulccsal (`_all`).
5. `u.cosmetics.avatar` = a mostani avatar, akkor is, ha a rang szerint még zárva lenne (a 7. fejezet szerint megmarad).
6. `u.schema = 2`. Amit a program nem ismer, azt **nem törli** (egy régebbi változatú eszköz se rontsa el).

**Régi eszköz kompatibilitás:** amíg egy eszközön a régi app fut (nem frissítették), az a teljes felhasználói objektumot írja, a `prefs`, `hist` és a többi új mező nélkül. Ezért:

- az új változat felhőből érkező adatnál a hiányzó új mezőket **nem törli**, hanem a sajátjával egyesíti, mezőnként a frissebbet tartva meg;
- a `sw.js` verzióváltása miatt a régi eszköz a következő megnyitáskor magától frissül.

---

## 4. Felület

### 4.1 Felső sáv

| Elem | Viselkedés |
|---|---|
| 🧑‍🚀 Név | Játékosválasztó. Csak akkor kattintható, ha az eszközhöz több gyerek van rendelve (6. fejezet). |
| ⛽, 🔥 | Változatlan |
| ☁️ állapotjelző | Kattintásra **kis ablak PIN nélkül**: állapot, eseménynapló (utolsó 12), „⬆️ Mentés most”, „🔄 Újrakapcsolódás”, és egy **⚙️** ikon, amely PIN után a fogaskerékes ablak Felhő fülét nyitja |
| ❓ Súgó | Változatlan (F1) |
| **⚙️** | A „Szülő” gomb helyett. PIN után a 6 fülös ablak, a legutóbb nyitott fülön |

### 4.2 A fogaskerékes ablak

- Nagy felugró ablak: legfeljebb 1100 px széles és 90% magas, a fül tartalma görgethető.
- Felül a fülsor, alatta (a gyerekhez kötött füleknél) a **gyerekválasztó** csipszek formájában.
- A legutóbbi fület és gyereket megjegyzi (localStorage).

#### 📊 Fejlődés

1. **Csempék:** Ma · Utolsó 7 nap · Utolsó 30 nap. Mindegyikben: feladatok, perc, elsőre jó %, teljesített küldetések. Fölöttük 🔥 sorozat és ⭐ csillagok.
2. **Időszakválasztó:** Nap · Hét (alapértelmezett) · Hónap.
3. **Diagram:**

   | Nézet | Hány oszlop | Mit mutat |
   |---|---|---|
   | Napi | 30 nap | oszlop: feladatszám; vonal: elsőre jó %; 3 válasz alatt nincs pont |
   | Heti | 12 hét | ugyanígy |
   | Havi | 6 × 30 nap | ugyanígy |

   Egérrel rámutatva (`title`) megjelenik a dátum, a %, és hogy hány feladat volt.
4. **Bolygónkénti sávok:** a gyengébbtől az erősebbig.
   - Sáv: az aktuális időszak pontossága.
   - Fekete jel: az előző időszak pontossága.
   - **▲ +x% / ▼ −x%** változás; 5 válasz alatt „kevés adat”.
   - Színek: piros (70% alatt), zöld (90% fölött).
5. Ha még nincs elég adat: „📈 Gyűlik az adat…” üzenet.

#### 🗺️ Bolygók

A mostani típus-térkép változatlanul: csillagok, szint, és az altípusok színes állapota (zöld, sárga, piros, szürke).

#### 📝 Hibák

A hibanapló, a `logs/{gyerek}` ágról, csak a fül megnyitásakor letöltve. Bolygó szerint szűrhető.

#### ⚙️ Beállítások

1. **Napi cél és gyakorlás**, a beállításleírókból rajzolva: napi cél (feladat, perc), szabad kör hossza, felolvasás.
2. **Ünnepek:** ünnepi események, hóesés.
3. **Jutalmak** (gyerekenként): lista haladással, „Átadtam ✓” gomb, törlés, új felvétele, és „📋 Másolás a többi gyerekhez”.
4. Gomb: „↺ Családi alapérték visszaállítása”.

#### 👪 Család

1. **Játékosok:** új, átnevezés, törlés (megerősítéssel).
2. **Eszközök** (táblázat):

   | Eszköz (átírható név) | Utoljára látva | Bence | Lili | Szinkronmód | |
   |---|---|---|---|---|---|
   | Bence laptopja · Windows – Chrome | ma 16:20 | ✅ | ☐ | ✅ Feladatonként | 🗑️ |

   - A pipák adják meg, ki játszhat az adott eszközön.
   - Az „ez az eszköz” sor ki van emelve.
   - Ha egy eszköz 60 napja nem jelentkezett, „régi” címkét kap.
3. **PIN módosítása.**

#### ☁️ Felhő

1. Belépés/kilépés, családtagok, másik szülő hozzáadása (a mostani panelből).
2. **Szinkronmód ehhez az eszközhöz**, három rádiógombbal, mindegyiknél egy mondatos magyarázattal (5. fejezet).
3. **Forgalom ebben a hónapban:**
   - ez az eszköz: feltöltve, letöltve, szinkronok száma;
   - a család összesen (az eszközök számlálóinak összege);
   - becsült Spark-felhasználás: letöltés / 10 GB, tárhely / 1 GB, százalékban, sávval;
   - link: „Pontos adatok a Firebase-konzolban”.
4. Eseménynapló, „Mentés most”, „Újrakapcsolódás”.

### 4.3 Rangablak (a kezdőlap rangsávjára kattintva)

A 7. fejezetben részletezve.

### 4.4 Kezdőlap kiegészítések

- A rangsáv kattintható: „🧑‍🚀 Navigátor · még 380 ⛽ a Felfedező rangig – kb. 3 nap”.
- Decemberben (ha be van kapcsolva) az **🎄 Adventi naptár** csempe a küldetés alatt (8. fejezet).
- A kiválasztott háttér, rakéta és névkeret megjelenik.

---

## 5. Szinkron és forgalom

### 5.1 Szinkronmódok (eszközönként)

| Mód | Feltöltés | Letöltés | Kapcsolat |
|---|---|---|---|
| ⚡ Folyamatos (`live`) | minden feladat után azonnal | élőben (`onValue` figyelők) | folyamatos (tétlenségnél bontás, lásd 5.3) |
| ✅ Minden feladat után (`task`) – **alapértelmezett** | minden feladat után azonnal | induláskor, főmenübe lépéskor, a ⚙️ ablak nyitásakor (`get`) | írás és olvasás idejére nyit, utána 30 mp-cel bont |
| 🏠 Főmenübe lépéskor (`home`) | kör végén, főmenübe lépéskor, az oldal elhagyásakor | induláskor, főmenübe lépéskor, a ⚙️ ablak nyitásakor | csak ezekre a pillanatokra nyit |

Mindhárom módban:

- a böngészőbe (localStorage) **minden válasz után azonnal** ment, így nem vész el semmi;
- az oldal bezárásakor megpróbál feltölteni;
- a „Mentés most” gomb azonnal szinkronizál.

### 5.2 Részleges mentés (csak a változás megy fel)

A `record()` visszaadja a megváltozott útvonalakat, pl.:

```js
["pts", "total", "correct", "days/2026-11-17", "hist/2026-11-17/T2", "subs/T2:sorrend", "types/T2", "streak", "badges"]
```

A felhőmodul ezeket gyűjti, és egyetlen `update()` hívással küldi fel:

```js
update(ref(db, `families/${fam}/users/${gyerek}`), { "pts": 1240, "days/2026-11-17": {…}, …, "upd": now })
```

- **Új hibanapló-bejegyzés:** `logs/{gyerek}/{időbélyeg}` kulcsra kerül (`set`).
- **Várható méret:** kb. 0,5–1 KB feladatonként a mostani 35 KB helyett.
- **Ütközések:** egy gyerek egyszerre jellemzően egy eszközön játszik, ezért mezőnként az utolsó írás nyer. Kivétel a ⛽ (`pts`): ott a teljes értéket írjuk, nem növeljük, így két eszköz egyidejű játéka ritkán elveszíthet néhány pontot. Ezt elfogadhatónak tartjuk.

### 5.3 Kapcsolatbontás

- Ha az oldal háttérbe kerül, vagy 5 percig nincs érintés, kattintás vagy billentyű: `goOffline()`.
- Visszatéréskor `goOnline()`, és a mód szerinti letöltés.
- Az állapotjelző ilyenkor „💤 Szünetel” feliratot mutat, nem „Offline”-t, hogy ne tűnjön hibának.

### 5.4 Forgalomszámláló

- **Feltöltés:** minden írásnál a küldött adat JSON-mérete + 200 bájt becsült többlet.
- **Letöltés:** minden fogadott adatnál (`get` vagy `onValue`) a JSON-méret + 200 bájt.
- **Tárolás:** a böngészőben havonta (`traffic["2026-11"] = { up, down, syncs }`). A felhőbe a `devices/{id}/traffic` alá kerül, legfeljebb 10 percenként és a ⚙️ ablak nyitásakor.
- **Család összesen:** a ☁️ Felhő fül összeadja az eszközök számlálóit.
- **Tárhely:** a család adatainak legutóbbi teljes letöltéskori mérete.
- A felületen kiírjuk, hogy ez **becslés**, és a pontos adat a Firebase-konzolban van (Realtime Database → Usage).

---

## 6. Eszközfelismerés és hozzárendelés

### 6.1 Azonosító és név

- **Első indításkor:** `deviceId = "d" + 12 véletlen hexa`. Ez a localStorage-ba kerül, tartalékként az IndexedDB-be is.
- **Javasolt név** a böngésző adataiból: operációs rendszer és böngésző, pl. „Windows laptop – Chrome” vagy „iPhone – Safari”. A szülő a Család fülön átírhatja.
- **`lastSeen`:** frissül indításkor és legfeljebb óránként.

### 6.2 Folyamat új eszközön

1. Az eszköznek nincs hozzárendelése, és van legalább 2 gyerek → **„Ki játszik ezen az eszközön?”** ablak:
   - a gyerekek listája jelölőnégyzetekkel, és egy „Mindenki” gomb;
   - a mentés **szülői PIN-t kér**;
   - a „Később” gomb bezárja, és addig minden gyerek választható marad.
2. Ha csak 1 gyerek van a családban, nem kérdez, automatikusan hozzá rendeli.
3. A hozzárendelés a felhőbe kerül (`devices/{id}/kids`), és a böngésző is megjegyzi (offline is működik).

### 6.3 Hatás a játékban

| Hozzárendelés | Viselkedés |
|---|---|
| 1 gyerek | Automatikusan ő játszik. A név és az avatar látszik, de nem kattintható választóként. |
| több gyerek | A játékosválasztó csak a hozzárendelt gyerekeket mutatja |
| nincs („Később”) | Mint most: mindenki választható |

### 6.4 Szélső esetek

- **Törölt böngészőadatok vagy inkognitó mód:** új azonosító, új eszköz; a régi „régi” címkét kap, és törölhető.
- **Egy gépen két böngésző:** két külön eszköz, ezt a név mutatja.
- **Gyerek törlése:** az eszközök hozzárendeléséből is kikerül.
- **Átnevezés:** a hozzárendelés a gyerek belső azonosítójához kötődik, nem a nevéhez. Ehhez a gyerekek kapnak egy belső `id`-t, amit a migráció hoz létre.

---

## 7. Ranglétra és kinyitható tárgyak

### 7.1 A létra

| # | Rang | ⛽ | Kinyílik |
|---|---|---|---|
| 1 | Űrkadét | 0 | Avatar: 🧑‍🚀 👩‍🚀 👨‍🚀 👽 · Háttér: Éjkék űr (alap) · Rakéta: lila (alap) · Konfetti: színes (alap) |
| 2 | Pilóta | 300 | Avatar: 🐱 🦊 🐼 |
| 3 | Navigátor | 700 | Háttér: Lila köd |
| 4 | Felfedező | 1200 | Avatar: 🐶 🦄 🐸 |
| 5 | Kapitány | 1800 | Rakéta: arany |
| 6 | Bolygójáró | 2500 | Háttér: Smaragd galaxis |
| 7 | Csillagász | 3300 | Konfetti: csillageső |
| 8 | Parancsnok | 4200 | Avatar: 🐲 🦁 🤖 · Névkeret: ezüst |
| 9 | Űrhajós-mester | 5200 | Háttér: Napfelkelte-nebula |
| 10 | Galaxis-őr | 6300 | Rakéta: szivárvány |
| 11 | Admirális | 7500 | Névkeret: arany · Avatar: 🧑‍🚀👑 (különleges) |
| 12 | Csillagflotta-legenda | 9000 | Minden téma · „Legenda” felirat a név mellett |

- A **mostani rangnevek** (Űrkadét…Galaxis-admirális) helyére ez a létra kerül. A ⛽ megmarad, így a meglévő játékos azonnal a ⛽-jének megfelelő rangra kerül.
- A **mostani avatar megmarad** akkor is, ha a rang szerint még zárva lenne (`owned`-ba kerül).

### 7.2 Rangablak

- **Felső rész:** „🧑‍🚀 Navigátor (3/12)”, sáv a következő rangig, „még 380 ⛽ – kb. 3 nap gyakorlás”.
  - A „kb. Y nap” az utolsó 7 nap átlagos napi ⛽-je alapján számolódik.
  - Ha még nincs adat, 120 ⛽/nappal becsül.
- **A létra:** 12 kártya.
  - Elért rang: színes, pipával.
  - Következő: kiemelve, „Ezt nyitod ki következőnek!” felirattal.
  - Többi: szürke, 🔒, a tárgyak elmosva, de felismerhetők (motiváló látvány).
- **Szekrény:** fülek (Avatar, Háttér, Rakéta, Konfetti, Névkeret). A kinyitott tárgyak kattintással választhatók, a zártaknál „🔒 Kapitány rangnál nyílik”. Az ünnepi tárgyak „🎄 különleges” címkét kapnak.
- **Új rang elérésekor:** konfetti, és egy ablak: „🎉 Új rang: Felfedező! Kinyitottad: 🐶 🦄 🐸 – kipróbálod?”

### 7.3 Tárgyak megjelenítése

| Tárgy | Hol látszik | Hogyan |
|---|---|---|
| Háttér | Teljes oldal | CSS-változók (`--space1`, `--space2`, színátmenet) témánként |
| Rakéta | Kezdőlap kabalája | SVG vagy színezett emoji szűrővel |
| Konfetti | Ünneplésnél | A `confetti()` paletta és alak (pl. csillag) szerint |
| Névkeret | A felső sáv névgombja | CSS-keret és ragyogás |

---

## 8. Ünnepi események

### 8.1 Eseményleíró

```js
// js/game/events.js
{ id: "advent2026", kind: "advent", from: "2026-12-01", to: "2026-12-24", windows: ADVENT_2026 },
{ id: "santa2026", kind: "once", from: "2026-12-06", to: "2026-12-06", when: "missionDone",
  reward: [{ item: "av:🎅" }, { pts: 100 }], title: "🎅 Megjött a Mikulás!" },
{ id: "xmas2026", kind: "once", from: "2026-12-24", to: "2026-12-26", when: "missionDone",
  reward: [{ item: "bg:xmas" }, { item: "rocket:xmas" }] },
{ id: "newyear2027", kind: "once", from: "2026-12-31", to: "2027-01-01", when: "missionDone",
  reward: [{ item: "confetti:fireworks" }, { item: "frame:2027" }] },
{ id: "winter", kind: "ambient", from: "12-01", to: "01-06", effect: "snow" }, // évente ismétlődik
```

Az eseménymotor (`js/core/events.js`) általános: dátumtartomány, feltétel (`missionDone`), jutalom (tárgy vagy ⛽), ablak szövege. A német játék és a későbbi ünnepek (húsvét, születésnap, felvételi napja) ugyanígy felvehetők.

### 8.2 Adventi naptár

- **Kezdőlap csempe:** 24 kis ablak rácsban.
  - A kinyitottak mutatják a tartalmukat.
  - A mai ablak pulzál, ha a küldetés teljesült.
  - A jövőbeliek zárva vannak.
- **Kinyitás:** a napi küldetés teljesítése után a mai ablak kinyitható (kattintás → animáció → tartalom).
- **Pótlás:** aznap egy **plusz kör** (még egy küldetés) után **egy** korábbi, kihagyott ablak nyitható ki. Naponta legfeljebb egy pótlás.
- **Tartalom (24 ablak):** főleg +20/+30/+50 ⛽ és vicces matricák, és ezek a különleges ablakok:

  | Nap | Tartalom |
  |---|---|
  | dec. 6. | 🎅 Mikulás-avatar (a Mikulás eseménnyel együtt) |
  | dec. 13. | ❄️ Hópehely-konfetti |
  | dec. 20. | ⛄ Hóember-avatar |
  | dec. 24. | 🎄 Karácsonyi háttér + piros-arany rakéta |

- **Az advent után:** december 25-től a csempe eltűnik, a megszerzett tárgyak a szekrényben maradnak.

### 8.3 Téli hangulat

- Hóesés a háttérben (CSS vagy canvas, kis processzorterheléssel), december 1. és január 6. között.
- A Beállítások fülön kikapcsolható, és a „csökkentett mozgás” rendszerbeállításnál magától kikapcsol.

---

## 9. Gyorsbillentyű-modul

### 9.1 Elv

A `js/core/keys.js` egy **kontextusvermet** kezel. Minden képernyő vagy ablak megnyitáskor feltesz egy kontextust, bezáráskor leveszi. A billentyű mindig a legfelső kontextushoz megy.

```js
keys.push({
  id: "home",
  items: () => [missionBtn, ...planetBtns],   // Tab / Shift+Tab ezek között lép, körbe
  onEnter: el => el.click(),                  // alapértelmezés: a kijelölt elem aktiválása
  onEsc: null,                                // a kezdőlapon nincs teendő
  onF1: el => openHelp(el?.dataset.type),
});
```

### 9.2 Kontextusok

| Kontextus | Tab / Shift+Tab | Enter | Esc | F1 | Egyéb |
|---|---|---|---|---|---|
| Kezdőlap | küldetés, bolygók, rangsáv, adventi naptár | indítás / megnyitás | – | a kijelölt bolygó súgója | – |
| Gyakorlás | a böngésző alapja (beviteli mező, gombok) | ellenőrzés / tovább | főmenü | az aktuális bolygó súgója | – |
| Felugró ablak | az ablak gombjai között, körbe (fókuszcsapda) | a kijelölt gomb | bezárás (mint a Mégse) | – | – |
| ⚙️ füles ablak | fülsor → gyerekválasztó → tartalom | aktiválás | bezárás | a fül súgója (egy mondat a fülről) | **←/→** a fülsoron vált; **1–6** közvetlenül a fülre ugrik |
| Rangablak | rangkártyák, szekrény | kiválasztás | bezárás | „Hogyan szerzek ⛽-t?” | ←/→ a szekrényfülek között |

A súgószövegek a játék konfigurációjából jönnek, így más tartalommal is működik.

---

## 10. Ütemek, átvételi feltételek

Minden ütem után élesítés (GitHub Pages), és a következő a jóváhagyás után indul.

### 1. ütem – Keret, fülek, fejlődés (2–3 nap)

- `core/keys.js`, `core/modal.js`, `core/tabs.js`, `core/settings.js`, `core/progress.js`, `core/charts.js`
- ⚙️ ikon, 6 fülös ablak. A Család és a Felhő fül ebben az ütemben még a mostani tartalommal készül.
- ☁️ kis ablak PIN nélkül, ⚙️ átugrással a Felhő fülre
- `u.hist` gyűjtése, Fejlődés fül, gyerekenkénti beállítások, migráció (`schema 2`, 1–2. és 4–6. lépés)

**Átvétel:**

- [ ] A fogaskerék PIN után a legutóbbi fület nyitja; mind a 6 fül működik.
- [ ] Az új feladatok bekerülnek a `hist`-be; a Fejlődés fül napi/heti/havi nézete és a bolygónkénti ▲/▼ helyes (tesztadatokkal ellenőrizve).
- [ ] A beállítások gyerekenként mentődnek; két gyereknél eltérő napi cél működik.
- [ ] Tab, Shift+Tab, ←/→, 1–6, Enter, Esc és F1 minden kontextusban az elvárt módon működik.
- [ ] A régi adat migrációja adatvesztés nélkül fut le (régi állapotfájlból tesztelve).

### 2. ütem – Szinkron, forgalom, eszközök (+2 nap)

- Szinkronmódok, részleges mentés, külön hibanapló-ág (migráció 3. lépés), tétlenségi bontás
- Forgalomszámláló a Felhő fülön
- Eszközazonosító, „Ki játszik ezen az eszközön?”, eszközlista a Család fülön, gyerek belső `id`

**Átvétel:**

- [ ] A „Minden feladat után” módban egy feladat után 2 KB-nál kisebb feltöltés (a számláló szerint).
- [ ] Egy régi (még nem frissült) eszköz írása nem törli az új mezőket.
- [ ] Két böngészőben (két „eszköz”) a hozzárendelés és a játékosválasztó helyesen viselkedik.
- [ ] 5 perc tétlenség után „💤 Szünetel”, visszatéréskor szinkronizál.

### 3. ütem – Ranglétra és tárgyak (+2 nap)

- `game/ranks.js`, `game/cosmetics-catalog.js`, `core/cosmetics.js`
- Rangablak, szekrény, új rang ünneplése, háttér, rakéta, konfetti és névkeret megjelenítése

**Átvétel:**

- [ ] A meglévő játékos a ⛽-je szerinti rangot kapja, a régi avatarja megmarad.
- [ ] Zárt tárgy nem választható; a kinyitott azonnal megjelenik.
- [ ] A „kb. Y nap” az utolsó 7 nap átlagából számolódik.

### 4. ütem – Ünnepek (november 28-ig)

- `core/events.js`, `game/events.js`, adventi csempe, pótlás, Mikulás, karácsony, szilveszter, hóesés, szülői kapcsolók

**Átvétel:**

- [ ] A dátumot szimulálva (tesztkapcsolóval) minden esemény a helyes napokon jelenik meg és ad jutalmat.
- [ ] A pótlás naponta legfeljebb egy ablakot nyit, és csak plusz kör után.
- [ ] Kikapcsolt ünnepeknél semmi nem jelenik meg; a hóesés csökkentett mozgásnál nem fut.

---

## 11. Tesztelés

**Automatikus tesztek** (Node, a meglévő `tests/` mellé):

- `progress.test.mjs`: `hist` összesítés, időszakok, ▲/▼, „kevés adat” határ.
- `migration.test.mjs`: régi állapot → `schema 2`; nincs adatvesztés; ismeretlen mezők megmaradnak.
- `settings.test.mjs`: alapértékek, határok, hatókörök.
- `events.test.mjs`: dátumtartományok (év- és hónapváltás), pótlás szabálya.
- `ranks.test.mjs`: rang és tárgyak ⛽ szerint, „kb. Y nap” becslés.
- `sync-diff.test.mjs`: a `record()` által visszaadott útvonalak pontosan a megváltozott mezők.

**A meglévő tesztek továbbra is futnak:** generátorok, Firebase-kulcsok.

**Kézi ellenőrzés böngészőben**, minden ütem után: billentyűk, két böngészős eszközteszt, élő oldal betöltése, hibamentes konzol.

---

## 12. Kockázatok

| Kockázat | Hatás | Kezelés |
|---|---|---|
| A bolygónkénti fejlődés csak a bevezetéstől teljes | Az első hetekben kevés adat | Visszamenőleg a napi összesítés látszik („összes bolygó”) |
| Régi és új változat egyszerre fut két eszközön | Mezők felülírása | Mezőnkénti egyesítés, az ismeretlen mezők megtartása, service worker frissítés |
| A forgalom csak becslés | A Spark-százalék pontatlan | Felirat + link a konzolhoz |
| Törölt böngészőadat → új eszköz | Újra hozzá kell rendelni | „Régi” címke, törlés gomb |
| Avatarválasztás szűkül | A gyerek csalódhat | A meglévő avatar megmarad; az új rang ünneplése mutatja, mit kap |
| Határidő: advent december 1. | Csúszás | A 4. ütem november 28-ra tervezve, 2 nap tartalék |
| Az `app.js` szétbontása | Visszatérő hibák | Ütemenként, tesztekkel és böngészős ellenőrzéssel |
