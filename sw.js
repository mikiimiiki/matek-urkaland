// ===== Service worker: offline működés =====
// Az app fájljait gyorsítótárba tesszük; frissítéskor a VERSION-t növeld, hogy az új változat betöltődjön.
const VERSION = "urkaland-v2";
const SHELL = [
  "./", "index.html", "css/style.css", "manifest.webmanifest", "icon.svg",
  "js/app.js", "js/engine.js", "js/check.js", "js/util.js", "js/cloud.js", "js/firebase-config.js",
  "js/types/index.js", "js/types/t1_szamok.js", "js/types/t3_mertekegyseg.js", "js/types/t5_diagram.js", "js/types/t8_minta.js", "js/types/t4_ido.js",
];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Saját fájlok: előbb a hálózat (hogy a frissítés megjelenjen), ha nincs net, a gyorsítótár.
// Firebase és betűtípus: nem nyúlunk hozzá, a böngésző kezeli.
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
