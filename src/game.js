// 像素对决 v3.0 —— 3 层 × 3 波 Roguelite 跑图
// 8 个技能 / 12 种强化 / 6 种敌人 / 3 个 Boss / 物理动量 / 完全信息
import {
  createFrame, clearFrame, createFx, composite, painterFor, drawActor, stockActor, backdrop, hex,
} from "../vendor/pixelfx/core/index.js";
import { textWidth, rasterText } from "../vendor/pixelfx/core/font.js";

import * as mSword from "../vendor/pixelfx/fx/melee/sword-slash.js";
import * as mThrust from "../vendor/pixelfx/fx/melee/thrust.js";
import * as mHammer from "../vendor/pixelfx/fx/melee/hammer-smash.js";
import * as mSpin from "../vendor/pixelfx/fx/melee/spin-slash.js";
import * as mFlurry from "../vendor/pixelfx/fx/melee/dagger-flurry.js";
import * as mCleave from "../vendor/pixelfx/fx/melee/heavy-cleave.js";
import * as mUpper from "../vendor/pixelfx/fx/melee/uppercut.js";
import * as mScythe from "../vendor/pixelfx/fx/melee/scythe-reap.js";
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
import * as cFrog from "../vendor/pixelfx/fx/critters/frog.js";
import * as cEye from "../vendor/pixelfx/fx/critters/eyeball.js";
import * as cWisp from "../vendor/pixelfx/fx/critters/wisp.js";
import * as cSnake from "../vendor/pixelfx/fx/critters/snake.js";
import * as cSkull from "../vendor/pixelfx/fx/critters/flying-skull.js";
import * as uDmg from "../vendor/pixelfx/fx/ui/damage-number.js";
import * as uCrit from "../vendor/pixelfx/fx/ui/crit-number.js";
import * as uAlert from "../vendor/pixelfx/fx/ui/exclamation.js";

import * as tBurn from "../vendor/pixelfx/fx/transitions/burn-away.js";
import * as spawnSoul from "../vendor/pixelfx/fx/spawn/soul-rise.js";
import * as wFog from "../vendor/pixelfx/fx/weather/fog.js";
import * as wFirefly from "../vendor/pixelfx/fx/weather/fireflies.js";
import * as wLeaves from "../vendor/pixelfx/fx/weather/falling-leaves.js";
import * as wRays from "../vendor/pixelfx/fx/weather/god-rays.js";
import * as wStars from "../vendor/pixelfx/fx/weather/shooting-stars.js";
import * as fSpirit from "../vendor/pixelfx/fx/fire/spirit-flame.js";
import * as fBrazier from "../vendor/pixelfx/fx/fire/brazier.js";
import * as sSkulls from "../vendor/pixelfx/fx/shadow/necro-skulls.js";

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
const GROUND = 152, PX = 92, CINE_LINE = 262, MAX_ENERGY = 100;
const GRAV = 1250, MAX_SKILLS = 6, WAVES = 3;

const cv = document.getElementById("screen");
const ctx = cv.getContext("2d");
ctx.imageSmoothingEnabled = false;
const off = document.createElement("canvas");
off.width = W; off.height = H;
const octx = off.getContext("2d");
const img = octx.createImageData(W, H);
const frame = createFrame(W, H);
const BG_BASE = backdrop("ground", W, H, GROUND);
// 同一张底图做色调分离，让三层像三个不同地方
function tint(src, mr, mg, mb, ar, ag, ab) {
  const out = new Uint32Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const a = c >>> 24, r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
    out[i] = (a << 24)
      | (Math.min(255, r * mr + ar) & 255)
      | ((Math.min(255, g * mg + ag) & 255) << 8)
      | ((Math.min(255, b * mb + ab) & 255) << 16);
  }
  return out;
}
const BGS = [
  tint(BG_BASE, 0.62, 1.08, 0.66, 0, 16, 4),    // 腐沼：沼泽绿
  tint(BG_BASE, 1.18, 0.96, 0.60, 14, 6, 0),    // 枯井：土黄砖石
  tint(BG_BASE, 0.94, 0.58, 1.25, 18, 0, 26),   // 深渊：暗紫虚空
];
const PURPLE_FOG = ["#0d0818", "#1a1030", "#281643", "#38205e", "#4b2a78", "#6b3d9a", "#9660c0", "#c99ee0"];
const AMB = [
  [[wFog, null], [wFirefly, null]],
  [[wLeaves, null], [wRays, null]],
  [[wStars, null], [wFog, { palette: PURPLE_FOG }]],
];
let ambFx = [];
function setStageFx(force) {
  if (!force && ambFx.stage === S.stage) return;
  setStageDecor();
  ambFx = AMB[Math.min(S.stage, AMB.length - 1)].map(([m, o]) =>
    createFx(m, { x: 160, y: 170, seed: ri(1, 900), ...(o || {}) }));
  ambFx.stage = S.stage;
}
const ACTOR = stockActor(2);
// 每层不同的场景道具 + 手绘剪影
const PURPLE_FIRE = ["#0a0616", "#1e0c33", "#3a1560", "#5c2090", "#8a3ac0", "#b96be0", "#e0a8f5", "#f7e2ff"];
const GREEN_FIRE = ["#04100a", "#0a2a18", "#124a26", "#1c6e34", "#2a9448", "#4cc066", "#88e09a", "#d8ffdc"];
const DECOR = [
  { dk: "#1a2e20", lt: "#4a7a52",
    props: [[fSpirit, { x: 30, y: GROUND + 8, palette: GREEN_FIRE }], [fSpirit, { x: 290, y: GROUND + 8, palette: GREEN_FIRE, flip: true }]],
    sils: [["tree", 62], ["tree", 258], ["mushroom", 88], ["mushroom", 236]] },
  { dk: "#0f0c07", lt: "#8a7048",
    props: [[fBrazier, { x: 34, y: GROUND + 14 }], [fBrazier, { x: 286, y: GROUND + 14, flip: true }]],
    sils: [["pillar", 56], ["pillarTall", 152], ["pillar", 264]] },
  { dk: "#241634", lt: "#9a5ae0",
    props: [[sSkulls, { x: 160, y: GROUND - 34 }], [fSpirit, { x: 32, y: GROUND + 8, palette: PURPLE_FIRE }], [fSpirit, { x: 288, y: GROUND + 8, palette: PURPLE_FIRE, flip: true }]],
    sils: [["rift", 96], ["rift", 226], ["rock", 132], ["rock", 190]] },
];
let props = [];
function setStageDecor() {
  const d = DECOR[Math.min(S.stage, DECOR.length - 1)];
  props = d.props.map(([m, o]) => createFx(m, { seed: ri(1, 900), ...o }));
}
function drawSil(kind, x, dk, lt) {
  const p = painterFor(frame); p.place(0, 0);
  if (kind === "tree") {
    p.line(x, GROUND, x - 3, GROUND - 24, dk);
    p.line(x - 3, GROUND - 24, x + 1, GROUND - 46, dk);
    p.line(x - 3, GROUND - 27, x - 15, GROUND - 40, dk);
    p.line(x - 1, GROUND - 36, x + 13, GROUND - 48, dk);
    p.line(x + 1, GROUND - 45, x + 5, GROUND - 58, dk);
    p.line(x + 1, GROUND - 41, x - 7, GROUND - 53, dk);
  } else if (kind === "mushroom") {
    p.rect(x - 1, GROUND - 7, 2, 7, dk);
    p.disc(x, GROUND - 9, 3.5, lt);
    p.dot(x - 2, GROUND - 10, dk);
  } else if (kind === "pillar") {
    p.rect(x - 7, GROUND - 42, 14, 42, dk);
    p.rect(x - 9, GROUND - 47, 18, 5, dk);
    p.rect(x - 10, GROUND - 4, 20, 4, dk);
    p.rect(x - 9, GROUND - 47, 18, 1, lt);
  } else if (kind === "pillarTall") {
    p.rect(x - 8, GROUND - 62, 16, 62, dk);
    p.rect(x - 10, GROUND - 68, 20, 6, dk);
    p.rect(x - 11, GROUND - 4, 22, 4, dk);
    p.rect(x - 10, GROUND - 68, 20, 1, lt);
    p.rect(x - 3, GROUND - 50, 6, 2, dk);
  } else if (kind === "arch") {
    p.rect(x - 26, GROUND - 50, 6, 50, dk);
    p.rect(x + 20, GROUND - 50, 6, 50, dk);
    p.rect(x - 26, GROUND - 54, 52, 4, dk);
    p.rect(x - 20, GROUND - 50, 40, 2, dk);
  } else if (kind === "rift") {
    p.line(x, GROUND, x + 3, GROUND - 22, dk);
    p.line(x + 3, GROUND - 22, x - 2, GROUND - 44, dk);
    p.line(x - 2, GROUND - 44, x + 2, GROUND - 64, dk);
    p.line(x + 1, GROUND - 6, x + 4, GROUND - 26, lt);
    p.line(x + 4, GROUND - 26, x - 1, GROUND - 42, lt);
  } else if (kind === "rock") {
    p.poly([[x - 8, GROUND], [x - 11, GROUND - 11], [x - 4, GROUND - 17], [x + 6, GROUND - 14], [x + 9, GROUND - 4], [x + 4, GROUND]], dk);
  }
}

