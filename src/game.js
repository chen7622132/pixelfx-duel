// 像素对决 —— pixelfx 回合制对战 v1.1（带回能量终结技）
// 渲染：320×180 内部像素缓冲 → 整数倍放大到 1280×720
import {
  createFrame, clearFrame, createFx, composite, painterFor, drawActor, stockActor, backdrop,
} from "../vendor/pixelfx/core/index.js";

import * as mSword from "../vendor/pixelfx/fx/melee/sword-slash.js";
import * as mThrust from "../vendor/pixelfx/fx/melee/thrust.js";
import * as mHammer from "../vendor/pixelfx/fx/melee/hammer-smash.js";
import * as mSpin from "../vendor/pixelfx/fx/melee/spin-slash.js";
import * as iBlunt from "../vendor/pixelfx/fx/impacts/blunt-hit.js";
import * as iCrit from "../vendor/pixelfx/fx/impacts/crit-hit.js";
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

// 12 个完整招式（终结技）
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
const GROUND = 152, PX = 118, EX = 196;
const CINE_LINE = 262;      // 终结技时敌人靶位固定在右起 58px
const MAX_ENERGY = 100;

// ---- 画布与缓冲 ----------------------------------------------------------
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
  { mod: mSword,  name: "疾斩",   dmg: [11, 15], hit: 0.06, shake: 2, cd: 0 },
  { mod: mThrust, name: "突刺",   dmg: [14, 18], hit: 0.07, shake: 2, cd: 1, break: true },
  { mod: mHammer, name: "碎地锤", dmg: [28, 34], hit: 0.15, shake: 3, cd: 2, stun: true },
  { mod: mSpin,   name: "回旋斩", dmg: [13, 17], hit: 0.17, shake: 2, cd: 1, bleed: true },
];

// 12 个终结技：伤害 / 元素 / 该招式自带的靶距 (act.target)
const FINISHERS = {
  "fireball-throw":  { mod: gFireball,  name: "火球投掷", el: "FIRE",       dmg: [34, 44], target: 190, hit: 1.41 },
  "earth-stomp":     { mod: gStomp,     name: "大地践踏", el: "EARTH",      dmg: [32, 40], target: 112, hit: 0.06 },
  "ground-pound":    { mod: gPound,     name: "坠落重击", el: "IMPACT",     dmg: [33, 42], target: 80, hit: 0.62 },
  "sword-combo":     { mod: gCombo,     name: "三段连斩", el: "BLADE",      dmg: [30, 39], target: 118, hit: 0.06 },
  "lightning-call":  { mod: gLightning, name: "引雷",     el: "THUNDER",    dmg: [35, 46], target: 130, hit: 0.76 },
  "ice-lance-throw": { mod: gIce,       name: "冰枪投掷", el: "FROST",      dmg: [33, 43], target: 170, hit: 1.14 },
  "dash-strike":     { mod: gDash,      name: "疾风突袭", el: "BLADE",      dmg: [30, 39], target: 176, hit: 0.22 },
  "meteor-call":     { mod: gMeteor,    name: "召唤陨石", el: "METEOR",     dmg: [38, 50], target: 170, hit: 1.52 },
  "holy-smite":      { mod: gHoly,      name: "圣光制裁", el: "HOLY",       dmg: [35, 46], target: 118, hit: 0.47 },
  "rocket-launcher": { mod: gRocket,    name: "火箭筒",   el: "BLAST",      dmg: [37, 48], target: 200, hit: 0.6 },
  "pistol-shots":    { mod: gPistol,    name: "三连射",   el: "SHOT",       dmg: [28, 37], target: 180, hit: 0.26 },
  "arrow-shot":      { mod: gArrow,     name: "穿云箭",   el: "ARROW",      dmg: [30, 39], target: 180, hit: 0.8 },
};

const FOES = [
  { mod: cSlime, name: "史莱姆", hp: 52, dmg: [5, 7],  oy: -6,  heal: 14,
    pool: ["fireball-throw", "earth-stomp", "ground-pound", "sword-combo"] },
  { mod: cBat,   name: "蝙蝠",   hp: 64, dmg: [6, 9],  oy: -34, heal: 16,
    pool: ["lightning-call", "ice-lance-throw", "dash-strike", "meteor-call"] },
  { mod: cGhost, name: "幽魂",   hp: 78, dmg: [8, 11], oy: -10, heal: 18,
    pool: ["holy-smite", "rocket-launcher", "pistol-shots", "arrow-shot"] },
];

