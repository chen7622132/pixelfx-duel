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
    ov: document.getElementById('ovTitle')?.textContent?.trim() + ' / ' + document.getElementById('ovText')?.textContent?.trim().slice(0, 40),
    prog: document.getElementById('progress')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 50),
    foes: document.getElementById('foeBars')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 40),
    disabled: (() => { const b = document.getElementById('execBtn'); return b ? b.disabled : null })(),
  };
});

const log = [];
let stage = maxStage(read());
for (let step = 0; step < 140; step++) {
  const s = await read();
  if (s.over) { log.push('OVERLAY: ' + s.ov); break }
  if (s.route) {
    await page.evaluate(() => document.querySelector('#routeList button')?.click());
    await page.waitForTimeout(1500); continue;
  }
  if (s.up) {
    await page.evaluate(() => document.querySelector('#upList button, #upList .up, #upList *[class*=up]')?.click());
    await page.waitForTimeout(1500); continue;
  }
  if (s.disabled === false) {
    await page.evaluate(() => {
      const mv = [...document.querySelectorAll('.mv')].filter(b => !b.classList.contains('fin') && !b.disabled);
      [2, 2, 0, 1].forEach(i => { if (mv[i]) mv[i].click(); });
    });
    await page.waitForTimeout(120);
    await page.evaluate(() => document.getElementById('execBtn').click());
    // 等回合号变化或非编排态
    for (let w = 0; w < 60; w++) {
      await page.waitForTimeout(250);
      const n = await read();
      if (n.over || n.route || n.up || n.disabled === false || (n.r !== s.r && n.r > 0 && n.hint.includes('编排'))) break;
    }
    log.push(`R${s.r} -> prog[${s.prog}] foes[${s.foes}]`);
    continue;
  }
  await page.waitForTimeout(400);
}
const fin = await read();
console.log('LAST 8 LOG:');
log.slice(-8).forEach(l => console.log('  ' + l));
console.log('FINAL', JSON.stringify(fin));
console.log('=== errors(' + errs.length + ') ===');
errs.slice(0, 8).forEach(e => console.log(e));
await page.screenshot({ path: 'shots/sa_full2.png' });
await browser.close();

function maxStage() { return 0 }