// ---- 技能池（8 个，初始 4 个，强化可解锁） --------------------------------
const SKILL_POOL = {
  slash:  { mod: mSword,  name: "疾斩",   tag: "快 · 稳",   dmg: [8, 11],  hit: 0.06, power: 1, cd: 0, kb: { x: 130, y: -330 }, follow: { dmg: [3, 4], t: 0.3, kb: { x: 90, y: -320 } } },
  thrust: { mod: mThrust, name: "突刺",   tag: "破防 · 打断", dmg: [10, 13], hit: 0.07, power: 2, cd: 1, break: true, kb: { x: 250, y: -150 }, follow: { dmg: [4, 5], t: 0.36, kb: { x: 110, y: -300 } } },
  flurry: { mod: mFlurry, name: "连环刺", tag: "极快 · 无冷却", dmg: [7, 9],  hit: 0.08, power: 1, cd: 0, kb: { x: 90, y: -260 }, follow: { dmg: [6, 8], t: 0.18, kb: { x: 80, y: -240 } } },
  hammer: { mod: mHammer, name: "碎地锤", tag: "慢 · 击晕",  dmg: [22, 27], hit: 0.15, power: 3, cd: 2, stun: true, kb: { x: 50, y: -520 }, follow: { dmg: [6, 7], t: 0.42, kb: { x: 80, y: -300 } } },
  spin:   { mod: mSpin,   name: "回旋斩", tag: "全体 · 流血", dmg: [9, 12],  hit: 0.17, power: 2, cd: 1, area: true, bleed: true, kb: { x: 170, y: -400 }, follow: { dmg: [4, 5], t: 0.42, kb: { x: 110, y: -280 } } },
  cleave: { mod: mCleave, name: "横扫",   tag: "全体 · 重击", dmg: [13, 17], hit: 0.22, power: 3, cd: 2, area: true, kb: { x: 200, y: -420 } },
  upper:  { mod: mUpper,  name: "上勾拳", tag: "打飞 · 高",  dmg: [14, 18], hit: 0.1,  power: 2, cd: 1, kb: { x: 60, y: -820 }, follow: { dmg: [5, 6], t: 0.34, kb: { x: 40, y: -400 } } },
  scythe: { mod: mScythe, name: "镰割",   tag: "吸血 40%",   dmg: [16, 20], hit: 0.16, power: 3, cd: 2, lifesteal: 0.4, kb: { x: 140, y: -380 } },
};
const BASE_SKILLS = ["slash", "thrust", "hammer", "spin"];
const LOCKED_SKILLS = ["flurry", "cleave", "upper", "scythe"];

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

// ---- 敌人池 --------------------------------------------------------------
const FOE_POOL = {
  slime: { mod: cSlime, name: "史莱姆", hp: 26, dmg: [4, 6],  oy: -6,  h: 88,  lift: 0,   uiY: 96,  pool: ["fireball-throw", "earth-stomp", "ground-pound", "sword-combo"] },
  frog:  { mod: cFrog,  name: "沼泽蛙", hp: 30, dmg: [5, 7],  oy: -8,  h: 88,  lift: 0,   uiY: 96,  pool: ["ground-pound", "earth-stomp", "sword-combo", "dash-strike"] },
  bat:   { mod: cBat,   name: "蝙蝠",   hp: 30, dmg: [5, 7],  oy: -34, h: 80,  lift: -14, uiY: 108, pool: ["lightning-call", "ice-lance-throw", "dash-strike", "meteor-call"] },
  ghost: { mod: cGhost, name: "幽魂",   hp: 34, dmg: [6, 8],  oy: -10, h: 100, lift: -30, uiY: 116, pool: ["holy-smite", "rocket-launcher", "pistol-shots", "arrow-shot"] },
  eye:   { mod: cEye,   name: "邪眼",   hp: 36, dmg: [7, 9],  oy: -12, h: 108, lift: -22, uiY: 120, pool: ["lightning-call", "holy-smite", "meteor-call", "pistol-shots"] },
  wisp:  { mod: cWisp,  name: "鬼火",   hp: 28, dmg: [6, 8],  oy: -14, h: 104, lift: -34, uiY: 122, pool: ["fireball-throw", "lightning-call", "earth-stomp", "arrow-shot"] },
  snake: { mod: cSnake, name: "巨蛇",   hp: 60, dmg: [7, 10], oy: -4,  h: 56,  lift: 0,   uiY: 66,  pool: ["dash-strike", "sword-combo", "ground-pound", "ice-lance-throw"], big: true },
  skull: { mod: cSkull, name: "飞行头颅", hp: 66, dmg: [8, 11], oy: -16, h: 132, lift: -30, uiY: 128, pool: ["meteor-call", "holy-smite", "rocket-launcher", "lightning-call"], big: true },
};

