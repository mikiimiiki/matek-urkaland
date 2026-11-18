# Matek Űrkaland 🚀

Felkészítő program a **4. évfolyamosok központi matematika felvételijére** (8 évfolyamos gimnáziumba, M4 feladatlap).
Build nélküli, sima HTML + JavaScript webapp. GitHub Pages-en fut, offline is működik, és a Firebase-szel több eszköz között szinkronizál.

## Mit tud (1. ütem)

- **15 feladattípus generátorral**, végtelen sok változattal. A típusok a 2022–2026-os feladatlapok elemzése alapján készültek (lásd [docs/feladattipusok.md](docs/feladattipusok.md)):
  - 🪐 Számok tulajdonságai: kerekítés, számszomszédok, helyi érték, számkártyák, „találd ki a számot”
  - ☄️ Műveletek: műveleti sorrend lépésenként (zárójel, szorzás/osztás előbb, azonos szinten balról jobbra), műveletek szövegesen („Mennyivel kevesebb…”, „Hányszorosa…”, „kétszeresénél 30-cal több”), hiányzó tag (kisebbítendő, osztó…), számpiramis, fejszámolási fogások
  - 🌕 Mértékegységek: átváltás, vegyes alak, pótlás, becslés
  - 📊 Diagramok: leolvasás, különbség, összeg, legnagyobb/legkisebb, „között van”, hányszor annyi, középső, igaz/hamis
  - 🌀 Ismétlődő minták: n-edik elem, hány darab, mennyivel több, hányadik lesz
  - ⏰ Idő: óra leolvasása, eltelt idő, érkezés/indulás, menetrend, naptár
  - 📖 Szöveges feladatok: összeg és különbség, „többször annyi”, életkor, csomagolási lánc, fák/oszlopok/vágások (eggyel kevesebb köz), lépcsőzés, csere, mérleg – szalagmodelles (szakaszos) ábrával
  - 💰 Pénz és vásárlás: persely összeszámolása, visszajáró pénz (felfelé számolás a számegyenesen), legkevesebb érme, legfeljebb hány darab, egy darab ára, akció (2 után a 3. ajándék), parkolási díj, spórolás – érme- és bankjegyrajzokkal
  - 🛰️ Szabálykeresés: X–Y táblázat (hiányzó szám előre és visszafelé, melyik szabály illik minden oszlophoz – a 3. szinten több egyenértékű szabály is, mint 2026-ban –, találd ki a szabályt), „minden nap 3-mal többet” sorozatok (n-edik nap, hányadik nap, összeg, a hét melyik napja), számsorozatok
  - 🧩 Logika: sorrend állításokból (verseny, magasság), ki-kicsoda táblázat (egy vagy két tulajdonság, pl. kutya fajtája és neve), mérkőzésgráf (a nyíl a győztes felé mutat) – mindig pontosan egy megoldás, és a kérdésre adott válasz sosincs kimondva az állításokban
  - 📐 Síkidomok: terület és kerület négyzetrácson (kiemelt határvonallal), tengelyes tükrösség, útvonal égtájakkal, téglalap/négyzet kerülete és oldala, kerítés kapukkal
  - 🧊 Kockaépítmények: térbeli rajz kiskockákból – hány kocka (felülnézet számokkal), kiegészítés téglatestté/kockává, nézetek (szemből, felülről), nagy kocka és a befestett lapok (színezve), matricák a felületen
  - 🎯 Biztos, lehetséges, lehetetlen: húzás zsákból (golyórajzzal), letakart számjegyű kártyák, ki idősebb – a program minden esetet végigpróbál, a magyarázat példát és ellenpéldát mutat
  - ⭕ Halmazábra: leolvasás pöttyös ábráról, számok elhelyezése két tulajdonság szerint, szöveges halmazfeladat (mindkettőre / egyikre sem)
  - 🎲 Kombinatorika: „sorold fel az összes lehetőséget” – választás (sorrend nem számít), tornyok és zászlók feltételekkel, öltöztetés/menü, útvonalak ábrán, számok kártyákból, „hányféleképpen?”. A gyerek betűgombokkal rakja ki a lehetőségeket, a hibás (felesleges) lehetőséget a program megjelöli és megindokolja.
