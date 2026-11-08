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

// 排 4 招，留 0 格（看最激烈的动作块）
await page.evaluate(() => {
  const mv = [...document.querySelectorAll('.mv')].filter(b => !b.classList.contains('fin'));
  [2, 0, 1, 3].forEach(i => mv[i] && mv[i].click());
});
await page.waitForTimeout(200);
await page.evaluate(() => document.getElementById('execBtn').click());

const acts = (await D()).acts;
console.log('动作序列:', JSON.stringify(acts));

let px = [], cam = [], stops = 0, n = 0;
for (let i = 0; i < 200; i++) {
  const d = await D();
  px.push(d.px); cam.push(d.cam[0]);
  if (d.hitstop > 0) stops++;
  n++;
  if (d.phase === 'plan' && i > 10) break;
  await page.waitForTimeout(35);
}
const rng = a => { const mn = Math.min(...a), mx = Math.max(...a); return [Math.round(mn), Math.round(mx), Math.round(mx - mn)] };
console.log('玩家 x  [min,max,跨度] =', rng(px));
console.log('镜头x   [min,max,跨度] =', rng(cam));
console.log('顿帧命中采样帧数 =', stops, '/', n, ' 采样数', n);

// 再抓 3 张连续动作帧
await page.evaluate(() => {
  const mv = [...document.querySelectorAll('.mv')].filter(b => !b.classList.contains('fin'));
  [2, 1, 0].forEach(i => mv[i] && mv[i].click());
});
await page.waitForTimeout(150);
await page.evaluate(() => document.getElementById('execBtn').click());
for (const tag of ['a', 'b', 'c']) { await page.waitForTimeout(320); await page.screenshot({ path: 'shots/act_' + tag + '.png' }); }

console.log('=== errors(' + errs.length + ') ===');
errs.slice(0, 8).forEach(e => console.log(e));
await browser.close();
