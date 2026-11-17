// ===== Dátumok: napsorszám (helyi idő szerint) és "ÉÉÉÉ-HH-NN" kulcs =====
// A keret és a játékok is ezt használják, hogy a napok mindenhol ugyanúgy számolódjanak.
export const dayNum = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 864e5);
export const dateKey = n => new Date(n * 864e5).toISOString().slice(0, 10);
export const keyToDay = k => Math.floor(Date.parse(k + "T00:00:00Z") / 864e5);
// "11.17." rövid felirat diagramokhoz
export const shortDate = n => dateKey(n).slice(5).replace("-", ".") + ".";
