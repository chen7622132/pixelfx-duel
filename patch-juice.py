import sys
P = '/sandbox/workspace/pixelfx-duel/src/game.js'
s = open(P, encoding='utf-8').read()
orig = s
def rep(old, new, cnt=1, tag=''):
    global s
    n = s.count(old)
    if n != cnt:
        print('!! FAIL', tag, 'found', n); sys.exit(1)
    s = s.replace(old, new); print('ok', tag)

# ---------- B0. 粒子容器 ----------
rep('let shake = 0, zoom = 0, lb = 0, hitstop = 0;',
'''let shake = 0, zoom = 0, lb = 0, hitstop = 0;
const PT = [];   // 打击粒子：spark / line / dust
function stepPt(dt) {
  for (let i = PT.length - 1; i >= 0; i--) {
    const p = PT[i];
    p.t += dt;
    if (p.t >= p.life) { PT.splice(i, 1); continue; }
    if (p.k === "dust") { p.vy += 70 * dt; p.vx *= 1 - 2.2 * dt; }
    else if (p.k !== "line") { p.vy += 250 * dt; p.vx *= 1 - 1.5 * dt; }
    if (p.k !== "line") { p.x += p.vx * dt; p.y += p.vy * dt; }
  }
  if (PT.length > 220) PT.splice(0, PT.length - 220);
}
function burst(x, y, power, dir) {
  const n = 4 + power * 3;
  for (let i = 0; i < n; i++) {
    const a = rnd(-Math.PI, Math.PI), sp = rnd(50, 140) + power * 45;
    PT.push({ k: "spark", x, y, vx: Math.cos(a) * sp * dir + rnd(-30, 30), vy: Math.sin(a) * sp - 70,
      life: rnd(0.16, 0.4), t: 0, sz: power >= 3 ? 2 : 1,
      c: power >= 3 ? 0xff66e0e0 : 0xffffffff });
  }
  const m = 2 + power * 2;
  for (let i = 0; i < m; i++) {
    PT.push({ k: "line", x, y, a: rnd(-0.85, 0.85) + (dir > 0 ? 0 : Math.PI),
      len: rnd(12, 26) + power * 9, life: rnd(0.07, 0.15), t: 0,
      c: power >= 3 ? 0xff8ce8ff : 0xffa8e8ff });
  }
  if (power >= 3) {
    for (let i = 0; i < 9; i++) {
      PT.push({ k: "dust", x: x + rnd(-18, 18), y: GROUND - rnd(0, 6), vx: rnd(-46, 46), vy: rnd(-34, -6),
        life: rnd(0.4, 0.85), t: 0, sz: 1 + (rnd(0, 2) | 0), c: 0xff6a5a44 });
    }
  }
}''', 1, 'B0 粒子系统')

# ---------- B1. 顿帧分级 + 更强对比 ----------
rep('''    { stop: 0.06, shake: 3, zoom: 0.035, kb: 9, sink: 4 },
    { stop: 0.085, shake: 4, zoom: 0.055, kb: 14, sink: 6 },
    { stop: 0.125, shake: 6, zoom: 0.08, kb: 20, sink: 8 },
    { stop: 0.21, shake: 9, zoom: 0.12, kb: 34, sink: 10 },''',
'''    { stop: 0.045, shake: 2.6, zoom: 0.03, kb: 9, sink: 4 },
    { stop: 0.075, shake: 3.8, zoom: 0.05, kb: 14, sink: 6 },
    { stop: 0.118, shake: 6.6, zoom: 0.088, kb: 20, sink: 8 },
    { stop: 0.19, shake: 10, zoom: 0.135, kb: 34, sink: 10 },''', 1, 'B1 顿帧分级')

# ---------- B2. 音效三层 ----------
rep('''function sfx(power) {
  if (!AC || AC.state !== "running") return;
  const t = AC.currentTime, k = Math.min(3, power - 1);
  const g = AC.createGain(); g.connect(AC.destination);
  const dur = [0.07, 0.11, 0.2, 0.34][k];
  const o = AC.createOscillator();
  o.type = power >= 3 ? "triangle" : "sine";
  o.frequency.setValueAtTime([210, 165, 115, 90][k], t);
  o.frequency.exponentialRampToValueAtTime([65, 55, 40, 28][k], t + dur);
  g.gain.setValueAtTime([0.22, 0.3, 0.42, 0.5][k], t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); o.start(t); o.stop(t + dur + 0.02);
  const n = AC.createBufferSource(); n.buffer = noiseBuf();
  const ng = AC.createGain();
  ng.gain.setValueAtTime([0.1, 0.16, 0.26, 0.34][k], t);
  ng.gain.exponentialRampToValueAtTime(0.0008, t + 0.07);
  n.connect(ng); ng.connect(AC.destination); n.start(t); n.stop(t + 0.1);
}''',
'''function sfx(power) {
  if (!AC || AC.state !== "running") return;
  const t = AC.currentTime, k = Math.min(3, power - 1);
  const jit = 0.93 + Math.random() * 0.14;   // 每次音高微随机，避免机械重复
  // ① 低频 body：撞击的"重量"
  const g = AC.createGain(); g.connect(AC.destination);
  const dur = [0.08, 0.12, 0.21, 0.36][k];
  const o = AC.createOscillator();
  o.type = power >= 3 ? "triangle" : "sine";
  o.frequency.setValueAtTime([210, 165, 115, 90][k] * jit, t);
  o.frequency.exponentialRampToValueAtTime([65, 55, 40, 28][k] * jit, t + dur);
  g.gain.setValueAtTime([0.22, 0.3, 0.42, 0.5][k], t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); o.start(t); o.stop(t + dur + 0.02);
  // ② 高通 crack：刀刃/骨裂的"尖"
  const n = AC.createBufferSource(); n.buffer = noiseBuf();
  const hp = AC.createBiquadFilter(); hp.type = "highpass";
  hp.frequency.value = 1300 + power * 550;
  const ng = AC.createGain();
  ng.gain.setValueAtTime([0.1, 0.17, 0.28, 0.36][k], t);
  ng.gain.exponentialRampToValueAtTime(0.0008, t + 0.06);
  n.connect(hp); hp.connect(ng); ng.connect(AC.destination); n.start(t); n.stop(t + 0.09);
  // ③ 中频金属尾：中重击的余韵
  if (power >= 2) {
    const n2 = AC.createBufferSource(); n2.buffer = noiseBuf();
    const bp = AC.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = (620 + Math.random() * 420) * jit; bp.Q.value = 3.2;
    const g2 = AC.createGain();
    g2.gain.setValueAtTime(0.14, t + 0.005);
    g2.gain.exponentialRampToValueAtTime(0.0008, t + 0.24);
    n2.connect(bp); bp.connect(g2); g2.connect(AC.destination);
    n2.start(t); n2.stop(t + 0.26);
  }
  // ④ sub-bass 冲击：重击让胸口"闷"一下
  if (power >= 3) {
    const sub = AC.createOscillator(), sg = AC.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(58 * jit, t);
    sub.frequency.exponentialRampToValueAtTime(30, t + 0.42);
    sg.gain.setValueAtTime(0.42, t);
    sg.gain.exponentialRampToValueAtTime(0.0008, t + 0.46);
    sub.connect(sg); sg.connect(AC.destination); sub.start(t); sub.stop(t + 0.48);
  }
}''', 1, 'B2 三层音效')

