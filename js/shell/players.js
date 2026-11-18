// ===== Játékosok, eszköz-hozzárendelés, szülői PIN, ⚙️ ablak =====
import { $, el, btn, toast, escHtml as esc } from "../core/dom.js";
import { modal, ask, isOpen as isModalOpen } from "../core/modal.js";
import { openTabs } from "../core/tabs.js";
import { guessName } from "../core/device.js";
import { setMult, streakNow } from "../core/dailygoal.js";
import { C, G, cur, prefs, persist, save, saveUser, saveFamily, applyPrefs, rewardKinds, rewardProgress } from "./ctx.js";
import { refreshAll, renderTop, renderHome } from "./home.js";
import { parentTabs } from "./parent-tabs.js";
import { renderCloudInto } from "./cloud-ui.js";
import { newUser } from "./user.js";

// ---------- Új játékos, váltás ----------
// first: az első játékos (nem zárható be); after: visszahívás mentés után (pl. a Család fül frissítése)
export function newPlayer(first = false, after = null) {
  const g = G(), START = g.ranks.RANKS[0].unlocks.filter(id => id.startsWith("av:")).map(id => id.slice(3));
  let av = START[Object.keys(C.state.users).length % START.length];
  modal((box, close) => {
    box.append(el("h3", null, first ? g.texts.welcome : "Új játékos"));
    box.append(el("p", null, g.texts.pickAvatar));
    const inp = el("input", "minp"); inp.maxLength = 20; inp.placeholder = "Neved"; box.append(inp);
    const avs = el("div", "avatars");
    START.forEach(a => { const b = btn(a === av ? "sel" : "", a, () => { av = a; avs.querySelectorAll("button").forEach(x => x.classList.toggle("sel", x === b)); }); avs.append(b); });
    box.append(avs, el("p", "soft small", g.texts.unlockHint));
    const go = () => {
      const name = inp.value.trim().replace(/[.$#\[\]\/]/g, "");
      if (!name) return toast("Írd be a neved!");
      if (C.state.users[name]) return toast("Ilyen nevű játékos már van.");
      const nu = newUser(name, av, C.pack); nu.prefs = { ...(C.state.settings.childDefaults || {}) }; nu.id = g.migrate.newId();
      C.state.users[name] = g.migrate.user(nu, C.state); C.state.current = name; delete C.state.deleted[name];
      // ha ehhez az eszközhöz már meg van adva, ki játszik rajta, az új játékos is ide kerül
      if (C.device.kids) { C.device.setKids([...C.device.kids, nu.id]); C.cloud.pushDevice(true); }
      save(); close(); applyPrefs(); refreshAll(); if (after) after();
    };
    inp.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
    const row = el("div", "mbtns");
    if (!first) row.append(btn("secondary", "Mégse", () => close()));
    row.append(btn("primary", g.texts.go, go));
    box.append(row);
  }, { esc: first ? false : undefined });
}
export function switchPlayer() {
  modal((box, close) => {
    box.append(el("h3", null, "Ki játszik?"));
    const list = el("div", "userlist");
    allowedUsers().forEach(u => list.append(btn(u.name === C.state.current ? "cur" : "", `<span style="font-size:28px">${u.avatar}</span> ${esc(u.name)} <span class="soft small" style="margin-left:auto">${G().pointsIcon} ${u.pts}</span>`, () => { C.state.current = u.name; persist(); close(); applyPrefs(); refreshAll(); })));
    box.append(list);
    const row = el("div", "mbtns");
    // ha az eszközhöz meg van adva, ki játszik rajta, új játékost csak a szülő vehet fel (⚙️ Család)
    if (!C.device.kids) row.append(btn("secondary", "➕ Új játékos", () => { close(); newPlayer(); }));
    row.append(btn("primary", "Bezár", () => close()));
    box.append(row);
  });
}

// ---------- Eszköz: ki játszik ezen az eszközön? ----------
// device.kids: a gyerekek belső azonosítói (u.id); null = nincs megadva, mindenki játszhat
export function allowedUsers() {
  const all = Object.values(C.state.users), k = C.device && C.device.kids;
  if (!k) return all;
  const a = all.filter(u => k.includes(u.id));
  return a.length ? a : all;   // ha a hozzárendelt gyerekek közben törlődtek, ne zárjuk ki az összeset
}
export const userLocked = () => !!(C.device && C.device.kids) && allowedUsers().length <= 1 && Object.keys(C.state.users).length > 1;
export function enforceDevice() {
  const a = allowedUsers();
  if (a.length && !a.some(u => u.name === C.state.current)) { C.state.current = a[0].name; persist(); applyPrefs(); }
}
let deviceAsked = false;
export function maybeAskDevice() {
  if (deviceAsked || C.device.kids || !C.cloud.settled || isModalOpen() || !$("scr-home").classList.contains("on")) return;
  const us = Object.values(C.state.users);
  if (!us.length) return;
  if (us.length === 1) { C.device.setKids([us[0].id]); C.cloud.pushDevice(true); return; }
  deviceAsked = true;
  askDeviceKids();
}
function askDeviceKids() {
  modal((box, close) => {
    box.append(el("h3", null, "📱 Ki játszik ezen az eszközön?"));
    box.append(el("p", null, `Eszköz: <b>${esc(C.device.name)}</b>`), el("p", "soft small", "Ha egy gyereket jelölsz be, a játék automatikusan őt indítja. Ha többet, csak közülük lehet választani. Később a ⚙️ → Család fülön módosíthatod."));
    const list = el("div", "kidchecks");
    Object.values(C.state.users).forEach(u => list.append(el("label", "kidcheck", `<input type="checkbox" value="${esc(u.id)}"> <span style="font-size:24px">${u.avatar}</span> ${esc(u.name)}`)));
    box.append(list);
    const row = el("div", "mbtns");
    row.append(btn("secondary", "Később", () => close()));
    row.append(btn("secondary", "Mindenki", () => list.querySelectorAll("input").forEach(i => { i.checked = true; })));
    row.append(btn("primary", "Mentés 🔒", async () => {
      const ids = [...list.querySelectorAll("input:checked")].map(i => i.value);
      if (!ids.length) return toast("Jelölj be legalább egy gyereket – vagy válaszd a Később gombot.");
      close();
      if (!(await requirePin())) return;
      C.device.setKids(ids); C.cloud.pushDevice(true); enforceDevice(); refreshAll();
      toast("✅ Elmentve – ezen az eszközön: " + allowedUsers().map(u => esc(u.name)).join(", "));
    }));
    box.append(row);
  });
}
export function onUserClick() {
  if (userLocked()) return toast(`📱 Ezen az eszközön <b>${esc(cur().name)}</b> játszik. A szülő a ⚙️ → Család fülön módosíthatja.`, 4000);
  switchPlayer();
}
// A felhőből jött eszköz-adat: a szülő egy másik eszközön módosíthatta ennek az eszköznek a nevét vagy a hozzárendelést
export function onDeviceRemote(rec) {
  let ch = false;
  if ((rec.kidsUpd || 0) > C.device.kidsUpd) { C.device.setKids(rec.kids ? (Array.isArray(rec.kids) ? rec.kids : Object.values(rec.kids)) : null, rec.kidsUpd); ch = true; }
  if ((rec.nameUpd || 0) > C.device.nameUpd && rec.name) C.device.setName(rec.name, rec.nameUpd);
  if (ch) { enforceDevice(); refreshAll(); }
}

// ---------- Szülői PIN ----------
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
async function hashPin(pin, saltHex) {
  const salt = saltHex ? Uint8Array.from(saltHex.match(/../g).map(h => parseInt(h, 16))) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" }, key, 256);
  return { salt: hex(salt), hash: hex(bits) };
}
const PIN_OK = /^\d{4,10}$/; // a régebbi (4–8, illetve 6–10 számjegyes) PIN-ek is érvényesek maradnak
export async function setNewPin() {
  const a = await ask({ title: "Szülői PIN beállítása", text: "Adj meg egy 4–10 számjegyű PIN-kódot. Ezzel védjük a szülői felületet.", value: "", secret: true });
  if (a == null) return false;
  if (!PIN_OK.test(a)) { toast("A PIN 4–10 számjegyből álljon."); return false; }
  const b = await ask({ title: "PIN megerősítése", text: "Írd be még egyszer.", value: "", secret: true });
  if (a !== b) { toast("A két PIN nem egyezik."); return false; }
  C.state.parent = await hashPin(a); persist(); C.cloud.pushParent(); toast("✅ PIN beállítva.");
  return true;
}
export async function requirePin() {
  if (!(window.crypto && crypto.subtle)) { toast("A PIN-hez biztonságos (https) kapcsolat kell."); return false; }
  if (!C.state.parent) { const r = await C.cloud.fetchParent(); if (r) { C.state.parent = r; persist(); } }
  if (!C.state.parent) return setNewPin();
  const p = await ask({ title: "Szülői felület", text: "Írd be a szülői PIN-kódot.", value: "", secret: true });
  if (p == null) return false;
  const ok = (await hashPin(p, C.state.parent.salt)).hash === C.state.parent.hash;
  if (!ok) toast("❌ Hibás PIN.");
  return ok;
}

// ---------- ⚙️ Szülői beállítások: 6 fülös ablak (PIN után) ----------
export async function openGear(startTab) {
  if (C.gearApi) return;
  if (!(await requirePin())) return;
  C.cloud.checkpoint("gear");
  C.gearApi = openTabs({
    id: "parent", title: G().settingsTitle, startTab,
    tabs: parentTabs(app),
    children: () => Object.values(C.state.users).map(u => ({ id: u.name, label: `${u.avatar} ${esc(u.name)}` })),
    startChild: C.state.current,
    onClose: () => { C.gearApi = null; refreshAll(); },
  });
}
async function deleteUser(name) {
  const ok = await ask({ title: `${name} törlése`, text: "Biztosan törlöd? Az összes eredménye elvész, és nem állítható vissza.", ok: "Törlöm", cancel: "Mégse" });
  if (!ok) return false;
  const ts = Date.now(), id = C.state.users[name] && C.state.users[name].id;
  C.state.deleted[name] = ts; delete C.state.users[name]; C.cloud.markDeleted(name, ts);
  if (C.device.kids && id) { const rest = C.device.kids.filter(x => x !== id); C.device.setKids(rest.length ? rest : null); C.cloud.pushDevice(true); }
  if (C.state.current === name) C.state.current = Object.keys(C.state.users)[0] || "";
  persist(); renderTop(); if ($("scr-home").classList.contains("on")) renderHome();
  if (!C.state.current) newPlayer(true);
  return true;
}
// Átnevezés: a gyerek új néven folytatja (a belső azonosító, így az eszköz-hozzárendelés is megmarad)
async function renameUser(old) {
  const u = C.state.users[old]; if (!u) return false;
  const v = await ask({ title: `${old} átnevezése`, text: "Új név:", value: old, ok: "Átnevezés" });
  if (v == null) return false;
  const nu = v.trim().replace(/[.$#\[\]\/]/g, "").slice(0, 20);
  if (!nu || nu === old) return false;
  if (C.state.users[nu]) { toast("Ilyen nevű játékos már van."); return false; }
  const ts = Date.now();
  C.state.users[nu] = { ...u, name: nu, upd: ts }; delete C.state.users[old];
  C.state.deleted[old] = ts; delete C.state.deleted[nu];
  if (C.state.current === old) C.state.current = nu;
  C.cloud.markDeleted(old, ts); persist(); C.cloud.queue(nu); refreshAll();
  toast(`✅ Átnevezve: ${esc(nu)}`);
  return true;
}
// Eszközlista a Család és a Felhő fülhöz (a felhőből, kiegészítve ennek az eszköznek a helyi adataival)
async function devicesList() {
  const D = C.device, remote = C.cloud.ready ? await C.cloud.fetchDevices() : null;
  const list = Object.entries(remote || {}).map(([id, r]) => ({ id, name: r.name || r.model || id, model: r.model || "", lastSeen: r.lastSeen || 0, kids: r.kids ? (Array.isArray(r.kids) ? r.kids : Object.values(r.kids)) : null, syncMode: r.syncMode || "", traffic: r.traffic || {}, me: id === D.id }));
  const mine = { id: D.id, name: D.name, model: guessName(), lastSeen: Date.now(), kids: D.kids, syncMode: D.syncMode, traffic: D.allTraffic, me: true };
  const i = list.findIndex(d => d.me);
  if (i >= 0) list[i] = { ...list[i], ...mine }; else list.unshift(mine);
  list.sort((a, b) => (b.me - a.me) || (b.lastSeen - a.lastSeen));
  return { list, fromCloud: !!remote };
}
function setDeviceKids(id, kids) {
  const k = kids && kids.length ? [...new Set(kids)] : null, ts = Date.now();
  if (id === C.device.id) { C.device.setKids(k, ts); enforceDevice(); refreshAll(); }
  return C.cloud.updateDevice(id, { kids: k, kidsUpd: ts });
}
function renameDevice(id, name) {
  const n = String(name || "").trim().slice(0, 40), ts = Date.now();
  if (!n) return Promise.resolve(false);
  if (id === C.device.id) C.device.setName(n, ts);
  return C.cloud.updateDevice(id, { name: n, nameUpd: ts });
}
async function removeDevice(id, name) {
  if (id === C.device.id) return false;
  const ok = await ask({ title: "Eszköz törlése", text: `Törlöd a listából: <b>${esc(name)}</b>? Ha az eszközön újra megnyitják a játékot, új eszközként jelenik meg.`, ok: "Törlöm" });
  return ok ? C.cloud.removeDevice(id) : false;
}
// Mai pontszorzó és témazár (a ⚙️ Beállítások fül „🏆 Napi cél és szorzók” szakaszából)
function setTodayMult(u, v) { setMult(u, v); saveUser(u); }
function setBlocked(u, topics) {
  const all = C.pack.topics.map(t => t.id), keep = topics.filter(t => all.includes(t));
  if (keep.length >= all.length) { toast(`Legalább egy ${G().topicWord.one} maradjon nyitva!`); return false; }
  u.block = keep.length ? { topics: keep, since: Date.now() } : null; saveUser(u); return true;
}
// A fülek ezen keresztül érik el az adatokat és a műveleteket (így a parent-tabs.js nem függ a többi modultól)
export const app = {
  get state() { return C.state; }, get cloud() { return C.cloud; }, get device() { return C.device; }, get pack() { return C.pack; }, get game() { return C.game; }, get defs() { return C.defs; },
  saveUser, saveFamily, deleteUser, renameUser, setNewPin, prefs,
  newPlayer: after => newPlayer(false, after),
  renderCloudInto: box => renderCloudInto(box),
  fetchLogs: name => C.cloud.fetchLogs(name),
  devicesList, setDeviceKids, renameDevice, removeDevice,
  setTodayMult, setBlocked, streakNow, rewardKinds, rewardProgress,
  get consoleUrl() { const f = G().firebase; return f && f.projectId ? `https://console.firebase.google.com/project/${f.projectId}/database` : ""; },
};
