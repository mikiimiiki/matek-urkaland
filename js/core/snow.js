// ===== Hóesés a háttérben – kis terheléssel =====
// Egy rögzített canvas a tartalom mögött; háttérbe került lapon és „csökkentett mozgás” beállításnál nem fut.
let cv = null, raf = 0, flakes = [], on = false;

function frame() {
  if (!on) return;
  const ctx = cv.getContext("2d"), w = cv.width, h = cv.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,.85)";
  flakes.forEach(f => {
    f.y += f.v; f.x += Math.sin((f.y + f.p) / 40) * 0.4;
    if (f.y > h + 5) { f.y = -5; f.x = Math.random() * w; }
    ctx.globalAlpha = f.a; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  raf = requestAnimationFrame(frame);
}
function resize() { if (cv) { cv.width = innerWidth; cv.height = innerHeight; } }
export function setSnow(want) {
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  want = !!want && !reduced;
  if (want === on) return on;
  on = want;
  if (on) {
    if (!cv) {
      cv = document.createElement("canvas"); cv.id = "snow"; cv.setAttribute("aria-hidden", "true");
      document.body.prepend(cv); addEventListener("resize", resize);
      document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (on && document.visibilityState === "visible") raf = requestAnimationFrame(frame); });
    }
    resize();
    const n = Math.min(70, Math.round(innerWidth / 18));
    flakes = Array.from({ length: n }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: 1 + Math.random() * 2.2, v: 0.3 + Math.random() * 0.8, a: 0.35 + Math.random() * 0.5, p: Math.random() * 100 }));
    cv.hidden = false; raf = requestAnimationFrame(frame);
  } else if (cv) { cancelAnimationFrame(raf); cv.hidden = true; }
  return on;
}
export const snowing = () => on;