const STAGES = [
  { name: "腐沼", waves: [["slime", "frog"], ["frog", "bat", "slime"], ["snake"]] },
  { name: "枯井", waves: [["bat", "ghost"], ["ghost", "eye", "bat"], ["eye"]] },
  { name: "深渊", waves: [["ghost", "wisp"], ["wisp", "eye", "ghost"], ["skull"]] },
];

const INTENT = {
  attack: { c: "#ffd9a0" }, heavy: { c: "#ff5a4a" }, debuff: { c: "#7ee06a" },
  guard: { c: "#8ab4ff" }, stunned: { c: "#8f89a8" },
};

// ---- 强化池 --------------------------------------------------------------
const UPGRADES = [
  { id: "skill",  name: "学习新招式", desc: "从 4 个未掌握的招式里随机获得一个", kind: "new" },
  { id: "dmg",    name: "锋芒",       desc: "所有招式伤害 +20%" },
  { id: "hp",     name: "体质",       desc: "最大生命 +25，并立刻回满" },
  { id: "energy", name: "共鸣",       desc: "能量获取 +35%" },
  { id: "crit",   name: "弱点洞察",   desc: "暴击率 +12%" },
  { id: "regen",  name: "再生",       desc: "每回合回复 4 点生命" },
  { id: "kb",     name: "蛮力",       desc: "击退力 +50%，打得更飞" },
  { id: "fin",    name: "超载",       desc: "终结技伤害 +30%" },
  { id: "bleed",  name: "放血",       desc: "所有攻击附带流血（3 回合 −3）" },
  { id: "heal",   name: "嗜血",       desc: "击杀敌人回复 12 点生命" },
  { id: "cd",     name: "疾风",       desc: "所有技能冷却 −1 回合" },
  { id: "shield", name: "护体",       desc: "每回合开始获得 6 点护盾" },
];

const CRIT_PAL = ["#2a1a05", "#5a3a08", "#a06a0c", "#e8b030", "#ffe066", "#fff3c0", "#ffffff"];

// ---- 状态 ----------------------------------------------------------------
const S = {
  phase: "ready", t: 0,
  hp: 120, maxhp: 120, shield: 0,
  skills: [...BASE_SKILLS],
  mods: { dmg: 1, energy: 1, crit: 0.12, regen: 0, kb: 1, fin: 1, healOnKill: 0, cd: 0, shield: 0, bleed: false },
  taken: [],
  stage: 0, wave: 0,
  cd: [0, 0, 0, 0, 0, 0],
  moveIx: 0, hit: false,
  poison: 0, target: 0, actor: 0, energy: 0, round: 1, kills: 0,
  fin: null, cinePX: PX, cineEX: CINE_LINE, slow: 0, breakFx: 0, dashTo: PX,
  usedFins: new Set(), log: [],
  combo: 0, comboT: 0, pendingClear: false, pendingUp: 0, route: null, eliteWave: false, extraUp: 0,
  upChoices: null,
};
const foes = [];
let atkFx = null, transFx = null;
const floats = [], rings = [], embers = [];
let shake = 0, zoom = 0, lb = 0, hitstop = 0;
let pPos = PX, pY = 0, pKb = 0, playerHit = 0, followT = 0;
let flashN = 0, whiteN = 0, wallHits = 0, floorHits = 0;
let AC = null, NOISE = null, btns = [];

const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.round(rnd(a, b));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const $ = (id) => document.getElementById(id);
const alive = () => foes.filter((f) => f.alive);
const tgt = () => (foes[S.target] && foes[S.target].alive ? foes[S.target] : alive()[0] || foes[0]);
const curSkill = (i) => SKILL_POOL[S.skills[i]];

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
}
function sfxHurt() {
  if (!AC || AC.state !== "running") return;
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(300, t);
  o.frequency.exponentialRampToValueAtTime(70, t + 0.16);
  g.gain.setValueAtTime(0.16, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.17);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + 0.19);
}

