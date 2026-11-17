// ===== Ez az eszköz: azonosító, név, hozzárendelt gyerekek, szinkronmód, forgalomszámláló =====
// Játékfüggetlen. Az adatok a böngészőben vannak (localStorage, tartalékként IndexedDB), a felhőbe
// a cloud.js tölti fel a devices/{id} ágra.

const rnd = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, "0")).join("");
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// Javasolt név a böngésző adataiból, pl. „Windows – Chrome”, „iPhone – Safari”
export function guessName(ua = (typeof navigator !== "undefined" ? navigator.userAgent : ""), touch = (typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0)) {
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1) ? "iPad"
    : /Android/.test(ua) ? (/Mobile/.test(ua) ? "Android telefon" : "Android tablet")
    : /CrOS/.test(ua) ? "Chromebook" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Eszköz";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\/|CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "böngésző";
  return `${os} – ${br}`;
}

// IndexedDB tartalék: ha a localStorage törlődik, az azonosító innen visszajön (és fordítva)
function idb(mode, key, val) {
  return new Promise(res => {
    try {
      const rq = indexedDB.open("device-id", 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
      rq.onerror = () => res(null);
      rq.onsuccess = () => {
        try {
          const tx = rq.result.transaction("kv", mode), st = tx.objectStore("kv");
          const r = mode === "readonly" ? st.get(key) : st.put(val, key);
          r.onsuccess = () => res(mode === "readonly" ? r.result ?? null : true); r.onerror = () => res(null);
        } catch { res(null); }
      };
    } catch { res(null); }
  });
}

export function createDevice(prefix, { defaultMode = "task" } = {}) {
  const KEY = prefix + "_device";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
  let d = load();
  const fresh = !d || !d.id;
  if (fresh) d = { id: "d" + rnd(6), name: guessName(), firstSeen: Date.now() };
  d.syncMode = d.syncMode || defaultMode;
  d.traffic = d.traffic || {};
  let idbDone = false;
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* privát mód */ }
    if (!idbDone) { idbDone = true; idb("readwrite", KEY, d.id); }
  };

  // Indításkor: ha a localStorage üres volt, de az IndexedDB-ben van azonosító, azt használjuk
  const ready = (async () => {
    if (fresh) { const old = await idb("readonly", KEY); if (old && typeof old === "string") d.id = old; }
    save();
  })();

  return {
    ready,
    get id() { return d.id; },
    get name() { return d.name; },
    get firstSeen() { return d.firstSeen; },
    get syncMode() { return d.syncMode; },
    get kids() { return Array.isArray(d.kids) ? d.kids.slice() : null; },   // null = nincs megadva (mindenki játszhat)
    get kidsUpd() { return d.kidsUpd || 0; },
    get nameUpd() { return d.nameUpd || 0; },
    get raw() { return d; },
    setName(n, ts = Date.now()) { d.name = String(n || "").trim().slice(0, 40) || guessName(); d.nameUpd = ts; save(); },
    setKids(ids, ts = Date.now()) { d.kids = ids == null ? null : [...new Set(ids)]; d.kidsUpd = ts; save(); },
    setSyncMode(m) { d.syncMode = m; save(); },
    // Forgalom: dir = "up" | "down" | "sync"
    count(dir, n = 0) {
      const m = monthKey(), t = (d.traffic[m] = d.traffic[m] || { up: 0, down: 0, syncs: 0 });
      if (dir === "sync") t.syncs++; else t[dir] += Math.max(0, Math.round(n));
      // csak az utolsó 3 hónapot tartjuk meg
      Object.keys(d.traffic).sort().slice(0, -3).forEach(k => delete d.traffic[k]);
      save();
    },
    traffic(m = monthKey()) { return { up: 0, down: 0, syncs: 0, ...(d.traffic[m] || {}) }; },
    get allTraffic() { return JSON.parse(JSON.stringify(d.traffic)); },
  };
}
