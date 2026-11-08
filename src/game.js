// 像素对决 —— v2.0（三怪同场 + 物理动量 + 完全信息）
// 修复：去掉错位的 hit-flash（红色方框）；残影只在冲刺时出现（重影）
import {
  createFrame, clearFrame, createFx, composite, painterFor, drawActor, stockActor, backdrop, hex,
} from "../vendor/pixelfx/core/index.js";
import { textWidth, rasterText } from "../vendor/pixelfx/core/font.js";

import * as mSword from "../vendor/pixelfx/fx/melee/sword-slash.js";
import * as mThrust from "../vendor/pixelfx/fx/melee/thrust.js";
import * as mHammer from "../vendor/pixelfx/fx/melee/hammer-smash.js";
import * as mSpin from "../vendor/pixelfx/fx/melee/spin-slash.js";
import * as iBlunt from "../vendor/pixelfx/fx/impacts/blunt-hit.js";
import * as iCrit from "../vendor/pixelfx/fx/impacts/crit-hit.js";
import * as iShield from "../vendor/pixelfx/fx/impacts/shield-block.js";
import * as iSpark from "../vendor/pixelfx/fx/impacts/hit-spark.js";
import * as iFrame from "../vendor/pixelfx/fx/impacts/impact-frame.js";
import * as sBleeding from "../vendor/pixelfx/fx/status/bleeding.js";
import * as sPoison from "../vendor/pixelfx/fx/status/poisoned.js";
import * as sStun from "../vendor/pixelfx/fx/status/stunned.js";
import * as cSlime from "../vendor/pixelfx/fx/critters/slime.js";
import * as cBat from "../vendor/pixelfx/fx/critters/bat.js";
import * as cGhost from "../vendor/pixelfx/fx/critters/ghost.js";
import * as uDmg from "../vendor/pixelfx/fx/ui/damage-number.js";
import * as uCrit from "../vendor/pixelfx/fx/ui/crit-number.js";
import * as uAlert from "../vendor/pixelfx/fx/ui/exclamation.js";
import * as fTorch from "../vendor/pixelfx/fx/fire/torch.js";
import * as tBurn from "../vendor/pixelfx/fx/transitions/burn-away.js";
import * as spawnPoof from "../vendor/pixelfx/fx/spawn/poof.js";
import * as spawnSoul from "../vendor/pixelfx/fx/spawn/soul-rise.js";

import * as gArrow from "../vendor/pixelfx/fx/moves/arrow-shot.js";
import * as gDash from "../vendor/pixelfx/fx/moves/dash-strike.js";
import * as gStomp from "../vendor/pixelfx/fx/moves/earth-stomp.js";
import * as gFireball from "../vendor/pixelfx/fx/moves/fireball-throw.js";
import * as gPound from "../vendor/pixelfx/fx/moves/ground-pound.js";
import * as gHoly from "../vendor/pixelfx/fx/moves/holy-smite.js";
import * as gIce from "../vendor/pixelfx/fx/moves/ice-lance-throw.js";
import * as gLightning from "../vendor/pixelfx/fx/moves/lightning-call.js";
import * as gMeteor from "../vendor/pixelfx/fx/moves/meteor-call.js";
import * as gPistol from "../vendor/pixelfx/fx/moves/pistol-shots.js";
import * as gRocket from "../vendor/pixelfx/fx/moves/rocket-launcher.js";
import * as gCombo from "../vendor/pixelfx/fx/moves/sword-combo.js";

const W = 320, H = 180, SCALE = 4;
const GROUND = 152, PX = 96, CINE_LINE = 262, MAX_ENERGY = 100;
const GRAV = 1250;

// ---- 画布 ----------------------------------------------------------------
const cv = document.getElementById("screen");
const ctx = cv.getContext("2d");
ctx.imageSmoothingEnabled = false;
const off = document.createElement("canvas");
off.width = W; off.height = H;
const octx = off.getContext("2d");
const img = octx.createImageData(W, H);
const frame = createFrame(W, H);
const BG = backdrop("ground", W, H, GROUND);
const ACTOR = stockActor(2);
const TORCHES = [
  createFx(fTorch, { x: 18, y: GROUND + 10, seed: 11 }),
  createFx(fTorch, { x: 302, y: GROUND + 10, seed: 23 }),
];

// ---- 内容表 --------------------------------------------------------------
const MOVES = [
  { mod: mSword,  name: "疾斩",   dmg: [8, 11],  hit: 0.06, power: 1, cd: 0, area: false,
    kb: { x: 130, y: -330 }, follow: { dmg: [3, 4], t: 0.3, kb: { x: 90, y: -320 } } },
  { mod: mThrust, name: "突刺",   dmg: [10, 13], hit: 0.07, power: 2, cd: 1, break: true, area: false,
    kb: { x: 250, y: -150 }, follow: { dmg: [4, 5], t: 0.36, kb: { x: 110, y: -300 } } },
  { mod: mHammer, name: "碎地锤", dmg: [22, 27], hit: 0.15, power: 3, cd: 2, stun: true, area: false,
    kb: { x: 50, y: -520 }, follow: { dmg: [6, 7], t: 0.42, kb: { x: 80, y: -300 } } },
  { mod: mSpin,   name: "回旋斩", dmg: [9, 12],  hit: 0.17, power: 2, cd: 1, bleed: true, area: true,
    kb: { x: 170, y: -400 }, follow: { dmg: [4, 5], t: 0.42, kb: { x: 110, y: -280 } } },
];

