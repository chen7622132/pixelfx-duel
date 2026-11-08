import { chromium } from 'playwright';

const FILE = 'file:///sandbox/workspace/pixelfx-duel/pixelfx-duel-standalone.html';
const errs = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
page.on('pageerror', e => errs.push('[pageerror] ' + e.message));
page.on('requestfailed', r => errs.push('[reqfail] ' + r.url()));

await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2000);

const boot = await page.evaluate(() => ({
  canvas: !!document.querySelector('canvas#screen'),
  slots: document.getElementById('slots')?.children.length,
  mv: document.querySelectorAll('.mv').length,
  hint: document.getElementById('hint')?.textContent?.trim(),
}));
console.log('BOOT', JSON.stringify(boot));

// 填两个槽（连携：突刺->碎地锤）
await page.evaluate(() => document.querySelectorAll('.mv')[1].click());
await page.waitForTimeout(150);
await page.evaluate(() => document.querySelectorAll('.mv')[2].click());
await page.waitForTimeout(250);
const filled = await page.evaluate(() => ({
  slotTxt: [...document.querySelectorAll('.slot')].map(s => s.textContent.trim().slice(0, 6)),
  chain: document.querySelectorAll('.slot.chain').length,
  execDisabled: document.getElementById('execBtn').disabled,
}));
console.log('FILLED', JSON.stringify(filled));
await page.screenshot({ path: 'shots/sa_filled.png' });

// 执行
await page.evaluate(() => document.getElementById('execBtn').click());
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/sa_exec.png' });

// 等回 plan
let ok = false, st = null;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(300);
  st = await page.evaluate(() => ({
    hint: document.getElementById('hint')?.textContent?.trim(),
    slots: [...document.querySelectorAll('.slot')].map(s => s.textContent.trim().slice(0, 4)),
    foebars: document.getElementById('foeBars')?.textContent?.replace(/\s+/g, ' ').trim(),
  }));
  if (st.hint && st.hint.includes('编排')) { ok = true; break; }
}
console.log('AFTER ROUND', ok ? 'BACK TO PLAN' : 'TIMEOUT', JSON.stringify(st));
await page.screenshot({ path: 'shots/sa_done.png' });

console.log('=== errors(' + errs.length + ') ===');
errs.slice(0, 10).forEach(e => console.log(e));
await browser.close();