// ---- 打击感 / 物理 --------------------------------------------------------
function addRing(x, y, power) {
  rings.push({ x, y, t: 0, life: 0.17, r0: 4 + power * 3, r1: 22 + power * 11,
    c: power >= 3 ? "#ffe066" : power >= 2 ? "#ffd0a0" : "#ffffff" });
}
function impact(power, on = "foe", foe = null) {
  const P = [
    { stop: 0.06, shake: 3, zoom: 0.035, kb: 9, sink: 4 },
    { stop: 0.085, shake: 4, zoom: 0.055, kb: 14, sink: 6 },
    { stop: 0.125, shake: 6, zoom: 0.08, kb: 20, sink: 8 },
    { stop: 0.21, shake: 9, zoom: 0.12, kb: 34, sink: 10 },
  ][Math.max(0, Math.min(3, power - 1))];
  hitstop = Math.max(hitstop, P.stop);
  shake = Math.max(shake, P.shake);
  zoom = Math.max(zoom, P.zoom);
  if (on === "foe" && foe) {
    foe.sink = Math.max(foe.sink || 0, P.sink);
    addRing(foe.F.x, GROUND + foe.def.lift + foe.F.y - 34, power);
  } else if (on === "player") pKb -= P.kb * 0.7;
  flash(power >= 3 ? "white" : "micro");
  sfx(power);
}
function physicsOf(f, dt) {
  if (["cineIn", "cine", "cineOut", "upgrade", "over"].includes(S.phase)) return;
  const F = f.F;
  if (!F.air && F.vx === 0 && F.vy === 0) {
    if (Math.abs(F.x - f.homeX) > 0.5) F.x += (f.homeX - F.x) * (1 - Math.exp(-dt * 2.0));
    return;
  }
  F.vy += GRAV * dt; F.y += F.vy * dt; F.x += F.vx * dt;
  if (F.x < 74) { F.x = 74; if (F.vx < 0) { F.vx = -F.vx * 0.55; smash("left", f); } }
  if (F.x > 296) { F.x = 296; if (F.vx > 0) { F.vx = -F.vx * 0.55; smash("right", f); } }
  if (F.y >= 0) {
    F.y = 0;
    if (F.vy > 240) { F.vy = -F.vy * 0.4; F.vx *= 0.7; thud(f); }
    else { F.vy = 0; F.vx *= Math.pow(0.02, dt); if (Math.abs(F.vx) < 26) { F.vx = 0; F.air = false; } }
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

// ---- 文字 / 图标 ---------------------------------------------------------
function drawText(p, str, x, y, color, font = "mini", k = 1, align = "center") {
  const w = textWidth(str, font) * k;
  const ox = align === "center" ? Math.round(x - w / 2) : align === "right" ? x - w : x;
  rasterText(str, font, (gx, gy) => {
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) p.px(ox + gx * k + dx, y + gy * k + dy, color);
  });
}
function drawIcon(p, kind, x, y, c) {
  if (kind === "attack") { p.line(x - 2, y + 9, x + 3, y + 1, c); p.line(x - 3, y + 7, x, y + 10, c); }
  else if (kind === "heavy") { p.rect(x - 1, y, 2, 6, c); p.rect(x - 1, y + 8, 2, 2, c); }
  else if (kind === "debuff") { p.disc(x - 2, y + 3, 1.6, c); p.disc(x + 2, y + 6, 1.2, c); p.disc(x, y + 9, 1.0, c); }
  else { p.rect(x - 3, y + 1, 6, 5, c); p.rect(x - 2, y + 6, 4, 2, c); p.rect(x - 1, y + 8, 2, 1, c); }
}
function addFx(mod, o) { const f = createFx(mod, o); floats.push(f); return f; }

// ---- 波次生成 ------------------------------------------------------------
function waveDef() {
  const st = STAGES[S.stage];
  return st.waves[S.wave];
}
function hpMul() { return 1 + 0.55 * S.stage + 0.18 * S.wave; }
function dmgBonus() { return S.stage; }

function spawnWave() {
  foes.length = 0;
  const ids = waveDef();
  const xs = ids.length >= 3 ? [146, 214, 282] : ids.length === 2 ? [170, 246] : [212];
  ids.forEach((id, i) => {
    const d = FOE_POOL[id];
    const big = !!d.big;
    foes.push({
      def: d, hp: Math.round(d.hp * hpMul()), maxhp: Math.round(d.hp * hpMul()),
      alive: true, deathT: 0,
      F: { x: xs[i], y: 0, vx: 0, vy: 0, air: false }, homeX: xs[i],
      intent: null, fx: null, dotFx: null, alertFx: null,
      hitT: 0, sink: 0, bleed: 0, stun: false, guard: false, big,
    });
  });
  for (const f of foes) f.fx = createFx(f.def.mod, { x: f.F.x, y: GROUND + f.def.oy + f.def.lift, seed: ri(1, 900) });
  S.target = 0; S.actor = 0; S.round = 1;
  S.usedFins = new Set();
  paintFoeBars(); paintProgress();
}
function rollIntent(f) {
  const base = ri(f.def.dmg[0], f.def.dmg[1]) + dmgBonus();
  const r = Math.random();
  if (r < 0.26) return { type: "heavy", dmg: Math.round(base * 1.9) };
  if (r < 0.4) return { type: "debuff", dmg: 0 };
  if (r < 0.52) return { type: "guard", dmg: 0 };
  return { type: "attack", dmg: base };
}
function intentHint(f) {
  const I = f.intent;
  if (!I) return f.def.name + " 待机";
  const n = f.def.name;
  if (I.type === "attack") return n + " 将攻击 " + I.dmg;
  if (I.type === "heavy") return n + " 蓄力 " + I.dmg + " 重击 —— 突刺可打断";
  if (I.type === "debuff") return n + " 要放毒雾 —— 中毒 3 回合";
  if (I.type === "guard") return n + " 要举盾 —— 伤害 -40%";
  return n + " 被打断了";
}
function pickActor() {
  const list = alive();
  if (!list.length) return null;
  const cand = list.filter((f) => f !== foes[S.actor]);
  const pool = cand.length ? cand : list;
  const f = pool[ri(0, pool.length - 1)];
  S.actor = foes.indexOf(f);
  for (const g of foes) g.intent = null;
  f.intent = rollIntent(f);
  if (f.intent.type === "heavy") {
    f.alertFx = createFx(uAlert, { x: f.F.x, y: GROUND + f.def.oy + f.def.lift - 6, seed: ri(1, 900) });
  }
  paintFoeBars(); paintStatus();
  return f;
}

// ---- 出招 ----------------------------------------------------------------
function chooseMove(i) {
  ensureAudio();
  if (S.phase !== "ready") return;
  if (i === S.skills.length) return startFinisher();
  if (i >= S.skills.length) return;
  if (S.cd[i] > 0) return;
  const m = curSkill(i);
  S.phase = "player"; S.t = 0; S.hit = false; S.moveIx = i;
  S.cd = S.cd.map((c) => Math.max(0, c - 1));
  S.cd[i] = Math.max(0, m.cd - S.mods.cd);
  const f = tgt();
  S.dashTo = Math.max(30, Math.min(150, f.F.x - 62));
  atkFx = createFx(m.mod, { x: pPos, y: GROUND, seed: ri(1, 900) });
  hint(m.name + (m.area ? "（全体）" : ""));
  paintButtons();
}
function dmgOf(base) { return Math.max(1, Math.round(base * S.mods.dmg)); }
function comboMul() { return 1 + Math.min(S.combo, 10) * 0.03; }
function bumpCombo() {
  S.combo += 1; S.comboT = 4;
  if (S.combo === 3 || S.combo === 6 || S.combo === 10) {
    addRing(pPos + 20, GROUND - 40, 3);
    sfx(2);
  }
}
function hitFoe(f, dmg, power, opts = {}) {
  f.hp = Math.max(0, f.hp - dmg);
  f.hitT = 0.24;
  const kb = opts.kb || { x: 60, y: -240 };
  f.F.vx += kb.x * S.mods.kb; f.F.vy += kb.y * S.mods.kb; f.F.air = true;
  impact(power, "foe", f);
  const pop = { x: f.F.x + ri(-8, 8), y: GROUND + f.def.lift + f.F.y - 72, text: "-" + dmg };
  if (opts.crit) pop.palette = CRIT_PAL;
  addFx(opts.crit ? uCrit : uDmg, pop);
  addFx(opts.crit ? iCrit : iBlunt, { x: f.F.x - 20, y: GROUND + f.def.lift - 26, seed: ri(1, 900) });
  if (opts.crit) addFx(iFrame, { x: f.F.x, y: GROUND + f.def.lift - 34, seed: ri(1, 900) });
  if (f.hp <= 0) killFoe(f);
}
function resolveHit() {
  const m = curSkill(S.moveIx);
  const f = tgt();
  let dmg = Math.round(dmgOf(ri(m.dmg[0], m.dmg[1])) * comboMul());
  let crit = Math.random() < S.mods.crit || (m.stun && Math.random() < 0.3);
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
  bumpCombo();
  hint(broke ? "识破！打断蓄力" : guarded ? "被护盾吸收" : crit ? "暴击" : "命中");

  if (m.area) {
    const list = alive();
    for (const g of list) {
      const d2 = Math.max(1, Math.round(dmg * 0.75));
      g.hp = Math.max(0, g.hp - d2);
      g.hitT = 0.24;
      g.F.vx += m.kb.x * 0.8 * S.mods.kb; g.F.vy += m.kb.y * 0.8 * S.mods.kb; g.F.air = true;
      addFx(uDmg, { x: g.F.x + ri(-8, 8), y: GROUND + g.def.lift + g.F.y - 66, text: "-" + d2 });
      if (S.mods.bleed && !g.bleed) { g.bleed = 3; g.dotFx = createFx(sBleeding, { x: g.F.x, y: GROUND + g.def.oy + g.def.lift + 6, seed: 7 }); }
      if (g.hp <= 0) killFoe(g);
    }
    impact(m.power, "foe", f);
    addRing(f.F.x, GROUND + f.def.lift - 30, 3);
    log("hit", m.name + " 全体 · " + dmg + " ×" + list.length);
  } else {
    hitFoe(f, dmg, Math.min(4, m.power + (crit ? 1 : 0)), { kb: m.kb, crit });
    log("hit", m.name + " · " + dmg + (broke ? "（打断）" : guarded ? "（被盾）" : crit ? "（暴击）" : "") + (f.hp <= 0 ? " · 击杀" : ""));
    if (m.lifesteal) {
      const heal = Math.round(dmg * m.lifesteal);
      S.hp = Math.min(S.maxhp, S.hp + heal);
      hint("吸血 +" + heal);
      paintBars();
    }
  }
  if (m.stun) { f.stun = true; addFx(sStun, { x: f.F.x, y: GROUND + f.def.lift - 62, seed: 3 }); }
  if ((m.bleed || S.mods.bleed) && !f.bleed) {
    f.bleed = 3;
    f.dotFx = createFx(sBleeding, { x: f.F.x, y: GROUND + f.def.oy + f.def.lift + 6, seed: 7 });
  }
  if (m.follow) followT = m.follow.t;
  paintFoeBars(); paintStatus();
}
function doFollow() {
  const m = curSkill(S.moveIx);
  if (!m.follow) return;
  const f = tgt();
  if (!f.alive) return;
  S.dashTo = Math.max(30, Math.min(150, f.F.x - 62));
  const dmg = Math.round(dmgOf(ri(m.follow.dmg[0], m.follow.dmg[1])) * comboMul());
  hitFoe(f, dmg, 1, { kb: m.follow.kb });
  hint("追打 " + dmg);
  if (f.hp > 0) log("hit", "追击 · " + dmg);
}
function killFoe(f) {
  if (!f.alive) return;
  f.alive = false; f.deathT = 1.1; f.intent = null;
  S.kills += 1;
  addEnergy(10);
  S.slow = Math.max(S.slow, 0.26);   // 击杀慢镜
  if (S.mods.healOnKill) { S.hp = Math.min(S.maxhp, S.hp + S.mods.healOnKill); paintBars(); }
  addFx(spawnSoul, { x: f.F.x, y: GROUND + f.def.lift + f.F.y, seed: ri(1, 900) });
  log("win", "击杀 " + f.def.name);
  paintFoeBars();
  const rest = alive();
  if (!rest.length) {
    S.pendingClear = true;   // 只打标记，等当前演出播完再收场
    return;
  }
  if (f === foes[S.target]) S.target = foes.indexOf(rest[0]);
}

// ---- 回合 ----------------------------------------------------------------
function beginClear() {
  S.pendingClear = false;
  S.phase = "clear"; S.t = 0;
  transFx = createFx(tBurn, { x: W / 2, y: H / 2, seed: ri(1, 900) });
  $("cineName").textContent = "清场";
  $("cineSub").textContent = "WAVE " + (S.wave + 1) + "/3 · " + STAGES[S.stage].name;
  $("cine").classList.add("on");
}

function endTurn() {
  S.cd = S.cd.map((c) => Math.max(0, c - 1));
  if (!alive().length) return;
  if (S.hp <= 0) return gameOver(false);
  S.phase = "ready"; S.t = 0; S.round += 1;
  if (S.mods.regen) { S.hp = Math.min(S.maxhp, S.hp + S.mods.regen); paintBars(); }
  if (S.mods.shield) { S.shield = S.mods.shield; paintBars(); }
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
    f.bleed -= 1; f.hp = Math.max(0, f.hp - 3);
    addFx(uDmg, { x: f.F.x + ri(-8, 8), y: GROUND + f.def.lift - 66, text: "-3" });
    log("hit", "流血 -3"); paintFoeBars();
    if (f.hp <= 0) { killFoe(f); return endTurn(); }
  }
  if (f.stun) {
    f.stun = false;
    addFx(sStun, { x: f.F.x, y: GROUND + f.def.lift - 62, seed: 5 });
    hint(f.def.name + " 被击晕，跳过回合");
    log("sys", f.def.name + " 眩晕");
    paintStatus();
    return endTurn();
  }
  if (f.intent && f.intent.type === "stunned") { hint("蓄力被打断"); return endTurn(); }
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
    log("sys", f.def.name + " 举盾 · 伤害 -40%");
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
  let dmg = I.dmg;
  if (S.shield > 0) {
    const absorbed = Math.min(S.shield, dmg);
    S.shield -= absorbed; dmg -= absorbed;
    hint("护盾吸收 " + absorbed);
  }
  if (dmg > 0) S.hp = Math.max(0, S.hp - dmg);
  if (dmg > 0) S.combo = 0;   // 挨打断连击
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
  S.energy = Math.min(MAX_ENERGY, S.energy + n * S.mods.energy);
  paintFin();
}
function startFinisher(forceId) {
  if (S.energy < MAX_ENERGY) { hint("能量不足（" + Math.round(S.energy) + " / " + MAX_ENERGY + "）"); return; }
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
  const dmg = Math.round(ri(F.dmg[0], F.dmg[1]) * 1.35 * S.mods.fin);
  const main = tgt();
  for (const f of alive()) {
    const d = Math.max(1, Math.round(dmg * (f === main ? 1 : 0.7)));
    f.hp = Math.max(0, f.hp - d);
    f.hitT = 0.34;
    f.F.vx += 200 * S.mods.kb; f.F.vy += -700 * S.mods.kb; f.F.air = true;
    addFx(uCrit, { x: f.F.x, y: GROUND + f.def.lift - 80, text: "-" + d });
    if (f.hp <= 0) killFoe(f);
  }
  S.slow = 0.18;
  impact(4, "foe", main);
  addFx(iFrame, { x: S.cineEX, y: GROUND - 40, seed: ri(1, 900) });
  flash("white");
  hint(F.name + " 全体 " + dmg);
  log("win", F.name + " 命中全体");
  paintFoeBars();
}

