import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("C " + m.text()); });
await page.goto("http://127.0.0.1:8149/index.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(600);
const out = { before: await page.evaluate(() => ({ n: window.__game.S.skills.length, btns: document.querySelectorAll(".mv").length })) };
// 反复抽，直到出现"学习新招式"，点它
let got = false;
for (let i = 0; i < 24 && !got; i++) {
  await page.evaluate(() => window.__game.offerUpgrade());
  const has = await page.evaluate(() => !!document.querySelector('.up[data-u="skill"]'));
  if (has) { await page.click('.up[data-u="skill"]'); got = true; }
  else await page.evaluate(() => document.getElementById("upgrade").classList.add("hide"));
}
await page.waitForTimeout(800);
out.after = await page.evaluate(() => ({ n: window.__game.S.skills.length, skills: window.__game.S.skills,
  btns: document.querySelectorAll(".mv").length, phase: window.__game.S.phase }));
await page.screenshot({ path: "shots/skill5.png" });
console.log(JSON.stringify(out, null, 1), "\nerrors:", errs.length ? errs : "none");
await browser.close();
