import { chromium } from 'playwright';

const FILE = process.argv[2] || 'file:///sandbox/workspace/pixelfx-duel/pixelfx-duel-standalone.html';
const errs = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
page.on('pageerror', e => errs.push('[pageerror] ' + e.message));

await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(1600);

const D = () => page.evaluate(() => window.__game.dbg());

// 排 3 招（含重击碎地锤），留 1 格挡
await page.evaluate(() => {
  const mv = [...document.querySelectorAll('.mv')].filter(b => !b.classList.contains('fin'));
  [2, 0, 1].forEach(i => mv[i] && mv[i].click());
});
await page.waitForTimeout(200);
const pre = await D();
console.log('PRE  stance=', pre.stance, 'slots=', pre.slots.length, 'hp=', pre.hp);

await page.evaluate(() => document.getElementById('execBtn').click());

// 高频采样：粒子峰值 / 顿帧峰值 / 震屏峰值 / 镜头峰值
let ptMax = 0, stopMax = 0, shakeMax = 0, zoomMax = 0, zeroFrames = 0, samples = 0;
for (let i = 0; i < 220; i++) {
  const d = await D();
  ptMax = Math.max(ptMax, d.pt);
  stopMax = Math.max(stopMax, d.hitstop);
  shakeMax = Math.max(shakeMax, d.shake);
  zoomMax = Math.max(zoomMax, d.zoom);
  samples++;
  if (d.pt === 0) zeroFrames++;
  if (d.phase === 'plan' && i > 20) break;
  await page.waitForTimeout(45);
}
console.log('PEAK  pt=', ptMax, 'hitstop(s)=', stopMax.toFixed(3), 'shake=', shakeMax.toFixed(1), 'zoom=', zoomMax.toFixed(3));
console.log('samples=', samples, 'noParticleFrames=', zeroFrames);

const post = await D();
console.log('POST  phase=', post.phase, 'round=', post.round, 'hp=', post.hp, 'foeHp=', post.foes.map(f => f.hp).join('/'));

// 抓两张带粒子的图
await page.evaluate(() => {
  const mv = [...document.querySelectorAll('.mv')].filter(b => !b.classList.contains('fin'));
  [2, 1, 0].forEach(i => mv[i] && mv[i].click());
});
await page.waitForTimeout(150);
await page.evaluate(() => document.getElementById('execBtn').click());
for (let i = 0; i < 60; i++) {
  const d = await D();
  if (d.pt > 4) {
    for (const tag of ['a','b','c','d']) {
      await page.screenshot({ path: 'shots/juice_' + tag + '.png' });
      await page.waitForTimeout(35);
    }
    break;
  }
  await page.waitForTimeout(35);
}
console.log('=== errors(' + errs.length + ') ===');
errs.slice(0, 8).forEach(e => console.log(e));
await browser.close();
