import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] ?? "http://127.0.0.1:8145/index.html";
mkdirSync("shots", { recursive: true });
const errs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(700);
const ready = async () => page.waitForFunction(() => window.__game.S.phase === "ready", null, { timeout: 15000 }).catch(() => {});

const out = {};
const snap = () => page.evaluate(() => window.__game.dbg());

out.spawn = (await snap()).foes.map((f) => f.name + ":" + f.hp);
await page.screenshot({ path: "shots/wave_start.png" });

// 单体：只该掉一只
await page.click('.mv[data-i="0"]');
await page.waitForTimeout(1400);
const s1 = await snap();
out.single = { hps: s1.foes.map((f) => f.hp), hitCount: s1.foes.filter((f, i) => f.hp < [26, 30, 34][i]).length };
await page.screenshot({ path: "shots/wave_hit.png" });
await ready();

// 切目标到幽魂
await page.click('.fbar[data-i="2"]');
out.targetSwitch = await page.evaluate(() => window.__game.S.target);

// AOE：全体掉血
await page.evaluate(() => { window.__game.foes.forEach((f) => { f.hp = f.maxhp; }); window.__game.S.target = 0; });
await page.click('.mv[data-i="3"]');
await page.waitForTimeout(1500);
const s2 = await snap();
out.aoe = { hps: s2.foes.map((f) => f.hp), allHit: s2.foes.every((f, i) => f.hp < [26, 30, 34][i]) };
await page.screenshot({ path: "shots/wave_aoe.png" });
await ready();

// 击杀 -> 目标自动切换
await page.evaluate(() => { window.__game.S.target = 0; window.__game.foes[0].hp = 1; window.__game.S.cd = [0, 0, 0, 0]; });
await page.click('.mv[data-i="0"]');
await page.waitForTimeout(1600);
const s3 = await snap();
out.kill = { alive: s3.foes.filter((f) => f.alive).length, target: s3.target, kills: await page.evaluate(() => window.__game.S.kills) };
await page.screenshot({ path: "shots/wave_kill.png" });

// 全灭 -> 通关
await page.evaluate(() => { window.__game.foes.forEach((f) => { if (f.alive) f.hp = 1; }); window.__game.S.cd = [0, 0, 0, 0]; window.__game.S.energy = 100; });
await page.waitForFunction(() => window.__game.S.phase === "ready", null, { timeout: 12000 }).catch(() => {});
await page.evaluate(() => window.__game.startFinisher("fireball-throw"));
await page.waitForTimeout(9000);
out.clear = await page.evaluate(() => ({ phase: window.__game.S.phase, alive: window.__game.foes.filter((f) => f.alive).length,
  overlay: !document.getElementById("overlay").classList.contains("hide") }));
await page.screenshot({ path: "shots/wave_clear.png" });

console.log(JSON.stringify(out, null, 1));
console.log("errors:", errs.length ? errs.slice(0, 6) : "none");
await browser.close();
