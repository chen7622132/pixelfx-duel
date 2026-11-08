import { chromium } from 'playwright';

const URL = process.argv[2] || 'https://chen7622132.github.io/pixelfx-duel/';
const errs = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
page.on('pageerror', e => errs.push('[pageerror] ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(1800);

// 列出可见按钮
const btns = await page.evaluate(() => [...document.querySelectorAll('button,[data-act]')]
  .filter(b => b.offsetParent !== null)
  .map(b => ({ id: b.id, cls: b.className, txt: b.textContent.trim().slice(0, 14), act: b.dataset.act || '' })));
console.log('=== visible btns ===');
console.log(JSON.stringify(btns));

// 点第一个可见按钮（开始游戏）
const started = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button,[data-act]')].filter(x => x.offsetParent !== null)[0];
  if (!b) return 'no clickable';
  b.click();
  return 'clicked: ' + (b.textContent.trim() || b.id);
});
console.log('=== start ===', started);
await page.waitForTimeout(1200);

const st = await page.evaluate(() => {
  const o = document.getElementById('overlay');
  return {
    overlay: o ? getComputedStyle(o).display : 'none-el',
    slots: document.getElementById('slots')?.children.length,
    mvBtns: document.querySelectorAll('.mv').length,
    execDisabled: document.getElementById('execBtn')?.disabled,
    hint: document.querySelector('.hint,#hint')?.textContent?.trim().slice(0, 40),
  };
});
console.log('=== after click ===', JSON.stringify(st));
console.log('=== errors(' + errs.length + ') ===');
errs.slice(0, 12).forEach(e => console.log(e));

await page.screenshot({ path: 'shots/live2_after_start.png' });
await browser.close();