// ---- 三选一强化 ----------------------------------------------------------
function offerUpgrade() {
  const canLearn = S.skills.length < MAX_SKILLS && LOCKED_SKILLS.some((k) => !S.skills.includes(k));
  const pool = UPGRADES.filter((u) => (u.id === "skill" ? canLearn : true)
    && !(u.id !== "skill" && S.taken.includes(u.id)));
  const picks = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(ri(0, pool.length - 1), 1)[0]);
  S.upChoices = picks;
  S.phase = "upgrade";
  const box = $("upList");
  box.innerHTML = picks.map((u, i) => {
    let title = u.name, desc = u.desc;
    if (u.id === "skill") {
      const left = LOCKED_SKILLS.filter((k) => !S.skills.includes(k));
      title = "学习 " + SKILL_POOL[left[ri(0, left.length - 1)]].name;
      desc = "获得一个新招式（当前 " + S.skills.length + "/" + MAX_SKILLS + "）";
    }
    return '<button class="up' + (u.id === "skill" ? " new" : "") + '" data-u="' + u.id + '"><b>' + title + '</b><i>' + desc + '</i></button>';
  }).join("");
  box.querySelectorAll(".up").forEach((b) => b.addEventListener("click", () => applyUpgrade(b.dataset.u)));
  $("upTitle").textContent = "强化 · " + STAGES[S.stage].name + " " + (S.wave + 1) + "/3 已完成";
  $("upSub").textContent = "选一个，进入下一波";
  $("upgrade").classList.remove("hide");
}
function applyUpgrade(id, silent) {
  const M = S.mods;
  if (id === "skill") {
    const left = LOCKED_SKILLS.filter((k) => !S.skills.includes(k));
    if (left.length && S.skills.length < MAX_SKILLS) {
      S.skills.push(left[ri(0, left.length - 1)]);
      S.cd.push(0);
      log("sys", "习得 " + SKILL_POOL[S.skills[S.skills.length - 1]].name);
    } else { M.dmg *= 1.2; log("sys", "招式伤害 +20%"); }
  } else if (id === "dmg") M.dmg *= 1.2;
  else if (id === "hp") { S.maxhp += 25; S.hp = S.maxhp; }
  else if (id === "energy") M.energy *= 1.35;
  else if (id === "crit") M.crit += 0.12;
  else if (id === "regen") M.regen += 4;
  else if (id === "kb") M.kb *= 1.5;
  else if (id === "fin") M.fin *= 1.3;
  else if (id === "bleed") M.bleed = true;
  else if (id === "heal") M.healOnKill += 12;
  else if (id === "cd") M.cd += 1;
  else if (id === "shield") M.shield += 6;
  if (id !== "skill" || S.skills.length >= MAX_SKILLS) S.taken.push(id);
  $("upgrade").classList.add("hide");
  renderSkills();
  paintBars();
  if (silent) return;
  if (S.extraUp > 0) { S.extraUp -= 1; return offerUpgrade(); }
  nextWave();
}
function startWave() {
  setStageFx();
  spawnWave();
  if (S.eliteWave) {
    for (const f of foes) { f.hp = Math.round(f.hp * 1.6); f.maxhp = f.hp; }
    S.eliteWave = false;
  }
  const f = pickActor();
  S.phase = "ready"; S.t = 0;
  paintBars(); paintButtons(); paintFin(); paintStatus(); paintProgress();
  hint((f ? intentHint(f) : "选一招") + "   [" + STAGES[S.stage].name + " " + (S.wave + 1) + "/3]");
}

