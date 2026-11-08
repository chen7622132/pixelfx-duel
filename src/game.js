// 像素对决 —— v1.2「完全信息」版
// 轮 1-3：敌方意图预告（图标+数字）· 打断因果可视化 · 状态图标化
// 设计依据：Into the Breach 的「敌人意图全公开」与 Slay the Spire 的 intent 系统
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
import * as iFlash from "../vendor/pixelfx/fx/impacts/hit-flash.js";
import * as sBurning from "../vendor/pixelfx/fx/status/burning.js";
import * as sPoison from "../vendor/pixelfx/fx/status/poisoned.js";
import * as sBleed from "../vendor/pixelfx/fx/status/bleeding.js";
import * as sStun from "../vendor/pixelfx/fx/status/stunned.js";
import * as cSlime from "../vendor/pixelfx/fx/critters/slime.js";
import * as cBat from "../vendor/pixelfx/fx/critters/bat.js";
import * as cGhost from "../vendor/pixelfx/fx/critters/ghost.js";
import * as uDmg from "../vendor/pixelfx/fx/ui/damage-number.js";
import * as uCrit from "../vendor/pixelfx/fx/ui/crit-number.js";
import * as uAlert from "../vendor/pixelfx/fx/ui/exclamation.js";
import * as fTorch from "../vendor/pixelfx/fx/fire/torch.js";
import * as tBurn from "../vendor/pixelfx/fx/transitions/burn-away.js";

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
const GROUND = 152, PX = 118, EX = 196, CINE_LINE = 262, MAX_ENERGY = 100;

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
  createFx(fTorch, { x: 26, y: GROUND + 10, seed: 11 }),
  createFx(fTorch, { x: 294, y: GROUND + 10, seed: 23 }),
];

// ---- 内容表 --------------------------------------------------------------
const MOVES = [
  { mod: mSword,  name: "疾斩",   dmg: [8, 11],  hit: 0.06, power: 1, cd: 0,
    follow: { dmg: [3, 4], t: 0.24 } },
  { mod: mThrust, name: "突刺",   dmg: [10, 13], hit: 0.07, power: 2, cd: 1, break: true,
    follow: { dmg: [4, 5], t: 0.26 } },
  { mod: mHammer, name: "碎地锤", dmg: [22, 27], hit: 0.15, power: 3, cd: 2, stun: true,
    follow: { dmg: [6, 7], t: 0.34 } },
  { mod: mSpin,   name: "回旋斩", dmg: [9, 12],  hit: 0.17, power: 2, cd: 1, bleed: true,
    follow: { dmg: [4, 5], t: 0.3 } },
];

const FINISHERS = {
  "fireball-throw":  { mod: gFireball,  name: "火球投掷", el: "FIRE",    dmg: [34, 44], target: 190, hit: 1.41 },
  "earth-stomp":     { mod: gStomp,     name: "大地践踏", el: "EARTH",   dmg: [32, 40], target: 112, hit: 0.06 },
  "ground-pound":    { mod: gPound,     name: "坠落重击", el: "IMPACT",  dmg: [33, 42], target: 80,  hit: 0.62 },
  "sword-combo":     { mod: gCombo,     name: "三段连斩", el: "BLADE",   dmg: [30, 39], target: 118, hit: 0.06 },
  "lightning-call":  { mod: gLightning, name: "引雷",     el: "THUNDER", dmg: [35, 46], target: 130, hit: 0.76 },
  "ice-lance-throw": { mod: gIce,       name: "冰枪投掷", el: "FROST",   dmg: [33, 43], target: 170, hit: 1.14 },
  "dash-strike":     { mod: gDash,      name: "疾风突袭", el: "BLADE",   dmg: [30, 39], target: 176, hit: 0.22 },
  "meteor-call":     { mod: gMeteor,    name: "召唤陨石", el: "METEOR",  dmg: [38, 50], target: 170, hit: 1.52 },
  "holy-smite":      { mod: gHoly,      name: "圣光制裁", el: "HOLY",    dmg: [35, 46], target: 118, hit: 0.47 },
  "rocket-launcher": { mod: gRocket,    name: "火箭筒",   el: "BLAST",   dmg: [37, 48], target: 200, hit: 0.6 },
  "pistol-shots":    { mod: gPistol,    name: "三连射",   el: "SHOT",    dmg: [28, 37], target: 180, hit: 0.26 },
  "arrow-shot":      { mod: gArrow,     name: "穿云箭",   el: "ARROW",   dmg: [30, 39], target: 180, hit: 0.8 },
};

