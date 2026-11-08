import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("shots", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("C " + m.text()); });
await page.goto("http://127.0.0.1:8157/index.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(800);
const out = {};
for (const st of [0, 1, 2]) {
  await page.evaluate((i) => {
    const g = window.__game;
    g.S.stage = i; g.S.wave = 0;
    g.setStageFx(true);
    g.startWave();
  }, st);
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `shots/bg${st + 1}.png` });
  out["stage" + (st + 1)] = await page.evaluate(() => {
    const g = window.__game;
    return { stage: g.S.stage, foes: g.foes.map((f) => f.def.name), phase: g.S.phase };
  });
}
// 帧率采样（两个全屏氛围特效同跑）
out.fps = await page.evaluate(() => new Promise((res) => {
  const ts = [];
  let n = 0;
  const loop = (t) => { ts.push(t); if (++n < 70) requestAnimationFrame(loop); else {
    const d = []; for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
    d.sort((a, b) => a - b);
    res({ median: +d[Math.floor(d.length / 2)].toFixed(1), p90: +d[Math.floor(d.length * 0.9)].toFixed(1) });
  } };
  requestAnimationFrame(loop);
}));
console.log(JSON.stringify(out, null, 1));
console.log("errors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
