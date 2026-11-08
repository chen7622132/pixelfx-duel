p = 'src/game.js'
s = open(p).read()
done = []


def rep(a, b, tag):
    global s
    if a not in s:
        print("MISS:", tag)
        return
    s = s.replace(a, b, 1)
    done.append(tag)


# 1) 新特效 import
rep('import * as iSpark from "../vendor/pixelfx/fx/impacts/hit-spark.js";',
    'import * as iSpark from "../vendor/pixelfx/fx/impacts/hit-spark.js";\n'
    'import * as iFrame from "../vendor/pixelfx/fx/impacts/impact-frame.js";\n'
    'import * as iFlash from "../vendor/pixelfx/fx/impacts/hit-flash.js";', "imports")

# 2) 打击感状态
rep("let shake = 0, foeHit = 0, playerHit = 0, lb = 0;",
    """let shake = 0, foeHit = 0, playerHit = 0, lb = 0;
// —— 打击感 ——
let hitstop = 0;      // 顿帧：完全静止，打击的"咬合感"
let zoom = 0;         // 镜头猛推
let foeKb = 0;        // 击退位移（弹簧回位）
let foeSink = 0;      // 受击下沉
let followT = 0;      // 追击段计时
let AC = null;        // WebAudio

function ensureAudio() {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
  } catch (e) { AC = null; }
}
let NOISE = null;
function noiseBuf() {
  if (NOISE) return NOISE;
  NOISE = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.09), AC.sampleRate);
  const ch = NOISE.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2);
  return NOISE;
}
/** power 1-4：轻/中/重/终结技 */
function sfx(power) {
  if (!AC || AC.state !== "running") return;
  const t = AC.currentTime;
  const g = AC.createGain();
  g.connect(AC.destination);
  const dur = [0.07, 0.11, 0.2, 0.34][power - 1];
  const o = AC.createOscillator();
  o.type = power >= 3 ? "triangle" : "sine";
  o.frequency.setValueAtTime([210, 165, 115, 90][power - 1], t);
  o.frequency.exponentialRampToValueAtTime([65, 55, 40, 28][power - 1], t + dur);
  g.gain.setValueAtTime([0.22, 0.3, 0.42, 0.5][power - 1], t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); o.start(t); o.stop(t + dur + 0.02);
  const n = AC.createBufferSource();
  n.buffer = noiseBuf();
  const ng = AC.createGain();
  ng.gain.setValueAtTime([0.1, 0.16, 0.26, 0.34][power - 1], t);
  ng.gain.exponentialRampToValueAtTime(0.0008, t + 0.07);
  n.connect(ng); ng.connect(AC.destination); n.start(t); n.stop(t + 0.1);
}
function sfxHurt() {
  if (!AC || AC.state !== "running") return;
  const t = AC.currentTime;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(300, t);
  o.frequency.exponentialRampToValueAtTime(70, t + 0.16);
  g.gain.setValueAtTime(0.16, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.17);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + 0.19);
}

/** 一次打击的全部反馈：顿帧 / 震屏 / 镜头 / 击退 / 下沉 / 音效 */
function impact(power) {
  const P = [
    { stop: 0.055, shake: 2, zoom: 0.018, kb: 4, sink: 2 },
    { stop: 0.075, shake: 3, zoom: 0.028, kb: 7, sink: 3 },
    { stop: 0.115, shake: 4, zoom: 0.045, kb: 11, sink: 4 },
    { stop: 0.2, shake: 6, zoom: 0.075, kb: 22, sink: 6 },
  ][Math.max(0, Math.min(3, power - 1))];
  hitstop = Math.max(hitstop, P.stop);
  shake = Math.max(shake, P.shake);
  zoom = Math.max(zoom, P.zoom);
  foeKb += P.kb;
  foeSink = Math.max(foeSink, P.sink);
  sfx(power);
}""", "impact core")

# 2.5) 暴击配色
rep("const S = {", 'const CRIT_PAL = ["#2a1a05", "#5a3a08", "#a06a0c", "#e8b030", "#ffe066", "#fff3c0", "#ffffff"];\n\nconst S = {', "crit palette")