const FINISHERS = {
  "fireball-throw":  { mod: gFireball,  name: "火球投掷", el: "FIRE",    dmg: [30, 40], target: 190, hit: 1.41 },
  "earth-stomp":     { mod: gStomp,     name: "大地践踏", el: "EARTH",   dmg: [28, 36], target: 112, hit: 0.06 },
  "ground-pound":    { mod: gPound,     name: "坠落重击", el: "IMPACT",  dmg: [29, 38], target: 80,  hit: 0.62 },
  "sword-combo":     { mod: gCombo,     name: "三段连斩", el: "BLADE",   dmg: [26, 35], target: 118, hit: 0.06 },
  "lightning-call":  { mod: gLightning, name: "引雷",     el: "THUNDER", dmg: [31, 41], target: 130, hit: 0.76 },
  "ice-lance-throw": { mod: gIce,       name: "冰枪投掷", el: "FROST",   dmg: [29, 38], target: 170, hit: 1.14 },
  "dash-strike":     { mod: gDash,      name: "疾风突袭", el: "BLADE",   dmg: [26, 35], target: 176, hit: 0.22 },
  "meteor-call":     { mod: gMeteor,    name: "召唤陨石", el: "METEOR",  dmg: [34, 45], target: 170, hit: 1.52 },
  "holy-smite":      { mod: gHoly,      name: "圣光制裁", el: "HOLY",    dmg: [31, 41], target: 118, hit: 0.47 },
  "rocket-launcher": { mod: gRocket,    name: "火箭筒",   el: "BLAST",   dmg: [33, 43], target: 200, hit: 0.6 },
  "pistol-shots":    { mod: gPistol,    name: "三连射",   el: "SHOT",    dmg: [24, 33], target: 180, hit: 0.26 },
  "arrow-shot":      { mod: gArrow,     name: "穿云箭",   el: "ARROW",   dmg: [26, 35], target: 180, hit: 0.8 },
};

// 三只怪：站位错开、悬浮高度不同
const FOE_DEFS = [
  { mod: cSlime, name: "史莱姆", hp: 26, dmg: [4, 6],  oy: -6,  h: 88,  x: 150, lift: 0,  uiY: 96,
    pool: ["fireball-throw", "earth-stomp", "ground-pound", "sword-combo"] },
  { mod: cBat,   name: "蝙蝠",   hp: 30, dmg: [5, 7],  oy: -34, h: 80,  x: 220, lift: -14, uiY: 108,
    pool: ["lightning-call", "ice-lance-throw", "dash-strike", "meteor-call"] },
  { mod: cGhost, name: "幽魂",   hp: 34, dmg: [6, 8],  oy: -10, h: 100, x: 284, lift: -30, uiY: 116,
    pool: ["holy-smite", "rocket-launcher", "pistol-shots", "arrow-shot"] },
];

const INTENT = {
  attack: { c: "#ffd9a0" },
  heavy:  { c: "#ff5a4a" },
  debuff: { c: "#7ee06a" },
  guard:  { c: "#8ab4ff" },
  stunned: { c: "#8f89a8" },
};

// ---- 状态 ----------------------------------------------------------------
const CRIT_PAL = ["#2a1a05", "#5a3a08", "#a06a0c", "#e8b030", "#ffe066", "#fff3c0", "#ffffff"];
const S = {
  phase: "ready",
  t: 0,
  hp: 120, maxhp: 120,
  cd: [0, 0, 0, 0],
  moveIx: 0, hit: false,
  poison: 0,
  guardUp: false,
  target: 0,
  actor: 0,
  energy: 0,
  round: 1,
  kills: 0,
  fin: null, cinePX: PX, cineEX: CINE_LINE, slow: 0,
  breakFx: 0, dashTo: PX,
  usedFins: new Set(),
  log: [],
};
const foes = [];

let atkFx = null, transFx = null;
const floats = [], rings = [];
let shake = 0, zoom = 0, lb = 0, hitstop = 0;
let pPos = PX, pY = 0, pKb = 0, playerHit = 0, followT = 0;
let flashN = 0, whiteN = 0, wallHits = 0, floorHits = 0;
let AC = null, NOISE = null;

const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.round(rnd(a, b));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const $ = (id) => document.getElementById(id);
const alive = () => foes.filter((f) => f.alive);
const tgt = () => foes[S.target] && foes[S.target].alive ? foes[S.target] : (alive()[0] || foes[0]);

