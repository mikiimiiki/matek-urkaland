// ===== Válasz ellenőrzése (DOM nélkül, tesztelhető) =====

// "1 200", "1200", " 1200 " → 1200; üres vagy hibás → null
export function parseNum(s) {
  const t = String(s ?? "").replace(/[\s .]/g, "").replace(/^−/, "-");
  return /^-?\d+$/.test(t) ? Number(t) : null;
}

const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));

// Visszaad: { ok, missing, extra, good } – a "sorold fel az összeset" típusnál a hiányzó és a felesleges elemek száma
export function checkAnswer(ans, input) {
  switch (ans.kind) {
    case "num": return { ok: input === ans.value };
    case "time": {
      if (!Number.isInteger(input)) return { ok: false };
      const m = ans.mod12 ? 720 : 1440;
      return { ok: ((input - ans.value) % m + m) % m === 0 };
    }
    case "choice": return { ok: input === ans.value };
    case "pick":
    case "numset": {
      const inp = [...new Set(input || [])];
      const good = inp.filter(x => ans.value.includes(x)).length;
      return { ok: sameSet(inp, ans.value), good, missing: ans.value.length - good, extra: inp.length - good };
    }
  }
  return { ok: false };
}

// A felhasználó válaszának szöveges alakja (hibanaplóhoz, magyarázathoz)
export function answerText(ans, input) {
  if (input == null) return "–";
  switch (ans.kind) {
    case "num": return String(input) + (ans.unit ? " " + ans.unit : "");
    case "time": { const m = ((input % 1440) + 1440) % 1440; return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; }
    case "choice": return ans.options[input] ?? "–";
    case "pick": return input.map(i => ans.options[i]).join(", ") || "–";
    case "numset": return input.join(", ") || "–";
  }
  return String(input);
}
export const correctText = ans => answerText(ans, ans.value);
