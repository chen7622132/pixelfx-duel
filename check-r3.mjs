import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] ?? "http://127.0.0.1:8129/index.html";
mkdirSync("shots", { recursive: true });
const errs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await page.goto(URL, { waitUntil: "load", timeout: 45000 });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(700);

const out = { steps: [] };

// 1 意图预告
const i0 = await page.evaluate(() => window.__game.S.intent);
await page.screenshot({ path: "shots/r1_intent.png" });
out.steps.push({ t: "intent shown", intent: i0, ok: !!i0 && !!i0.type });

// 2 蓄力可打断
await page.evaluate(() => { const g = window.__game; g.S.intent = { type: "heavy", dmg: 16 }; g.paintButtons(); });
const hasBreakTag = await page.evaluate(() => document.querySelector('.mv[data-i="1"]').classList.contains("hint-break"));
await page.screenshot({ path: "shots/r2_breaktag.png" });
await page.click('.mv[data-i="1"]');
await page.waitForTimeout(450);
const brk = await page.evaluate(() => ({ intent: window.__game.S.intent.type, breakFx: +window.__game.S.breakFx.toFixed(2), fhp: window.__game.S.fhp }));
await page.screenshot({ path: "shots/r2_break.png" });
out.steps.push({ t: "heavy break", hasBreakTag, after: brk, ok: hasBreakTag && brk.intent === "stunned" && brk.breakFx > 0 });
await page.waitForFunction(() => ["ready", "over"].includes(window.__game.S.phase), null, { timeout: 14000 }).catch(() => {});

// 3 举盾
await page.waitForFunction(() => window.__game.S.phase === "ready", null, { timeout: 15000 });
await page.evaluate(() => { window.__game.S.intent = { type: "guard", dmg: 0 }; window.__game.S.fhp = 45; });
await page.click('.mv[data-i="0"]');
await page.waitForFunction(() => window.__game.S.foeGuard === true, null, { timeout: 9000 }).catch(() => {});
const guardOn = await page.evaluate(() => window.__game.S.foeGuard);
const estatusGuard = await page.evaluate(() => document.getElementById("estatus").textContent);
await page.screenshot({ path: "shots/r3_guard.png" });
out.steps.push({ t: "guard", foeGuard: guardOn, estatus: estatusGuard, ok: guardOn === true });
await page.waitForFunction(() => ["ready", "over"].includes(window.__game.S.phase), null, { timeout: 14000 }).catch(() => {});

// 4 放毒
await page.waitForFunction(() => window.__game.S.phase === "ready", null, { timeout: 15000 });
await page.evaluate(() => { window.__game.S.intent = { type: "debuff", dmg: 0 }; window.__game.S.fhp = 45; });
await page.click('.mv[data-i="0"]');
await page.waitForFunction(() => window.__game.S.poison > 0, null, { timeout: 9000 }).catch(() => {});
const poison = await page.evaluate(() => window.__game.S.poison);
const pstatus = await page.evaluate(() => document.getElementById("pstatus").textContent);
await page.screenshot({ path: "shots/r3_poison.png" });
out.steps.push({ t: "debuff", poison, pstatus, ok: poison > 0 });
await page.waitForFunction(() => ["ready", "over"].includes(window.__game.S.phase), null, { timeout: 14000 }).catch(() => {});

console.log(JSON.stringify(out, null, 1));
console.log("errors:", errs.length ? errs.slice(0, 6) : "none");
await browser.close();
