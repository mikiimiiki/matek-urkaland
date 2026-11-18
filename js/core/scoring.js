// ===== Egységes pontozás – minden játékban ugyanaz (a játék GAME.scoring-gal felülírhatja) =====
// r: 1 = elsőre jó · 2 = tipp / második próba után jó · 0 = hibás, de végignézte a magyarázatot
export const SCORING = {
  first: 10,                 // elsőre jó
  levelBonus: { 2: 2, 3: 5 },// szintbónusz elsőre jó válaszhoz
  second: 5,                 // tipp vagy második próba után jó
  explained: 2,              // hibás, de végignézte a magyarázatot (vagy újraírta a szót)
  combo: 3, comboFrom: 3,    // sorozatbónusz a 3. egymást követő elsőre jó választól
  twin: 3,                   // hibából tanulás: az ikerfeladat jó
  help: 3, helpMin: 2,       // segítségenként −3, de legalább 2
};

// Pontszám egy válaszra. o: { r, level, combo (hányadik egymást követő elsőre jó, ezt is beleértve), twin, helps }
export function score(o, T = SCORING) {
  const r = o.r, parts = [];
  let p = r === 1 ? T.first : r === 2 ? T.second : T.explained;
  parts.push([r === 1 ? "first" : r === 2 ? "second" : "explained", p]);
  if (r === 1 && T.levelBonus[o.level]) { p += T.levelBonus[o.level]; parts.push(["level", T.levelBonus[o.level]]); }
  if (r === 1 && (o.combo || 0) >= T.comboFrom) { p += T.combo; parts.push(["combo", T.combo]); }
  if (o.twin && r >= 1) { p += T.twin; parts.push(["twin", T.twin]); }
  if (o.helps > 0) { const before = p; p = Math.max(T.helpMin, p - o.helps * T.help); parts.push(["help", p - before]); }
  return { pts: p, parts };
}
