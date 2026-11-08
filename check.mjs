import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] ?? "http://127.0.0.1:8136/index.html";
mkdirSync("shots", { recursive: true });
const errs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(1200);

const r = {};
r.canvas = await page.evaluate(() => { const c = document.getElementById("screen"); return c ? [c.width, c.height, Math.round(c.getBoundingClientRect().width)] : null; });
r.hasGame = await page.evaluate(() => !!window.__game);
r.foe0 = await page.evaluate(() => window.__game && { name: (window.__game.foe||{}).name, hp: window.__game.S.fhp });
r.overflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

// 出第一招
await page.click('.mv[data-i="0"]');
await page.waitForTimeout(1400);
r.afterHit = await page.evaluate(() => ({ hp: window.__game.S.fhp, phase: window.__game.S.phase }));
await page.screenshot({ path: "shots/hit.png" });

// 打满一整个回合，看敌人是否反击
await page.waitForTimeout(2600);
r.afterRound = await page.evaluate(() => ({ php: window.__game.S.hp, phase: window.__game.S.phase }));
await page.screenshot({ path: "shots/round.png" });

// 连续自动出招 40 秒，验证多回合 / 敌人切换 / 无崩溃
const t0 = Date.now();
while (Date.now() - t0 < 110000) {
  await page.evaluate(() => {
    const g = window.__game;
    if (g.S.phase !== "ready") return;
    if (g.S.energy >= 100) { g.chooseMove(4); return; }
    for (let i = 0; i < 4; i++) if (g.S.cd[i] === 0) { g.chooseMove(i); return; }
  });
  await page.waitForTimeout(320);
}
r.after110s = await page.evaluate(() => ({
  foe: (window.__game.foe || {}).name ?? "-", fhp: window.__game.S.fhp, php: window.__game.S.hp,
  phase: window.__game.S.phase, kills: window.__game.S.kills,
}));
await page.screenshot({ path: "shots/late.png" });

// 桌面视口再看一眼排版
await page.setViewportSize({ width: 900, height: 900 });
await page.waitForTimeout(400);
await page.screenshot({ path: "shots/desktop.png" });

console.log(JSON.stringify(r, null, 1));
console.log("errors:", errs.length ? errs.slice(0, 8) : "none");
await browser.close();
mkdirSync("shots", { recursive: true });
