import { chromium } from 'playwright';

const FILE = 'file:///sandbox/workspace/pixelfx-duel/pixelfx-duel-standalone.html';
const errs = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
page.on('pageerror', e => errs.push('[pageerror] ' + e.message));

await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1800);

const read = () => page.evaluate(() => {
  const t = id => { const e = document.getElementById(id); return e ? !e.classList.contains('hide') : false };
  const hint = document.getElementById('hint')?.textContent?.trim() || '';
  const m = hint.match(/R(\d+)/);
  return {
    r: m ? +m[1] : 0, hint,
    route: t('route'), up: t('upgrade'), over: t('overlay'),
    ov: document.getElementById('ovTitle')?.textContent?.trim() + ' / ' + document.getElementById('ovText')?.textContent?.trim().slice(0, 50),
    prog: document.getElementById('progress')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 50),
    foes: document.getElementById('foeBars')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 40),
  };
});

const log = [];
for (let step = 0; step < 120; step++) {
  const s = await read();
  if (s.over) { log.push('OVERLAY: ' + s.ov); break }
  if (s.route) {
    await page.evaluate(() => document.querySelector('#routeList button')?.click());
    await page.waitForTimeout(1600); continue;
  }
  if (s.up) {
    await page.evaluate(() => { const b = document.querySelector('#upList button'); b && b.click(); });
    await page.waitForTimeout(1600); continue;
  }
  if (s.hint.includes('编排')) {
    await page.evaluate((FILL) => {
      const mv = [...document.querySelectorAll('.mv')].filter(b => !b.classList.contains('fin') && !b.disabled);
      [2, 0, 1, 3].slice(0, FILL).forEach(i => { if (mv[i]) mv[i].click(); });
    }, +(process.env.FILL || 4));
    await page.waitForTimeout(150);
    const can = await page.evaluate(() => { const b = document.getElementById('execBtn'); return b && !b.disabled });
    if (!can) { await page.waitForTimeout(500); continue }
    await page.evaluate(() => document.getElementById('execBtn').click());
    let back = false;
    for (let w = 0; w < 80; w++) {
      await page.waitForTimeout(250);
      const n = await read();
      if (n.over || n.route || n.up) { back = true; break }
      if (n.hint.includes('编排') && n.r > s.r) { back = true; break }
    }
    log.push(`R${s.r} "${s.prog}" foes[${s.foes}] -> ${back ? 'OK' : 'STUCK'}`);
    continue;
  }
  await page.waitForTimeout(300);
}
const fin = await read();
console.log('LOG tail:');
log.slice(-10).forEach(l => console.log('  ' + l));
console.log('rounds executed:', log.filter(l => l.startsWith('R')).length);
console.log('FINAL', JSON.stringify(fin));
console.log('=== errors(' + errs.length + ') ===');
errs.slice(0, 8).forEach(e => console.log(e));
await page.screenshot({ path: 'shots/sa_full3.png' });
await browser.close();
