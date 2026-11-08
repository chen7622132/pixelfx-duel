import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("shots", { recursive: true });
const URL = process.argv[2] ?? "http://127.0.0.1:8162/index.html";
const errs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on("console", (m) => { if (m.type() === "error") errs.push("C " + m.text()); });
page.on("pageerror", (e) => errs.push("P " + e.message));
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(700);
const out = {};
const d = () => page.evaluate(() => window.__game.dbg());

out.boot = await d();
await page.screenshot({ path: "shots/plan_boot.png" });

await page.click('.mv[data-i="1"]');
await page.click('.mv[data-i="2"]');
await page.waitForTimeout(250);
out.slots = await page.evaluate(() => window.__game.S.slots);
out.chainSlots = await page.evaluate(() => document.querySelectorAll(".slot.chain").length);
await page.screenshot({ path: "shots/plan_filled.png" });

await page.click('.slot[data-i="0"]');
await page.waitForTimeout(150);
out.afterClear = await page.evaluate(() => window.__game.S.slots);
await page.evaluate(() => { window.__game.S.slots = [null, null, null, null]; window.__game.fillSlot("thrust"); window.__game.fillSlot("hammer"); });

const hpBefore = (await d()).foes.map((f) => f.hp);
await page.click("#execBtn");
await page.waitForTimeout(300);
out.execStarted = (await d()).phase;
await page.screenshot({ path: "shots/plan_exec.png" });
await page.waitForFunction(() => window.__game.dbg().phase === "plan", null, { timeout: 25000 }).catch(() => {});
const after = await d();
out.afterRound = { phase: after.phase, round: after.round, hp: after.hp, foeHp: after.foes.map((f) => f.hp) };
out.dmgDone = hpBefore.map((h, i) => h - out.afterRound.foeHp[i]);
await page.screenshot({ path: "shots/plan_done.png" });

await page.evaluate(() => { window.__game.S.slots = [null, null, null, null]; window.__game.fillSlot("slash"); window.__game.buildExec(); });
await page.waitForFunction(() => window.__game.dbg().phase === "plan", null, { timeout: 25000 }).catch(() => {});
out.secondRound = (await d()).round;

console.log(JSON.stringify(out, null, 1));
console.log("errors:", errs.length ? errs.slice(0, 6) : "none");
await browser.close();