const FOES = [
  { mod: cSlime, name: "史莱姆", hp: 52, dmg: [5, 7],  oy: -6,  h: 88,  heal: 14,
    pool: ["fireball-throw", "earth-stomp", "ground-pound", "sword-combo"] },
  { mod: cBat,   name: "蝙蝠",   hp: 64, dmg: [6, 9],  oy: -34, h: 80,  heal: 16,
    pool: ["lightning-call", "ice-lance-throw", "dash-strike", "meteor-call"] },
  { mod: cGhost, name: "幽魂",   hp: 78, dmg: [8, 11], oy: -10, h: 100, heal: 18,
    pool: ["holy-smite", "rocket-launcher", "pistol-shots", "arrow-shot"] },
];

// 意图类型：色 / 提示
const INTENT = {
  attack: { c: "#ffd9a0", text: "攻击" },
  heavy:  { c: "#ff5a4a", text: "蓄力重击" },
  debuff: { c: "#7ee06a", text: "放毒" },
  guard:  { c: "#8ab4ff", text: "举盾" },
  stunned: { c: "#8f89a8", text: "被打断" },
};

// ---- 状态 ----------------------------------------------------------------
const curFoe = () => FOES[S.foeIx] || FOES[FOES.length - 1];
const CRIT_PAL = ["#2a1a05", "#5a3a08", "#a06a0c", "#e8b030", "#ffe066", "#fff3c0", "#ffffff"];

const S = {
  phase: "ready",
  t: 0,
  hp: 120, maxhp: 120,
  foeIx: 0, fhp: 52, fmaxhp: 52,
  cd: [0, 0, 0, 0],
  moveIx: 0, hit: false,
  stun: false, bleed: 0, poison: 0, foeGuard: false,
  intent: null,
  energy: 0,
  round: 1,
  kills: 0,
  fin: null, cinePX: PX, cineEX: EX, slow: 0,
  breakFx: 0,
  usedFins: new Set(),
  log: [],
};
let atkFx = null, foeFx = null, foeDotFx = null, transFx = null, alertFx = null;
const floats = [];
let shake = 0, foeHit = 0, playerHit = 0, lb = 0;
// —— 打击感 ——
let hitstop = 0;      // 顿帧：完全静止，打击的"咬合感"
let zoom = 0;         // 镜头猛推
let foeKb = 0;        // 击退位移（弹簧回位）
let foeSink = 0;      // 受击下沉
let pKb = 0;          // 玩家被击退
let followT = 0;      // 追击段计时
let flashN = 0;       // 受击白闪像素数（自检用）
let whiteN = 0;       // 泛红像素数
let AC = null;        // WebAudio
const rings = [];     // 打击点的冲击环
function addRing(x, y, power) {
  rings.push({
    x, y, t: 0, life: 0.17,
    r0: 4 + power * 3, r1: 22 + power * 11,
    c: power >= 3 ? "#ffe066" : power >= 2 ? "#ffd0a0" : "#ffffff",
  });
}

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
function impact(power, on = "foe") {
  const P = [
    { stop: 0.06,  shake: 3, zoom: 0.035, kb: 9,  sink: 4 },
    { stop: 0.085, shake: 4, zoom: 0.055, kb: 14, sink: 6 },
    { stop: 0.125, shake: 6, zoom: 0.08,  kb: 20, sink: 8 },
    { stop: 0.21,  shake: 9, zoom: 0.12,  kb: 34, sink: 10 },
  ][Math.max(0, Math.min(3, power - 1))];
  hitstop = Math.max(hitstop, P.stop);
  shake = Math.max(shake, P.shake);
  zoom = Math.max(zoom, P.zoom);
  if (on === "foe") {
    foeKb += P.kb;
    foeSink = Math.max(foeSink, P.sink);
    addRing(ePos + foeKb, GROUND - 34, power);
  } else {
    pKb -= P.kb * 0.7;
  }
  flash(power >= 3 ? "white" : "micro");
  sfx(power);
}
let pPos = PX, ePos = EX;

