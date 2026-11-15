# Felhős mentés beállítása (kb. 15 perc)

Amíg ez nincs kész, az app **helyi módban** működik: minden adat csak abban a böngészőben van, ahol a gyerek gyakorol.
A felhővel a szülő Google-fiókkal lép be, és minden eszközön ugyanaz az állás látszik. A másik szülő is beléphet.

A felépítés ugyanaz, mint a Massalhangzok appnál, de **külön Firebase-projekt** kell, hogy a két app adatai ne keveredjenek.

## 1. Új Firebase-projekt

1. Nyisd meg a <https://console.firebase.google.com> oldalt, és válaszd az **Add project** (Projekt hozzáadása) lehetőséget.
2. Név: pl. `matek-urkaland`. A Google Analytics nem kell, kikapcsolhatod.

## 2. Webalkalmazás regisztrálása

1. A projekt kezdőlapján kattints a **`</>`** (Web) ikonra.
2. Név: `Matek Űrkaland`. A „Firebase Hosting” jelölőnégyzet maradjon üresen, mert GitHub Pages-en fog futni.
3. A megjelenő `firebaseConfig` értékeit másold be a [js/firebase-config.js](js/firebase-config.js) fájlba (apiKey, authDomain, projectId stb.).

## 3. Google-belépés bekapcsolása

1. **Build → Authentication → Get started**.
2. **Sign-in method → Google → Enable**. Add meg a támogatási e-mail-címet, majd mentsd.
3. **Settings → Authorized domains → Add domain**: `mikiimiiki.github.io`. A `localhost` alapból szerepel a listában.

## 4. Adatbázis

1. **Build → Realtime Database → Create database**.
2. Helyszín: **Belgium (europe-west1)**.
3. Indulj **locked mode**-ban.
4. Másold ki az adatbázis címét (pl. `https://matek-urkaland-default-rtdb.europe-west1.firebasedatabase.app`), és írd be a `databaseURL` mezőbe a `js/firebase-config.js` fájlban.
5. **Rules** fül: töröld a meglévő szabályokat, másold be a [database.rules.json](database.rules.json) tartalmát, majd kattints a **Publish** gombra.

## 5. Feltöltés és első belépés

1. Töltsd fel a módosított `js/firebase-config.js` fájlt a GitHub-repóba.
2. Nyisd meg az appot, majd **☁️ → Belépés Google-lel → Család létrehozása**. Az ezen az eszközön lévő eredmények ekkor feltöltődnek.
3. **☁️ → Másik szülő hozzáadása**: írd be a másik szülő Google-fiókjának e-mail-címét. Ő belépés után ugyanazt a családot látja.
4. A többi eszközön (pl. a gyerek laptopján) elég egyszer belépni a szülő fiókjával.

## Biztonság

- A család adatait csak a családhoz hozzáadott, ellenőrzött e-mail-című Google-fiókok olvashatják és írhatják.
- A gyereknek nincs saját fiókja; csak a nevét, az avatarját és a gyakorlási eredményeit tároljuk.
- A szülői PIN-t nem tároljuk, csak a sózott hash-ét (PBKDF2).
- Az `apiKey` nem titkos, nyugodtan lehet a nyilvános repóban. A védelmet az adatbázis szabályai adják.

## Költség

A Spark (ingyenes) csomag egy család használatához bőven elég, bankkártyát nem kell megadni.
