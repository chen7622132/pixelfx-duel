import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto('file:///sandbox/workspace/pixelfx-duel/pixelfx-duel-standalone.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1800);
const D = () => page.evaluate(() => window.__game.dbg());

let got = 0;
for (let attempt = 0; attempt < 6 && got < 2; attempt++) {
  for (let w = 0; w < 80; w++) { const d = await D(); if (d.phase === 'plan') break; await page.waitForTimeout(100) }
  await page.evaluate(() => {
    const mv = [...document.querySelectorAll('.mv')].filter(b => !b.classList.contains('fin'));
    [2, 0, 1, 3].forEach(i => mv[i] && mv[i].click());
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => document.getElementById('execBtn').click());
  for (let i = 0; i < 120; i++) {
    const d = await D();
    if (d.cracks >= 1) {
      await page.screenshot({ path: 'shots/crack_' + got + '.png' });
      console.log('crack shot', got, 'cracks=', d.cracks, 'pY=', d.pY, 'foeY=', (d.foes.find(f => f.alive) || {}).y);
      got++;
      break;
    }
    if (d.phase === 'plan') break;
    await page.waitForTimeout(25);
  }
}
console.log('shots:', got, 'errors:', errs.length);
await browser.close();