// ---- 音效 ----------------------------------------------------------------
function ensureAudio() {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
  } catch (e) { AC = null; }
}
function noiseBuf() {
  if (NOISE) return NOISE;
  NOISE = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.09), AC.sampleRate);
  const ch = NOISE.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2);
  return NOISE;
}
function sfx(power) {
  if (!AC || AC.state !== "running") return;
  const t = AC.currentTime;
  const g = AC.createGain();
  g.connect(AC.destination);
  const dur = [0.07, 0.11, 0.2, 0.34][Math.min(3, power - 1)];
  const o = AC.createOscillator();
  o.type = power >= 3 ? "triangle" : "sine";
  o.frequency.setValueAtTime([210, 165, 115, 90][Math.min(3, power - 1)], t);
  o.frequency.exponentialRampToValueAtTime([65, 55, 40, 28][Math.min(3, power - 1)], t + dur);
  g.gain.setValueAtTime([0.22, 0.3, 0.42, 0.5][Math.min(3, power - 1)], t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); o.start(t); o.stop(t + dur + 0.02);
  const n = AC.createBufferSource();
  n.buffer = noiseBuf();
  const ng = AC.createGain();
  ng.gain.setValueAtTime([0.1, 0.16, 0.26, 0.34][Math.min(3, power - 1)], t);
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

// ---- 打击感 --------------------------------------------------------------
function addRing(x, y, power) {
  rings.push({ x, y, t: 0, life: 0.17, r0: 4 + power * 3, r1: 22 + power * 11,
    c: power >= 3 ? "#ffe066" : power >= 2 ? "#ffd0a0" : "#ffffff" });
}
function impact(power, on = "foe", foe = null) {
  const P = [
    { stop: 0.06,  shake: 3, zoom: 0.035, kb: 9,  sink: 4 },
    { stop: 0.085, shake: 4, zoom: 0.055, kb: 14, sink: 6 },
    { stop: 0.125, shake: 6, zoom: 0.08,  kb: 20, sink: 8 },
    { stop: 0.21,  shake: 9, zoom: 0.12,  kb: 34, sink: 10 },
  ][Math.max(0, Math.min(3, power - 1))];
  hitstop = Math.max(hitstop, P.stop);
  shake = Math.max(shake, P.shake);
  zoom = Math.max(zoom, P.zoom);
  if (on === "foe" && foe) {
    foe.F.x += Math.sign(foe.F.x - pPos || 1) * 1;
    foe.sink = Math.max(foe.sink || 0, P.sink);
    addRing(foe.F.x, GROUND + foe.def.lift + foe.F.y - 34, power);
  } else if (on === "player") {
    pKb -= P.kb * 0.7;
  }
  flash(power >= 3 ? "white" : "micro");
  sfx(power);
}

// ---- 物理 ----------------------------------------------------------------
function physicsOf(f, dt) {
  if (["cineIn", "cine", "cineOut"].includes(S.phase)) return;
  const F = f.F;
  if (!F.air && F.vx === 0 && F.vy === 0) {
    if (Math.abs(F.x - f.def.x) > 0.5) F.x += (f.def.x - F.x) * (1 - Math.exp(-dt * 2.0));
    return;
  }
  F.vy += GRAV * dt;
  F.y += F.vy * dt;
  F.x += F.vx * dt;
  if (F.x < 74) { F.x = 74; if (F.vx < 0) { F.vx = -F.vx * 0.55; smash("left", f); } }
  if (F.x > 296) { F.x = 296; if (F.vx > 0) { F.vx = -F.vx * 0.55; smash("right", f); } }
  if (F.y >= 0) {
    F.y = 0;
    if (F.vy > 240) { F.vy = -F.vy * 0.4; F.vx *= 0.7; thud(f); }
    else {
      F.vy = 0; F.vx *= Math.pow(0.02, dt);
      if (Math.abs(F.vx) < 26) { F.vx = 0; F.air = false; }
    }
  } else F.air = true;
}
function smash(side, f) {
  wallHits++;
  shake = Math.max(shake, 4); zoom = Math.max(zoom, 0.045);
  const x = side === "left" ? 82 : 288;
  addRing(x, GROUND - 44 + f.def.lift, 3);
  addFx(iBlunt, { x, y: GROUND - 44 + f.def.lift, seed: ri(1, 900) });
  sfx(3);
}
function thud(f) {
  floorHits++;
  shake = Math.max(shake, 2.4);
  addRing(f.F.x, GROUND - 6 + f.def.lift, 2);
  sfx(2);
}

// ---- 像素文字 / 图标 ------------------------------------------------------
function drawText(p, str, x, y, color, font = "mini", k = 1, align = "center") {
  const w = textWidth(str, font) * k;
  const ox = align === "center" ? Math.round(x - w / 2) : align === "right" ? x - w : x;
  rasterText(str, font, (gx, gy) => {
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) p.px(ox + gx * k + dx, y + gy * k + dy, color);
  });
}
function drawIcon(p, kind, x, y, c) {
  if (kind === "attack") {
    p.line(x - 2, y + 9, x + 3, y + 1, c);
    p.line(x - 3, y + 7, x, y + 10, c);
  } else if (kind === "heavy") {
    p.rect(x - 1, y, 2, 6, c);
    p.rect(x - 1, y + 8, 2, 2, c);
  } else if (kind === "debuff") {
    p.disc(x - 2, y + 3, 1.6, c);
    p.disc(x + 2, y + 6, 1.2, c);
    p.disc(x, y + 9, 1.0, c);
  } else {
    p.rect(x - 3, y + 1, 6, 5, c);
    p.rect(x - 2, y + 6, 4, 2, c);
    p.rect(x - 1, y + 8, 2, 1, c);
  }
}

// ---- 敌人生成 ------------------------------------------------------------
function addFx(mod, o) {
  const f = createFx(mod, o);
  floats.push(f);
  return f;
}
function spawnWave() {
  foes.length = 0;
  for (const d of FOE_DEFS) {
    foes.push({
      def: d, hp: d.hp, maxhp: d.hp, alive: true, deathT: 0,
      F: { x: d.x, y: 0, vx: 0, vy: 0, air: false },
      intent: null, fx: null, dotFx: null, alertFx: null,
      hitT: 0, sink: 0, bleed: 0, stun: false, guard: false,
    });
  }
  for (const f of foes) f.fx = createFx(f.def.mod, { x: f.def.x, y: GROUND + f.def.oy + f.def.lift, seed: ri(1, 900) });
  S.target = 0; S.actor = 0;
  S.usedFins = new Set();
  paintFoeBars();
}
function rollIntent(f) {
  const base = ri(f.def.dmg[0], f.def.dmg[1]);
  const r = Math.random();
  if (r < 0.26 && S.round > 1) return { type: "heavy", dmg: Math.round(base * 1.9) };
  if (r < 0.4) return { type: "debuff", dmg: 0 };
  if (r < 0.52) return { type: "guard", dmg: 0 };
  return { type: "attack", dmg: base };
}
function intentHint(f) {
  const I = f.intent;
  if (!I) return f.def.name + " 待机";
  const n = f.def.name;
  if (I.type === "attack") return n + " 将攻击 " + I.dmg + " 点";
  if (I.type === "heavy") return n + " 在蓄力 " + I.dmg + " 点重击 —— 突刺可打断";
  if (I.type === "debuff") return n + " 要放毒雾 —— 会中毒 3 回合";
  if (I.type === "guard") return n + " 要举盾 —— 伤害 -40%";
  return n + " 被打断了";
}
function pickActor() {
  const list = alive();
  if (!list.length) return null;
  // 优先选上一回合没行动的
  const cand = list.filter((f) => f !== foes[S.actor]);
  const pool = cand.length ? cand : list;
  const f = pool[ri(0, pool.length - 1)];
  S.actor = foes.indexOf(f);
  for (const g of foes) g.intent = null;
  f.intent = rollIntent(f);
  if (f.intent.type === "heavy") {
    f.alertFx = createFx(uAlert, { x: f.F.x, y: GROUND + f.def.oy + f.def.lift - 6, seed: ri(1, 900) });
  }
  paintFoeBars();
  return f;
}

// ---- 出招 ----------------------------------------------------------------
function chooseMove(i) {
  ensureAudio();
  if (S.phase !== "ready") return;
  if (i === 4) return startFinisher();
  if (S.cd[i] > 0) return;
  const m = MOVES[i];
  S.phase = "player"; S.t = 0; S.hit = false; S.moveIx = i;
  S.cd = S.cd.map((c) => Math.max(0, c - 1));
  S.cd[i] = m.cd;
  const f = tgt();
  S.dashTo = Math.max(30, Math.min(150, f.F.x - 62));
  atkFx = createFx(m.mod, { x: pPos, y: GROUND, seed: ri(1, 900) });
  hint(m.name + (m.area ? "（全体）" : "") );
  paintButtons();
}