const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.round(rnd(a, b));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const $ = (id) => document.getElementById(id);

// ---- 像素文字 ------------------------------------------------------------
function drawText(p, str, x, y, color, font = "mini", k = 1, align = "center") {
  const w = textWidth(str, font) * k;
  const ox = align === "center" ? Math.round(x - w / 2) : align === "right" ? x - w : x;
  rasterText(str, font, (gx, gy) => {
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) p.px(ox + gx * k + dx, y + gy * k + dy, color);
  });
}

// ---- 意图图标 ------------------------------------------------------------
function drawIcon(p, kind, x, y, c) {
  if (kind === "attack") {            // 斜置短剑
    p.line(x - 2, y + 9, x + 3, y + 1, c);
    p.line(x - 3, y + 7, x, y + 10, c);
    p.dot(x + 3, y + 1, c);
  } else if (kind === "heavy") {      // 感叹号
    p.rect(x - 1, y, 2, 6, c);
    p.rect(x - 1, y + 8, 2, 2, c);
  } else if (kind === "debuff") {     // 三个气泡
    p.disc(x - 2, y + 3, 1.6, c);
    p.disc(x + 2, y + 6, 1.2, c);
    p.disc(x, y + 9, 1.0, c);
  } else {                            // 盾
    p.rect(x - 3, y + 1, 6, 5, c);
    p.rect(x - 2, y + 6, 4, 2, c);
    p.rect(x - 1, y + 8, 2, 1, c);
  }
}

function drawIntent() {
  if (!S.intent) return;
  if (["kill", "over", "cineIn", "cine", "cineOut"].includes(S.phase)) return;
  const I = S.intent, f = curFoe();
  const cx = Math.round(ePos);
  const y = GROUND + f.oy - f.h - 20;
  const meta = INTENT[I.type] || INTENT.attack;
  const col = hex(meta.c);
  const p = painterFor(frame);
  p.place(0, 0);
  p.rect(cx - 19, y, 38, 13, hex("#08070d"), 0.86);
  p.rect(cx - 19, y, 38, 1, col, 1);
  p.rect(cx - 19, y + 12, 38, 1, col, 0.45);
  drawIcon(p, I.type, cx - 11, y + 2, col);
  if (I.dmg > 0) drawText(p, String(I.dmg), cx + 7, y + 4, col, "mini", 1, "center");
  else drawText(p, "!", cx + 7, y + 4, col, "mini", 1, "center");
  // 可打断标记
  if (I.type === "heavy") {
    const bx = cx + 22;
    p.rect(bx, y + 3, 1, 7, hex("#ff5a4a"), 1);
    p.rect(bx + 3, y + 3, 1, 7, hex("#ff5a4a"), 1);
  }
}

// ---- 回合逻辑 ------------------------------------------------------------
function addFx(mod, o) {
  const f = createFx(mod, o);
  floats.push(f);
  return f;
}

function rollIntent() {
  const f = curFoe();
  const base = ri(f.dmg[0], f.dmg[1]);
  const r = Math.random();
  if (r < 0.26 && S.round > 1) return { type: "heavy", dmg: Math.round(base * 1.9) };
  if (r < 0.42) return { type: "debuff", dmg: 0 };
  if (r < 0.54) return { type: "guard", dmg: 0 };
  return { type: "attack", dmg: base };
}

function intentHint(I) {
  if (I.type === "attack") return "对手将攻击 " + I.dmg + " 点";
  if (I.type === "heavy") return "对手在蓄力 " + I.dmg + " 点重击 —— 突刺可打断";
  if (I.type === "debuff") return "对手要放毒雾 —— 会中毒 3 回合";
  return "对手要举盾 —— 你的伤害会 -40%";
}

