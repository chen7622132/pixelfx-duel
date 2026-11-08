import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] ?? "http://127.0.0.1:8139/index.html";
mkdirSync("shots", { recursive: true });
const errs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await page.goto(URL, { waitUntil: "load", timeout: 45000 });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(600);

const out = {};
await page.evaluate(() => {
  window.__samples = [];
  window.__samp = setInterval(() => window.__samples.push(window.__game.dbg()), 16);
});

const hp0 = await page.evaluate(() => window.__game.S.fhp);
await page.click('.mv[data-i="0"]');
await page.waitForTimeout(170);
await page.screenshot({ path: "shots/juice_hit.png" });
await page.waitForTimeout(1200);
const st = await page.evaluate(() => ({ samples: window.__samples, hp: window.__game.S.fhp, audio: window.__game.dbg().audio }));
out.normal = {
  maxHitstop: Math.max(...st.samples.map((s) => s.hitstop)),
  maxZoom: Math.max(...st.samples.map((s) => s.zoom)).toFixed(3),
  maxKb: Math.max(...st.samples.map((s) => s.foeKb)).toFixed(1),
  maxSink: Math.max(...st.samples.map((s) => s.foeSink)).toFixed(1),
  flashFrames: Math.max(...st.samples.map((s) => s.flashN || 0)),
  hpDrop: hp0 - st.hp,
  audio: st.audio,
};

await page.waitForFunction(() => window.__game.S.phase === "ready", null, { timeout: 15000 }).catch(() => {});
await page.evaluate(() => { window.__samples = []; window.__game.S.fhp = 90; window.__game.addEnergy(100); });
await page.evaluate(() => window.__game.startFinisher("holy-smite"));
await page.waitForTimeout(1150);
await page.screenshot({ path: "shots/juice_finisher.png" });
await page.waitForTimeout(500);
out.finisher = await page.evaluate(() => ({
  maxHitstop: Math.max(...window.__samples.map((s) => s.hitstop)),
  maxZoom: Math.max(...window.__samples.map((s) => s.zoom)).toFixed(3),
  maxKb: Math.max(...window.__samples.map((s) => s.foeKb)).toFixed(1),
}));
await page.waitForFunction(() => ["ready", "over"].includes(window.__game.S.phase), null, { timeout: 20000 }).catch(() => {});
out.logs = await page.evaluate(() => [...document.querySelectorAll("#log li")].map((li) => li.textContent).slice(0, 4));

console.log(JSON.stringify(out, null, 1));
console.log("errors:", errs.length ? errs.slice(0, 5) : "none");
await browser.close();
