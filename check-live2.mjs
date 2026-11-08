import { chromium } from 'playwright';

const URL = process.argv[2] || 'https://chen7622132.github.io/pixelfx-duel/';
const errs = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
page.on('pageerror', e => errs.push('[pageerror] ' + e.message));
page.on('requestfailed', r => errs.push('[reqfail] ' + r.url() + ' ' + (r.failure()?.errorText || '')));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(2500);

console.log('=== errors(' + errs.length + ') ===');
errs.slice(0, 20).forEach(e => console.log(e));

const info = await page.evaluate(() => {
  const cv = document.querySelector('canvas');
  const s = window.__S || null;
  return {
    title: document.title,
    canvas: cv ? cv.width + 'x' + cv.height + ' css:' + cv.clientWidth + 'x' + cv.clientHeight : 'NO CANVAS',
    overlayHidden: (() => { const o = document.getElementById('overlay'); return o ? getComputedStyle(o).display + '/' + o.className : 'no overlay'; })(),
    slots: document.getElementById('slots')?.children.length ?? 'no slots',
    execBtn: document.getElementById('execBtn')?.textContent?.trim() ?? 'no btn',
    startBtn: document.querySelector('[data-act="start"],#startBtn') ? 'yes' : 'no',
    dbg: typeof window.dbg === 'function' ? window.dbg() : null,
  };
});
console.log('=== state ===');
console.log(JSON.stringify(info, null, 1));

await page.screenshot({ path: 'shots/live2_boot.png' });
await browser.close();
