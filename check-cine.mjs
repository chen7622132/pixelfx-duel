import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] ?? "http://127.0.0.1:8125/index.html";
mkdirSync("shots", { recursive: true });
const errs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await page.goto(URL, { waitUntil: "load", timeout: 45000 });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(600);

const out = { steps: [] };

// 普通招仍正常
const hp0 = await page.evaluate(() => window.__game.S.fhp);
await page.click('.mv[data-i="0"]');
await page.waitForTimeout(1300);
const hp1 = await page.evaluate(() => window.__game.S.fhp);
out.steps.push({ t: "normal move", hp0, hp1, ok: hp1 < hp0 });
await page.waitForFunction(() => window.__game.S.phase === "ready", null, { timeout: 8000 });

// 三个终结技
for (const [id, tag] of [["fireball-throw", "fire"], ["lightning-call", "thunder"], ["holy-smite", "holy"]]) {
  const b = await page.evaluate(() => window.__game.S.fhp);
  await page.evaluate((fid) => { window.__game.addEnergy(100); window.__game.startFinisher(fid); }, id);
  await page.waitForTimeout(900);
  const cineOn = await page.evaluate(() => document.getElementById("cine").classList.contains("on"));
  const title = await page.evaluate(() => document.getElementById("cineName").textContent);
  await page.screenshot({ path: `shots/cine_${tag}.png` });
  await page.waitForFunction(() => ["ready", "over"].includes(window.__game.S.phase), null, { timeout: 20000 }).catch(() => {});
  const after = await page.evaluate(() => ({ hp: window.__game.S.fhp, phase: window.__game.S.phase, energy: window.__game.S.energy }));
  out.steps.push({ t: "finisher " + id, before: b, after, cineOn, title, ok: (after.hp < b) || after.phase === "over" });
  if (after.phase !== "ready") break;
}

await page.screenshot({ path: "shots/cine_after.png" });
console.log(JSON.stringify(out, null, 1));
console.log("errors:", errs.length ? errs.slice(0, 6) : "none");
await browser.close();