function nextWave() {
  S.wave += 1;
  if (S.wave >= WAVES) { S.wave = WAVES - 1; return offerRoute(); }
  startWave();
}

function enterNextStage() {
  S.stage += 1;
  if (S.stage >= STAGES.length) return gameOver(true);
  S.wave = 0; S.round = 1;
  S.hp = Math.min(S.maxhp, S.hp + 30);
  log("sys", "进入 " + STAGES[S.stage].name);
  startWave();
}

function offerRoute() {
  S.phase = "route";
  const gates = [
    { id: "elite", cls: "risk", name: "精英战",
      desc: "下一波敌人血量 ×1.6（更耐打）· 打完多给 1 次三选一", cost: "风险：这一波会很疼" },
    { id: "rest", cls: "rest", name: "营火",
      desc: "回复 45% 生命 · 能量直接充满", cost: "代价：没有额外强化" },
    { id: "chest", cls: "", name: "宝箱",
      desc: "立刻获得 1 个三选一强化 · 回复 15% 生命", cost: "代价：放弃精英的那 1 次额外强化" },
  ];
  S.route = gates;
  $("routeTitle").textContent = STAGES[S.stage].name + " 已清 · 选择前路";
  $("routeSub").innerHTML = "下一层：" + (STAGES[S.stage + 1] ? STAGES[S.stage + 1].name : "终点")
    + '<br><b style="color:#8ce0a0">你：' + Math.max(0, S.hp) + "/" + S.maxhp + " HP"
    + " · 能量 " + Math.round(S.energy) + "/100</b> · 已有 " + S.skills.length + " 个招式";
  $("routeList").innerHTML = gates.map((g) =>
    '<button class="gate ' + g.cls + '" data-r="' + g.id + '"><b>' + g.name + "</b><i>" + g.desc
    + '<br><span class="cost">' + g.cost + "</span></i></button>").join("");
  $("routeList").querySelectorAll(".gate").forEach((b) =>
    b.addEventListener("click", () => pickRoute(b.dataset.r)));
  $("route").classList.remove("hide");
}

function pickRoute(id) {
  $("route").classList.add("hide");
  S.route = null;
  if (id === "rest") {
    S.hp = Math.min(S.maxhp, S.hp + Math.round(S.maxhp * 0.45));
    S.energy = MAX_ENERGY;
    log("sys", "营火：回满状态");
  } else if (id === "chest") {
    S.hp = Math.min(S.maxhp, S.hp + Math.round(S.maxhp * 0.15));
    const pool = UPGRADES.filter((u) => u.id !== "skill" && !S.taken.includes(u.id));
    const u = pool.length ? pool[ri(0, pool.length - 1)] : UPGRADES[1];
    applyUpgrade(u.id, true);
    log("sys", "宝箱：" + u.name);
  } else {
    S.eliteWave = true;
    S.extraUp = (S.extraUp || 0) + 1;
    log("sys", "精英战：敌人强化");
  }
  paintBars();
  enterNextStage();
}

