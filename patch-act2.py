import sys
P = '/sandbox/workspace/pixelfx-duel/src/game.js'
s = open(P, encoding='utf-8').read()
def rep(o, n, t):
    global s
    if s.count(o) != 1:
        print('!! FAIL', t, s.count(o)); sys.exit(1)
    s = s.replace(o, n); print('ok', t)

# ---- 动作曲线函数 + 镜头焦点变量 ----
rep('''function burst(x, y, power, dir) {''',
'''// 火柴人式动作曲线：慢预备(后压) → 极快出击 → 命中 → 收势回摆
function lungeCurve(t, hit) {
  const pre = hit * 0.55;
  if (t < pre) {
    const k = t / pre;
    return -15 * (1 - Math.pow(1 - k, 2));
  }
  if (t < hit) {
    const k = (t - pre) / Math.max(0.001, hit - pre);
    return -15 + 43 * (1 - Math.pow(1 - k, 4));
  }
  const k = Math.min(1, (t - hit) / 0.32);
  return 28 * (1 - k * k);
}
const camFocus = { x: 160, y: 96 };

function burst(x, y, power, dir) {''', '动作曲线函数')

# ---- 玩家动作位移 + 预备蓄力特效 + 出击残影 ----
rep('''  const lean = S.phase === "exec" && curA && curA.side === "me" ? Math.sin(Math.min(1, S.exec.t / 0.8) * Math.PI) * 7 : 0;
  if (atkFx) atkFx.options.x = pPos;
  const pT = (S.dashTo ?? PX);
  const dashing = S.phase === "exec" && Math.abs(pT - pPos) > 5;''',
'''  const isMe = S.phase === "exec" && curA && curA.side === "me";
  const myT = isMe ? S.exec.t : 0;
  const myHit = isMe ? (curA.hitAt || 0.3) : 0.3;
  const lungeP = isMe ? lungeCurve(myT, myHit) : 0;
  // 预备后倾 → 命中前扑
  const lean = isMe
    ? (myT < myHit
        ? -3 * Math.sin(Math.min(1, myT / (myHit * 0.55)) * Math.PI / 2)
        : Math.sin(Math.min(1, (myT - myHit) / 0.3) * Math.PI) * 10)
    : 0;
  // 预备阶段：力量向内收拢的蓄力环
  if (isMe && myT > 0.02 && myT < myHit) {
    const k = myT / myHit;
    const sp = painterFor(frame); sp.place(0, 0);
    const r = 17 - 11 * k;
    sp.ring(pPos + 20, GROUND - 34, r, 1, hex("#ffd18a"), 0.35 + k * 0.5);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + k * 3.2;
      sp.rect(Math.round(pPos + 20 + Math.cos(a) * (r + 7)), Math.round(GROUND - 34 + Math.sin(a) * (r + 7)),
        1, 1, hex("#ffe9b0"), 0.85);
    }
  }
  if (atkFx) atkFx.options.x = pPos;
  const pT = (S.dashTo ?? PX);
  const dashing = S.phase === "exec" && ((isMe && lungeP > 10) || Math.abs(pT - pPos) > 5);''', '玩家动作曲线')

rep('''  p.place(pPos + lean + pKb + (playerHit > 0 ? rnd(-1.5, 1.5) : 0), GROUND + pY);''',
'''  p.place(pPos + lungeP + lean + pKb + (playerHit > 0 ? rnd(-1.5, 1.5) : 0), GROUND + pY);''', '玩家位置叠加冲势')

# ---- 镜头对焦：放大时对准打架位置 ----
rep('''  const dw = Math.round(W * SCALE * (1 + zoom));
  const dh = Math.round(H * SCALE * (1 + zoom));
  ctx.drawImage(off, sx * SCALE - (dw - W * SCALE) / 2, sy * SCALE - (dh - H * SCALE) / 2, dw, dh);''',
'''  const dw = Math.round(W * SCALE * (1 + zoom));
  const dh = Math.round(H * SCALE * (1 + zoom));
  const kx = dw / (W * SCALE) - 1, ky = dh / (H * SCALE) - 1;
  ctx.drawImage(off, sx * SCALE - camFocus.x * SCALE * kx,
    sy * SCALE - camFocus.y * SCALE * ky, dw, dh);''', '镜头焦点')

# ---- step 里更新镜头焦点 ----
rep('''  if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }''',
'''  if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
  {
    const cf = tgt();
    const tx = Math.max(80, Math.min(240, (pPos + (cf ? cf.F.x : PX + 90)) / 2));
    const ty = Math.max(52, Math.min(138, GROUND - 46 + (cf ? cf.F.y * 0.3 : 0)));
    camFocus.x += (tx - camFocus.x) * (1 - Math.exp(-dt * 5.5));
    camFocus.y += (ty - camFocus.y) * (1 - Math.exp(-dt * 5.5));
  }''', '镜头焦点更新')

open(P, 'w', encoding='utf-8').write(s)
print('--- part2 done')