function hitFoe(f, dmg, power, opts = {}) {
  f.hp = Math.max(0, f.hp - dmg);
  f.hitT = 0.24;
  f.F.vx += (opts.kb?.x ?? 60);
  f.F.vy += (opts.kb?.y ?? -240);
  f.F.air = true;
  impact(power, "foe", f);
  const pop = { x: f.F.x + ri(-8, 8), y: GROUND + f.def.lift + f.F.y - 72, text: "-" + dmg };
  if (opts.crit) pop.palette = CRIT_PAL;
  addFx(opts.crit ? uCrit : uDmg, pop);
  addFx(opts.crit ? iCrit : iBlunt, { x: f.F.x - 20, y: GROUND + f.def.lift - 26, seed: ri(1, 900) });
  if (opts.crit) addFx(iFrame, { x: f.F.x, y: GROUND + f.def.lift - 34, seed: ri(1, 900) });
  if (f.hp <= 0) killFoe(f);
}

function resolveHit() {
  const m = MOVES[S.moveIx];
  const f = tgt();
  let dmg = ri(m.dmg[0], m.dmg[1]);
  let crit = Math.random() < 0.12 || (m.stun && Math.random() < 0.3);
  let broke = false, guarded = false;
  if (m.break && f.intent && f.intent.type === "heavy") {
    broke = true; dmg = Math.round(dmg * 1.5); crit = true;
    f.intent = { type: "stunned", dmg: 0 };
    S.breakFx = 0.7;
    addFx(iSpark, { x: f.F.x, y: GROUND + f.def.lift - 40, seed: ri(1, 900) });
  }
  if (crit) dmg = Math.round(dmg * 1.35);
  if (f.guard) { dmg = Math.round(dmg * 0.6); f.guard = false; guarded = true; }
  addEnergy(12);
  hint(broke ? "识破！打断蓄力" : guarded ? "被护盾吸收" : crit ? "暴击" : "命中");

  if (m.area) {
    const others = alive();
    for (const g of others) {
      const d2 = Math.max(1, Math.round(dmg * 0.75));
      g.hp = Math.max(0, g.hp - d2);
      g.hitT = 0.24; g.F.vx += m.kb.x * 0.8; g.F.vy += m.kb.y * 0.8; g.F.air = true;
      addFx(uDmg, { x: g.F.x + ri(-8, 8), y: GROUND + g.def.lift + g.F.y - 66, text: "-" + d2 });
      if (g.hp <= 0) killFoe(g);
    }
    impact(m.power, "foe", f);
    addRing(f.F.x, GROUND + f.def.lift - 30, 3);
    log("hit", m.name + " 全体 · " + dmg + " / x" + others.length);
  } else {
    hitFoe(f, dmg, Math.min(4, m.power + (crit ? 1 : 0)), { kb: m.kb, crit });
    log("hit", m.name + " · " + dmg + (broke ? "（打断）" : guarded ? "（被盾吸收）" : crit ? "（暴击）" : "") + (f.hp <= 0 ? " · 击杀" : ""));
  }
  if (m.stun) { f.stun = true; addFx(sStun, { x: f.F.x, y: GROUND + f.def.lift - 62, seed: 3 }); }
  if (m.bleed && !f.bleed) {
    f.bleed = 3;
    f.dotFx = createFx(sBleeding, { x: f.F.x, y: GROUND + f.def.oy + f.def.lift + 6, seed: 7 });
  }
  if (m.follow) followT = m.follow.t;
  paintFoeBars(); paintStatus();
}

function doFollow() {
  const m = MOVES[S.moveIx];
  if (!m.follow) return;
  const f = tgt();
  if (!f.alive) return;
  S.dashTo = Math.max(30, Math.min(150, f.F.x - 62));
  const dmg = ri(m.follow.dmg[0], m.follow.dmg[1]);
  const kb = m.follow.kb || { x: 60, y: -200 };
  f.F.vx += kb.x; f.F.vy += kb.y; f.F.air = true;
  hitFoe(f, dmg, 1, { kb: { x: 0, y: 0 } });
  hint("追打 " + dmg);
  if (f.hp > 0) log("hit", "追击 · " + dmg);
}

function killFoe(f) {
  if (!f.alive) return;
  f.alive = false; f.deathT = 1.1; f.intent = null;
  S.kills += 1;
  addEnergy(10);
  addFx(spawnSoul, { x: f.F.x, y: GROUND + f.def.lift + f.F.y, seed: ri(1, 900) });
  log("win", "击杀 " + f.def.name);
  if (f.alertFx) { f.alertFx = null; }
  paintFoeBars();
  const rest = alive();
  if (!rest.length) {
    S.phase = "clear"; S.t = 0;
    transFx = createFx(tBurn, { x: W / 2, y: H / 2, seed: ri(1, 900) });
    $("cineName").textContent = "全灭";
    $("cineSub").textContent = "WAVE CLEAR";
    $("cine").classList.add("on");
    return;
  }
  if (f === foes[S.target]) S.target = foes.indexOf(rest[0]);
}

// ---- 回合 ----------------------------------------------------------------
function endTurn() {
  S.cd = S.cd.map((c) => Math.max(0, c - 1));
  if (!alive().length) return;
  if (S.hp <= 0) return gameOver(false);
  S.phase = "ready"; S.t = 0; S.round += 1;
  const f = pickActor();
  hint(f ? intentHint(f) : "选一招");
  paintButtons(); paintStatus();
}