- **Hibakezelés:** első hibánál tipp, a második hibánál lépésenkénti, képes magyarázat. Ilyenkor a gyerek a saját válaszát is látja, a felismert hibával együtt („úgy számoltál, mintha egy órában 100 perc lenne”). Utána ikerfeladat jön, a hibás típus pedig 1, 3 és 7 nap múlva visszatér.
- **Motiváció:** űr téma, bolygótérkép, típusonként 3 csillag (3 egymás utáni elsőre jó válasz), üzemanyag-pontok, rangok, jelvények, napi sorozat heti egy pajzzsal, a szülő által beállított valódi jutalmak. Időnyomás és pontlevonás nincs.
- **Szabad gyakorlás:** a térképen egy bolygóra kattintva rögzített hosszú kör indul abból a típusból (3, 5 vagy 10 feladat – gyerekenként állítható a ⚙️ Beállítások fülön); az üres karikák már az elején mutatják, hány feladat lesz, a kör végén összegzés.
- **Napi küldetés:** alapból 10 feladat vagy 15 perc (gyerekenként állítható). Kb. 60% gyenge vagy új típus, 30% ismétlés, 10% meglepetés. Ez viszi a napos sorozatot (hetente 1 pajzs).
- **Napi nagy cél:** alapból 30 helyes válasz → 🏆 serlegeső és a kör végén ajándékdoboz (holnapi előleg, puszi, ölelés…). A szülő aznapra ×2/×3 pontszorzót adhat, és lezárhat bolygókat (témazár).
- **Egységes pontozás:** elsőre jó 10 (2. szinten +2, 3. szinten +5), tipp után 5, magyarázat után 2, sorozatbónusz +3 a 3. egymás utáni elsőre jótól, hibából tanulás +3.
- **⚙️ Szülői beállítások (PIN-nel), felugró ablakban, 6 fülön:**
  - 📊 **Fejlődés:** Ma / 7 nap / 30 nap csempék, diagram napi, heti vagy havi bontásban (oszlop: feladatszám, vonal: elsőre jó arány), bolygónkénti sávok ▲/▼ változással az előző időszakhoz képest;
  - 🗺️ **Bolygók:** csillagok, szintek, altípusok állapota színekkel;
  - 📝 **Hibák:** hibanapló bolygó szerinti szűréssel;
  - ⚙️ **Beállítások:** napi cél, szabad kör hossza, felolvasás és jutalmak **gyerekenként**, családi alapértékkel;
  - 👪 **Család:** játékosok (átnevezés, törlés), **eszközök táblázata**: melyik eszközön ki játszhat (pipákkal), PIN;
  - ☁️ **Felhő:** szinkronmód ehhez az eszközhöz, **adatforgalom** (ez az eszköz és a család összesen) és becsült Spark-felhasználás, belépés, családtagok.

  Billentyűk az ablakban: ←/→ vagy 1–6 fülváltás, Tab lépés, F1 a fül súgója, Esc bezárás.
- **Ranglétra és szekrény:** 12 rang (Űrkadét → Csillagflotta-legenda) a ⛽ alapján. A kezdőlap rangsávja mutatja, mennyi hiányzik és kb. hány nap (az utolsó 7 nap tempójával); rákattintva nagy áttekintő nyílik a létrával és a szekrénnyel. Rangonként új avatar, háttér, rakéta, konfetti vagy névkeret nyílik, új rangnál ünneplés. A meglévő avatar akkor is megmarad, ha a rang szerint még zárva lenne.
- **Ünnepek (2026/27 tél):** 🎄 adventi naptár dec. 1–24. a kezdőlapon (a mai ablak a napi küldetés után nyílik; egy plusz kör – a napi cél után még 5 feladat – után naponta egy kihagyott ablak pótolható), 🎅 Mikulás dec. 6-án, 🎄 karácsony dec. 24–26., 🎆 szilveszter/újév, ❄️ hóesés dec. 1. – jan. 6. Az ünnepi tárgyak (Mikulás- és hóember-avatar, karácsonyi háttér és rakéta, hópehely- és tűzijáték-konfetti, 2027-es keret) a szekrénybe kerülnek. Gyerekenként kikapcsolható (⚙️ Beállítások), a hóesés csökkentett mozgásnál magától nem fut.
- **Dátum szimulálása teszteléshez:** `index.html?nap=2026-12-06#debug` – külön tesztadatokkal és felhő nélkül fut, a valódi adatok nem változnak.
- **Szinkronmódok (eszközönként):** ⚡ folyamatos · ✅ minden feladat után (ajánlott, alapértelmezett) · 🏠 főmenübe lépéskor. Csak a megváltozott mezők mennek fel (egy feladat kb. 0,3–0,6 KB), a hibanapló külön ágon van, és csak a Hibák fül nyitásakor töltődik le. 5 perc tétlenség vagy háttérbe kerülés után a kapcsolat szünetel (💤).
- **Eszközfelismerés:** minden böngésző saját azonosítót és javasolt nevet kap (pl. „Windows – Chrome”). Ha több gyerek van, az első indításkor megkérdezi: „Ki játszik ezen az eszközön?” (mentés szülői PIN-nel). Egy hozzárendelt gyerek esetén a játék automatikusan vele indul; több esetén a választó csak őket mutatja.
- **☁️ Szinkron ablak (PIN nélkül):** állapot, eseménynapló, Mentés most, Újrakapcsolódás; a ⚙️ gomb PIN után a Felhő fülre visz.
- **Billentyűzet a kezdőképernyőn:** Tab / Shift+Tab lép a küldetés gomb és a bolygók között (körbe), Enter elindítja a kijelöltet.
- **Súgó (F1 vagy ❓):** gyerekeknek szóló leírás a kijelölt bolygóról (mit gyakorol ott, példafeladat, tipp), kijelölés nélkül áttekintés mind a 15 bolygóról; gyakorlás közben az aktuális bolygóról.
- **Esc gomb:** ha felugró ablak van nyitva, bezárja (mint a Mégse); egyébként bármelyik képernyőről (feladat, magyarázat) a főmenübe visz. Az első játékos nevét nem lehet Esc-kel átugrani.
- **Felolvasás** (🔊, alapból kikapcsolva) a böngésző magyar hangjával.