// ---- 运行时状态 ----------------------------------------------------------
const S = {
  phase: "ready",   // ready | player | pause | enemy | kill | cineIn | cine | cineOut | over
  t: 0,
  hp: 120, maxhp: 120,
  foeIx: 0, fhp: 52, fmaxhp: 52,
  cd: [0, 0, 0, 0],
  moveIx: 0, hit: false,
  stun: false, bleed: 0, poison: 0,
  charging: false,
  energy: 0,
  kills: 0,
  fin: null,          // 当前终结技配置
  cinePX: PX, cineEX: EX,
  slow: 0,
};
let atkFx = null, foeFx = null, foeDotFx = null, transFx = null, alertFx = null;
const floats = [];
let shake = 0, foeHit = 0, playerHit = 0, lb = 0;
let pPos = PX, ePos = EX;

const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.round(rnd(a, b));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const $ = (id) => document.getElementById(id);

function addFx(mod, o) {
  const f = createFx(mod, o);
  floats.push(f);
  return f;
}

function spawnFoe() {
  const f = FOES[S.foeIx];
  S.fmaxhp = f.hp; S.fhp = f.hp;
  S.bleed = 0; S.stun = false; S.charging = false; S.fin = null;
  foeFx = createFx(f.mod, { x: EX, y: GROUND + f.oy, seed: ri(1, 900) });
  foeDotFx = null; alertFx = null;
  $("ename").textContent = f.name;
  S.usedFins = new Set();
}

function setFoeDot(kind) {
  const mod = kind === "burn" ? sBurning : kind === "bleed" ? sBleed : null;
  if (mod) foeDotFx = createFx(mod, { x: ePos, y: GROUND + FOES[S.foeIx].oy + 6, seed: 7 });
}

// ---- 出招 ----------------------------------------------------------------
function chooseMove(i) {
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
  let broke = false;
  if (m.break && S.charging) { broke = true; S.charging = false; dmg = Math.round(dmg * 1.5); crit = true; }
  if (crit) dmg = Math.round(dmg * 1.35);
  S.fhp = Math.max(0, S.fhp - dmg);
  addEnergy(14);
  shake = m.shake; foeHit = 0.2;
  addFx(crit ? uCrit : uDmg, { x: ePos + ri(-8, 8), y: GROUND - 72, text: "-" + dmg });
  addFx(crit ? iCrit : iBlunt, { x: ePos - 20, y: GROUND - 26, seed: ri(1, 900) });
  if (m.stun) { S.stun = true; addFx(sStun, { x: ePos, y: GROUND - 62, seed: 3 }); }
  if (m.bleed && !S.bleed) { S.bleed = 3; setFoeDot("bleed"); }
  hint(broke ? "识破！打断蓄力，造成 " + dmg : crit ? "暴击 " + dmg : "命中 " + dmg);
  paintBars();
}

function endTurn() {
  S.cd = S.cd.map((c) => Math.max(0, c - 1));
  if (S.fhp <= 0) return startKill();
  if (S.hp <= 0) return gameOver(false);
  S.phase = "ready"; S.t = 0;
  S.charging = Math.random() < 0.3 && !S.stun;
  if (S.charging) {
    alertFx = createFx(uAlert, { x: ePos, y: GROUND + FOES[S.foeIx].oy - 4, seed: ri(1, 900) });
    hint("对手在蓄力 —— 用突刺可以打断");
  } else hint(S.energy >= MAX_ENERGY ? "能量满 —— 可以放终结技" : "选一招");
  paintButtons();
}