function enemyTurn() {
  if (S.hp <= 0) return gameOver(false);
  if (S.poison > 0) { S.poison -= 1; S.hp = Math.max(0, S.hp - 3); log("hurt", "中毒 -3"); paintBars(); }
  const f = foes[S.actor];
  if (!f || !f.alive) return endTurn();
  if (f.bleed > 0) {
    f.bleed -= 1;
    f.hp = Math.max(0, f.hp - 3);
    addFx(uDmg, { x: f.F.x + ri(-8, 8), y: GROUND + f.def.lift - 66, text: "-3" });
    log("hit", "流血 -3");
    paintFoeBars();
    if (f.hp <= 0) { killFoe(f); return endTurn(); }
  }
  if (S.guardUp) { S.guardUp = false; }
  if (f.stun) {
    f.stun = false;
    addFx(sStun, { x: f.F.x, y: GROUND + f.def.lift - 62, seed: 5 });
    hint(f.def.name + " 被击晕，跳过回合");
    log("sys", f.def.name + " 眩晕");
    paintStatus();
    return endTurn();
  }
  if (f.intent && f.intent.type === "stunned") {
    hint("蓄力被打断");
    return endTurn();
  }
  S.phase = "enemy"; S.t = 0; S.hit = false;
  hint(f.intent ? intentHint(f) : f.def.name + " 反击…");
}

function enemyStrike() {
  const f = foes[S.actor];
  if (!f || !f.alive) return;
  const I = f.intent || { type: "attack", dmg: 6 };
  if (I.type === "guard") {
    f.guard = true;
    addFx(iShield, { x: f.F.x, y: GROUND + f.def.lift - 30, seed: 3 });
    hint(f.def.name + " 举起了护盾");
    log("sys", f.def.name + " 举盾 · 下次伤害 -40%");
    paintStatus();
    return;
  }
  if (I.type === "debuff") {
    S.poison = 3;
    addFx(sPoison, { x: pPos, y: GROUND, seed: 11 });
    hint("你中毒了（3 回合）");
    log("hurt", "中毒 3 回合 · 每回合 -3");
    paintStatus();
    return;
  }
  const dmg = I.dmg;
  S.hp = Math.max(0, S.hp - dmg);
  addEnergy(6);
  const heavy = I.type === "heavy";
  playerHit = 0.26;
  impact(heavy ? 3 : 1, "player");
  sfxHurt();
  addFx(heavy ? uCrit : uDmg, { x: pPos + ri(-6, 6), y: GROUND - 58, text: "-" + dmg });
  addFx(heavy ? iCrit : iBlunt, { x: pPos + 16, y: GROUND - 24, seed: ri(1, 900) });
  if (heavy) addFx(iFrame, { x: pPos, y: GROUND - 34, seed: ri(1, 900) });
  flash("red");
  hint((heavy ? "重击 " : "受到 ") + dmg + " 伤害");
  log("hurt", f.def.name + " · " + (heavy ? "重击 -" : "攻击 -") + dmg);
  paintBars();
}

// ---- 终结技 --------------------------------------------------------------
function addEnergy(n) {
  S.energy = Math.min(MAX_ENERGY, S.energy + n);
  paintFin();
}
function startFinisher(forceId) {
  if (S.energy < MAX_ENERGY) { hint("能量不足（" + S.energy + " / " + MAX_ENERGY + "）"); return; }
  const live = alive();
  if (!live.length) return;
  const f = tgt();
  const pool = f.def.pool.filter((k) => !S.usedFins.has(k));
  const pick = pool.length ? pool : f.def.pool;
  const id = forceId && FINISHERS[forceId] ? forceId : pick[ri(0, pick.length - 1)];
  S.usedFins.add(id);
  const F = FINISHERS[id];
  S.fin = { id, ...F };
  S.energy = 0;
  S.cinePX = Math.max(34, Math.min(150, CINE_LINE - F.target));
  S.cineEX = S.cinePX + F.target;
  S.phase = "cineIn"; S.t = 0; S.hit = false;
  atkFx = createFx(F.mod, { x: pPos, y: GROUND, seed: ri(1, 900) });
  $("cineName").textContent = F.name;
  $("cineSub").textContent = F.el + " · FINISHER";
  paintButtons(); paintFin();
  hint("终结技：" + F.name);
}
function finisherHit() {
  const F = S.fin;
  const dmg = Math.round(ri(F.dmg[0], F.dmg[1]) * 1.35);
  const live = alive();
  for (const f of live) {
    const d = Math.max(1, Math.round(dmg * (f === tgt() ? 1 : 0.7)));
    f.hp = Math.max(0, f.hp - d);
    f.hitT = 0.34;
    f.F.vx += 200; f.F.vy += -700; f.F.air = true;
    addFx(uCrit, { x: f.F.x, y: GROUND + f.def.lift - 80, text: "-" + d });
    if (f.hp <= 0) killFoe(f);
  }
  S.slow = 0.18;
  impact(4, "foe", tgt());
  addFx(iCrit, { x: S.cineEX - 30, y: GROUND - 40, seed: ri(1, 900) });
  addFx(iFrame, { x: S.cineEX, y: GROUND - 40, seed: ri(1, 900) });
  flash("white");
  hint(F.name + " 全体 " + dmg);
  log("win", F.name + " 命中全体");
  paintFoeBars();
}

// ---- 结算 ----------------------------------------------------------------
function gameOver(win) {
  S.phase = "over";
  $("cine").classList.remove("on");
  $("ovTitle").textContent = win ? "通关" : "被打倒了";
  $("ovText").textContent = win
    ? "三只全清，用了 " + S.round + " 回合，剩下 " + Math.max(0, S.hp) + " HP。"
    : "倒在回合 " + S.round + "，还剩 " + alive().length + " 只。再来一次？";
  $("overlay").classList.remove("hide");
}
function restart() {
  $("overlay").classList.add("hide");
  $("cine").classList.remove("on");
  S.hp = S.maxhp; S.kills = 0; S.cd = [0, 0, 0, 0]; S.energy = 0;
  S.poison = 0; S.guardUp = false; S.round = 1; S.fin = null; S.breakFx = 0;
  floats.length = 0; rings.length = 0; atkFx = null; transFx = null;
  pPos = PX; pY = 0; pKb = 0;
  spawnWave();
  const f = pickActor();
  S.phase = "ready"; S.t = 0;
  paintBars(); paintButtons(); paintFin(); paintStatus();
  hint(f ? intentHint(f) : "选一招");
}

// ---- 主循环 --------------------------------------------------------------
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  try { step(dt); draw(); } catch (e) { console.error("frame error:", e && e.message); }
  requestAnimationFrame(tick);
}

