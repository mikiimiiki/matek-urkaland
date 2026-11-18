// ===== Újrapróbálkozás, ha a szerver nem érhető el: lépcsőzetes visszavárakozás =====
// 3× 15 mp-enként → 3× percenként → 3× 5 percenként → utána 15 percenként (amíg az app nyitva van).
// Csak akkor próbálkozik, ha van mit feltölteni / letölteni (needed), és csak előtérben (visible);
// háttérben a próba kivár, és előtérbe kerüléskor azonnal lefut. Siker után a lépcső előről indul.
// DOM és Firebase nélküli logika: az időzítőt és az órát kívülről kapja (így tesztelhető).
export const RETRY = { ladder: [15e3, 15e3, 15e3, 60e3, 60e3, 60e3, 300e3, 300e3, 300e3], after: 900e3 };

// hány ms múlva jön a következő próba ennyi egymás utáni hiba után (0 hiba: nincs várakozás)
export const retryDelay = (fails, R = RETRY) => fails <= 0 ? 0 : (R.ladder[fails - 1] ?? R.after);
// a lépcső foka: 0 = 15 mp-es, 1 = perces, 2 = 5 perces, 3 = 15 perces (−1: nincs hiba)
export function retryStage(fails, R = RETRY) {
  if (fails <= 0) return -1;
  const steps = [...new Set([...R.ladder, R.after])];
  return steps.indexOf(retryDelay(fails, R));
}

// opts: attempt() → Promise<boolean> (sikerült-e), needed(), visible(), onStage(fok, ms), onRecover(), onChange(),
//       now(), timer: { set(fn, ms), clear(id) }
export function makeRetry(o) {
  const R = o.R || RETRY, now = o.now || (() => Date.now()), timer = o.timer || { set: (f, ms) => setTimeout(f, ms), clear: id => clearTimeout(id) };
  const visible = o.visible || (() => true), changed = () => o.onChange && o.onChange();
  let fails = 0, t = null, nextAt = 0, running = false, waiting = false, lastTry = 0, restart = false;
  const clear = () => { if (t != null) timer.clear(t); t = null; nextAt = 0; };
  function plan() {
    clear();
    if (!fails) return changed();
    if (!o.needed()) return reset();
    const d = retryDelay(fails, R); nextAt = now() + d; t = timer.set(fire, d); changed();
  }
  function fire() {
    t = null; nextAt = 0;
    if (!o.needed()) return reset();
    if (!visible()) { waiting = true; return changed(); }   // háttérben kivár, előtérben azonnal fut
    run();
  }
  async function run() {
    if (running) return;
    running = true; waiting = false; lastTry = now(); changed();
    let ok = false;
    try { ok = await o.attempt(); } catch { ok = false; }
    running = false;
    if (ok) success(); else fail();
  }
  function fail() {
    if (restart) { restart = false; fails = 0; }   // kézi / „visszajött a net” próba sem sikerült: a lépcső előről
    fails++;
    const s = retryStage(fails, R);
    if (s !== retryStage(fails - 1, R) && o.onStage) o.onStage(s, retryDelay(fails, R));
    plan();
  }
  function success() { const had = fails > 0; restart = false; clear(); fails = 0; waiting = false; if (had && o.onRecover) o.onRecover(); changed(); }
  function reset() { clear(); fails = 0; waiting = false; restart = false; changed(); }
  return {
    // a szokásos úton (nem újrapróbáláskor) nem sikerült egy mentés / letöltés
    failed() { if (!running) fail(); },
    // a szokásos úton sikerült: ha már nincs várakozó adat, a lépcső véget ér
    succeeded() { if (!running && fails && !o.needed()) success(); },
    active: () => fails > 0,
    running: () => running,
    fails: () => fails,
    stage: () => retryStage(fails, R),
    nextIn: () => (nextAt ? Math.max(0, nextAt - now()) : null),
    waitingVisible: () => waiting,
    // azonnali próba; reset: a lépcső előről indul (visszajött a net, kézi gomb)
    kick(resetLadder = false) {
      if (!o.needed()) return;
      if (resetLadder) restart = true;
      if (!running) { clear(); run(); }
    },
    // előtérbe került: ha épp a lépcsőn vagyunk, azonnal próbál (a lépcső folytatódik)
    onVisible() { if (fails && !running && (waiting || now() - lastTry > 5000)) { clear(); run(); } },
    reset,
  };
}
