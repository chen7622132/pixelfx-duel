// 像素对决 —— pixelfx 回合制对战 v1
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

const W = 320, H = 180, SCALE = 4;
const GROUND = 152, PX = 118, EX = 196;

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

const FOES = [
  { mod: cSlime, name: "史莱姆", hp: 52, dmg: [5, 7],  oy: -6,  heal: 14 },
  { mod: cBat,   name: "蝙蝠",   hp: 64, dmg: [6, 9],  oy: -34, heal: 16 },
  { mod: cGhost, name: "幽魂",   hp: 78, dmg: [8, 11], oy: -10, heal: 18 },
];

// ---- 运行时状态 ----------------------------------------------------------
const S = {
  phase: "ready",   // ready | player | pause | enemy | kill | over
  t: 0,
  hp: 120, maxhp: 120,
  foeIx: 0, fhp: 52, fmaxhp: 52,
  cd: [0, 0, 0, 0],
  moveIx: 0, hit: false,
  stun: false, bleed: 0, poison: 0,
  charging: false,   // 敌人正在蓄力（本轮会重击，可用突刺打断）
  kills: 0,
};
let atkFx = null;
let foeFx = null;
let foeDotFx = null;
let transFx = null;
let alertFx = null;
const floats = [];
let shake = 0, foeHit = 0, playerHit = 0;

const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.round(rnd(a, b));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function addFx(mod, o) {
  const f = createFx(mod, o);
  floats.push(f);
  return f;
}

function spawnFoe() {
  const f = FOES[S.foeIx];
  S.fmaxhp = f.hp; S.fhp = f.hp;
  S.bleed = 0; S.stun = false; S.charging = false;
  foeFx = createFx(f.mod, { x: EX, y: GROUND + f.oy, seed: ri(1, 900) });
  foeDotFx = null; alertFx = null;
  document.getElementById("ename").textContent = f.name;
}

function setFoeDot(kind) {
  const mod = kind === "burn" ? sBurning : kind === "bleed" ? sBleed : null;
  if (mod) foeDotFx = createFx(mod, { x: EX, y: GROUND + FOES[S.foeIx].oy + 6, seed: 7 });
}

// ---- 回合逻辑 ------------------------------------------------------------
function chooseMove(i) {
  if (S.phase !== "ready") return;
  if (S.cd[i] > 0) return;
  const m = MOVES[i];
  S.phase = "player"; S.t = 0; S.hit = false; S.moveIx = i;
  S.cd = S.cd.map((c) => Math.max(0, c - 1));
  S.cd[i] = m.cd;
  atkFx = createFx(m.mod, { x: PX, y: GROUND, seed: ri(1, 900) });
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
  shake = m.shake; foeHit = 0.2;
  addFx(crit ? uCrit : uDmg, { x: EX + ri(-8, 8), y: GROUND - 72, text: "-" + dmg });
  addFx(crit ? iCrit : iBlunt, { x: EX - 20, y: GROUND - 26, seed: ri(1, 900) });
  if (m.stun) { S.stun = true; addFx(sStun, { x: EX, y: GROUND - 62, seed: 3 }); }
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
    alertFx = createFx(uAlert, { x: EX, y: GROUND + FOES[S.foeIx].oy - 4, seed: ri(1, 900) });
    hint("对手在蓄力 —— 用突刺可以打断");
  } else hint("选一招");
  paintButtons();
}

function enemyTurn() {
  if (S.fhp <= 0) return startKill();
  let dot = 0;
  if (S.bleed > 0) { S.bleed -= 1; dot += 3; }
  if (S.poison > 0) { S.poison -= 1; S.hp = Math.max(0, S.hp - 3); }
  if (dot) {
    S.fhp = Math.max(0, S.fhp - dot);
    addFx(uDmg, { x: EX + ri(-8, 8), y: GROUND - 66, text: "-" + dot });
    paintBars();
    if (S.fhp <= 0) return startKill();
  }
  if (S.stun) {
    S.stun = false; S.charging = false;
    addFx(sStun, { x: EX, y: GROUND - 62, seed: 5 });
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
  shake = heavy ? 3 : 2; playerHit = 0.22;
  addFx(heavy ? uCrit : uDmg, { x: PX + ri(-6, 6), y: GROUND - 58, text: "-" + dmg });
  addFx(iBlunt, { x: PX + 16, y: GROUND - 24, seed: ri(1, 900) });
  flash();
  if (Math.random() < 0.15 && !S.poison) {
    S.poison = 3;
    addFx(sPoison, { x: PX, y: GROUND, seed: 11 });
    hint("你中毒了");
  } else hint(heavy ? "重击 " + dmg + "！" : "受到 " + dmg + " 伤害");
  paintBars();
}

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
  document.getElementById("ovTitle").textContent = win ? "通关" : "被打倒了";
  document.getElementById("ovText").textContent = win
    ? "三只怪全部清掉。剩下 217 个特效等你接上去。"
    : "倒在" + FOES[S.foeIx].name + "面前。再来一次？";
  document.getElementById("overlay").classList.remove("hide");
}

