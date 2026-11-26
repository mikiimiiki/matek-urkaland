// ===== 🌨️ Időjárás a hóeséshez: havazik-e ma a megadott városban? =====
// Naponta egyszer kérdez (Open-Meteo, ingyenes, kulcs nélkül): ha aznap havazott vagy havazás várható, egész nap
// esik a hó a játékban. Csak a város neve megy ki (pontos hely nem). A választ a böngésző eltárolja (város + nap),
// így ugyanaznap nincs újabb lekérdezés; hiba vagy ismeretlen város esetén snow: null (a hívó dönt a tartalékról).
const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);   // WMO: havazás, hódara, hózápor

export const normCity = c => String(c || "").replace(/\s+/g, " ").trim().toLowerCase();
// a mai nap napi adatából: volt / várható-e hó
export const isSnowDay = daily => !!daily && ((+daily.snowfall_sum?.[0] || 0) > 0 || SNOW_CODES.has(+daily.weather_code?.[0]));

// Gyorsítótár (localStorage-szerű tároló): { city, day, snow, place }
export function cachedSnow(store, key, city, day) {
  try { const c = JSON.parse(store.getItem(key) || "null"); return c && c.city === normCity(city) && c.day === day ? c : null; } catch { return null; }
}
// Lekérdezés (vagy a mai gyorsítótár): { snow: true|false|null, place }
export async function snowToday(city, day, { store, key, fetchFn = globalThis.fetch } = {}) {
  if (!normCity(city)) return { snow: null, place: "" };
  const hit = store && cachedSnow(store, key, city, day); if (hit) return hit;
  try {
    const g = await (await fetchFn(`${GEO}?name=${encodeURIComponent(String(city).trim())}&count=1&language=hu&format=json`)).json();
    const p = g && g.results && g.results[0];
    let out;
    if (!p) out = { city: normCity(city), day, snow: null, place: "" };   // ismeretlen város: ma ne kérdezzük újra
    else {
      const f = await (await fetchFn(`${FORECAST}?latitude=${p.latitude}&longitude=${p.longitude}&daily=snowfall_sum,weather_code&timezone=auto&forecast_days=1`)).json();
      out = { city: normCity(city), day, snow: isSnowDay(f && f.daily), place: p.name || String(city) };
    }
    try { store && store.setItem(key, JSON.stringify(out)); } catch { /* privát mód */ }
    return out;
  } catch { return { snow: null, place: "" }; }   // nincs net: legközelebb újra próbálja
}
