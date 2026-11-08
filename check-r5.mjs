import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] ?? "http://127.0.0.1:8131/index.html";
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
const txt = (i) => page.evaluate((k) => document.querySelector('.mv[data-i="' + k + '"] s').textContent, i);

// 1 伤害预览
const t0 = await txt(0), t2 = await txt(2);
const hint0 = await page.evaluate(() => document.getElementById("hint").textContent);
out.steps.push({ t: "preview", move1: t0, move3: t2, hint: hint0, ok: /^\d+-\d+$/.test(t0) && /\d+-\d+/.test(hint0) });

// 2 必杀高亮：把敌人血量压到 5
await page.evaluate(() => { window.__game.S.fhp = 5; window.__game.paintButtons(); });
const lethal = await page.evaluate(() => [...document.querySelectorAll(".mv.lethal")].map((b) => b.dataset.i));
await page.screenshot({ path: "shots/r4_lethal.png" });
out.steps.push({ t: "lethal", lethalButtons: lethal, ok: lethal.length === 4 });

// 3 护盾预览：数值应下降
await page.evaluate(() => { window.__game.S.fhp = 52; window.__game.S.foeGuard = true; window.__game.paintButtons(); });
const guarded = await txt(0);
const base = await page.evaluate(() => { const pv = window.__game.previewOf(0); return pv; });
out.steps.push({ t: "guard preview", guardedText: guarded, preview: base, ok: guarded !== t0 });
await page.evaluate(() => { window.__game.S.foeGuard = false; window.__game.paintButtons(); });

// 4 出招 -> 日志
await page.click('.mv[data-i="0"]');
await page.waitForTimeout(1400);
const logs = await page.evaluate(() => [...document.querySelectorAll("#log li")].map((li) => li.className + ":" + li.textContent));
await page.screenshot({ path: "shots/r5_log.png" });
out.steps.push({ t: "log", count: logs.length, first: logs[0], ok: logs.length > 0 });

await page.waitForFunction(() => window.__game.S.phase === "ready", null, { timeout: 15000 }).catch(() => {});
await page.screenshot({ path: "shots/r5_full.png" });
const totalLogs = await page.evaluate(() => document.querySelectorAll("#log li").length);
out.steps.push({ t: "log grows", total: totalLogs, ok: totalLogs >= 2 });

console.log(JSON.stringify(out, null, 1));
console.log("errors:", errs.length ? errs.slice(0, 6) : "none");
await browser.close();