// ---- 结算 ----------------------------------------------------------------
function gameOver(win) {
  S.phase = "over";
  $("cine").classList.remove("on");
  $("upgrade").classList.add("hide");
  $("ovTitle").textContent = win ? "通关" : "倒下了";
  $("ovText").textContent = win
    ? "三只 Boss 全清，共 " + S.kills + " 击杀，剩 " + Math.max(0, S.hp) + " HP。"
    : "倒在 " + STAGES[S.stage].name + " 第 " + (S.wave + 1) + " 波，击杀 " + S.kills + " 只。";
  $("overlay").classList.remove("hide");
}
function restart() {
  $("overlay").classList.add("hide");
  $("upgrade").classList.add("hide");
  $("cine").classList.remove("on");
  S.hp = 120; S.maxhp = 120; S.shield = 0; S.kills = 0; S.energy = 0;
  S.poison = 0; S.round = 1; S.fin = null; S.breakFx = 0;
  S.skills = [...BASE_SKILLS]; S.cd = [0, 0, 0, 0, 0, 0];
  S.mods = { dmg: 1, energy: 1, crit: 0.12, regen: 0, kb: 1, fin: 1, healOnKill: 0, cd: 0, shield: 0, bleed: false };
  S.taken = []; S.stage = 0; S.wave = 0; S.log = [];
  S.eliteWave = false; S.extraUp = 0; S.route = null; S.pendingClear = false;
  $("route").classList.add("hide");
  floats.length = 0; rings.length = 0; atkFx = null; transFx = null;
  pPos = PX; pY = 0; pKb = 0;
  renderSkills();
  setStageFx(true);
  spawnWave();
  const f = pickActor();
  S.phase = "ready"; S.t = 0;
  paintBars(); paintButtons(); paintFin(); paintStatus(); paintProgress();
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
  const pYTarget = (S.phase === "player" || S.phase === "pause") && fr ? Math.max(-52, Math.min(0, fr.F.y)) : 0;
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
  for (const pr of props) pr.update(dt);
  for (const a of ambFx) a.update(dt);
  for (let i = floats.length - 1; i >= 0; i--) { floats[i].update(dEff); if (floats[i].done()) floats.splice(i, 1); }
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dEff; if (rings[i].t >= rings[i].life) rings.splice(i, 1); }
  if (shake > 0) shake = Math.max(0, shake - dt * 14);
  if (zoom > 0) zoom = Math.max(0, zoom - dt * 0.9);
  if (Math.abs(pKb) > 0.2) pKb *= Math.exp(-dt * 11); else pKb = 0;
  if (playerHit > 0) playerHit = Math.max(0, playerHit - dt);
  if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
  if (Math.random() < 0.3 && embers.length < 26) {
    embers.push({ x: rnd(0, W), y: rnd(H * 0.4, H), vx: rnd(-8, 8), vy: rnd(-26, -12), life: rnd(1.1, 2.4), t: 0 });
  }
  for (let i = embers.length - 1; i >= 0; i--) {
    const e = embers[i];
    e.t += dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vx += rnd(-6, 6) * dt;
    if (e.t >= e.life) embers.splice(i, 1);
  }
  if (followT > 0) { followT -= dEff; if (followT <= 0 && S.phase === "player") doFollow(); }

  switch (S.phase) {
    case "player":
      if (!S.hit && S.t >= curSkill(S.moveIx).hit) { S.hit = true; resolveHit(); }
      if (atkFx && atkFx.done()) { atkFx = null; S.phase = "pause"; S.t = 0; }
      break;
    case "pause":
      if (S.t >= 0.32) { if (S.pendingClear) return beginClear(); enemyTurn(); }
      break;
    case "enemy":
      if (!S.hit && S.t >= 0.18) { S.hit = true; enemyStrike(); }
      if (S.t >= 0.92) { if (S.pendingClear) return beginClear(); endTurn(); }
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
        if (S.pendingClear) return beginClear();
        if (S.phase === "clear") return;
        S.phase = "ready"; S.t = 0;
        hint(intentHint(foes[S.actor]));
        paintButtons(); paintFin();
      }
      break;
    case "clear":
      if (S.t >= 1.3) {
        $("cine").classList.remove("on"); transFx = null;
        if (S.stage === STAGES.length - 1 && S.wave === WAVES - 1) return gameOver(true);
        offerUpgrade();
      }
      break;
  }
}

