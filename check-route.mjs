import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const URL = process.argv[2] ?? "http://127.0.0.1:8155/index.html";
mkdirSync("shots", { recursive: true });
const errs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on("console", (m) => { if (m.type() === "error") errs.push("C " + m.text()); });
page.on("pageerror", (e) => errs.push("P " + e.message));
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(700);
const out = {};
const ph = () => page.evaluate(() => window.__game.dbg());
const clearWave = async () => {
  await page.waitForFunction(() => window.__game.dbg().phase === "ready", null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => {
    const g = window.__game;
    g.foes.forEach((f) => { if (f.alive) f.hp = 1; });
    g.S.cd = [0, 0, 0, 0, 0, 0];
    const ix = g.S.skills.findIndex((id) => g.SKILL_POOL[id].area);
    g.chooseMove(ix >= 0 ? ix : 0);
  });
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(600);
    const s = await ph();
    if (s.phase === "upgrade") { await page.evaluate(() => document.querySelectorAll(".up")[0]?.click()); await page.waitForTimeout(500); }
    else if (s.phase === "route" || s.phase === "ready") return;
    else if (s.phase === "over") return;
  }
};

await page.evaluate(() => { window.__game.S.fhp = 999; });
await page.click('.mv[data-i="0"]');
await page.waitForTimeout(1200);
const c1 = await page.evaluate(() => window.__game.S.combo);
await page.waitForFunction(() => window.__game.S.phase === "ready", null, { timeout: 12000 }).catch(() => {});
await page.evaluate(() => { window.__game.foes.forEach((f) => { if (f.alive) f.hp = 999; }); window.__game.S.cd = [0,0,0,0,0,0]; });
await page.click('.mv[data-i="0"]');
await page.waitForTimeout(1200);
out.combo = { first: c1, second: await page.evaluate(() => window.__game.S.combo) };
await page.screenshot({ path: "shots/r_combo.png" });
await page.waitForFunction(() => window.__game.S.phase === "ready", null, { timeout: 12000 }).catch(() => {});

for (let i = 0; i < 3; i++) { await clearWave(); await page.waitForTimeout(700); }
const st = await ph();
out.afterStage = { phase: st.phase, stage: st.stage, wave: st.wave, gates: await page.evaluate(() => document.querySelectorAll("#route .gate").length) };
await page.screenshot({ path: "shots/r_route.png" });

const hpBefore = (await ph()).hp;
await page.click('#route .gate[data-r="rest"]');
await page.waitForTimeout(900);
const st2 = await ph();
out.rest = { hpBefore, hpAfter: st2.hp, maxhp: st2.maxhp, stage: st2.stage, wave: st2.wave, phase: st2.phase };

for (let i = 0; i < 3; i++) { await clearWave(); await page.waitForTimeout(700); }
await page.waitForTimeout(600);
const hasRoute = await page.evaluate(() => !document.getElementById("route").classList.contains("hide"));
if (hasRoute) await page.click('#route .gate[data-r="elite"]');
await page.waitForTimeout(900);
const st3 = await ph();
out.elite = { stage: st3.stage, hpList: st3.foes.map((f) => f.name + ":" + f.hp), extraUp: await page.evaluate(() => window.__game.S.extraUp) };
await page.screenshot({ path: "shots/r_elite.png" });

console.log(JSON.stringify(out, null, 1));
console.log("errors:", errs.length ? errs.slice(0, 6) : "none");
await browser.close();
