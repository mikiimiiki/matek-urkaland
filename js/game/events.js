// ===== A Matek Űrkaland ünnepei (2026/27 tél) =====
// Új ünnep felvétele: egy újabb leíró ide (lásd core/events.js). A tárgyak a game/cosmetics-catalog.js-ben vannak.

const pts = n => ({ pts: n }), item = id => ({ item: id }), sticker = e => ({ item: "st:" + e });

// 24 ablak: főleg ⛽ és matricák, különleges ablakok: 6. Mikulás, 13. hópehely-konfetti, 20. hóember, 24. karácsony
const ADVENT = [
  [pts(20)], [sticker("🦌")], [pts(30)], [sticker("⭐")], [pts(20)], [item("av:🎅")],
  [sticker("🍪")], [pts(30)], [sticker("🧦")], [pts(50)], [sticker("🔔")], [pts(20)],
  [item("confetti:snow")], [sticker("🕯️")], [pts(30)], [sticker("🍬")], [pts(50)], [sticker("🎁")],
  [pts(30)], [item("av:⛄")], [sticker("🦉")], [pts(50)], [sticker("🧸")], [item("bg:xmas"), item("rocket:xmas")],
].map((reward, i) => ({ day: i + 1, reward }));

export const EVENTS = [
  { id: "advent2026", kind: "advent", from: "2026-12-01", to: "2026-12-24", title: "🎄 Adventi naptár", windows: ADVENT },
  { id: "santa2026", kind: "once", from: "2026-12-06", to: "2026-12-06", when: "missionDone",
    reward: [item("av:🎅"), pts(100)], title: "🎅 Megjött a Mikulás!", text: "A mai küldetésért a Mikulás is hozott valamit a csizmádba!" },
  { id: "xmas2026", kind: "once", from: "2026-12-24", to: "2026-12-26", when: "missionDone",
    reward: [item("bg:xmas"), item("rocket:xmas"), pts(50)], title: "🎄 Boldog karácsonyt!", text: "Karácsonyi ajándék a mai küldetésért – nézd meg a szekrényedben!" },
  { id: "newyear2027", kind: "once", from: "2026-12-31", to: "2027-01-01", when: "missionDone",
    reward: [item("confetti:fireworks"), item("frame:2027")], title: "🎆 Boldog új évet!", text: "Tűzijáték-konfetti és 2027-es névkeret – sikeres felvételit!" },
  { id: "winter", kind: "ambient", from: "12-01", to: "01-06", effect: "snow" },
];
// „Plusz kör”: a napi cél felett még ennyi feladat – ezután nyitható ki egy korábbi, kihagyott ablak
export const PLUS_ROUND = 5;
