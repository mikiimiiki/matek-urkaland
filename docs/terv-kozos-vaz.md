# Részletes terv: közös, paraméterezhető váz (Matek Űrkaland → Massalhangzok → német gyakorló)

*Készült: 2026-11-17, a „grill me” beszélgetés döntései alapján.*

## Tartalom

1. [Cél és döntések](#1-cél-és-döntések)
2. [Felépítés: váz, játék, feladatcsomag](#2-felépítés-váz-játék-feladatcsomag)
3. [A feladatcsomag (pack) szerződése](#3-a-feladatcsomag-pack-szerződése)
4. [Egységes pontozás](#4-egységes-pontozás)
5. [Kétszintű napi cél, szorzók, ajándékok, témazár](#5-kétszintű-napi-cél-szorzók-ajándékok-témazár)
6. [Rangok, szekrény, Gyűjtemény-ablak](#6-rangok-szekrény-gyűjtemény-ablak)
7. [⚙️ Szülői ablak és beállítások](#7-️-szülői-ablak-és-beállítások)
8. [Kinézet: közös elrendezés, saját téma](#8-kinézet-közös-elrendezés-saját-téma)
9. [Adatok, felhő, átállás](#9-adatok-felhő-átállás)
10. [Ütemek és átvételi feltételek](#10-ütemek-és-átvételi-feltételek)
11. [Tesztelés](#11-tesztelés)
12. [Kockázatok](#12-kockázatok)
13. [Nyitott kérdések](#13-nyitott-kérdések)

---

## 1. Cél és döntések

**Cél:** a program váza egységes és paraméterezhető legyen; appankként **csak a feladatok** (és a téma) térjenek el. A váz a Matek Űrkalandból készül, a Massalhangzok lesz a második „feladatcsomag”, a német gyakorló a harmadik.

| # | Döntés |
|---|---|
| 1 | Közös váz; a Matek a kiindulás, a Massalhangzok feladatcsomagként épül rá. |
| 2 | Sorrend: **0.** ünnepek a Massalhangzokba nov. 28-ig → **1.** a Matek szétválasztása vázra és csomagra → **2.** a Massalhangzok a vázon → **3.** keret-repó a német előtt. |
| 3 | Jutalmak: a Matek rendszere (12 rang, rangonként nyíló tárgyak, szekrény), **közös ranghatárok** (0–9000). A már kinyitott tárgyak megmaradnak. |
| 4 | Egységes pontozás minden appban (4. fejezet). |
| 5 | Kétszintű napi cél mindkét appban: napi küldetés + napi nagy cél (serlegeső, ajándékdobozok, ×2/×3 szorzó, holnapi előleg) + témazár. |
| 6 | Minden beállítás gyerekenkénti, családi alapértékkel. ⚙️ ablak 6 füllel; a Beállítások fülön külön **„🏆 Napi cél és szorzók”** szakasz. |
| 7 | Közös elrendezés, saját téma (cím, kabala, színek, háttér, szavak). |
| 8 | Egy közös **Gyűjtemény-ablak** a gyerekeknek: Ranglétra · Szekrény · Eredményeim · + a csomag saját fülei. |
| 9 | Külön Firebase-projekt appankként; **csak Google-belépés** (az e-mailes link megszűnik). |
| 10 | A váz forrása most a Matek repó; a német előtt saját keret-repóba költözik. |

---

## 2. Felépítés: váz, játék, feladatcsomag

### 2.1 Három réteg

| Réteg | Mappa | Mit tartalmaz | Ki változtatja |
|---|---|---|---|
| **Keret** (játékfüggetlen segédek) | `js/core/` | billentyűk, ablakok, fülek, beállításűrlap, fejlődés, diagram, szinkron-diff, eszköz, tárgyak, események, hó, **új:** pontozás, napi cél, ismétlés (Leitner), jelvénymotor, felhő | közös |
| **Váz** (képernyők és játékmenet) | `js/shell/` | kezdőlap, gyakorlókör, visszajelzés és magyarázat, ⚙️ ablak fülei, Gyűjtemény-ablak, rangok, adventi csempe, ünnepek, játékosok, eszköz-hozzárendelés, PIN, indítás | közös |
| **Játék** (paraméterek) | `js/game/` | `config.js` (téma, szavak, alapértékek), `ranks.js` (rangnevek), `cosmetics-catalog.js`, `events.js`, `gifts.js`, Firebase-beállítás | appankként |
| **Feladatcsomag** | `js/pack/` | a feladatok előállítása, megjelenítése, ellenőrzése, magyarázata; a csomag saját adatai és fülei | appankként |

A Matekban a mostani `js/types/*` (15 feladattípus) a `js/pack/` alá kerül; az `app.js` szétesik `js/shell/*` modulokra; a `index.html` csak egy üres keretet ad, amit a váz tölt ki.

### 2.2 Indítás

```js
// index.html → js/main.js (appankként 5–10 sor)
import { startShell } from "./shell/index.js";
import { GAME } from "./game/config.js";
import { PACK } from "./pack/index.js";
startShell({ game: GAME, pack: PACK });
```

### 2.3 Új keretmodulok (`js/core/`)

| Modul | Feladat |
|---|---|
| `scoring.js` | Egységes ponttábla (4. fejezet); bemenet: eredmény-objektum, kimenet: pont + bontás |
| `dailygoal.js` | Napi küldetés, napi nagy cél, szorzó, előleg, ajándékdoboz-húzás, sorozat heti pajzzsal (5. fejezet) |
| `srs.js` | Leitner-ismétlés kulcsonként (Matek: altípus, Massalhangzok: szó), elsajátítás és frissítő ismétlés |
| `badges.js` | Jelvénymotor: a váz és a csomag jelvénylistáját együtt ellenőrzi |
| `cloud.js` | A mostani `js/cloud.js` ide költözik, a Firebase-beállítás paraméterként jön; családtag eltávolítása (a Massalhangzokból) bekerül |

---

## 3. A feladatcsomag (pack) szerződése

```js
export const PACK = {
  id: "matek",                       // vagy "helyesiras", "nemet"
  topics: [                          // a kezdőlap témakártyái (Matek: bolygók)
    { id: "T1", name: "Számok tulajdonságai", icon: "🪐", color: "#8b5cf6", place: "Számkő", help: {...} },
  ],
  levels: { count: 3, mode: "auto" },// "auto": a csomag dönti el (Matek: csillagok); "manual": szülői beállítás (Massalhangzok)
  settings: [ /* csomag-saját beállításleírók, pl. diszlexiás betűtípus, szótagolási szint */ ],
  normUser(u) {},                    // a csomag saját mezőinek pótlása/átalakítása (Matek: types, subs; Massalhangzok: srs, syl, …)
  plan(u, n, ctx) {},                // a napi küldetés feladatterve; alapértelmezés: a váz 60/30/10-es tervezője
  makeTask(topicId, ctx) {},         // → Task
  badges: [ /* csomag-saját jelvények */ ],
  collectionTabs: [ /* a Gyűjtemény-ablak saját fülei: { id, icon, label, render(box, ctx) } */ ],
  parentPanels: { topics: fn, mistakes: fn },   // a ⚙️ Témák és Hibák fül csomagfüggő része
};
```

**Task** (egy feladat):

```js
{
  topic, sub, level, key,            // key: az ismétlés kulcsa (altípus vagy szó)
  render(box, io),                   // a feladat saját felülete (számbillentyűzet, betűkirakó, szótagoló…)
  // io: { submit(answer), useHelp(), setActions(buttons), focus() }
  check(answer) → { ok, partial, why },
  hint,                              // első hiba után
  explain() → [lépések],             // második hiba után, lépésenként
  correctText, speech,               // helyes alak és felolvasható szöveg
  twin: true | false,                // kérhető-e „hasonló feladat”
}
```

A **váz** végzi: kérdés → válasz → ellenőrzés → tipp → magyarázat → ikerfeladat, a pontozást, a karikákat, az automatikus továbblépést, a felolvasást, a hibanaplót, a fejlődés-adatot (`hist`), az ismétlést (`srs`), a napi célt és az ünnepi eseményeket. A **csomag** csak a feladatot adja.

> A Massalhangzok mostani visszajelzője (alulról felcsúszó lap, „írd be újra” a hiba után) a váz visszajelzőjének egyik **megjelenési módja** lesz (`GAME.feedback: "sheet" | "side"`), hogy a gyerekek ismerős felületet lássanak.

---

## 4. Egységes pontozás

`js/core/scoring.js`, a tábla a `GAME.scoring`-gal felülírható (alapból mindenhol ugyanaz):

| Eset | Pont |
|---|---|
| Elsőre jó | **10**; 2. szinten **+2**, 3. szinten **+5** |
| Tipp / második próba után jó | **5** |
| Hibás, de végignézte a magyarázatot (vagy újraírta a szót) | **2** |
| Sorozatbónusz: a 3. egymást követő elsőre jó választól | **+3** |
| Hibából tanulás: az ikerfeladat jó | **+3** |
| Segítség (pl. betűkirakó-súgás) | **−3 / segítség**, de legalább **2** |
| Rossz válasz | nincs levonás |

- A **napi nagy cél** nem pontot, hanem **helyes válaszokat** számol (a szorzóval: ×2/×3 helyes válasznak számít).
- A meglévő pontok megmaradnak; csak a jövőbeli gyűjtés üteme változik (a Massalhangzokban lassul: eddig 10–20 + 5).

---

## 5. Kétszintű napi cél, szorzók, ajándékok, témazár

`js/core/dailygoal.js` – gyerekenként, a „🏆 Napi cél és szorzók” szakaszban állítható.

| Szint | Mi számít | Mit ad | Alap (Matek / Massalhangzok) |
|---|---|---|---|
| **Napi küldetés** | X feladat **vagy** Y perc | sorozat (heti 1 pajzs), jelvények, adventi ablak | 10 feladat vagy 15 perc / 10 feladat vagy 15 perc |
| **Napi nagy cél** | N helyes válasz (szorzóval) | 🏆 serlegeső, a kör végén 🎁 ajándékdoboz-választás | 30 / 100 |

- **Pontszorzó** (×1/×2/×3): csak a napi nagy cél felé számít, csak aznapra szól (napváltáskor ×1), játékos jelzéssel („🚀 DUPLA PONT nap”).
- **Holnapi előleg:** ajándékdobozból „+10/+20 holnap” → másnap ennyivel kevesebb kell.
- **Ajándékdobozok tartalma** a `game/gifts.js`-ben (Massalhangzok: puszi anyától/apától, ölelés a tesónak, előleg, üres doboz); a szülő a Beállításokban szerkesztheti (később).
- **Témazár:** a szülő lezárhat témákat (Matek: bolygók), legalább egy nyitva marad; a kezdőlapon 🔒 jelzés.
- A **plusz kör** (adventi pótláshoz) = a napi küldetés után még 5 feladat (mint most).

Kezdőlapon: a küldetéssáv alatt a napi nagy cél sávja (🏆 37/100 ×2), a felső sávban a „✅ Ma: N” számláló.

---

## 6. Rangok, szekrény, Gyűjtemény-ablak

### 6.1 Rangok

- **Közös ranghatárok** (12): 0 · 300 · 700 · 1200 · 1800 · 2500 · 3300 · 4200 · 5200 · 6300 · 7500 · 9000.
- **Rangnevek appankként** (`game/ranks.js`). Massalhangzok javaslat: Kezdő Betűvadász · Betűgyűjtő · Helyesírás Inas · Szókirakó · Mássalhangzó Mester · Szótagoló · Betűvarázsló · Szófejtő · Nyelvtan Bajnok · Helyesírás Lovag · Betűkirály · Helyesírás Legenda.
- Rangonként kinyíló tárgyak a `game/cosmetics-catalog.js`-ben. Massalhangzok: a mostani ~75 avatar és 9 téma rangonként szétosztva (kb. 6 avatar + 1 háttér/rang), plusz konfetti és névkeret. Az avatarkategóriák (állatok, járművek, műszaki, lányos, édességek) a szekrényben **szűrőként** maradnak.
- Átálláskor minden eddig kinyitott tárgy (`u.unl`) az `u.owned`-ba kerül, így semmi nem zárul vissza.

### 6.2 Gyűjtemény-ablak (a rangsávra kattintva, Tab/Enter)

| Fül | Tartalom |
|---|---|
| 🪜 Ranglétra | rang, sáv, „kb. Y nap”, 12 kártya (mint most a Matekban) |
| 👕 Szekrény | Avatar · Háttér · Rakéta/Kabala · Konfetti · Névkeret; ünnepi tárgyak 🎄 címkével |
| 📊 Eredményeim | gyerekbarát statisztika: utolsó 7 nap, témák pontossága, jelvények |
| + csomag fülei | Massalhangzok: 🃏 Szókártyák (az album); Matek: ⭐ Csillagok (bolygónként) |

A Massalhangzok kezdőlapjáról a 📖 Gyűjtemény és a 📊 Statisztika gomb megszűnik (ez az egy belépés marad); a beállítások a ⚙️ ablakba költöznek.

---

## 7. ⚙️ Szülői ablak és beállítások

6 fül, a „Szülői nézet” gomb helyén ⚙️:

| Fül | Közös rész | Csomagfüggő rész |
|---|---|---|
| 📊 Fejlődés | Ma / 7 / 30 nap csempék, nap/hét/hónap diagram, témánkénti ▲/▼ | – |
| 🃏 Témák (Matek: 🗺️ Bolygók) | témák pontossága, csillag/szint | Matek: altípus-térkép; Massalhangzok: elsajátított szavak, szótagolási szint |
| 📝 Hibák | hibanapló szűréssel (felhőből a fül nyitásakor) | Massalhangzok: „legtöbbet hibázott szavak” |
| ⚙️ Beállítások | **Gyakorlás:** nehézség (ha `levels.mode = manual`), automatikus továbblépés, felolvasás, diszlexiás betűtípus · **🏆 Napi cél és szorzók:** küldetés (feladat/perc), napi nagy cél (N), pontszorzó, ajándékdobozok be/ki, témazár · **🎄 Ünnepek:** események, hóesés · **🎁 Jutalmak** (szülői) · ↺ / 📌 családi alapérték | csomag-saját beállítások |
| 👪 Család | játékosok (átnevezés, törlés), eszközök és hozzárendelés, PIN, **családtag eltávolítása** | – |
| ☁️ Felhő | szinkronmód, forgalom és Spark-becslés, belépés, családtagok, napló | – |

A beállítások leírók (`core/settings.js`): a váz, a napi cél, az ünnepek és a csomag mind leírólistát ad, a fül csak kirajzolja. Mind `scope: "child"`, kivéve a szinkronmódot (`device`).

---

## 8. Kinézet: közös elrendezés, saját téma

`GAME.theme` paraméterei:

```js
theme: {
  title: "Helyesírás Kaland", mascot: "🦉", pointsIcon: "⭐", pointsName: "pont",
  topicWord: { one: "feladat", many: "feladatok" },     // Matek: bolygó, bolygók
  palette: { space1, space2, glow, pri, pri2, ... },    // CSS-változók
  background: "light" | "space",                        // világos (Massalhangzok) vagy űr (Matek)
  feedback: "sheet" | "side",                           // visszajelzés: felcsúszó lap vagy oldalsáv
  font: "Nunito",
}
```

Közös elrendezés: felső sáv (játékos, pont, sorozat, ✅ Ma, ☁️, ❓, ⚙️) → üdvözlés és kabala → napi küldetés → napi nagy cél → adventi csempe (decemberben) → rangsáv + jutalom → témakártyák (Tab/Enter/F1) → jelvények. A Massalhangzok „Vegyes kaland” gombja = napi küldetés; a feladattípus-gombok = témakártyák; az „Ismétlő kör” = a váz ismétlő köre (esedékes és hibás elemek, `srs`-ből).

---

## 9. Adatok, felhő, átállás

### 9.1 Felhasználó: közös és csomagmezők

- **Közös (váz):** `id, name, avatar, pts, days{n,ok,ms,pts,done}, hist, streak{n,last,best}, shields, badges, prefs, rewards, claimed, cosmetics, owned, eventState, log, goal{big, mult, bonus, gift, giftLog}, block, upd, schema`.
- **Csomag:** a helyén marad, a csomag `normUser`-e kezeli. Matek: `types, subs, twins`; Massalhangzok: `srs, practiced, mistakes, stats, syl, grade, maxM`.
- A szinkron (részleges mentés, mezőnkénti összefésülés, hibanapló-ág) a mezőnevektől független, így mindkettőre működik.

### 9.2 Massalhangzok átállása (schema → 4, egyszer, idempotensen)

| Régi | Új |
|---|---|
| `state.settings {level, autoNext, dyslexia, goal}` (csak helyi) | `settings.childDefaults` + minden gyerek `prefs` (felhőbe is) |
| `u.daily[nap]` (helyes válaszok) | `u.days[nap].ok` (az `n` a `hist`-ből pótolva) |
| `u.streak {n, last: "ÉÉÉÉ-HH-NN"}`, `u.best` | `u.streak {n, last: napsorszám, best}` |
| `u.p100, u.mult, u.bonus, u.gift, u.giftLog` | `u.goal.big, .mult, .bonus, .gift, .giftLog` |
| `u.unl` (kinyitott jutalmak), `u.theme` | `u.owned` (`av:…`, `bg:…`), `u.cosmetics.bg` |
| `u.block` | `u.block` (változatlan, a váz témazára) |
| 5 rang | 12 rang (a ⛽/pont alapján azonnal) |
| PIN 6–10 számjegy | a meglévő hash marad; új PIN-nél a közös szabály (13. fejezet) |
| e-mailes linkes belépés | megszűnik (lásd 12. fejezet) |

A Matek átállása (schema 3 → 4): `days[].pts` már megvan; új a `goal` objektum és a `block` (üres); a ⛽ marad.

### 9.3 Felhő

Mindkét app a saját projektjében, ugyanazzal a szerkezettel: `families/{fam}/ users · logs · settings · parent · deleted · devices · members`, `memberOf`. A `database.rules.json` mindkettőben azonos (nem kell módosítani). A régi változatú eszközök írását a mezőnkénti összefésülés kezeli (2. ütemben bevezetve).

---

## 10. Ütemek és átvételi feltételek

### 0. ütem – Ünnepek a Massalhangzokba (nov. 28-ig)

- Átmásolva: `core/dates.js` (napfelülírással), `core/events.js`, `core/snow.js`, `game/events.js` (ugyanazok az ünnepek), az ünnepi tárgyak a Massalhangzok mostani jutalomrendszerébe (`u.unl`-be) kerülnek, avatarként és témaként.
- Adventi csempe a kezdőlapon, a mostani napi célhoz (`goal`) kötve; pótlás a cél + 5 helyes válasz után.
- Mikulás, karácsony, szilveszter: a napi cél teljesítése után; +pont a mostani pontozás szerint.
- Kapcsolók a szülői nézet Beállítások paneljén (családi szinten, mert ott még nincs gyerekenkénti beállítás); hóesés.
- Tesztkapcsoló: `?nap=ÉÉÉÉ-HH-NN#debug`, külön tárolóval, felhő nélkül.

**Átvétel:** a szimulált dec. 1., 6., 13., 20., 24., 31. napokon a jutalmak megjelennek; pótlás naponta egy; a kapcsolók működnek; `tests/events.test.mjs` a Massalhangzokban is fut.

### 1. ütem – Váz kiemelése a Matekból (+4–5 nap)

- `js/shell/` és `js/pack/` létrehozása, a mostani `app.js` szétbontása; `main.js`.
- Új keretmodulok: `scoring.js`, `dailygoal.js`, `srs.js`, `badges.js`, `core/cloud.js`.
- A Matek kap: napi nagy cél (30), szorzó, ajándékdobozok, témazár, Gyűjtemény-ablak (Ranglétra · Szekrény · Eredményeim · ⭐ Csillagok), egységes pontozás.
- Átállás: schema 4.

**Átvétel:**
- [x] Minden meglévő teszt zöld; a generátorteszt változatlan.
- [x] Új tesztek: pontozás (minden sor a táblából), napi cél (szorzó, előleg, napváltás, ajándék naponta egyszer), témazár.
- [x] Böngészőben a Matek ugyanúgy működik, mint előtte (billentyűk, ⚙️ ablak, szinkron, rangok, advent).
- [x] A `js/shell/` és `js/core/` egyetlen sora sem hivatkozik matekos fogalomra (ellenőrző szkript: „bolygó”, „⛽”, „T1” keresése).

> Megvalósítva (2026-11-18). A `js/types` a `js/pack/types` alá került; az `index.html` sablon közös szerkezetű, a szövegeket a váz tölti ki.

### 2. ütem – Massalhangzok a vázon (+5–6 nap)

- A Massalhangzok repóba bekerül a `js/core/`, `js/shell/`; a feladatok `js/pack/`-ba kerülnek: hosszú mássalhangzó (választós, betűpótló, beíró), j–ly, betűkirakó, jelentéskülönbség, szótagolás, plusz a szókártya-album (Gyűjtemény-fül) és a Leitner-ismétlés (`core/srs.js`-sel).
- `game/`: téma (🦉, világos), rangnevek, katalógus (a ~75 avatar + 9 téma rangonként), ajándékok, Firebase-beállítás.
- Átállás (9.2), e-mailes belépés megszűnése.
- A vázzal „ingyen” megjön a Matek 1–4. ütemének minden része: ⚙️ füles ablak, gyerekenkénti beállítások, szinkronmódok és részleges mentés, külön hibanapló-ág, forgalomszámláló, eszközfelismerés és hozzárendelés, 12 rangos létra és szekrény, gyorsbillentyű-modul (Tab, ←/→, 1–6, Enter, Esc, F1).

**Átvétel:**
- [x] Régi állapotfájlból (a mostani éles adatból mentett másolat) adatvesztés nélkül áll át: pont, elsajátított szavak, szókártyák, sorozat, kinyitott tárgyak, napi 100 állása.
- [x] Minden feladattípus végigjátszható; a szókártya-ismétlés ugyanazokat a szavakat hozza esedékesnek.
- [x] Két böngészőben a régi (még nem frissült) és az új változat egymás mellett sem ront adatot.
- [x] A szótagolás-ellenőrző szkript és a meglévő tesztek zöldek.

> Megvalósítva (2026-11-18). Eltérések: az „Ismétlő kör” gomb helyett az esedékes szavak a vegyes kaland (napi küldetés) elejére kerülnek; a hiba utáni „írd le a helyes alakot” helyett a váz tipp → magyarázat → ikerfeladat menete érvényes; a betűkirakó és a szótagolás újrapróbája („a jó betűk zölden maradnak”) a tipp lépésére került. Az avatarok a 12 rangra egyenletesen oszlanak el a régi nehézségi sorrendben; a régi kinyitott tárgyak megmaradnak.

### 3. ütem – Keret-repó (a német előtt)

- `js/core/` + `js/shell/` saját repóba (pl. `keretrendszer`), verziózva; `tools/keret-masolas` szkript, `KERET_VERZIO` fájl appankként; teszt jelzi a kézi eltérést.
- Csomagsablon a némethez (`pack-template/`), rövid fejlesztői leírás.

> Megvalósítva (2026-11-18): helyi `keretrendszer` repó (keret 1.0.0) – közös keret és váz, minta szótanuló (der/die/das, szójelentés, begépelés) mint csomagsablon a némethez, `tools/keret-masolas.mjs` (`KERET_VERZIO`, `--check`), `tests/keret.test.mjs` az appokban, alap- és felhőtesztek, fejlesztői README. A GitHub-repó létrehozása a szülőre vár.

---

## 11. Tesztelés

- **Node-tesztek (közös, a keret-repóba költöznek):** core, sync, cloud (ál-Firebase), ranks, events, **új:** scoring, dailygoal, srs, shell-smoke (a váz egy ál-csomaggal végigmegy egy körön).
- **Csomagtesztek appankként:** Matek generátorteszt (239 000 feladat), Massalhangzok szótagolás- és szóadat-ellenőrzés, `firebase-keys`.
- **Átállási teszt:** valódi régi állapotfájl (névtelenítve) → schema 4 → összehasonlítás mezőnként.
- **Böngésző:** minden ütem után mindkét appban: billentyűk, ⚙️ ablak, Gyűjtemény, kör, ünnepek szimulált dátummal, konzol hibamentes; élő oldal ellenőrzése.

---

## 12. Kockázatok

| Kockázat | Hatás | Kezelés |
|---|---|---|
| E-mailes linkkel belépő családtag a Massalhangzokban | nem látja a családot | előtte megnézzük a `members` listát; ugyanazzal az e-mail-címmel Google-fiókkal kell belépnie; a ☁️ fülön figyelmeztetés |
| A Massalhangzok pontozása lassul | a gyerek lassabban lép rangot | a ranghatárok közösek, a kinyitott tárgyak maradnak; az első napokban az ünnepi jutalmak ellensúlyoznak |
| Nagy átírás (2000 + 900 sor) | visszatérő hibák | ütemenként, ál-csomagos és átállási tesztekkel; a Matek 1. ütem után változatlanul kell működjön |
| A Massalhangzok gyerekei megszokták a felületet | csalódás | `feedback: "sheet"`, világos téma, ugyanazok a feladatfelületek; a változás „új szekrény és rangok” ajándékként jelenik meg |
| Advent közben átállás (dec. 1–24.) | az advent állapota elveszhet | az `eventState` formátuma a 0. ütemtől azonos; átállási teszt adventi adattal |
| Két app eltérő keret-másolata | szétcsúszó javítások | 3. ütem: keret-repó, verziófájl, eltérésjelző teszt |

---

## 13. Nyitott kérdések

1. **PIN-szabály:** Matek 4–8, Massalhangzok 6–10 számjegy. Javaslat: közösen 4–10 (a meglévő PIN-ek érvényesek maradnak).
2. **Ajándékdobozok szerkesztése** a szülői felületen (saját jutalmak, pl. „Mozi”) – most vagy később?
3. **Nehézség a Massalhangzokban:** marad kézi (szülő állítja), vagy a Matek-féle automatikus (csillagok alapján)? Javaslat: marad kézi (`levels.mode = "manual"`), a váz mindkettőt tudja.
4. **Massalhangzok rangkatalógus:** a ~75 avatar elosztása rangonként – a javaslatot a 2. ütem elején egy táblázatban jóváhagyásra mutatom.
