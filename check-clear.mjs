import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = [];
page.on("pageerror", (e) => errs.push("P " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("C " + m.text()); });
await page.goto("http://127.0.0.1:8153/index.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(600);
const out = {};
// A. 终结技清场（验证 pendingClear 不打断终结技演出）
await page.evaluate(() => {
  const g = window.__game;
  g.foes.forEach((f) => { if (f.alive) f.hp = 1; });
  g.S.energy = 100;
  g.startFinisher("holy-smite");
});
await page.waitForTimeout(1200);
out.midCine = await page.evaluate(() => window.__game.dbg().phase);
await page.waitForFunction(() => ["upgrade", "route", "ready", "over"].includes(window.__game.dbg().phase), null, { timeout: 15000 }).catch(() => {});
out.afterFinisher = await page.evaluate(() => window.__game.dbg().phase);
// B. 连击被打断清零
await page.evaluate(() => { window.__game.S.combo = 5; window.__game.S.comboT = 4; });
await page.evaluate(() => { const g = window.__game; g.S.intent = null; g.foes[g.S.actor].intent = { type: "attack", dmg: 5 }; });
out.comboBefore = await page.evaluate(() => window.__game.S.combo);
await page.waitForTimeout(5200);
out.comboAfterTimeout = await page.evaluate(() => window.__game.S.combo);
console.log(JSON.stringify(out, null, 1), "\nerrors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
