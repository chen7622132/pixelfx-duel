p = 'src/game.js'
s = open(p).read()
done = []


def rep(a, b, t):
    global s
    if a not in s:
        print("MISS:", t)
        return
    s = s.replace(a, b, 1)
    done.append(t)


# 1) 物理体 + 常量
rep("let pPos = PX, ePos = EX;",
    """let pPos = PX, ePos = EX;
// —— 物理（火柴人式动量：被打飞 / 撞墙反弹 / 落地弹跳） ——
const GRAV = 1250;
const F = { x: EX, y: 0, vx: 0, vy: 0, air: false };
let pY = 0;          // 玩家离地高度（追击时跳起来）
let wallHits = 0, floorHits = 0;   // 自检用""", 'physics vars')

# 2) 物理循环 + 撞击事件
rep("const rnd = (a, b) => a + Math.random() * (b - a);",
    """function physics(dt) {
  if (["cineIn", "cine", "cineOut"].includes(S.phase)) return;
  // 静止时慢慢走回原位（像打完一套走回来）
  if (!F.air && F.vx === 0 && F.vy === 0) {
    if (Math.abs(F.x - EX) > 0.5) F.x += (EX - F.x) * (1 - Math.exp(-dt * 2.0));
    return;
  }
  F.vy += GRAV * dt;
  F.y += F.vy * dt;
  F.x += F.vx * dt;
  // 撞墙反弹
  if (F.x < 64) { F.x = 64; if (F.vx < 0) { F.vx = -F.vx * 0.55; smash("left"); } }
  if (F.x > 266) { F.x = 266; if (F.vx > 0) { F.vx = -F.vx * 0.55; smash("right"); } }
  // 落地弹跳
  if (F.y >= 0) {
    F.y = 0;
    if (F.vy > 240) { F.vy = -F.vy * 0.4; F.vx *= 0.7; thud(); }
    else {
      F.vy = 0; F.vx *= Math.pow(0.02, dt);
      if (Math.abs(F.vx) < 26) { F.vx = 0; F.air = false; }
    }
  } else F.air = true;
}
function smash(side) {
  wallHits++;
  shake = Math.max(shake, 4); zoom = Math.max(zoom, 0.045);
  const x = side === "left" ? 72 : 256;
  addRing(x, GROUND - 44, 3);
  addFx(iBlunt, { x, y: GROUND - 44, seed: ri(1, 900) });
  sfx(3);
}
function thud() {
  floorHits++;
  shake = Math.max(shake, 2.4);
  addRing(F.x, GROUND - 6, 2);
  sfx(2);
}

const rnd = (a, b) => a + Math.random() * (b - a);""", 'physics fn')

# 3) 招式加冲量（每招一个"打飞"向量）
rep("""const MOVES = [
  { mod: mSword,  name: "疾斩",   dmg: [8, 11],  hit: 0.06, power: 1, cd: 0,
    follow: { dmg: [3, 4], t: 0.24 } },
  { mod: mThrust, name: "突刺",   dmg: [10, 13], hit: 0.07, power: 2, cd: 1, break: true,
    follow: { dmg: [4, 5], t: 0.26 } },
  { mod: mHammer, name: "碎地锤", dmg: [22, 27], hit: 0.15, power: 3, cd: 2, stun: true,
    follow: { dmg: [6, 7], t: 0.34 } },
  { mod: mSpin,   name: "回旋斩", dmg: [9, 12],  hit: 0.17, power: 2, cd: 1, bleed: true,
    follow: { dmg: [4, 5], t: 0.3 } },
];""",
    """const MOVES = [
  { mod: mSword,  name: "疾斩",   dmg: [8, 11],  hit: 0.06, power: 1, cd: 0,
    kb: { x: 130, y: -330 }, follow: { dmg: [3, 4], t: 0.3, kb: { x: 90, y: -320 } } },
  { mod: mThrust, name: "突刺",   dmg: [10, 13], hit: 0.07, power: 2, cd: 1, break: true,
    kb: { x: 250, y: -150 }, follow: { dmg: [4, 5], t: 0.36, kb: { x: 110, y: -300 } } },
  { mod: mHammer, name: "碎地锤", dmg: [22, 27], hit: 0.15, power: 3, cd: 2, stun: true,
    kb: { x: 50, y: -780 }, follow: { dmg: [6, 7], t: 0.55, kb: { x: 70, y: -260 } } },
  { mod: mSpin,   name: "回旋斩", dmg: [9, 12],  hit: 0.17, power: 2, cd: 1, bleed: true,
    kb: { x: 180, y: -420 }, follow: { dmg: [4, 5], t: 0.42, kb: { x: 110, y: -280 } } },
];""", 'moves kb')