# ---------- B3. 振动/缩放曲线 ----------
rep('if (shake > 0) shake = Math.max(0, shake - dt * 14);',
    'if (shake > 0) shake = Math.max(0, shake - dt * (8.5 + shake * 3.2));', 1, 'B3 shake 衰减')
rep('if (zoom > 0) zoom = Math.max(0, zoom - dt * 0.9);',
    'if (zoom > 0) zoom = Math.max(0, zoom * Math.pow(0.0022, dt) - 0.0004);', 1, 'B3 zoom 回弹')
rep('''  const sx = shake > 0 ? Math.round(rnd(-shake, shake)) : 0;
  const sy = shake > 0 ? Math.round(rnd(-shake, shake)) : 0;''',
'''  const amp = shake > 0 ? shake * 0.55 + shake * shake * 0.055 : 0;
  const sx = amp > 0 ? Math.round(rnd(-amp, amp)) : 0;
  const sy = amp > 0 ? Math.round(rnd(-amp, amp) * 0.72) : 0;''', 1, 'B3 shake 曲线')

# ---------- B4. 顿帧期间粒子慢放（世界停但碎片还在飞） ----------
rep('if (hitstop > 0) { hitstop -= dt; return; }',
    'if (hitstop > 0) { hitstop -= dt; stepPt(dt * 0.22); return; }', 1, 'B4 顿帧粒子慢放')

# ---------- B5. 粒子更新挂进主循环 ----------
rep('''  if (followT > 0) { followT -= dEff; if (followT <= 0 && S.phase === "player") doFollow(); }''',
'''  stepPt(dEff);''', 1, 'B5 粒子更新') if 'if (followT > 0) { followT -= dEff;' in s else print('skip B5 (no followT line)')

# ---------- B6. 刚体命中时喷碎片 ----------
rep('''  addRing(foe.F.x, GROUND + foe.def.lift + foe.F.y - 34, power);''',
'''  addRing(foe.F.x, GROUND + foe.def.lift + foe.F.y - 34, power);
  burst(foe.F.x - 12, GROUND + foe.def.lift + foe.F.y - 36, power, 1);''', 1, 'B6 命中碎片')

# 玩家挨打也喷
rep('''  addFx(heavy ? iCrit : iBlunt, { x: pPos + 16, y: GROUND - 24, seed: ri(1, 900) });
  if (heavy) addFx(iFrame, { x: pPos, y: GROUND - 34, seed: ri(1, 900) });''',
'''  addFx(heavy ? iCrit : iBlunt, { x: pPos + 16, y: GROUND - 24, seed: ri(1, 900) });
  if (heavy) addFx(iFrame, { x: pPos, y: GROUND - 34, seed: ri(1, 900) });
  burst(pPos + 20, GROUND - 44, heavy ? 3 : 2, -1);''', 1, 'B6 玩家挨打碎片')

# ---------- B7. 绘制粒子（最上层，压在所有特效之上） ----------
rep('''  for (const fl of floats) fl.draw(frame, "front");
  if (transFx) transFx.draw(frame, "front");''',
'''  for (const fl of floats) fl.draw(frame, "front");
  if (transFx) transFx.draw(frame, "front");

  if (PT.length) {
    const pt = painterFor(frame); pt.place(0, 0);
    for (const p of PT) {
      const k = p.t / p.life, a = Math.max(0, 1 - k * k);
      if (p.k === "line") {
        for (let q = 1; q <= 4; q++) {
          const d = p.len * (q / 4) * (1 - k * 0.45);
          pt.rect(Math.round(p.x + Math.cos(p.a) * d), Math.round(p.y + Math.sin(p.a) * d), 1, 1, p.c, a * 0.9);
        }
      } else {
        pt.rect(Math.round(p.x), Math.round(p.y), p.sz, p.sz, p.c, a);
      }
    }
  }''', 1, 'B7 粒子绘制')

open(P, 'w', encoding='utf-8').write(s)
print('--- changed bytes:', len(s) - len(orig))
