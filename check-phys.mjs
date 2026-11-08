import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] ?? "http://127.0.0.1:8142/index.html";
mkdirSync("shots", { recursive: true });
const errs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await page.goto(URL, { waitUntil: "load", timeout: 45000 });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(500);

await page.evaluate(() => {
  window.__s = [];
  setInterval(() => window.__s.push(window.__game.dbg()), 16);
});
const out = {};

// 碎地锤：垂直打飞
await page.evaluate(() => { window.__s = []; window.__game.S.fhp = 48; });
await page.click('.mv[data-i="2"]');
await page.waitForTimeout(420);
await page.screenshot({ path: "shots/phys_air.png" });
await page.waitForTimeout(1600);
out.hammer = await page.evaluate(() => {
  const a = window.__s;
  return {
    maxHeight: Math.min(...a.map((x) => x.phys.y)).toFixed(1),
    everAir: a.some((x) => x.phys.air),
    endY: a[a.length - 1].phys.y.toFixed(1),
    maxPlayerJump: Math.min(...a.map((x) => x.pY)).toFixed(1),
  };
});
await page.waitForFunction(() => window.__game.S.phase === "ready", null, { timeout: 12000 }).catch(() => {});

// 突刺：横向打飞 -> 撞墙
await page.evaluate(() => { window.__s = []; window.__game.S.fhp = 48; window.__game.S.cd = [0, 0, 0, 0]; });
await page.click('.mv[data-i="1"]');
await page.waitForTimeout(420);
await page.screenshot({ path: "shots/phys_dash.png" });
await page.waitForTimeout(1500);
out.thrust = await page.evaluate(() => {
  const a = window.__s;
  const last = a[a.length - 1];
  return {
    maxX: Math.max(...a.map((x) => x.phys.x)).toFixed(0),
    endX: last.phys.x.toFixed(0),
    wallHits: last.wallHits,
    floorHits: last.floorHits,
  };
});
await page.waitForFunction(() => window.__game.S.phase === "ready", null, { timeout: 12000 }).catch(() => {});
await page.waitForTimeout(2200);
out.home = await page.evaluate(() => window.__game.dbg().phys.x);

console.log(JSON.stringify(out, null, 1));
console.log("errors:", errs.length ? errs.slice(0, 5) : "none");
await browser.close();