# 4) 命中施加冲量
rep("  if (m.follow) followT = m.follow.t;",
    """  F.vx += m.kb.x; F.vy += m.kb.y; F.air = true;
  if (m.follow) followT = m.follow.t;""", 'impulse hit')

# 5) 追击：跳过去再打，继续打飞
rep("""function doFollow() {
  const m = MOVES[S.moveIx];
  if (!m.follow) return;""",
    """function doFollow() {
  const m = MOVES[S.moveIx];
  if (!m.follow) return;
  S.dashTo = Math.max(36, Math.min(200, F.x - 56));
  const kb = m.follow.kb || { x: 60, y: -200 };
  F.vx += kb.x; F.vy += kb.y; F.air = true;""", 'follow chase')

# 6) 出招时冲刺到敌人面前
rep("""  atkFx = createFx(m.mod, { x: pPos, y: GROUND, seed: ri(1, 900) });
  hint(m.name);""",
    """  S.dashTo = Math.max(36, Math.min(200, F.x - 56));
  atkFx = createFx(m.mod, { x: pPos, y: GROUND, seed: ri(1, 900) });
  hint(m.name);""", 'dash on choose')

# 7) step：跑物理、同步 ePos、玩家冲刺/起跳
rep("""  const cineLike = ["cineIn", "cine", "cineOut"].includes(S.phase);
  pPos += ((cineLike ? S.cinePX : PX) - pPos) * (1 - Math.exp(-dt * 9));
  ePos += ((cineLike ? S.cineEX : EX) - ePos) * (1 - Math.exp(-dt * 9));""",
    """  const cineLike = ["cineIn", "cine", "cineOut"].includes(S.phase);
  physics(dt);
  if (cineLike) {
    ePos += (S.cineEX - ePos) * (1 - Math.exp(-dt * 9));
  } else ePos = F.x;
  const pTarget = cineLike ? S.cinePX : (S.phase === "player" || S.phase === "pause") ? (S.dashTo ?? PX) : PX;
  pPos += (pTarget - pPos) * (1 - Math.exp(-dt * 16));
  const pYTarget = (S.phase === "player" || S.phase === "pause") ? Math.max(-52, Math.min(0, F.y)) : 0;
  pY += (pYTarget - pY) * (1 - Math.exp(-dt * 11));""", 'step physics')

# 8) 敌人绘制用物理高度
rep("""  if (foeFx) {
    foeFx.options.x = ePos - lunge + jitter + foeKb;
    foeFx.options.y = GROUND + curFoe().oy + foeSink;
  }""",
    """  if (foeFx) {
    foeFx.options.x = ePos - lunge + jitter;
    foeFx.options.y = GROUND + curFoe().oy + F.y + foeSink;
  }""", 'foe draw physics')

# 9) 玩家绘制：起跳 + 冲刺残影
rep("""  const p = painterFor(frame);
  p.place(pPos + lean + pKb + (playerHit > 0 ? rnd(-1.5, 1.5) : 0), GROUND);
  drawActor(p, ACTOR, 1);""",
    """  const dashing = Math.abs((S.dashTo ?? PX) - pPos) > 5;
  if (dashing) {
    const dir = Math.sign((S.dashTo ?? PX) - pPos) || 1;
    for (let i = 3; i >= 1; i--) {
      const gp = painterFor(frame);
      gp.place(pPos - dir * i * 7, GROUND + pY);
      drawActor(gp, ACTOR, 0.2);
    }
  }
  const p = painterFor(frame);
  p.place(pPos + lean + pKb + (playerHit > 0 ? rnd(-1.5, 1.5) : 0), GROUND + pY);
  drawActor(p, ACTOR, 1);""", 'player dash ghost')

# 10) 重生/重开时重置物理
rep("""  foeFx = createFx(curFoe().mod, { x: EX, y: GROUND + curFoe().oy, seed: ri(1, 900) });""",
    """  F.x = EX; F.y = 0; F.vx = 0; F.vy = 0; F.air = false;
  pY = 0; S.dashTo = PX;
  foeFx = createFx(curFoe().mod, { x: EX, y: GROUND + curFoe().oy, seed: ri(1, 900) });""", 'reset physics')

# 11) 自检钩子
rep("  dbg: () => ({ hitstop, zoom, foeKb, pKb, foeSink, followT, rings: rings.length, flashN, whiteN, audio: !!AC && AC.state }),",
    "  dbg: () => ({ hitstop, zoom, foeSink, followT, rings: rings.length, flashN, whiteN, wallHits, floorHits, audio: !!AC && AC.state,\n    phys: { x: +F.x.toFixed(1), y: +F.y.toFixed(1), vx: Math.round(F.vx), vy: Math.round(F.vy), air: F.air }, pY: +pY.toFixed(1) }),",
    'dbg phys')

open(p, 'w').write(s)
print("done:", len(done), done)
