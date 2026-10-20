// Self-check for night-mode beam logic. Run: node night-beams.check.mjs
import { readFileSync } from "node:fs";

const app = readFileSync("app.js", "utf8");

// beam angle must be atan2(dx, -dy). Eval the formula actually shipped in app.js.
const m = app.match(/angleDeg = Math\.atan2\(dx, -dy\) \* \(180 \/ Math\.PI\)/);
if (!m) throw new Error("beam angle formula missing from app.js");

const angleOf = (dx, dy) => {
  let a = Math.atan2(dx, -dy) * (180 / Math.PI);
  return a;
};

const cases = [
  [0, 1, 180, "pointer below â†’ beam down"],
  [1, 0, 90, "pointer right â†’ beam right"],
  [-1, 0, -90, "pointer left â†’ beam left"],
  [0, -1, 0, "pointer above â†’ beam up"],
];
for (const [dx, dy, want, name] of cases) {
  const got = angleOf(dx, dy);
  if (Math.abs(got - want) > 0.01) {
    throw new Error(`beam angle wrong for ${name}: got ${got}, want ${want}`);
  }
}

if (!app.includes("getContext(\"2d\")")) throw new Error("veil must be a canvas (2d context)");
if (!app.includes("destination-out")) throw new Error("beam cutout (destination-out) missing");
if (!/traceBeam\(ctx/.test(app)) throw new Error("beam trapezoid tracing missing");
if (!app.includes("updateNightBeams()")) throw new Error("beams not wired into frame loop");

// glow texture: alpha must be premultiplied into RGB before use as emissiveMap
if (!/emissiveMap[\s\S]{0,600}getImageData[\s\S]{0,400}putImageData/.test(app)) {
  throw new Error("emissiveMap alpha premultiply missing");
}
if (!/emissiveIntensity = on \? nightCfg\.eyeGlowStrength : 0;/.test(app)) throw new Error("glow layer must be night-gated");
if (app.includes("featherDeg")) throw new Error("stale featherDeg config left behind");
if (app.includes("conic-gradient") || app.includes("mask-composite")) throw new Error("old CSS-mask beam code still present");

const html = readFileSync("index.html", "utf8");
if (!/<canvas class="night-veil" id="night-veil"/.test(html)) throw new Error("night-veil must be a <canvas> in index.html");
if (html.includes("night-beams")) throw new Error("stale night-beams element in index.html");

console.log("night-beams check: OK");
