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
- **Napi küldetés:** alapból 10 feladat vagy 15 perc (gyerekenként állítható). Kb. 60% gyenge vagy új típus, 30% ismétlés, 10% meglepetés.
- **⚙️ Szülői beállítások (PIN-nel), felugró ablakban, 6 fülön:**
  - 📊 **Fejlődés:** Ma / 7 nap / 30 nap csempék, diagram napi, heti vagy havi bontásban (oszlop: feladatszám, vonal: elsőre jó arány), bolygónkénti sávok ▲/▼ változással az előző időszakhoz képest;
  - 🗺️ **Bolygók:** csillagok, szintek, altípusok állapota színekkel;
  - 📝 **Hibák:** hibanapló bolygó szerinti szűréssel;
  - ⚙️ **Beállítások:** napi cél, szabad kör hossza, felolvasás és jutalmak **gyerekenként**, családi alapértékkel;
  - 👪 **Család:** játékosok, PIN;
  - ☁️ **Felhő:** belépés, családtagok, szinkron.

  Billentyűk az ablakban: ←/→ vagy 1–6 fülváltás, Tab lépés, F1 a fül súgója, Esc bezárás.
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
node tests/firebase-keys.test.mjs
```

A `core.test.mjs` a fejlődés-adatokat (napi/heti/havi összesítés), a beállítások ellenőrzését és az adat-átállást (schema 2) teszteli. A `generators.test.mjs`:
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

## Felépítés (újrahasznosítható keret)

- `js/core/`: játékfüggetlen keret: gyorsbillentyűk (`keys.js`), egymásra rakható ablakok (`modal.js`), füles ablak (`tabs.js`), leíró alapú beállítások (`settings.js`), fejlődés-adatok (`progress.js`), diagram (`charts.js`).
- `js/game/`: a Matek Űrkaland saját beállításai (`config.js`: témák, beállítások leírása) és az adat-átállás (`migrate.js`).
- `js/parent/tabs.js`: a ⚙️ ablak fülei; az `app.js` egy `app` objektumon keresztül adja az adatokat.