# 3) 招式表：加威力等级 + 拆成主段/追击段（总伤害不变）
rep("""const MOVES = [
  { mod: mSword,  name: "疾斩",   dmg: [11, 15], hit: 0.06, shake: 2, cd: 0 },
  { mod: mThrust, name: "突刺",   dmg: [14, 18], hit: 0.07, shake: 2, cd: 1, break: true },
  { mod: mHammer, name: "碎地锤", dmg: [28, 34], hit: 0.15, shake: 3, cd: 2, stun: true },
  { mod: mSpin,   name: "回旋斩", dmg: [13, 17], hit: 0.17, shake: 2, cd: 1, bleed: true },
];""",
    """const MOVES = [
  { mod: mSword,  name: "疾斩",   dmg: [8, 11],  hit: 0.06, power: 1, cd: 0,
    follow: { dmg: [3, 4], t: 0.24 } },
  { mod: mThrust, name: "突刺",   dmg: [10, 13], hit: 0.07, power: 2, cd: 1, break: true,
    follow: { dmg: [4, 5], t: 0.26 } },
  { mod: mHammer, name: "碎地锤", dmg: [22, 27], hit: 0.15, power: 3, cd: 2, stun: true,
    follow: { dmg: [6, 7], t: 0.34 } },
  { mod: mSpin,   name: "回旋斩", dmg: [9, 12],  hit: 0.17, power: 2, cd: 1, bleed: true,
    follow: { dmg: [4, 5], t: 0.3 } },
];""", "moves table")

# 4) 命中：走 impact + 追击段
rep("""  S.fhp = Math.max(0, S.fhp - dmg);
  addEnergy(14);
  shake = m.shake; foeHit = 0.2;
  addFx(crit ? uCrit : uDmg, { x: ePos + ri(-8, 8), y: GROUND - 72, text: "-" + dmg });
  addFx(crit ? iCrit : iBlunt, { x: ePos - 20, y: GROUND - 26, seed: ri(1, 900) });""",
    """  S.fhp = Math.max(0, S.fhp - dmg);
  addEnergy(14);
  foeHit = 0.22;
  impact(Math.min(4, m.power + (crit ? 1 : 0)));
  { const pop = { x: ePos + ri(-8, 8), y: GROUND - 72, text: "-" + dmg }; if (crit) pop.palette = CRIT_PAL; addFx(uDmg, pop); }
  addFx(crit ? iCrit : iBlunt, { x: ePos - 20, y: GROUND - 26, seed: ri(1, 900) });
  if (crit) { flash("white"); addFx(iFrame, { x: ePos, y: GROUND - 34, seed: ri(1, 900) }); }
  if (m.follow) followT = m.follow.t;""", "resolveHit impact")

# 5) 追击段函数（插在 endTurn 前）
rep("function endTurn() {",
    """function doFollow() {
  const m = MOVES[S.moveIx];
  if (!m.follow) return;
  const dmg = ri(m.follow.dmg[0], m.follow.dmg[1]);
  S.fhp = Math.max(0, S.fhp - dmg);
  foeHit = 0.16;
  impact(1);
  addFx(uDmg, { x: ePos + ri(-10, 10), y: GROUND - 58, text: "-" + dmg });
  addFx(iSpark, { x: ePos - 6, y: GROUND - 30, seed: ri(1, 900) });
  hint("追打 " + dmg);
  paintBars();
  if (S.fhp <= 0) { log("hit", "追击 · " + dmg + " · 击杀"); startKill(); return; }
  log("hit", "追击 · " + dmg);
}

function endTurn() {""", "doFollow")

# 6) 受击也走 impact（弱一档）
rep("""  shake = heavy ? 3 : 2; playerHit = 0.22;
  addFx(heavy ? uCrit : uDmg, { x: pPos + ri(-6, 6), y: GROUND - 58, text: "-" + dmg });
  addFx(iBlunt, { x: pPos + 16, y: GROUND - 24, seed: ri(1, 900) });""",
    """  playerHit = 0.26;
  impact(heavy ? 3 : 1);
  sfxHurt();
  addFx(heavy ? uCrit : uDmg, { x: pPos + ri(-6, 6), y: GROUND - 58, text: "-" + dmg });
  addFx(heavy ? iCrit : iBlunt, { x: pPos + 16, y: GROUND - 24, seed: ri(1, 900) });
  if (heavy) addFx(iFrame, { x: pPos, y: GROUND - 34, seed: ri(1, 900) });""", "enemyStrike impact")

