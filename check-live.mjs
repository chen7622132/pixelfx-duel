import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] ?? "https://chen7622132.github.io/pixelfx-duel/";
mkdirSync("shots", { recursive: true });
const errs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
page.on("requestfailed", (r) => errs.push("REQFAIL " + r.url().slice(-60) + " " + (r.failure()?.errorText ?? "")));

const t0 = Date.now();
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
const tLoad = Date.now() - t0;
await page.waitForFunction(() => !!window.__game, null, { timeout: 40000 });

const before = await page.evaluate(() => ({ foe: (window.__game.foe || {}).name, hp: window.__game.S.fhp }));
await page.click('.mv[data-i="0"]');
await page.waitForTimeout(1500);
const after = await page.evaluate(() => ({ hp: window.__game.S.fhp, phase: window.__game.S.phase }));
const canvas = await page.evaluate(() => { const c = document.getElementById("screen"); return [c.width, c.height, Math.round(c.getBoundingClientRect().width)]; });
await page.screenshot({ path: "shots/live.png" });

console.log(JSON.stringify({ loadMs: tLoad, canvas, before, after }, null, 1));
console.log("errors:", errs.length ? errs.slice(0, 6) : "none");
await browser.close();