// ---- 绘制 ----------------------------------------------------------------
function draw() {
  clearFrame(frame);
  frame.color.set(BGS[Math.min(S.stage, BGS.length - 1)] || BGS[0]);
  for (const a of ambFx) a.draw(frame, "back");
  {
    const dd = DECOR[Math.min(S.stage, DECOR.length - 1)];
    for (const [k, x] of dd.sils) drawSil(k, x, hex(dd.dk), hex(dd.lt));
  }
  for (const pr of props) pr.draw(frame, "back");
  const vis = foes.filter((f) => f.alive || f.deathT > 0).sort((a, b) => a.F.x - b.F.x);

  if (embers.length) {
    const ep = painterFor(frame); ep.place(0, 0);
    for (const e of embers) {
      const k = 1 - e.t / e.life;
      ep.dot(e.x, e.y, hex(k > 0.5 ? "#ffb060" : "#ff6a30"), 0.25 + k * 0.6);
    }
  }
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
    if (f.fx) {
      f.fx.options.x = F.x + (f.hitT > 0 ? rnd(-1.5, 1.5) : 0);
      f.fx.options.y = GROUND + f.def.oy + f.def.lift + F.y + (f.sink || 0);
      f.fx.draw(frame, "back");
    }
  }
  if (atkFx) atkFx.draw(frame, "back");

  const lean = S.phase === "player" ? Math.sin(Math.min(1, S.t / 0.9) * Math.PI) * 7 : 0;
  if (atkFx) atkFx.options.x = pPos;
  const pT = (S.dashTo ?? PX);
  const dashing = (S.phase === "player" || S.phase === "pause") && Math.abs(pT - pPos) > 5;
  if (dashing) {
    const dir = Math.sign(pT - pPos) || 1;
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
    if (f.hitT > 0.045) {
      const x0 = Math.max(0, Math.floor(F.x - 58)), x1 = Math.min(W, Math.ceil(F.x + 58));
      const y0 = Math.max(0, Math.floor(GROUND + f.def.lift - 108)), y1 = Math.min(H, Math.floor(GROUND + 4));
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

  for (const pr of props) pr.draw(frame, "front");

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

  if (S.combo >= 2) {
    const cp = painterFor(frame); cp.place(0, 0);
    const pulse = S.comboT > 3.6 ? 1 : 0;
    drawText(cp, "x" + S.combo, 24, 14, hex(pulse ? "#ffffff" : "#ffe066"), "big", 2, "center");
    drawText(cp, "COMBO", 24, 31, hex("#ffb060"), "mini", 1, "center");
    if (S.combo >= 10) drawText(cp, "MAX", 24, 39, hex("#ff5a4a"), "mini", 1, "center");
  }

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

function drawOverlays(vis) {
  const pp = painterFor(frame);
  pp.place(0, 0);
  for (const f of vis) {
    if (!f.alive) continue;
    const F = f.F;
    const top = GROUND - f.def.uiY + F.y;
    const isTarget = f === tgt();
    const bw = f.big ? 46 : 38, bx = Math.round(F.x - bw / 2), by = Math.round(top - 8);
    pp.rect(bx, by, bw, 3, hex("#0a0910"), 0.9);
    pp.rect(bx, by, Math.round(bw * Math.max(0, f.hp / f.maxhp)), 3, isTarget ? hex("#ff8a5a") : hex("#c04048"), 1);
    if (isTarget) {
      pp.rect(bx - 1, by - 1, bw + 2, 1, hex("#ffd18a"), 1);
      pp.rect(bx - 1, by + 3, bw + 2, 1, hex("#ffd18a"), 1);
      pp.tri(F.x - 3, top - 17, F.x + 3, top - 17, F.x, top - 12, hex("#ffd18a"));
    }
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
    if (f.big) drawText(pp, "BOSS", F.x, by - 26, hex("#ff8a5a"), "mini", 1, "center");
  }
}

// ---- 界面 ----------------------------------------------------------------
function renderSkills() {
  const box = $("moves");
  let html = "";
  S.skills.forEach((id, i) => {
    const k = SKILL_POOL[id];
    html += '<button class="mv" data-i="' + i + '"><em>' + (i + 1) + '</em><b>' + k.name + '</b><i>' + k.tag + '</i><s></s><u></u></button>';
  });
  html += '<button class="mv fin" data-i="' + S.skills.length + '"><em>Q</em><b>终结技</b><i id="finTip">能量 0 / 100</i><s id="finDmg"></s><u></u></button>';
  box.innerHTML = html;
  btns = [...box.querySelectorAll(".mv")];
  btns.forEach((b) => b.addEventListener("click", () => chooseMove(+b.dataset.i)));
}
function paintBars() {
  $("php").style.transform = "scaleX(" + clamp01(S.hp / S.maxhp) + ")";
  $("pht").textContent = Math.max(0, S.hp) + (S.shield > 0 ? "+" + S.shield : "") + "/" + S.maxhp;
}
function paintProgress() {
  const st = STAGES[S.stage];
  let pips = "";
  for (let i = 0; i < WAVES; i++) pips += '<i class="pip' + (i < S.wave ? " on" : i === WAVES - 1 ? " boss" : "") + '"></i>';
  $("progress").innerHTML = '<b>' + st.name + "</b><span>第 " + (S.wave + 1) + " / 3 波</span><div class=\"pips\">" + pips + "</div>"
    + '<span style="margin-left:auto">击杀 ' + S.kills + "</span>";
}
function paintFoeBars() {
  const box = $("foeBars");
  box.innerHTML = foes.map((f, i) => {
    const pct = Math.max(0, Math.round((f.hp / f.maxhp) * 100));
    return '<div class="fbar' + (f.alive ? "" : " dead") + (f === tgt() && f.alive ? " tgt" : "") + '" data-i="' + i + '">'
      + '<span class="fn">' + f.def.name + (f.big ? " ★" : "") + '</span>'
      + '<div class="ftrack"><i style="width:' + pct + '%"></i></div>'
      + '<b>' + Math.max(0, f.hp) + '</b></div>';
  }).join("");
  box.querySelectorAll(".fbar").forEach((el) => {
    el.addEventListener("click", () => {
      const i = +el.dataset.i;
      if (!foes[i] || !foes[i].alive) return;
      S.target = i; paintFoeBars(); paintButtons();
    });
  });
}
function paintStatus() {
  const e = [];
  const f = foes[S.actor];
  if (f && f.intent && f.alive) {
    const t = { heavy: "蓄力", attack: "攻击", guard: "举盾", debuff: "放毒", stunned: "被打断" }[f.intent.type] || "?";
    e.push("<span>" + f.def.name + " · " + t + "</span>");
  }
  $("estatus").innerHTML = e.length ? e.join("") : '<span class="none">没有威胁</span>';
  const p = [];
  if (S.poison > 0) p.push('<span>☠<b class="tag">' + S.poison + "</b></span>");
  if (S.shield > 0) p.push('<span>🛡<b class="tag">' + S.shield + "</b></span>");
  $("pstatus").innerHTML = p.length ? p.join("") : '<span class="none">无状态</span>';
}
function previewOf(i) {
  const m = curSkill(i), f = tgt();
  let lo = m.dmg[0], hi = m.dmg[1];
  if (m.area) { lo = Math.round(lo * 0.75); hi = Math.round(hi * 0.75); }
  lo = dmgOf(lo); hi = dmgOf(hi);
  if (f && f.guard) { lo = Math.round(lo * 0.6); hi = Math.round(hi * 0.6); }
  const critHi = Math.round(hi * 1.35);
  const hp = f ? f.hp : 0;
  return { lo, hi, critHi, kill: lo >= hp, chance: critHi >= hp };
}
function paintButtons() {
  const f = tgt();
  const canBreak = f && f.intent && f.intent.type === "heavy";
  btns.forEach((b, i) => {
    if (i === S.skills.length) return;
    const cool = (S.cd[i] || 0) > 0;
    b.classList.toggle("cool", cool);
    b.classList.toggle("busy", S.phase !== "ready" || cool);
    b.querySelector("u").style.width = cool ? "100%" : "0";
    const m = SKILL_POOL[S.skills[i]];
    if (m.break) b.classList.toggle("hint-break", canBreak && !cool);
    const pv = previewOf(i);
    const dEl = b.querySelector("s");
    if (dEl) dEl.textContent = pv.lo + "-" + pv.hi;
    b.classList.toggle("lethal", pv.kill && S.phase === "ready");
    b.classList.toggle("chance", !pv.kill && pv.chance && S.phase === "ready");
  });
  paintFin();
}
function paintFin() {
  const b = btns[btns.length - 1];
  if (!b) return;
  const armed = S.energy >= MAX_ENERGY;
  b.classList.toggle("armed", armed);
  b.classList.toggle("busy", S.phase !== "ready" || !armed);
  b.querySelector("u").style.width = clamp01(S.energy / MAX_ENERGY) * 100 + "%";
  const tip = $("finTip");
  if (tip) tip.textContent = armed ? "就绪 · 按 Q" : "能量 " + Math.round(S.energy) + " / " + MAX_ENERGY;
  const fd = $("finDmg");
  if (fd) fd.textContent = Math.round(24 * 1.35 * S.mods.fin) + "-" + Math.round(45 * 1.35 * S.mods.fin);
}
const hintEl = $("hint");
function hint(s) { hintEl.textContent = "R" + S.round + " · " + s; }
function log(kind, text) {
  S.log.unshift({ kind, text, r: S.round });
  if (S.log.length > 6) S.log.pop();
  $("log").innerHTML = S.log.map((e) =>
    '<li class="' + e.kind + '"><span>R' + e.r + '</span><b>' + e.text + "</b></li>").join("");
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

$("ovBtn").addEventListener("click", restart);
addEventListener("keydown", (e) => {
  const i = "123456".indexOf(e.key);
  if (i >= 0) { e.preventDefault(); chooseMove(i); }
  if (e.key === "q" || e.key === "Q" || e.key === " ") { e.preventDefault(); chooseMove(S.skills.length); }
  if (e.key === "Tab") {
    e.preventDefault();
    const l = alive();
    if (l.length) { S.target = foes.indexOf(l[(l.indexOf(tgt()) + 1) % l.length]); paintFoeBars(); paintButtons(); }
  }
});
cv.addEventListener("pointerdown", (e) => {
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * W;
  let best = -1, bd = 60;
  foes.forEach((f, i) => { if (!f.alive) return; const d = Math.abs(f.F.x - x); if (d < bd) { bd = d; best = i; } });
  if (best >= 0) { S.target = best; paintFoeBars(); paintButtons(); }
});

// ---- 启动 ----------------------------------------------------------------
renderSkills();
spawnWave();
const f0 = pickActor();
paintBars(); paintButtons(); paintFin(); paintStatus(); paintProgress();
hint(f0 ? intentHint(f0) : "选一招");
requestAnimationFrame(tick);

window.__game = {
  S, foes, chooseMove, SKILL_POOL, FINISHERS, STAGES, UPGRADES, addEnergy, startFinisher,
  paintButtons, previewOf, log, applyUpgrade, offerUpgrade, nextWave, offerRoute, pickRoute, setStageFx, startWave,
  dbg: () => ({
    hitstop, zoom, flashN, whiteN, wallHits, floorHits, audio: !!AC && AC.state,
    phase: S.phase, stage: S.stage, wave: S.wave, round: S.round, kills: S.kills,
    hp: S.hp, maxhp: S.maxhp, shield: S.shield, skills: S.skills.slice(), mods: { ...S.mods },
    target: S.target, actor: S.actor, upChoices: S.upChoices && S.upChoices.map((u) => u.id),
    foes: foes.map((f) => ({ name: f.def.name, hp: f.hp, max: f.maxhp, alive: f.alive,
      intent: f.intent && f.intent.type, x: +f.F.x.toFixed(1), y: +f.F.y.toFixed(1), air: f.F.air, big: !!f.big })),
  }),
};