# 7) 终结技命中：满级反馈
rep("""  shake = 4; foeHit = 0.3; S.slow = 0.16;
  addFx(uCrit, { x: ePos, y: GROUND - 80, text: "-" + dmg });
  addFx(iCrit, { x: ePos - 30, y: GROUND - 40, seed: ri(1, 900) });""",
    """  foeHit = 0.34; S.slow = 0.18;
  impact(4);
  addFx(uCrit, { x: ePos, y: GROUND - 80, text: "-" + dmg });
  addFx(iCrit, { x: ePos - 30, y: GROUND - 40, seed: ri(1, 900) });
  addFx(iFrame, { x: ePos, y: GROUND - 40, seed: ri(1, 900) });
  addFx(iFlash, { x: ePos, y: GROUND - 30, seed: ri(1, 900) });""", "finisher impact")

# 8) step：顿帧 + 衰减 + 追击计时
rep("""function step(dt) {
  const cineLike = ["cineIn", "cine", "cineOut"].includes(S.phase);""",
    """function step(dt) {
  // 顿帧：完全静止，连特效一起停 —— 这是打击感的"咬合"
  if (hitstop > 0) { hitstop -= dt; return; }
  const cineLike = ["cineIn", "cine", "cineOut"].includes(S.phase);""", "hitstop")

rep("""  if (shake > 0) shake = Math.max(0, shake - dt * 12);
  if (foeHit > 0) foeHit = Math.max(0, foeHit - dt);""",
    """  if (shake > 0) shake = Math.max(0, shake - dt * 14);
  if (zoom > 0) zoom = Math.max(0, zoom - dt * 0.9);
  if (foeKb > 0.2) foeKb *= Math.exp(-dt * 11); else foeKb = 0;
  if (foeSink > 0) foeSink = Math.max(0, foeSink - dt * 26);
  if (followT > 0) { followT -= dEff; if (followT <= 0 && S.phase === "player") doFollow(); }
  if (foeHit > 0) foeHit = Math.max(0, foeHit - dt);""", "decay")

# 9) 绘制：击退 + 下沉 + 镜头猛推
rep("""  const jitter = foeHit > 0 ? rnd(-2, 2) : 0;
  if (foeFx) foeFx.options.x = ePos - lunge + jitter;""",
    """  const jitter = foeHit > 0 ? rnd(-1.5, 1.5) : 0;
  if (foeFx) {
    foeFx.options.x = ePos - lunge + jitter + foeKb;
    foeFx.options.y = GROUND + FOES[S.foeIx].oy + foeSink;
  }""", "foe kb sink")

rep("""  const sx = shake > 0 ? Math.round(rnd(-shake, shake)) : 0;
  const sy = shake > 0 ? Math.round(rnd(-shake, shake)) : 0;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W * SCALE, H * SCALE);
  ctx.drawImage(off, sx * SCALE, sy * SCALE, W * SCALE, H * SCALE);""",
    """  const sx = shake > 0 ? Math.round(rnd(-shake, shake)) : 0;
  const sy = shake > 0 ? Math.round(rnd(-shake, shake)) : 0;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W * SCALE, H * SCALE);
  const dw = Math.round(W * SCALE * (1 + zoom));
  const dh = Math.round(H * SCALE * (1 + zoom));
  ctx.drawImage(off, sx * SCALE - (dw - W * SCALE) / 2, sy * SCALE - (dh - H * SCALE) / 2, dw, dh);""", "zoom punch")

# 10) 首帧用户交互解锁音频 + 暴击配色
rep("btns.forEach((b) => b.addEventListener(\"click\", () => chooseMove(+b.dataset.i)));",
    """btns.forEach((b) => b.addEventListener("click", () => { ensureAudio(); chooseMove(+b.dataset.i); }));""", "audio unlock")

open(p, 'w').write(s)
print("done:", len(done), done)
