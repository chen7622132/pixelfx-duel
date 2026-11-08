import sys
P = '/sandbox/workspace/pixelfx-duel/src/game.js'
s = open(P, encoding='utf-8').read()
def rep(o, n, t):
    global s
    if s.count(o) != 1:
        print('!! FAIL', t, s.count(o)); sys.exit(1)
    s = s.replace(o, n); print('ok', t)

# ---------- 1. 地面裂缝系统 ----------
rep('''const camFocus = { x: 160, y: 96 };''',
'''const camFocus = { x: 160, y: 96 };
const CR = [];   // 落地裂缝
function crack(x, power) {
  const arms = [];
  const n = 2 + Math.min(3, power);
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? 1 : -1;
    const pts = [];
    const len = (10 + power * 8) * rnd(0.7, 1.2);
    for (let s2 = 1; s2 <= 3; s2++) {
      pts.push([dir * len * (s2 / 3), rnd(-2.5, 2.5) + (s2 === 3 ? rnd(-3, 1) : 0)]);
    }
    arms.push(pts);
  }
  CR.push({ x, y: GROUND + 1, t: 0, life: 0.45 + power * 0.13, arms,
    c: power >= 3 ? "#ffcf8a" : "#6b5c4a" });
  if (CR.length > 20) CR.shift();
}
// 落地：裂缝 + 尘 + 轻震
function landFX(x, power) {
  crack(x, power);
  for (let i = 0; i < 5 + power; i++) {
    PT.push({ k: "dust", x: x + rnd(-14, 14), y: GROUND - rnd(0, 4), vx: rnd(-38, 38),
      vy: rnd(-26, -5), life: rnd(0.35, 0.7), t: 0, sz: 1 + (rnd(0, 2) | 0), c: 0xff6a5a44 });
  }
  shake = Math.max(shake, 1.8 + power * 0.7);
}''', '裂缝系统')

# ---------- 2. 敌人重落地砸裂缝 ----------
rep('''function thud(f) {
  floorHits++;
  shake = Math.max(shake, 2.4);
  addRing(f.F.x, GROUND - 6 + f.def.lift, 2);
  sfx(2);
}''',
'''function thud(f, hard) {
  floorHits++;
  shake = Math.max(shake, hard ? 4.6 : 2.4);
  if (hard) zoom = Math.max(zoom, 0.045);
  addRing(f.F.x, GROUND - 6 + f.def.lift, hard ? 3 : 2);
  if (hard) { crack(f.F.x, 3); burst(f.F.x, GROUND - 10, 2, f.F.vx >= 0 ? 1 : -1); }
  sfx(hard ? 3 : 2);
}''', 'thud 硬着陆')
rep('''    if (F.vy > 240) { F.vy = -F.vy * 0.4; F.vx *= 0.7; thud(f); }''',
'''    if (F.vy > 240) { const hard = F.vy > 400; F.vy = -F.vy * 0.4; F.vx *= 0.7; thud(f, hard); }''', '落地速度判据')

# ---------- 3. 玩家跳起来追打 ----------
rep('''  const fr = tgt();
  const pYTarget = (S.phase === "exec") && fr ? Math.max(-52, Math.min(0, fr.F.y)) : 0;
  pY += (pYTarget - pY) * (1 - Math.exp(-dt * 11));''',
'''  const fr = tgt();
  // 目标被打飞起来时，玩家跳起来追打（高度跟着敌人走，还多冲一点）
  const airFoe = !!(fr && (fr.F.y < -10 || fr.F.air));
  const pYTarget = (S.phase === "exec") && fr
    ? Math.max(-74, Math.min(0, fr.F.y * (airFoe ? 1.18 : 1))) : 0;
  pY += (pYTarget - pY) * (1 - Math.exp(-dt * (airFoe ? 17 : 11)));
  if (pY < -26) S.airHigh = true;
  else if (S.airHigh && pY > -4) { S.airHigh = false; landFX(pPos, airFoe ? 3 : 2); }''', '玩家跳跃追打')

# ---------- 4. 空中命中：慢镜 + 上升速度线 ----------
rep('''  if (f.guard) { dmg = Math.round(dmg * 0.6); f.guard = false; guarded = true; }''',
'''  if (f.guard) { dmg = Math.round(dmg * 0.6); f.guard = false; guarded = true; }
  // 空中追击：目标在空中命中时给一段慢镜 + 向上炸开的速度线
  const airborne = f.F.y < -12;
  if (airborne) {
    S.slow = Math.max(S.slow, 0.2);
    for (let i = 0; i < 7; i++) {
      PT.push({ k: "line", x: f.F.x + rnd(-10, 10), y: GROUND + f.def.lift + f.F.y - 20,
        a: -Math.PI / 2 + rnd(-0.75, 0.75), len: rnd(16, 34), life: rnd(0.1, 0.2), t: 0,
        c: 0xffc8f0ff });
    }
  }''', '空中命中特效')

# ---------- 5. 裂缝更新 + 绘制 ----------
rep('''  stepPt(dEff);''',
'''  stepPt(dEff);
  for (let i = CR.length - 1; i >= 0; i--) { CR[i].t += dEff; if (CR[i].t >= CR[i].life) CR.splice(i, 1); }''', '裂缝更新')

rep('''  if (PT.length) {
    const pt = painterFor(frame); pt.place(0, 0);''',
'''  if (CR.length) {
    const kp = painterFor(frame); kp.place(0, 0);
    for (const k of CR) {
      const a2 = Math.max(0, 1 - (k.t / k.life) * (k.t / k.life));
      for (const arm of k.arms) {
        let lx = Math.round(k.x), ly = Math.round(k.y);
        for (const seg of arm) {
          const nx = Math.round(k.x + seg[0]), ny = Math.round(k.y + seg[1]);
          kp.line(lx, ly, nx, ny, hex(k.c), a2);
          lx = nx; ly = ny;
        }
      }
    }
  }
  if (PT.length) {
    const pt = painterFor(frame); pt.place(0, 0);''', '裂缝绘制')

# ---------- 6. 玩家跳起时地面阴影 ----------
rep('''  const p = painterFor(frame);
  p.place(pPos + lungeP + lean + pKb + (playerHit > 0 ? rnd(-1.5, 1.5) : 0), GROUND + pY);''',
'''  const shp = painterFor(frame); shp.place(0, 0);
  if (pY < -6) {
    const sk = Math.min(1, -pY / 60);
    shp.rect(Math.round(pPos + lungeP - 7 + sk * 3), GROUND + 1, Math.round(14 - sk * 6), 1, hex("#000000"), 0.45);
  }
  const p = painterFor(frame);
  p.place(pPos + lungeP + lean + pKb + (playerHit > 0 ? rnd(-1.5, 1.5) : 0), GROUND + pY);''', '跳跃阴影')

# ---------- 7. dbg 暴露 ----------
rep('''    acts: S.exec ? S.exec.list.map((a) => a.side[0] + (a.foes ? a.foes.length : 1)) : [],''',
'''    acts: S.exec ? S.exec.list.map((a) => a.side[0] + (a.foes ? a.foes.length : 1)) : [],
    pY: +pY.toFixed(1), cracks: CR.length,''', 'dbg 扩展')

open(P, 'w', encoding='utf-8').write(s)
print('--- air combo done')
