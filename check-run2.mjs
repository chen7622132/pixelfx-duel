import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("shots", { recursive: true });
const URL = process.argv[2] ?? "http://127.0.0.1:8166/index.html";
const errs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on("console", (m) => { if (m.type() === "error") errs.push("C " + m.text()); });
page.on("pageerror", (e) => errs.push("P " + e.message));
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(600);
const out = { rounds: 0, upgrades: 0, routes: 0 };
for (let step = 0; step < 400; step++) {
  const st = await page.evaluate(() => window.__game.dbg());
  if (st.phase === "over") break;
  if (st.phase === "upgrade") {
    await page.evaluate(() => document.querySelectorAll(".up")[0]?.click());
    out.upgrades++;
    await page.waitForTimeout(420);
    continue;
  }
  if (st.phase === "route") {
    await page.evaluate(() => document.querySelectorAll("#route .gate")[1]?.click());
    out.routes++;
    await page.waitForTimeout(600);
    continue;
  }
  if (st.phase === "plan") {
    await page.evaluate(() => {
      const g = window.__game;
      g.S.slots = [null, null, null, null];
      for (const id of g.S.skills) {
        const si = g.S.skills.indexOf(id);
        if ((g.S.cd[si] || 0) === 0 && !g.S.slots.includes(id)) g.fillSlot(id);
        if (g.S.slots.every(Boolean)) break;
      }
      if (g.S.energy >= 100) g.chooseMove(g.S.skills.length);
    });
    await page.waitForTimeout(120);
    const filled = await page.evaluate(() => window.__game.S.slots.filter(Boolean).length);
    if (filled) {
      await page.evaluate(() => window.__game.buildExec());
      out.rounds++;
    }
    await page.waitForFunction(() => ["plan", "upgrade", "route", "over"].includes(window.__game.dbg().phase), null, { timeout: 30000 }).catch(() => {});
    continue;
  }
  await page.waitForTimeout(200);
}
const fin = await page.evaluate(() => window.__game.dbg());
out.end = { phase: fin.phase, stage: fin.stage, wave: fin.wave, round: fin.round, kills: fin.kills, hp: fin.hp, maxhp: fin.maxhp, skills: fin.skills.length };
await page.screenshot({ path: "shots/plan_end.png" });
console.log(JSON.stringify(out, null, 1));
console.log("errors:", errs.length ? errs.slice(0, 6) : "none");
await browser.close();