function spawnFoe() {
  const f = curFoe();
  S.fmaxhp = f.hp; S.fhp = f.hp;
  S.bleed = 0; S.stun = false; S.foeGuard = false;
  foeFx = createFx(f.mod, { x: EX, y: GROUND + f.oy, seed: ri(1, 900) });
  foeDotFx = null; alertFx = null;
  $("ename").textContent = f.name;
  S.usedFins = new Set();
  S.intent = null;
}

function setFoeDot(kind) {
  const mod = kind === "burn" ? sBurning : kind === "bleed" ? sBleed : null;
  if (mod) foeDotFx = createFx(mod, { x: ePos, y: GROUND + curFoe().oy + 6, seed: 7 });
}

function chooseMove(i) {
  ensureAudio();
  if (S.phase !== "ready") return;
  if (i === 4) return startFinisher();
  if (S.cd[i] > 0) return;
  const m = MOVES[i];
  S.phase = "player"; S.t = 0; S.hit = false; S.moveIx = i;
  S.cd = S.cd.map((c) => Math.max(0, c - 1));
  S.cd[i] = m.cd;
  atkFx = createFx(m.mod, { x: pPos, y: GROUND, seed: ri(1, 900) });
  hint(m.name);
  paintButtons();
}

function resolveHit() {
  const m = MOVES[S.moveIx];
  let dmg = ri(m.dmg[0], m.dmg[1]);
  let crit = Math.random() < 0.12 || (m.stun && Math.random() < 0.3);
  let broke = false, guarded = false;
  if (m.break && S.intent && S.intent.type === "heavy") {
    broke = true; dmg = Math.round(dmg * 1.5); crit = true;
    S.intent = { type: "stunned", dmg: 0 };
    S.breakFx = 0.7;
    addFx(iSpark, { x: ePos, y: GROUND - 40, seed: ri(1, 900) });
  }
  if (crit) dmg = Math.round(dmg * 1.35);
  if (S.foeGuard) { dmg = Math.round(dmg * 0.6); S.foeGuard = false; guarded = true; }
  S.fhp = Math.max(0, S.fhp - dmg);
  addEnergy(14);
  foeHit = 0.22;
  impact(Math.min(4, m.power + (crit ? 1 : 0)));
  { const pop = { x: ePos + ri(-8, 8), y: GROUND - 72, text: "-" + dmg }; if (crit) pop.palette = CRIT_PAL; addFx(uDmg, pop); }
  addFx(crit ? iCrit : iBlunt, { x: ePos - 20, y: GROUND - 26, seed: ri(1, 900) });
  addFx(iFlash, { x: ePos, y: GROUND - 26, seed: ri(1, 900) });
  if (crit) addFx(iFrame, { x: ePos, y: GROUND - 34, seed: ri(1, 900) });
  if (m.follow) followT = m.follow.t;
  if (m.stun) { S.stun = true; addFx(sStun, { x: ePos, y: GROUND - 62, seed: 3 }); }
  if (m.bleed && !S.bleed) { S.bleed = 3; setFoeDot("bleed"); }
  hint(broke ? "识破！打断蓄力，造成 " + dmg : guarded ? "被护盾吸收，仅 " + dmg : crit ? "暴击 " + dmg : "命中 " + dmg);
  log("hit", m.name + " · " + dmg + (broke ? "（打断）" : guarded ? "（被盾吸收）" : crit ? "（暴击）" : "") + (S.fhp <= 0 ? " · 击杀" : ""));
  paintBars(); paintStatus();
}