function enemyTurn() {
  if (S.fhp <= 0) return startKill();
  let dot = 0;
  if (S.bleed > 0) { S.bleed -= 1; dot += 3; }
  if (S.poison > 0) { S.poison -= 1; S.hp = Math.max(0, S.hp - 3); }
  if (dot) {
    S.fhp = Math.max(0, S.fhp - dot);
    addFx(uDmg, { x: ePos + ri(-8, 8), y: GROUND - 66, text: "-" + dot });
    paintBars();
    if (S.fhp <= 0) return startKill();
  }
  if (S.stun) {
    S.stun = false; S.charging = false;
    addFx(sStun, { x: ePos, y: GROUND - 62, seed: 5 });
    hint("对手被击晕，跳过回合");
    return endTurn();
  }
  S.phase = "enemy"; S.t = 0; S.hit = false;
  hint(S.charging ? "重击来了！" : "对手反击…");
}

function enemyStrike() {
  const f = FOES[S.foeIx];
  let dmg = ri(f.dmg[0], f.dmg[1]);
  const heavy = S.charging;
  if (heavy) { dmg = Math.round(dmg * 1.8); S.charging = false; }
  S.hp = Math.max(0, S.hp - dmg);
  addEnergy(8);
  shake = heavy ? 3 : 2; playerHit = 0.22;
  addFx(heavy ? uCrit : uDmg, { x: pPos + ri(-6, 6), y: GROUND - 58, text: "-" + dmg });
  addFx(iBlunt, { x: pPos + 16, y: GROUND - 24, seed: ri(1, 900) });
  flash("red");
  if (Math.random() < 0.15 && !S.poison) {
    S.poison = 3;
    addFx(sPoison, { x: pPos, y: GROUND, seed: 11 });
    hint("你中毒了");
  } else hint(heavy ? "重击 " + dmg + "！" : "受到 " + dmg + " 伤害");
  paintBars();
}

// ---- 终结技 --------------------------------------------------------------
function addEnergy(n) {
  S.energy = Math.min(MAX_ENERGY, S.energy + n);
  paintFin();
}

function startFinisher(forceId) {
  if (S.energy < MAX_ENERGY) {
    hint("能量不足（" + S.energy + " / " + MAX_ENERGY + "）");
    return;
  }
  const pool = FOES[S.foeIx].pool.filter((k) => !S.usedFins.has(k));
  const pick = pool.length ? pool : FOES[S.foeIx].pool;
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
  shake = 4; foeHit = 0.3; S.slow = 0.16;
  addFx(uCrit, { x: ePos, y: GROUND - 80, text: "-" + dmg });
  addFx(iCrit, { x: ePos - 30, y: GROUND - 40, seed: ri(1, 900) });
  flash("white");
  hint(F.name + " " + dmg + " 伤害");
  paintBars();
}

// ---- 结算 ----------------------------------------------------------------
function startKill() {
  S.phase = "kill"; S.t = 0; S.charging = false;
  transFx = createFx(tBurn, { x: W / 2, y: H / 2, seed: ri(1, 900) });
  hint("击败 " + FOES[S.foeIx].name);
}

function nextFoe() {
  const heal = FOES[S.foeIx].heal;
  S.hp = Math.min(S.maxhp, S.hp + heal);
  S.kills += 1; S.foeIx += 1;
  transFx = null;
  paintBars();
  if (S.foeIx >= FOES.length) return gameOver(true);
  spawnFoe();
  S.phase = "ready"; S.t = 0;
  paintBars(); paintButtons();
  hint(FOES[S.foeIx].name + " 出现了（回复 " + heal + " HP）");
}

function gameOver(win) {
  S.phase = "over";
  $("ovTitle").textContent = win ? "通关" : "被打倒了";
  $("ovText").textContent = win
    ? "三只怪全部清掉，12 个终结技都摸过了。剩下 226 个特效等你接上去。"
    : "倒在" + FOES[S.foeIx].name + "面前。再来一次？";
  $("overlay").classList.remove("hide");
}

function restart() {
  $("overlay").classList.add("hide");
  S.hp = S.maxhp; S.foeIx = 0; S.kills = 0; S.cd = [0, 0, 0, 0]; S.energy = 0;
  S.bleed = 0; S.poison = 0; S.stun = false; S.charging = false; S.fin = null;
  floats.length = 0; atkFx = null; transFx = null; alertFx = null;
  pPos = PX; ePos = EX;
  spawnFoe(); S.phase = "ready"; S.t = 0;
  paintBars(); paintButtons(); paintFin(); hint("选一招");
}

