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

await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1800);

const seen = new Set();
let last = '';
for (let round = 0; round < 70; round++) {
  const s = await page.evaluate(() => ({
    hint: document.getElementById('hint')?.textContent?.trim() || '',
    route: !document.getElementById('route').classList.contains('hide'),
    up: !document.getElementById('upgrade').classList.contains('hide'),
    over: !document.getElementById('overlay').classList.contains('hide'),
    ovText: document.getElementById('ovText')?.textContent?.trim().slice(0, 60),
    ovTitle: document.getElementById('ovTitle')?.textContent?.trim(),
    prog: document.getElementById('progress')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 40),
  }));
  if (s.over) {
    console.log('GAME OVER @round', round, '|', s.ovTitle, '|', s.ovText);
    break;
  }
  if (s.route) {
    const n = await page.evaluate(() => { const b = document.querySelector('#routeList button'); if (b) { b.click(); return true } return false });
    if (n) { seen.add('route'); await page.waitForTimeout(1200); continue }
  }
  if (s.up) {
    const n = await page.evaluate(() => { const b = document.querySelector('#upList button, #upList .up'); if (b) { b.click(); return true } return false });
    if (n) { seen.add('upgrade'); await page.waitForTimeout(1200); continue }
  }
  if (s.hint.includes('编排')) {
    // 填满 4 槽（3+3+2+1 的固定组合，测连携）
    await page.evaluate(() => {
      const mv = [...document.querySelectorAll('.mv')].filter(b => !b.classList.contains('fin'));
      [2, 2, 0, 1].forEach(i => { const b = mv[i]; if (b && !b.disabled) b.click(); });
    });
    await page.waitForTimeout(120);
    const can = await page.evaluate(() => !document.getElementById('execBtn').disabled);
    if (can) {
      await page.evaluate(() => document.getElementById('execBtn').click());
      seen.add('exec');
    }
  }
  await page.waitForTimeout(700);
  last = s.hint;
}
const final = await page.evaluate(() => ({
  prog: document.getElementById('progress')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 60),
  foebars: document.getElementById('foeBars')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 40),
  over: !document.getElementById('overlay').classList.contains('hide'),
  ovTitle: document.getElementById('ovTitle')?.textContent?.trim(),
}));
console.log('STAGES SEEN', [...seen].join(','));
console.log('FINAL', JSON.stringify(final));
console.log('=== errors(' + errs.length + ') ===');
errs.slice(0, 8).forEach(e => console.log(e));
await page.screenshot({ path: 'shots/sa_full.png', fullPage: true });
await browser.close();