function restart() {
  document.getElementById("overlay").classList.add("hide");
  S.hp = S.maxhp; S.foeIx = 0; S.kills = 0; S.cd = [0, 0, 0, 0];
  S.bleed = 0; S.poison = 0; S.stun = false; S.charging = false;
  floats.length = 0; atkFx = null; transFx = null; alertFx = null;
  spawnFoe(); S.phase = "ready"; S.t = 0;
  paintBars(); paintButtons(); hint("选一招");
}

// ---- 主循环 --------------------------------------------------------------
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(dt);
  draw();
  requestAnimationFrame(tick);
}

function step(dt) {
  S.t += dt;
  if (foeFx) foeFx.update(dt);
  if (foeDotFx) { foeDotFx.update(dt); if (foeDotFx.done()) foeDotFx = null; }
  if (alertFx) { alertFx.update(dt); if (alertFx.done()) alertFx = null; }
  if (atkFx) atkFx.update(dt);
  if (transFx) transFx.update(dt);
  for (const t of TORCHES) t.update(dt);
  for (let i = floats.length - 1; i >= 0; i--) {
    floats[i].update(dt);
    if (floats[i].done()) floats.splice(i, 1);
  }
  if (shake > 0) shake = Math.max(0, shake - dt * 12);
  if (foeHit > 0) foeHit = Math.max(0, foeHit - dt);
  if (playerHit > 0) playerHit = Math.max(0, playerHit - dt);

  if (S.phase === "player") {
    if (!S.hit && S.t >= MOVES[S.moveIx].hit) { S.hit = true; resolveHit(); }
    if (atkFx && atkFx.done()) { atkFx = null; S.phase = "pause"; S.t = 0; }
  } else if (S.phase === "pause") {
    if (S.t >= 0.32) enemyTurn();
  } else if (S.phase === "enemy") {
    if (!S.hit && S.t >= 0.18) { S.hit = true; enemyStrike(); }
    if (S.t >= 0.92) endTurn();
  } else if (S.phase === "kill") {
    if (S.t >= 1.05) nextFoe();
  }
}

function draw() {
  clearFrame(frame);
  frame.color.set(BG);

  const lunge = S.phase === "enemy" ? Math.sin(Math.min(1, S.t / 0.9) * Math.PI) * 42 : 0;
  const jitter = foeHit > 0 ? rnd(-2, 2) : 0;
  if (foeFx) foeFx.options.x = EX - lunge + jitter;

  for (const t of TORCHES) t.draw(frame, "back");
  if (foeFx) foeFx.draw(frame, "back");
  if (atkFx) atkFx.draw(frame, "back");

  const lean = S.phase === "player" ? Math.sin(Math.min(1, S.t / 0.9) * Math.PI) * 7 : 0;
  const px = PX + lean + (playerHit > 0 ? rnd(-2, 2) : 0);
  const p = painterFor(frame);
  p.place(px, GROUND);
  drawActor(p, ACTOR, 1);

  if (atkFx) atkFx.draw(frame, "front");
  if (foeFx) foeFx.draw(frame, "front");
  if (foeDotFx) foeDotFx.draw(frame, "front");
  if (alertFx) alertFx.draw(frame, "front");
  for (const t of TORCHES) t.draw(frame, "front");
  for (const fl of floats) fl.draw(frame, "front");
  if (transFx) transFx.draw(frame, "front");

  composite(frame, img.data, null, 1);
  octx.putImageData(img, 0, 0);

  const sx = shake > 0 ? Math.round(rnd(-shake, shake)) : 0;
  const sy = shake > 0 ? Math.round(rnd(-shake, shake)) : 0;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W * SCALE, H * SCALE);
  ctx.drawImage(off, sx * SCALE, sy * SCALE, W * SCALE, H * SCALE);
}

// ---- 界面 ----------------------------------------------------------------
const php = document.getElementById("php");
const ehp = document.getElementById("ehp");
function paintBars() {
  php.style.transform = "scaleX(" + clamp01(S.hp / S.maxhp) + ")";
  ehp.style.transform = "scaleX(" + clamp01(S.fhp / S.fmaxhp) + ")";
  document.getElementById("pht").textContent = Math.max(0, S.hp);
  document.getElementById("eht").textContent = Math.max(0, S.fhp);
}

const btns = [...document.querySelectorAll(".mv")];
function paintButtons() {
  btns.forEach((b, i) => {
    const cool = S.cd[i] > 0;
    b.classList.toggle("cool", cool);
    b.classList.toggle("busy", S.phase !== "ready" || cool);
    b.querySelector("u").style.width = cool ? "100%" : "0";
  });
}

const hintEl = document.getElementById("hint");
function hint(s) { hintEl.textContent = s; }

const fl = document.getElementById("flash");
let flashT = 0;
function flash() {
  fl.classList.add("on");
  clearTimeout(flashT);
  flashT = setTimeout(() => fl.classList.remove("on"), 90);
}

btns.forEach((b) => b.addEventListener("click", () => chooseMove(+b.dataset.i)));
document.getElementById("ovBtn").addEventListener("click", restart);
addEventListener("keydown", (e) => {
  const i = "1234".indexOf(e.key);
  if (i >= 0) { e.preventDefault(); chooseMove(i); }
});

// ---- 启动 ----------------------------------------------------------------
spawnFoe();
paintBars();
paintButtons();
hint("选一招");
requestAnimationFrame(tick);

window.__game = { S, chooseMove, MOVES, get foe() { return FOES[S.foeIx]; } };
