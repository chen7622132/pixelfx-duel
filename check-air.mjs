import { chromium } from 'playwright';

const URL = process.argv[2] || 'file:///sandbox/workspace/pixelfx-duel/pixelfx-duel-standalone.html';
const errs = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
page.on('pageerror', e => errs.push('[pageerror] ' + e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(1800);
const D = () => page.evaluate(() => window.__game.dbg());

let minPY = 0, maxCrack = 0, airHits = 0, slowFrames = 0, foeAirMax = 0, n = 0;
for (let round = 0; round < 3; round++) {
  // 排 碎地锤(击飞) + 疾斩 + 突刺 + 回旋斩
  await page.evaluate(() => {
    const mv = [...document.querySelectorAll('.mv')].filter(b => !b.classList.contains('fin'));
    [2, 0, 1, 3].forEach(i => mv[i] && mv[i].click());
  });
  await page.waitForTimeout(180);
  await page.evaluate(() => document.getElementById('execBtn').click());
  for (let i = 0; i < 130; i++) {
    const d = await D();
    minPY = Math.min(minPY, d.pY);
    maxCrack = Math.max(maxCrack, d.cracks);
    const f = d.foes.find(x => x.alive);
    if (f) foeAirMax = Math.max(foeAirMax, -f.y);
    if (d.pY < -20) airHits++;
    if (d.hitstop > 0) slowFrames++;
    n++;
    if (d.phase === 'plan' && i > 8) break;
    if (d.phase === 'over') break;
    await page.waitForTimeout(30);
  }
  const st = await D();
  if (st.phase === 'over') break;
  // 抓一张空中/落地帧
  if (round === 0) await page.screenshot({ path: 'shots/air_1.png' });
}

const dfin = await D();
console.log('玩家最高跳起 =', minPY.toFixed(1), 'px');
console.log('敌人最高被击飞 =', foeAirMax.toFixed(1), 'px');
console.log('裂缝峰值 =', maxCrack, ' 空中帧数 =', airHits, '/', n);
console.log('顿帧采样 =', slowFrames, ' phase =', dfin.phase, ' hp =', dfin.hp);

// 抓落地瞬间（裂缝最多的帧）
for (let r = 0; r < 2; r++) {
  await page.evaluate(() => {
    const mv = [...document.querySelectorAll('.mv')].filter(b => !b.classList.contains('fin'));
    [2, 1, 0, 3].forEach(i => mv[i] && mv[i].click());
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => document.getElementById('execBtn').click());
  for (let i = 0; i < 90; i++) {
    const d = await D();
    if (d.cracks >= 1) { await page.screenshot({ path: 'shots/air_crack_' + r + '.png' }); break }
    if (d.phase === 'plan') break;
    await page.waitForTimeout(30);
  }
  // 等回 plan
  for (let i = 0; i < 60; i++) { const d = await D(); if (d.phase === 'plan') break; await page.waitForTimeout(80) }
}
console.log('=== errors(' + errs.length + ') ===');
errs.slice(0, 8).forEach(e => console.log(e));
await browser.close();