## Futtatás helyben

```bash
npx serve .
```

Ezután nyisd meg a `http://localhost:3000` címet. Bármilyen statikus szerver jó. A `file://` megnyitás nem működik, mert az app ES modulokat használ.

## Tesztek

```bash
node tests/generators.test.mjs
node tests/core.test.mjs
node tests/sync.test.mjs
node tests/ranks.test.mjs
node tests/events.test.mjs
node tests/shell.test.mjs
node tests/keret.test.mjs
node tests/cloud.test.mjs
node tests/firebase-keys.test.mjs
```

A `cloud.test.mjs` memóriabeli ál-Firebase-szel két eszközt szimulál (részleges feltöltés, összefésülés, régi változatú eszköz, hibanapló-ág, eszköz-hozzárendelés, törlés), a `sync.test.mjs` a mezőnkénti összehasonlítást és a feladatonkénti feltöltés méretét méri. A `core.test.mjs` a fejlődés-adatokat (napi/heti/havi összesítés), a beállítások ellenőrzését és az adat-átállást (schema 2) teszteli. A `generators.test.mjs`:
Típusonként, altípusonként és szintenként 1000 feladatot generál, és mindegyiket ellenőrzi:
- van-e válasz, és egész szám-e;
- nem negatív-e, és nem túl nagy-e;
- van-e magyarázat;
- nincs-e `undefined` vagy `NaN` a szövegben;
- átmegy-e a helyes válasz az ellenőrzőn.

A `node tests/sample.mjs T1` parancs mintafeladatokat ír ki átolvasásra.

## Felhős mentés

Lásd [FIREBASE.md](FIREBASE.md). Beállítás nélkül az app helyi módban működik.

## Új feladattípus hozzáadása

1. Hozz létre egy új fájlt a `js/types/` mappában a meglévők mintájára. Altípusonként kell egy `gen(rng, lvl)` függvény, ami ezeket adja vissza: `q`, `ans`, `hint`, `steps`, `why`.
2. Vedd fel a típust a `js/types/index.js` fájlba (és a `sw.js` listájába).
3. Futtasd le a teszteket.

## Következő ütemek

- Próbafelvételi mód: 45 perc, az eredeti feladatsorokkal, a javítási útmutató szerinti pontozással

## Felépítés: közös váz + feladatcsomag

A program váza közös és paraméterezhető; appankként csak a feladatok és a téma térnek el (részletek: `docs/terv-kozos-vaz.md`).

- `js/main.js`: indítás – `startShell({ game: GAME, pack: PACK })`.
- `js/core/`: játékfüggetlen keret – billentyűk, ablakok, fülek, beállításűrlap, fejlődés-adatok, diagram, részleges szinkron, felhő (`cloud.js`), eszköz és forgalom, tárgyak, események, hóesés, **egységes pontozás** (`scoring.js`), **kétszintű napi cél** (`dailygoal.js`), válaszrögzítés (`answers.js`), jelvénymotor (`badges.js`), ismétlés (`srs.js`), véletlenszám (`rng.js`).
- `js/shell/`: a közös váz képernyői – kezdőlap, gyakorlókör, ⚙️ ablak fülei, 🎒 Gyűjtemény, ünnepek, játékosok és eszközök, PIN, felhő-UI, súgó, napi nagy cél (serlegeső, ajándékdobozok, szorzós nap).
- `js/game/`: a Matek Űrkaland paraméterei – téma és szavak (`config.js`), ranglétra, tárgyak, ünnepek, ajándékok, adatátállás, Firebase.
- `js/pack/`: a matekos feladatcsomag – a 15 feladattípus, válaszadó felületek, bolygók csillagai és szintjei, küldetésterv, bolygósúgó.
- `js/engine.js`: a csomag és a keret összekötője a tesztekhez.

A `tests/shell.test.mjs` azt is ellenőrzi, hogy a `js/core` és a `js/shell` nem hivatkozik matekos fogalomra.

**A közös keret forrása az `urkaland-keret` repó** (a `Felvételi_matek` mellett: `../urkaland-keret`). A `js/core`, `js/shell`, `css/style.css` és `tests/keret.test.mjs` fájlokat itt nem szerkesztjük: a keret-repóban változtatunk, majd `node tools/keret-masolas.mjs ../Felvételi_matek` másolja át őket. A `KERET_VERZIO` fájl rögzíti a verziót és az ujjlenyomatot; a `node tests/keret.test.mjs` jelzi, ha a másolatot kézzel átírták.
