// ===== Felhő: élő állapot, eseménynapló, belépés, család (☁️ kis ablak és a ⚙️ Felhő fül) =====
import { $, el, btn, escHtml as esc } from "../core/dom.js";
import { modal } from "../core/modal.js";
import { C } from "./ctx.js";
import { openGear } from "./players.js";

let cloudBox = null;
export function renderCloudLive() {
  document.querySelectorAll(".cloud-live").forEach(box => {
    const cloud = C.cloud, st = cloud.status();
    const ev = cloud.events.slice(-12).reverse();
    box.innerHTML = `<div class="cl-status ${st.cls || ""}"><span class="cl-ic">${st.icon}</span><div><b>${esc(st.text)}</b><div class="small">${esc(st.detail)}</div></div></div>`
      + (cloud.ready ? `<div class="small soft">Család: ${esc(cloud.familyCode.slice(0, 7))}… · Feltöltésre vár: ${cloud.pendingCount}</div>` : "")
      + (ev.length ? `<details class="cl-log"${st.cls === "err" || st.cls === "warn" || box.classList.contains("log-open") ? " open" : ""}><summary>Eseménynapló (${ev.length})</summary>${ev.map(e => `<div class="${e.err ? "bad" : ""}"><span class="soft">${new Date(e.t).toLocaleTimeString("hu-HU")}</span> ${e.icon} ${esc(e.text)}</div>`).join("")}</details>` : "");
  });
}
export function renderCloudInto(c) {
  const cloud = C.cloud;
  cloudBox = c;
  const live = el("div", "cloud-live"); c.append(live);
  const box = el("div");
  if (!cloud.configured) {
    box.innerHTML = `<p>A felhős mentés még nincs beállítva, ezért az adatok <b>csak ebben a böngészőben</b> tárolódnak.</p><p class="soft small">A beállítás lépései a <code>FIREBASE.md</code> fájlban vannak (kb. 15 perc). Utána a szülő Google-fiókkal lép be, és minden eszközön ugyanaz az állás látszik.</p>`;
  } else if (!cloud.user) {
    box.innerHTML = `<p>Lépj be Google-fiókkal, hogy az eredmények minden eszközön megjelenjenek, és a másik szülő is lássa őket.</p>`;
    box.append(btn("primary", "Belépés Google-lel", () => cloud.signIn()));
  } else {
    box.innerHTML = `<p>Belépve: <b>${esc(cloud.user.email || "")}</b></p>`;
    if (!cloud.member) {
      box.insertAdjacentHTML("beforeend", `<p>Ehhez a fiókhoz még nem tartozik család. Hozz létre egyet – a jelenlegi adatok feltöltődnek –, vagy kérd meg a másik szülőt, hogy adja hozzá az e-mail-címedet.</p>`);
      box.append(btn("primary", "Család létrehozása", () => cloud.createFamily()));
    } else {
      const ml = el("div", "soft small", "Családtagok betöltése…"); box.append(ml);
      cloud.members().then(ms => {
        ml.innerHTML = "Családtagok:";
        ms.forEach(m => {
          const row = el("div", "rw-item", `<span>${esc(m)}${cloud.user && m === (cloud.user.email || "").toLowerCase() ? " <span class='soft small'>(te)</span>" : ""}</span>`);
          if (cloud.removeMember && m !== (cloud.user.email || "").toLowerCase()) row.append(btn("ghost danger", "Eltávolítás", () => cloud.removeMember(m)));
          ml.append(row);
        });
      });
      const f = el("div", "form-row", `<input id="cl-mail" type="email" placeholder="masik.szulo@gmail.com">`);
      f.append(btn("secondary", "Hozzáadás", () => cloud.addMember($("cl-mail").value)));
      box.append(el("p", "small", "Másik szülő hozzáadása (a Google-fiókja e-mail-címével):"), f);
    }
    const tools = el("div", "form-row");
    if (cloud.ready) tools.append(btn("secondary", "⬆️ Mentés most", () => cloud.checkpoint("now")));
    tools.append(btn("secondary", "🔄 Újrakapcsolódás", () => cloud.reconnect()), btn("secondary", "🚪 Kilépés", () => cloud.signOut()));
    box.append(tools);
  }
  if (cloud.note) box.append(el("p", "small", cloud.note));
  c.append(box);
  renderCloudLive();
}
// A ⚙️ Felhő fül újrarajzolása, ha nyitva van (a felhő állapotváltozásakor)
export function refreshCloud() { if (cloudBox && cloudBox.isConnected && !C.gearApi) { cloudBox.innerHTML = ""; renderCloudInto(cloudBox); } }

// ☁️ kis ablak PIN nélkül: állapot, eseménynapló (nyitva), Mentés most, Újrakapcsolódás; a ⚙️ PIN után a Felhő fülre visz
export function openCloud() {
  const cloud = C.cloud;
  modal((box, close) => {
    const head = el("div", "tabs-head");
    const gear = btn("ghost gear-jump", "⚙️", () => { close(); openGear("cloud"); });
    gear.title = "Felhő beállítások (szülői PIN)"; gear.setAttribute("aria-label", gear.title);
    head.append(el("h3", null, "☁️ Szinkron"), gear);
    box.append(head, el("div", "cloud-live log-open"));
    const row = el("div", "mbtns");
    if (cloud.ready) row.append(btn("secondary", "⬆️ Mentés most", () => cloud.checkpoint("now")));
    if (cloud.configured && !cloud.user) row.append(btn("secondary", "Belépés Google-lel", () => { close(); cloud.signIn(); }));
    if (cloud.configured && cloud.user) row.append(btn("secondary", "🔄 Újrakapcsolódás", () => cloud.reconnect()));
    row.append(btn("primary", "Bezár", () => close()));
    box.append(row);
    renderCloudLive();
  });
}
