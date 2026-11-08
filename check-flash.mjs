import { chromium } from "playwright";
const URL = process.argv[2] ?? "http://127.0.0.1:8140/index.html";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(URL, { waitUntil: "load", timeout: 45000 });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(500);

// 采样画布上史莱姆中心像素（1280x720，史莱姆锚点在 196,146）
await page.evaluate(() => {
  const cv = document.getElementById("screen");
  const c = cv.getContext("2d");
  window.__px = [];
  const read = () => {
    const d = c.getImageData(196 * 4, 118 * 4, 1, 1).data;
    window.__px.push([d[0], d[1], d[2]]);
  };
  window.__t = setInterval(read, 16);
});
await page.click('.mv[data-i="0"]');
await page.waitForTimeout(700);
const px = await page.evaluate(() => { clearInterval(window.__t); return window.__px; });
const white = px.filter((p) => p[0] > 240 && p[1] > 240 && p[2] > 240).length;
const red = px.filter((p) => p[0] > 120 && p[0] > p[1] * 1.5 && p[0] > p[2] * 1.5).length;
const base = px.slice(0, 10).map((p) => p.join(",")).join(" | ");
console.log(JSON.stringify({ samples: px.length, whiteFrames: white, redFrames: red, baseline: base, peak: px.slice().sort((a, b) => b[0] - a[0])[0].join(",") }, null, 1));
await browser.close();
