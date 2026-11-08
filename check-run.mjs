import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const URL = process.argv[2] ?? "http://127.0.0.1:8146/index.html";
mkdirSync("shots", { recursive: true });
const errs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on("console", (m) => { if (m.type() === "error") errs.push("C " + m.text()); });
page.on("pageerror", (e) => errs.push("P " + e.message));
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(700);
const out = {};
out.start = await page.evaluate(() => { const d = window.__game.dbg(); return { skills: d.skills, foes: d.foes.map(f => f.name + ":" + f.hp), stage: d.stage, wave: d.wave, btns: document.querySelectorAll(".mv").length }; });
await page.screenshot({ path: "shots/run_start.png" });

// 自动跑完整局：清场->选强化->下一波
let clears = 0, ups = 0;
for (let step = 0; step < 220; step++) {
  const st = await page.evaluate(() => window.__game.dbg().phase);
  if (st === "over") break;
  if (st === "upgrade") {
    const n = await page.evaluate(() => { document.querySelectorAll(".up")[0]?.click(); return document.querySelectorAll(".up").length; });
    ups++;
    await page.waitForTimeout(500);
    continue;
  }
  if (st === "ready") {
    // 把敌人血量压低，用 AOE 一击清场，加速测试
    await page.evaluate(() => {
      const g = window.__game;
      g.foes.forEach((f) => { if (f.alive) f.hp = 1; });
      g.S.cd = [0,0,0,0,0,0];
      const areaIx = g.S.skills.findIndex((id) => g.SKILL_POOL[id].area);
      g.chooseMove(areaIx >= 0 ? areaIx : 0);
    });
    clears++;
    await page.waitForTimeout(1500);
    continue;
  }
  await page.waitForTimeout(220);
}
const fin = await page.evaluate(() => window.__game.dbg());
out.end = { phase: fin.phase, stage: fin.stage, wave: fin.wave, kills: fin.kills, hp: fin.hp, maxhp: fin.maxhp,
  skills: fin.skills, mods: fin.mods, overlay: await page.evaluate(() => !document.getElementById("overlay").classList.contains("hide")) };
out.loops = { attacks: clears, upgrades: ups };
await page.screenshot({ path: "shots/run_end.png" });
console.log(JSON.stringify(out, null, 1));
console.log("errors:", errs.length ? errs.slice(0, 5) : "none");
await browser.close();