function doFollow() {
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

function endTurn() {
  S.cd = S.cd.map((c) => Math.max(0, c - 1));
  if (S.fhp <= 0) return startKill();
  if (S.hp <= 0) return gameOver(false);
  S.phase = "ready"; S.t = 0; S.round += 1;
  S.intent = rollIntent();
  if (S.intent.type === "heavy") {
    alertFx = createFx(uAlert, { x: ePos, y: GROUND + curFoe().oy - 6, seed: ri(1, 900) });
  }
  hint(intentHint(S.intent));
  paintButtons(); paintStatus();
}

function enemyTurn() {
  if (S.fhp <= 0) return startKill();
  let dot = 0;
  if (S.bleed > 0) { S.bleed -= 1; dot += 3; }
  if (S.poison > 0) { S.poison -= 1; S.hp = Math.max(0, S.hp - 3); }
  if (dot) {
    S.fhp = Math.max(0, S.fhp - dot);
    addFx(uDmg, { x: ePos + ri(-8, 8), y: GROUND - 66, text: "-" + dot });
    log("hit", "流血持续 -" + dot);
    paintBars();
    if (S.fhp <= 0) return startKill();
  }
  if (S.stun) {
    S.stun = false;
    addFx(sStun, { x: ePos, y: GROUND - 62, seed: 5 });
    hint("对手被击晕，跳过回合");
    paintStatus();
    return endTurn();
  }
  if (S.intent && S.intent.type === "stunned") {
    hint("蓄力被打断，对手这回合动不了");
    return endTurn();
  }
  S.phase = "enemy"; S.t = 0; S.hit = false;
  hint(S.intent ? intentHint(S.intent) : "对手反击…");
  paintStatus();
}

function enemyStrike() {
  const I = S.intent || { type: "attack", dmg: 6 };
  if (I.type === "guard") {
    S.foeGuard = true;
    addFx(iShield, { x: ePos, y: GROUND - 30, seed: 3 });
    hint("对手举起了护盾");
    log("sys", "对手举盾 · 下次伤害 -40%");
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
  addEnergy(8);
  const heavy = I.type === "heavy";
  playerHit = 0.26;
  impact(heavy ? 3 : 1, "player");
  sfxHurt();
  addFx(heavy ? uCrit : uDmg, { x: pPos + ri(-6, 6), y: GROUND - 58, text: "-" + dmg });
  addFx(heavy ? iCrit : iBlunt, { x: pPos + 16, y: GROUND - 24, seed: ri(1, 900) });
  if (heavy) addFx(iFrame, { x: pPos, y: GROUND - 34, seed: ri(1, 900) });
  flash(heavy ? "red" : "red");
  hint(heavy ? "重击 " + dmg + "！" : "受到 " + dmg + " 伤害");
  log("hurt", (heavy ? "重击" : "攻击") + " · -" + dmg);
  paintBars();
}

// ---- 终结技 --------------------------------------------------------------
function addEnergy(n) {
  S.energy = Math.min(MAX_ENERGY, S.energy + n);
  paintFin();
}

function startFinisher(forceId) {
  if (S.energy < MAX_ENERGY) { hint("能量不足（" + S.energy + " / " + MAX_ENERGY + "）"); return; }
  const pool = curFoe().pool.filter((k) => !S.usedFins.has(k));
  const pick = pool.length ? pool : curFoe().pool;
  const id = forceId && FINISHERS[forceId] ? forceId : pick[ri(0, pick.length - 1)];
  S.usedFins.add(id);
  const F = FINISHERS[id];
  S.fin = { id, ...F };
  S.energy = 0;
  S.cinePX = Math.max(34, Math.min(200, CINE_LINE - F.target));
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
  S.fhp = Math.max(0, S.fhp - dmg);
  foeHit = 0.34; S.slow = 0.18;
  impact(4);
  addFx(uCrit, { x: ePos, y: GROUND - 80, text: "-" + dmg });
  addFx(iCrit, { x: ePos - 30, y: GROUND - 40, seed: ri(1, 900) });
  addFx(iFrame, { x: ePos, y: GROUND - 40, seed: ri(1, 900) });
  addFx(iFlash, { x: ePos, y: GROUND - 30, seed: ri(1, 900) });
  flash("white");
  hint(F.name + " " + dmg + " 伤害");
  paintBars();
}

// ---- 结算 ----------------------------------------------------------------
function startKill() {
  S.phase = "kill"; S.t = 0;
  S.intent = null;
  transFx = createFx(tBurn, { x: W / 2, y: H / 2, seed: ri(1, 900) });
  hint("击败 " + curFoe().name);
  log("win", "击败 " + curFoe().name);
  paintStatus();
}

function nextFoe() {
  const heal = curFoe().heal;
  S.hp = Math.min(S.maxhp, S.hp + heal);
  S.kills += 1; S.foeIx += 1;
  transFx = null;
  paintBars();
  if (S.foeIx >= FOES.length) return gameOver(true);
  spawnFoe();
  S.phase = "ready"; S.t = 0;
  S.intent = rollIntent();
  paintBars(); paintButtons(); paintStatus();
  hint(curFoe().name + " 出现了（回复 " + heal + " HP）· " + intentHint(S.intent));
}

function gameOver(win) {
  S.phase = "over"; S.intent = null;
  foeFx = null; foeDotFx = null; alertFx = null;
  $("ovTitle").textContent = win ? "通关" : "被打倒了";
  $("ovText").textContent = win
    ? "三只怪全部清掉，用了 " + S.round + " 回合。12 个终结技都摸过了。"
    : "倒在" + curFoe().name + "面前，第 " + S.round + " 回合。再来一次？";
  $("overlay").classList.remove("hide");
}

function restart() {
  $("overlay").classList.add("hide");
  S.hp = S.maxhp; S.foeIx = 0; S.kills = 0; S.cd = [0, 0, 0, 0]; S.energy = 0;
  S.bleed = 0; S.poison = 0; S.stun = false; S.foeGuard = false; S.round = 1;
  S.fin = null; S.breakFx = 0;
  floats.length = 0; atkFx = null; transFx = null; alertFx = null;
  pPos = PX; ePos = EX;
  spawnFoe();
  S.intent = rollIntent();
  S.phase = "ready"; S.t = 0;
  paintBars(); paintButtons(); paintFin(); paintStatus();
  hint(intentHint(S.intent));
}

// ---- 主循环 --------------------------------------------------------------
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  try {
    step(dt);
    draw();
  } catch (e) {
    console.error("frame error:", e && e.message);
  }
  requestAnimationFrame(tick);
}

function step(dt) {
  // 顿帧：完全静止，连特效一起停 —— 这是打击感的"咬合"
  if (hitstop > 0) { hitstop -= dt; return; }
  const cineLike = ["cineIn", "cine", "cineOut"].includes(S.phase);
  pPos += ((cineLike ? S.cinePX : PX) - pPos) * (1 - Math.exp(-dt * 9));
  ePos += ((cineLike ? S.cineEX : EX) - ePos) * (1 - Math.exp(-dt * 9));
  const lbT = (S.phase === "cineIn" || S.phase === "cine") ? 16 : 0;
  lb += (lbT - lb) * (1 - Math.exp(-dt * 13));

  let d = dt;
  if (S.slow > 0) { S.slow -= dt; d = dt * 0.22; }
  const dEff = S.phase === "cine" ? d * 1.1 : d;
  S.t += dEff;
  if (S.breakFx > 0) S.breakFx = Math.max(0, S.breakFx - dt);

  if (foeFx) foeFx.update(dEff);
  if (foeDotFx) { foeDotFx.update(dEff); if (foeDotFx.done()) foeDotFx = null; }
  if (alertFx) { alertFx.update(dEff); if (alertFx.done()) alertFx = null; }
  if (atkFx) atkFx.update(dEff);
  if (transFx) transFx.update(dEff);
  for (const t of TORCHES) t.update(dt);
  for (let i = floats.length - 1; i >= 0; i--) {
    floats[i].update(dEff);
    if (floats[i].done()) floats.splice(i, 1);
  }
  if (shake > 0) shake = Math.max(0, shake - dt * 14);
  if (zoom > 0) zoom = Math.max(0, zoom - dt * 0.9);
  if (foeKb > 0.2) foeKb *= Math.exp(-dt * 11); else foeKb = 0;
  if (Math.abs(pKb) > 0.2) pKb *= Math.exp(-dt * 11); else pKb = 0;
  if (foeSink > 0) foeSink = Math.max(0, foeSink - dt * 26);
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dEff; if (rings[i].t >= rings[i].life) rings.splice(i, 1); }
  if (followT > 0) { followT -= dEff; if (followT <= 0 && S.phase === "player") doFollow(); }
  if (foeHit > 0) foeHit = Math.max(0, foeHit - dt);
  if (playerHit > 0) playerHit = Math.max(0, playerHit - dt);

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
      if (atkFx && atkFx.done()) {
        S.phase = "cineOut"; S.t = 0;
        $("cine").classList.remove("on");
        atkFx = null;
      }
      break;
    case "cineOut":
      if (S.t >= 0.55) {
        S.fin = null;
        if (S.fhp <= 0) return nextFoe();
        S.phase = "ready"; S.t = 0;
        hint(intentHint(S.intent));
        paintButtons(); paintFin();
      }
      break;
    case "kill":
      if (S.t >= 1.05) nextFoe();
      break;
  }
}