// ---- 主循环 --------------------------------------------------------------
let last = performance.now();
let lastDt = 0.016;
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; lastDt = dt;
  step(dt);
  draw();
  requestAnimationFrame(tick);
}

function step(dt) {
  const cineLike = S.phase === "cineIn" || S.phase === "cine" || S.phase === "cineOut";
  pPos += ((cineLike ? S.cinePX : PX) - pPos) * (1 - Math.exp(-dt * 9));
  ePos += ((cineLike ? S.cineEX : EX) - ePos) * (1 - Math.exp(-dt * 9));
  const lbT = (S.phase === "cineIn" || S.phase === "cine") ? 16 : 0;
  lb += (lbT - lb) * (1 - Math.exp(-dt * 13));

  let d = dt;
  if (S.slow > 0) { S.slow -= dt; d = dt * 0.22; }
  const dEff = S.phase === "cine" ? d * 1.1 : d;
  S.t += dEff;

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
  if (shake > 0) shake = Math.max(0, shake - dt * 12);
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
        hint("选一招");
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
  const jitter = foeHit > 0 ? rnd(-2, 2) : 0;
  if (foeFx) foeFx.options.x = ePos - lunge + jitter;
  if (foeDotFx) foeDotFx.options.x = ePos;
  if (alertFx) alertFx.options.x = ePos;

  for (const t of TORCHES) t.draw(frame, "back");
  if (foeFx) foeFx.draw(frame, "back");
  if (atkFx) atkFx.draw(frame, "back");

  const lean = S.phase === "player" ? Math.sin(Math.min(1, S.t / 0.9) * Math.PI) * 7 : 0;
  if (atkFx) atkFx.options.x = pPos;
  const p = painterFor(frame);
  p.place(pPos + lean + (playerHit > 0 ? rnd(-2, 2) : 0), GROUND);
  drawActor(p, ACTOR, 1);

  if (atkFx) atkFx.draw(frame, "front");
  if (foeFx) foeFx.draw(frame, "front");
  if (foeDotFx) foeDotFx.draw(frame, "front");
  if (alertFx) alertFx.draw(frame, "front");
  for (const t of TORCHES) t.draw(frame, "front");
  for (const fl of floats) fl.draw(frame, "front");
  if (transFx) transFx.draw(frame, "front");

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
  ctx.drawImage(off, sx * SCALE, sy * SCALE, W * SCALE, H * SCALE);
}

// ---- 界面 ----------------------------------------------------------------
const php = $("php"), ehp = $("ehp");
function paintBars() {
  php.style.transform = "scaleX(" + clamp01(S.hp / S.maxhp) + ")";
  ehp.style.transform = "scaleX(" + clamp01(S.fhp / S.fmaxhp) + ")";
  $("pht").textContent = Math.max(0, S.hp);
  $("eht").textContent = Math.max(0, S.fhp);
}

const btns = [...document.querySelectorAll(".mv")];
function paintButtons() {
  btns.forEach((b, i) => {
    if (i === 4) return;
    const cool = S.cd[i] > 0;
    b.classList.toggle("cool", cool);
    b.classList.toggle("busy", S.phase !== "ready" || cool);
    b.querySelector("u").style.width = cool ? "100%" : "0";
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
}

const hintEl = $("hint");
function hint(s) { hintEl.textContent = s; }

const fl = $("flash");
let flashT = 0;
function flash(kind) {
  fl.classList.toggle("white", kind === "white");
  fl.classList.add("on");
  clearTimeout(flashT);
  flashT = setTimeout(() => { fl.classList.remove("on"); fl.classList.remove("white"); }, kind === "white" ? 160 : 90);
}

btns.forEach((b) => b.addEventListener("click", () => chooseMove(+b.dataset.i)));
$("ovBtn").addEventListener("click", restart);
addEventListener("keydown", (e) => {
  const i = "12345".indexOf(e.key);
  if (i >= 0) { e.preventDefault(); chooseMove(i); }
});

spawnFoe();
paintBars(); paintButtons(); paintFin();
hint("选一招");
requestAnimationFrame(tick);

window.__game = {
  S, chooseMove, MOVES, FINISHERS,
  get foe() { return FOES[S.foeIx]; },
  addEnergy, startFinisher, // 自检用
};
