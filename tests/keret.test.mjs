// A közös keret másolatának ellenőrzése (ez a fájl is a keret része – a keret-repóból jön).
// Ha ez a teszt elbukik: valaki kézzel átírta a js/core, js/shell vagy css/style.css valamelyik fájlját az appban.
// Javítás: a változást a keret-repóban kell megcsinálni, majd onnan átmásolni:  node tools/keret-masolas.mjs <app-mappa>
// Futtatás: node tests/keret.test.mjs
import { readFileSync, existsSync } from "fs";
import { createHash } from "crypto";

const root = new URL("../", import.meta.url);
const vf = new URL("KERET_VERZIO", root);
if (!existsSync(vf)) { console.log("– nincs KERET_VERZIO (ez maga a keret-repó?) – az ellenőrzés kimarad"); process.exit(0); }
const info = JSON.parse(readFileSync(vf, "utf8"));
const h = createHash("sha256"), missing = [];
info.fajlok.forEach(f => {
  const p = new URL(f, root);
  if (!existsSync(p)) { missing.push(f); return; }
  h.update(f + "\n"); h.update(readFileSync(p, "utf8").replace(/\r\n/g, "\n"));
});
const ok = !missing.length && h.digest("hex") === info.ujjlenyomat;
console.log(ok ? `✓ A közös keret (${info.verzio}${info.commit ? " · " + info.commit : ""}) érintetlen` : `✗ A közös keret másolata eltér a ${info.verzio} változattól${missing.length ? " (hiányzik: " + missing.join(", ") + ")" : ""} – a keretet csak a keret-repóban szabad módosítani.`);
process.exit(ok ? 0 : 1);