function draw() {
  clearFrame(frame);
  frame.color.set(BG);

  const lunge = S.phase === "enemy" ? Math.sin(Math.min(1, S.t / 0.9) * Math.PI) * 42 : 0;
  const jitter = foeHit > 0 ? rnd(-1.5, 1.5) : 0;
  if (foeFx) {
    foeFx.options.x = ePos - lunge + jitter + foeKb;
    foeFx.options.y = GROUND + curFoe().oy + foeSink;
  }
  if (foeDotFx) foeDotFx.options.x = ePos;
  if (alertFx) alertFx.options.x = ePos;

  for (const t of TORCHES) t.draw(frame, "back");
  if (foeFx) foeFx.draw(frame, "back");
  if (atkFx) atkFx.draw(frame, "back");

  const lean = S.phase === "player" ? Math.sin(Math.min(1, S.t / 0.9) * Math.PI) * 7 : 0;
  if (atkFx) atkFx.options.x = pPos;
  const p = painterFor(frame);
  p.place(pPos + lean + pKb + (playerHit > 0 ? rnd(-1.5, 1.5) : 0), GROUND);
  drawActor(p, ACTOR, 1);

  if (atkFx) atkFx.draw(frame, "front");
  if (foeFx) foeFx.draw(frame, "front");
  // 受击白闪：把敌人矩形内的非透明像素全部刷白（2 帧）
  if (foeHit > 0.045) {
    const x0 = Math.max(0, Math.floor(ePos + foeKb - 58));
    const x1 = Math.min(W, Math.ceil(ePos + foeKb + 58));
    const y0 = Math.max(0, Math.floor(GROUND - 106));
    const y1 = Math.min(H, Math.floor(GROUND + 2));
    const white = foeHit > 0.19;              // 前 ~2 帧：整体变白
    for (let y = y0; y < y1; y++) {
      const row = y * W;
      for (let x = x0; x < x1; x++) {
        const c = frame.color[row + x];
        if (c >>> 24 === 0) continue;
        if (white) { frame.color[row + x] = 0xffffffff; flashN++; }
        else {                                   // 之后 ~0.08s：泛红染色
          const a = c >>> 24, r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
          frame.color[row + x] = (a << 24) | (Math.min(255, r * 1.15 + 55) & 255)
            | ((g * 0.5) & 255) << 8 | ((b * 0.5) & 255) << 16;
          whiteN++;
        }
      }
    }
  }
  if (foeDotFx) foeDotFx.draw(frame, "front");
  if (alertFx) alertFx.draw(frame, "front");
  for (const t of TORCHES) t.draw(frame, "front");
  if (rings.length) {
    const rp = painterFor(frame);
    rp.place(0, 0);
    for (const r of rings) {
      const k = r.t / r.life;
      const rad = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 2));
      // 外环实心 + 内环反向，形成"炸开"的双层感
      if (k < 0.82) rp.ring(r.x, r.y, rad, 2, hex(r.c), 1);
      rp.ring(r.x, r.y, Math.max(2, rad * 0.52), 1, hex(r.c), Math.max(0, 0.85 - k));
    }
  }
  for (const fl of floats) fl.draw(frame, "front");
  if (transFx) transFx.draw(frame, "front");

  drawIntent();

  if (S.breakFx > 0) {
    const pp = painterFor(frame);
    pp.place(0, 0);
    const a = Math.min(1, S.breakFx * 2.4);
    drawText(pp, "BREAK!", W / 2, GROUND - 118, hex("#ffe066"), "big", 2, "center");
    if (a > 0.9) drawText(pp, "BREAK!", W / 2, GROUND - 118, hex("#ffffff"), "big", 2, "center");
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

// ---- 界面 ----------------------------------------------------------------
const php = $("php"), ehp = $("ehp");
function paintBars() {
  php.style.transform = "scaleX(" + clamp01(S.hp / S.maxhp) + ")";
  ehp.style.transform = "scaleX(" + clamp01(S.fhp / S.fmaxhp) + ")";
  $("pht").textContent = Math.max(0, S.hp);
  $("eht").textContent = Math.max(0, S.fhp);
}

function paintStatus() {
  const e = [];
  if (S.bleed > 0) e.push('<span>🩸<b class="tag">' + S.bleed + '</b></span>');
  if (S.stun) e.push('<span>💫<b class="tag">晕</b></span>');
  if (S.foeGuard) e.push('<span>🛡<b class="tag">减伤</b></span>');
  $("estatus").innerHTML = e.length ? e.join("") : '<span class="none">无状态</span>';
  const p = [];
  if (S.poison > 0) p.push('<span>☠<b class="tag">' + S.poison + '</b></span>');
  $("pstatus").innerHTML = p.length ? p.join("") : '<span class="none">无状态</span>';
}

function previewOf(i) {
  const m = MOVES[i];
  let lo = m.dmg[0], hi = m.dmg[1];
  if (S.foeGuard) { lo = Math.round(lo * 0.6); hi = Math.round(hi * 0.6); }
  const critHi = Math.round(hi * 1.35);
  return { lo, hi, critHi, kill: lo >= S.fhp, chance: critHi >= S.fhp };
}

const btns = [...document.querySelectorAll(".mv")];
function paintButtons() {
  const I = S.intent;
  const canBreak = I && I.type === "heavy";
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
  const pool = curFoe().pool.map((k) => FINISHERS[k]);
  const flo = Math.round(Math.min(...pool.map((f) => f.dmg[0])) * 1.35);
  const fhi = Math.round(Math.max(...pool.map((f) => f.dmg[1])) * 1.35);
  const fd = $("finDmg");
  if (fd) fd.textContent = flo + "-" + fhi;
  b.classList.toggle("lethal", armed && flo >= S.fhp && S.phase === "ready");
}

const hintEl = $("hint");
function hint(s) { hintEl.textContent = "R" + S.round + " · " + s; }

function log(kind, text) {
  S.log.unshift({ kind, text, r: S.round });
  if (S.log.length > 6) S.log.pop();
  $("log").innerHTML = S.log
    .map((e) => '<li class="' + e.kind + '"><span>R' + e.r + '</span><b>' + e.text + '</b></li>')
    .join("");
}

const fl = $("flash");
let flashT = 0;
function flash(kind) {
  fl.classList.remove("white", "micro");
  if (kind) fl.classList.add(kind);
  fl.classList.add("on");
  clearTimeout(flashT);
  flashT = setTimeout(() => { fl.classList.remove("on", "white", "micro"); }, kind === "white" ? 150 : kind === "micro" ? 55 : 90);
}

btns.forEach((b) => b.addEventListener("click", () => { ensureAudio(); chooseMove(+b.dataset.i); }));
$("ovBtn").addEventListener("click", restart);
addEventListener("keydown", (e) => {
  const i = "12345".indexOf(e.key);
  if (i >= 0) { e.preventDefault(); chooseMove(i); }
});

spawnFoe();
S.intent = rollIntent();
paintBars(); paintButtons(); paintFin(); paintStatus();
hint(intentHint(S.intent));
requestAnimationFrame(tick);

window.__game = {
  S, chooseMove, MOVES, FINISHERS, addEnergy, startFinisher, paintButtons, previewOf, log,
  dbg: () => ({ hitstop, zoom, foeKb, pKb, foeSink, followT, rings: rings.length, flashN, whiteN, audio: !!AC && AC.state }),
  get foe() { return curFoe(); },
};