function step(dt) {
  if (hitstop > 0) { hitstop -= dt; return; }
  const cineLike = ["cineIn", "cine", "cineOut"].includes(S.phase);
  for (const f of foes) physicsOf(f, dt);
  const pTarget = cineLike ? S.cinePX : (S.phase === "player" || S.phase === "pause") ? (S.dashTo ?? PX) : PX;
  pPos += (pTarget - pPos) * (1 - Math.exp(-dt * 16));
  const fr = tgt();
  const pYTarget = (S.phase === "player" || S.phase === "pause") ? Math.max(-52, Math.min(0, fr.F.y)) : 0;
  pY += (pYTarget - pY) * (1 - Math.exp(-dt * 11));
  const lbT = (S.phase === "cineIn" || S.phase === "cine") ? 16 : 0;
  lb += (lbT - lb) * (1 - Math.exp(-dt * 13));

  let d = dt;
  if (S.slow > 0) { S.slow -= dt; d = dt * 0.22; }
  const dEff = S.phase === "cine" ? d * 1.1 : d;
  S.t += dEff;
  if (S.breakFx > 0) S.breakFx = Math.max(0, S.breakFx - dt);

  for (const f of foes) {
    if (f.fx) f.fx.update(dEff);
    if (f.dotFx) { f.dotFx.update(dEff); if (f.dotFx.done()) f.dotFx = null; }
    if (f.alertFx) { f.alertFx.update(dEff); if (f.alertFx.done()) f.alertFx = null; }
    if (f.hitT > 0) f.hitT = Math.max(0, f.hitT - dt);
    if (f.sink > 0) f.sink = Math.max(0, f.sink - dt * 26);
    if (f.deathT > 0) f.deathT = Math.max(0, f.deathT - dt);
  }
  if (atkFx) atkFx.update(dEff);
  if (transFx) transFx.update(dEff);
  for (const t of TORCHES) t.update(dt);
  for (let i = floats.length - 1; i >= 0; i--) { floats[i].update(dEff); if (floats[i].done()) floats.splice(i, 1); }
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dEff; if (rings[i].t >= rings[i].life) rings.splice(i, 1); }
  if (shake > 0) shake = Math.max(0, shake - dt * 14);
  if (zoom > 0) zoom = Math.max(0, zoom - dt * 0.9);
  if (Math.abs(pKb) > 0.2) pKb *= Math.exp(-dt * 11); else pKb = 0;
  if (playerHit > 0) playerHit = Math.max(0, playerHit - dt);
  if (followT > 0) { followT -= dEff; if (followT <= 0 && S.phase === "player") doFollow(); }

  switch (S.phase) {
    case "player":
      if (!S.hit && S.t >= MOVES[S.moveIx].hit) { S.hit = true; resolveHit(); }
      if (atkFx && atkFx.done()) { atkFx = null; S.phase = "pause"; S.t = 0; }
      break;
    case "pause":
      if (S.t >= 0.32) enemyTurn();
      break;
    case "enemy":
      if (!S.hit && S.t >= 0.18) { S.hit = true; enemyStrike(); }
      if (S.t >= 0.92) endTurn();
      break;
    case "cineIn":
      if (S.t >= 0.5) { S.phase = "cine"; S.t = 0; $("cine").classList.add("on"); }
      break;
    case "cine":
      if (!S.hit && S.t >= (S.fin.hit || 0.6)) { S.hit = true; finisherHit(); }
      if (atkFx && atkFx.done()) { S.phase = "cineOut"; S.t = 0; $("cine").classList.remove("on"); atkFx = null; }
      break;
    case "cineOut":
      if (S.t >= 0.55) {
        S.fin = null;
        if (!alive().length) return;
        S.phase = "ready"; S.t = 0;
        hint(intentHint(foes[S.actor]));
        paintButtons(); paintFin();
      }
      break;
    case "clear":
      if (S.t >= 1.3) { $("cine").classList.remove("on"); gameOver(true); }
      break;
  }
}

