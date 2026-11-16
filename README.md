# Matek Űrkaland 🚀

Felkészítő program a **4. évfolyamosok központi matematika felvételijére** (8 évfolyamos gimnáziumba, M4 feladatlap).
Build nélküli, sima HTML + JavaScript webapp. GitHub Pages-en fut, offline is működik, és a Firebase-szel több eszköz között szinkronizál.

## Mit tud (1. ütem)

- **13 feladattípus generátorral**, végtelen sok változattal. A típusok a 2022–2026-os feladatlapok elemzése alapján készültek (lásd [docs/feladattipusok.md](docs/feladattipusok.md)):
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
  - 🎲 Kombinatorika: „sorold fel az összes lehetőséget” – választás (sorrend nem számít), tornyok és zászlók feltételekkel, öltöztetés/menü, útvonalak ábrán, számok kártyákból, „hányféleképpen?”. A gyerek betűgombokkal rakja ki a lehetőségeket, a hibás (felesleges) lehetőséget a program megjelöli és megindokolja.
- **Hibakezelés:** első hibánál tipp, a második hibánál lépésenkénti, képes magyarázat. Ilyenkor a gyerek a saját válaszát is látja, a felismert hibával együtt („úgy számoltál, mintha egy órában 100 perc lenne”). Utána ikerfeladat jön, a hibás típus pedig 1, 3 és 7 nap múlva visszatér.
- **Motiváció:** űr téma, bolygótérkép, típusonként 3 csillag (3 egymás utáni elsőre jó válasz), üzemanyag-pontok, rangok, jelvények, napi sorozat heti egy pajzzsal, a szülő által beállított valódi jutalmak. Időnyomás és pontlevonás nincs.
- **Szabad gyakorlás:** a térképen egy bolygóra kattintva rögzített hosszú kör indul abból a típusból (3, 5 vagy 10 feladat – a szülői felületen állítható); az üres karikák már az elején mutatják, hány feladat lesz, a kör végén összegzés.
- **Napi küldetés:** 10 feladat vagy 15 perc. Kb. 60% gyenge vagy új típus, 30% ismétlés, 10% meglepetés.
- **Szülői felület (PIN-nel):** heti összefoglaló, színes térkép arról, miben erős a gyerek és min kell még dolgozni, hibanapló, jutalmak, napi cél, profilok, felhős mentés.
- **Esc gomb:** ha felugró ablak van nyitva, bezárja (mint a Mégse); egyébként bármelyik képernyőről (feladat, magyarázat, szülői felület) a főmenübe visz. Az első játékos nevét nem lehet Esc-kel átugrani.
- **Felolvasás** (🔊, alapból kikapcsolva) a böngésző magyar hangjával.

## Futtatás helyben

```bash
npx serve .
```

Ezután nyisd meg a `http://localhost:3000` címet. Bármilyen statikus szerver jó. A `file://` megnyitás nem működik, mert az app ES modulokat használ.

## Tesztek

```bash
node tests/generators.test.mjs
```

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
- 3. hullám: biztos/lehetséges/lehetetlen, halmazábra