// ---- 绘制 ----------------------------------------------------------------
function draw() {
  clearFrame(frame);
  frame.color.set(BG);

  const vis = foes.filter((f) => f.alive || f.deathT > 0).sort((a, b) => a.F.x - b.F.x);

  for (const t of TORCHES) t.draw(frame, "back");

  // 被打飞的速度线
  for (const f of vis) {
    const F = f.F;
    if (F.air && (Math.abs(F.vy) > 110 || Math.abs(F.vx) > 70)) {
      const sp = Math.hypot(F.vx, F.vy) || 1;
      const ux = -F.vx / sp, uy = -F.vy / sp, len = Math.min(64, sp * 0.11);
      const vp = painterFor(frame); vp.place(0, 0);
      const cy = GROUND + f.def.oy + f.def.lift + F.y;
      for (let i = 0; i < 6; i++) {
        const ox = rnd(-26, 26), oy = rnd(-40, 4);
        vp.line(F.x + ox, cy + oy, F.x + ox + ux * len, cy + oy + uy * len, hex("#ffffff"), 0.7);
      }
    }
    const jitter = f.hitT > 0 ? rnd(-1.5, 1.5) : 0;
    if (f.fx) {
      f.fx.options.x = F.x + jitter;
      f.fx.options.y = GROUND + f.def.oy + f.def.lift + F.y + (f.sink || 0);
      f.fx.draw(frame, "back");
    }
  }
  if (atkFx) atkFx.draw(frame, "back");

  // 玩家
  const lean = S.phase === "player" ? Math.sin(Math.min(1, S.t / 0.9) * Math.PI) * 7 : 0;
  if (atkFx) atkFx.options.x = pPos;
  const pTargetNow = (S.dashTo ?? PX);
  const dashing = (S.phase === "player" || S.phase === "pause") && Math.abs(pTargetNow - pPos) > 5;
  if (dashing) {
    const dir = Math.sign(pTargetNow - pPos) || 1;
    for (let i = 2; i >= 1; i--) {
      const gp = painterFor(frame);
      gp.place(pPos - dir * i * 8, GROUND + pY);
      drawActor(gp, ACTOR, 0.26);
    }
  }
  const p = painterFor(frame);
  p.place(pPos + lean + pKb + (playerHit > 0 ? rnd(-1.5, 1.5) : 0), GROUND + pY);
  drawActor(p, ACTOR, 1);

  if (atkFx) atkFx.draw(frame, "front");

  for (const f of vis) {
    const F = f.F;
    if (f.fx) {
      f.fx.options.x = F.x + (f.hitT > 0 ? rnd(-1.5, 1.5) : 0);
      f.fx.options.y = GROUND + f.def.oy + f.def.lift + F.y + (f.sink || 0);
      f.fx.draw(frame, "front");
    }
    // 受击白闪 / 泛红（逐只怪）
    if (f.hitT > 0.045) {
      const x0 = Math.max(0, Math.floor(F.x - 58)), x1 = Math.min(W, Math.ceil(F.x + 58));
      const y0 = Math.max(0, Math.floor(GROUND + f.def.lift - 106)), y1 = Math.min(H, Math.floor(GROUND + 4));
      const white = f.hitT > 0.2;
      for (let y = y0; y < y1; y++) {
        const row = y * W;
        for (let x = x0; x < x1; x++) {
          const c = frame.color[row + x];
          if (c >>> 24 === 0) continue;
          if (white) { frame.color[row + x] = 0xffffffff; flashN++; }
          else {
            const a = c >>> 24, r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
            frame.color[row + x] = (a << 24) | (Math.min(255, r * 1.15 + 55) & 255)
              | ((g * 0.5) & 255) << 8 | ((b * 0.5) & 255) << 16;
            whiteN++;
          }
        }
      }
    }
    if (f.dotFx) { f.dotFx.options.x = F.x; f.dotFx.options.y = GROUND + f.def.oy + f.def.lift + 6 + F.y; f.dotFx.draw(frame, "front"); }
    if (f.alertFx) { f.alertFx.options.x = F.x; f.alertFx.options.y = GROUND + f.def.oy + f.def.lift + F.y - 6; f.alertFx.draw(frame, "front"); }
  }

  for (const t of TORCHES) t.draw(frame, "front");

  if (rings.length) {
    const rp = painterFor(frame); rp.place(0, 0);
    for (const r of rings) {
      const k = r.t / r.life;
      const rad = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 2));
      if (k < 0.82) rp.ring(r.x, r.y, rad, 2, hex(r.c), 1);
      rp.ring(r.x, r.y, Math.max(2, rad * 0.52), 1, hex(r.c), Math.max(0, 0.85 - k));
    }
  }
  for (const fl of floats) fl.draw(frame, "front");
  if (transFx) transFx.draw(frame, "front");

  drawOverlays(vis);

  if (S.breakFx > 0) {
    const pp = painterFor(frame); pp.place(0, 0);
    drawText(pp, "BREAK!", W / 2, GROUND - 118, hex("#ffe066"), "big", 2, "center");
    if (S.breakFx > 0.6) drawText(pp, "BREAK!", W / 2, GROUND - 118, hex("#ffffff"), "big", 2, "center");
  }

  const bh = Math.round(lb);
  if (bh > 0) {
    frame.color.fill(0xff000000, 0, W * bh);
    frame.color.fill(0xff000000, W * (H - bh), W * bh);
  }

  composite(frame, img.data, null, 1);
  octx.putImageData(img, 0, 0);

  const sx = shake > 0 ? Math.round(rnd(-shake, shake)) : 0;
  const sy = shake > 0 ? Math.round(rnd(-shake, shake)) : 0;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W * SCALE, H * SCALE);
  const dw = Math.round(W * SCALE * (1 + zoom));
  const dh = Math.round(H * SCALE * (1 + zoom));
  ctx.drawImage(off, sx * SCALE - (dw - W * SCALE) / 2, sy * SCALE - (dh - H * SCALE) / 2, dw, dh);
}

/** 意图框 + 头顶血条 + 目标箭头 */
function drawOverlays(vis) {
  const pp = painterFor(frame);
  pp.place(0, 0);
  for (const f of vis) {
    if (!f.alive) continue;
    const F = f.F;
    const top = GROUND - f.def.uiY + F.y;
    const isTarget = f === foes[S.target];
    const isActor = f === foes[S.actor];

    // 头顶血条
    const bw = 38, bx = Math.round(F.x - bw / 2), by = Math.round(top - 8);
    pp.rect(bx, by, bw, 3, hex("#0a0910"), 0.9);
    const ratio = Math.max(0, f.hp / f.maxhp);
    pp.rect(bx, by, Math.round(bw * ratio), 3, isTarget ? hex("#ff8a5a") : hex("#c04048"), 1);
    if (isTarget) {
      pp.rect(bx - 1, by - 1, bw + 2, 1, hex("#ffd18a"), 1);
      pp.rect(bx - 1, by + 3, bw + 2, 1, hex("#ffd18a"), 1);
      // 目标下箭头
      pp.tri(F.x - 3, top - 16, F.x + 3, top - 16, F.x, top - 11, hex("#ffd18a"));
    }
    // 意图框（只给行动者，其他画待机点）
    if (f.intent) {
      const col = hex((INTENT[f.intent.type] || INTENT.attack).c);
      const iy = by - 20;
      pp.rect(F.x - 17, iy, 34, 12, hex("#08070d"), 0.88);
      pp.rect(F.x - 17, iy, 34, 1, col, 1);
      drawIcon(pp, f.intent.type, F.x - 10, iy + 1, col);
      if (f.intent.dmg > 0) drawText(pp, String(f.intent.dmg), F.x + 7, iy + 3, col, "mini", 1, "center");
      else drawText(pp, "!", F.x + 7, iy + 3, col, "mini", 1, "center");
    } else {
      for (let i = 0; i < 3; i++) pp.dot(F.x - 4 + i * 4, by - 12, hex("#4b4560"));
    }
  }
}

// ---- 界面 ----------------------------------------------------------------
function paintBars() {
  $("php").style.transform = "scaleX(" + clamp01(S.hp / S.maxhp) + ")";
  $("pht").textContent = Math.max(0, S.hp);
}
function paintFoeBars() {
  const box = $("foeBars");
  box.innerHTML = foes.map((f, i) => {
    const pct = Math.max(0, Math.round((f.hp / f.maxhp) * 100));
    return '<div class="fbar' + (f.alive ? "" : " dead") + (i === S.target && f.alive ? " tgt" : "") + '" data-i="' + i + '">'
      + '<span class="fn">' + f.def.name + '</span>'
      + '<div class="ftrack"><i style="width:' + pct + '%"></i></div>'
      + '<b>' + Math.max(0, f.hp) + '</b></div>';
  }).join("");
  box.querySelectorAll(".fbar").forEach((el) => {
    el.addEventListener("click", () => {
      const i = +el.dataset.i;
      if (!foes[i] || !foes[i].alive) return;
      S.target = i;
      paintFoeBars(); paintButtons();
    });
  });
}
function paintStatus() {
  const e = [];
  const f = foes[S.actor];
  if (f && f.intent && f.alive) e.push('<span>' + f.def.name + ' · ' + (f.intent.type === "heavy" ? "蓄力" : f.intent.type === "attack" ? "攻击" : f.intent.type === "guard" ? "举盾" : f.intent.type === "debuff" ? "放毒" : "被打断") + '</span>');
  $("estatus").innerHTML = e.length ? e.join("") : '<span class="none">没有威胁</span>';
  const p = [];
  if (S.poison > 0) p.push('<span>☠<b class="tag">' + S.poison + '</b></span>');
  $("pstatus").innerHTML = p.length ? p.join("") : '<span class="none">无状态</span>';
}

const btns = [...document.querySelectorAll(".mv")];
function previewOf(i) {
  const m = MOVES[i];
  const f = tgt();
  let lo = m.dmg[0], hi = m.dmg[1];
  if (m.area) { lo = Math.max(1, Math.round(lo * 0.75)); hi = Math.max(1, Math.round(hi * 0.75)); }
  if (f && f.guard) { lo = Math.round(lo * 0.6); hi = Math.round(hi * 0.6); }
  const critHi = Math.round(hi * 1.35);
  const hp = f ? f.hp : 0;
  return { lo, hi, critHi, kill: lo >= hp, chance: critHi >= hp };
}
function paintButtons() {
  const f = tgt();
  const canBreak = f && f.intent && f.intent.type === "heavy";
  btns.forEach((b, i) => {
    if (i === 4) return;
    const cool = S.cd[i] > 0;
    b.classList.toggle("cool", cool);
    b.classList.toggle("busy", S.phase !== "ready" || cool);
    b.querySelector("u").style.width = cool ? "100%" : "0";
    if (i === 1) b.classList.toggle("hint-break", canBreak && !cool);
    const pv = previewOf(i);
    const dmgEl = b.querySelector("s");
    if (dmgEl) dmgEl.textContent = pv.lo + "-" + pv.hi;
    b.classList.toggle("lethal", pv.kill && S.phase === "ready");
    b.classList.toggle("chance", !pv.kill && pv.chance && S.phase === "ready");
  });
  paintFin();
}
function paintFin() {
  const b = btns[4];
  const armed = S.energy >= MAX_ENERGY;
  b.classList.toggle("armed", armed);
  b.classList.toggle("busy", S.phase !== "ready" || !armed);
  b.querySelector("u").style.width = clamp01(S.energy / MAX_ENERGY) * 100 + "%";
  $("finTip").textContent = armed ? "就绪 · 按 5 释放" : "能量 " + Math.round(S.energy) + " / " + MAX_ENERGY;
  const f = tgt();
  const flo = 24, fhi = 61;
  const fd = $("finDmg");
  if (fd) fd.textContent = flo + "-" + fhi;
  b.classList.toggle("lethal", armed && f && flo >= f.hp && S.phase === "ready");
}

const hintEl = $("hint");
function hint(s) { hintEl.textContent = "R" + S.round + " · " + s; }
function log(kind, text) {
  S.log.unshift({ kind, text, r: S.round });
  if (S.log.length > 6) S.log.pop();
  $("log").innerHTML = S.log.map((e) =>
    '<li class="' + e.kind + '"><span>R' + e.r + '</span><b>' + e.text + '</b></li>').join("");
}

const fl = $("flash");
let flashT = 0;
function flash(kind) {
  fl.classList.remove("white", "micro");
  if (kind) fl.classList.add(kind);
  fl.classList.add("on");
  clearTimeout(flashT);
  flashT = setTimeout(() => fl.classList.remove("on", "white", "micro"), kind === "white" ? 150 : kind === "micro" ? 55 : 90);
}

btns.forEach((b) => b.addEventListener("click", () => chooseMove(+b.dataset.i)));
$("ovBtn").addEventListener("click", restart);
addEventListener("keydown", (e) => {
  const i = "12345".indexOf(e.key);
  if (i >= 0) { e.preventDefault(); chooseMove(i); }
  if (e.key === "Tab") { e.preventDefault(); const l = alive(); if (l.length) { S.target = foes.indexOf(l[(l.indexOf(tgt()) + 1) % l.length]); paintFoeBars(); paintButtons(); } }
});
// 点画面切目标
cv.addEventListener("pointerdown", (e) => {
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * W;
  let best = -1, bd = 60;
  foes.forEach((f, i) => {
    if (!f.alive) return;
    const d = Math.abs(f.F.x - x);
    if (d < bd) { bd = d; best = i; }
  });
  if (best >= 0) { S.target = best; paintFoeBars(); paintButtons(); }
});

// ---- 启动 ----------------------------------------------------------------
spawnWave();
const f0 = pickActor();
paintBars(); paintButtons(); paintFin(); paintStatus();
hint(f0 ? intentHint(f0) : "选一招");
requestAnimationFrame(tick);

window.__game = {
  S, foes, chooseMove, MOVES, FINISHERS, addEnergy, startFinisher, paintButtons, previewOf, log,
  dbg: () => ({
    hitstop, zoom, rings: rings.length, flashN, whiteN, wallHits, floorHits,
    audio: !!AC && AC.state,
    pY: +pY.toFixed(1), pPos: +pPos.toFixed(1),
    foes: foes.map((f) => ({ name: f.def.name, hp: f.hp, alive: f.alive, intent: f.intent && f.intent.type,
      x: +f.F.x.toFixed(1), y: +f.F.y.toFixed(1), vy: Math.round(f.F.vy), air: f.F.air })),
    target: S.target, actor: S.actor, phase: S.phase,
  }),
};
