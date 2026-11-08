import re
p = 'src/game.js'
s = open(p).read()
done = []


def sub_func(src, name, new_code, tag=None):
    """替换整个 function NAME(...) { ... }（以顶格 } 结束）"""
    pat = re.compile(r'function ' + name + r'\([^)]*\) \{.*?\n\}\n', re.S)
    if not pat.search(src):
        print("MISS fn:", tag or name)
        return src
    done.append(tag or name)
    return pat.sub(lambda m: new_code, src, count=1)


def rep(a, b, tag):
    global s
    if a not in s:
        print("MISS:", tag)
        return
    s = s.replace(a, b, 1)
    done.append(tag)


# ---------- 1. 状态 ----------
rep("  phase: \"ready\", t: 0,", "  phase: \"plan\", t: 0,\n  slots: [null, null, null, null], intents: [], exec: null,", 'state')

# ---------- 2. 连携表 ----------
rep("function fillSlotPLACEHOLDER", "", "noop") if False else None
rep("const BASE_SKILLS = [\"slash\", \"thrust\", \"hammer\", \"spin\"];",
    """const CHAIN = { thrust: ["hammer"], flurry: ["scythe"], upper: ["cleave"], spin: ["scythe", "hammer"] };
const BASE_SKILLS = ["slash", "thrust", "hammer", "spin"];""", 'chain table')

# ---------- 3. 编排函数（替换 chooseMove） ----------
s = sub_func(s, 'chooseMove', '''function fillSlot(skillId) {
  ensureAudio();
  if (S.phase !== "plan") return;
  const si = S.skills.indexOf(skillId);
  if (si < 0) return;
  if ((S.cd[si] || 0) > 0) { hint(SKILL_POOL[skillId].name + " 冷却中（还要 " + S.cd[si] + " 回合）"); return; }
  if (S.slots.includes(skillId)) { hint("同一招一回合只能排一次"); return; }
  const i = S.slots.indexOf(null);
  if (i < 0) { hint("槽位满了 —— 点槽位可以清空"); return; }
  S.slots[i] = skillId;
  renderSlots(); paintButtons();
  hint("第 " + (i + 1) + " 位 · " + SKILL_POOL[skillId].name);
}
function clearSlot(i) {
  if (S.phase !== "plan") return;
  const rest = S.slots.filter((x, k) => k !== i && x);
  S.slots = rest.concat([null, null, null, null]).slice(0, 4);
  renderSlots(); paintButtons();
}
function chainOf(prev, cur) { return !!(prev && cur && (CHAIN[prev] || []).includes(cur)); }
function buildExec() {
  if (S.phase !== "plan") return;
  const list = [];
  const n = Math.max(S.slots.filter(Boolean).length, S.intents.length);
  for (let i = 0; i < n; i++) {
    const sid = S.slots[i];
    if (sid) list.push({ side: "me", id: sid, chain: chainOf(S.slots[i - 1], sid) });
    if (S.intents[i]) list.push({ side: "foe", ix: i });
  }
  if (!list.length) { hint("先排至少一个技能"); return; }
  S.exec = { list, ix: 0, t: 0, started: false, hit: false };
  S.phase = "exec"; S.t = 0;
  hint("执行编排 —— 双方沿时间轴交锋");
  renderSlots(); paintButtons();
}
''', 'fillSlot')

# ---------- 4. 玩家动作结算（替换 resolveHit） ----------
s = sub_func(s, 'resolveHit', '''function meHit(id, chain) {
  const m = SKILL_POOL[id];
  const f = tgt();
  let dmg = Math.round(dmgOf(ri(m.dmg[0], m.dmg[1])) * comboMul() * (chain ? 1.5 : 1));
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
  if (chain) { addRing(f.F.x, GROUND + f.def.lift - 50, 3); sfx(2); }
  hint((chain ? "连携！" : "") + (broke ? "识破！" : crit ? "暴击 " : "") + m.name);

  if (m.area) {
    const list = alive();
    for (const g of list) {
      const d2 = Math.max(1, Math.round(dmg * 0.75));
      g.hp = Math.max(0, g.hp - d2);
      g.hitT = 0.24;
      g.F.vx += m.kb.x * 0.8 * S.mods.kb; g.F.vy += m.kb.y * 0.8 * S.mods.kb; g.F.air = true;
      addFx(uDmg, { x: g.F.x + ri(-8, 8), y: GROUND + g.def.lift + g.F.y - 66, text: "-" + d2 });
      if ((m.bleed || S.mods.bleed) && !g.bleed) {
        g.bleed = 3;
        g.dotFx = createFx(sBleeding, { x: g.F.x, y: GROUND + g.def.oy + g.def.lift + 6, seed: 7 });
      }
      if (g.hp <= 0) killFoe(g);
    }
    impact(m.power, "foe", f);
    addRing(f.F.x, GROUND + f.def.lift - 30, 3);
    log("hit", (chain ? "连携 " : "") + m.name + " 全体 " + dmg + " ×" + list.length);
  } else {
    hitFoe(f, dmg, Math.min(4, m.power + (crit ? 1 : 0)), { kb: m.kb, crit });
    log("hit", (chain ? "连携 " : "") + m.name + " " + dmg + (broke ? "（打断）" : guarded ? "（被盾）" : crit ? "（暴击）" : "") + (f.hp <= 0 ? " · 击杀" : ""));
    if (m.lifesteal) {
      const heal = Math.round(dmg * m.lifesteal);
      S.hp = Math.min(S.maxhp, S.hp + heal);
      paintBars();
    }
  }
  if (m.stun) { f.stun = true; addFx(sStun, { x: f.F.x, y: GROUND + f.def.lift - 62, seed: 3 }); }
  if ((m.bleed || S.mods.bleed) && !f.bleed) {
    f.bleed = 3;
    f.dotFx = createFx(sBleeding, { x: f.F.x, y: GROUND + f.def.oy + f.def.lift + 6, seed: 7 });
  }
  paintFoeBars(); paintStatus();
}
''', 'meHit')

# ---------- 5. 删掉 doFollow ----------
s = sub_func(s, 'doFollow', '', 'del doFollow')

# ---------- 6. 回合结束 ----------
s = sub_func(s, 'endTurn', '''function endRound() {
  S.exec = null;
  S.slots = [null, null, null, null];
  S.cd = S.cd.map((c) => Math.max(0, c - 1));
  S.round += 1;
  S.t = 0;
  if (S.mods.regen) { S.hp = Math.min(S.maxhp, S.hp + S.mods.regen); paintBars(); }
  if (S.mods.shield) { S.shield = S.mods.shield; paintBars(); }
  if (S.poison > 0) { S.poison -= 1; S.hp = Math.max(0, S.hp - 3); log("hurt", "中毒 -3"); paintBars(); }
  if (S.pendingClear) return beginClear();
  if (S.hp <= 0) return gameOver(false);
  rollIntents();
  S.phase = "plan";
  renderSlots(); paintButtons(); paintStatus();
  hint("编排行动 —— 点技能填进槽位");
}
''', 'endRound')

# ---------- 7. 敌人动作（替换 enemyTurn / enemyStrike，删掉） ----------
s = sub_func(s, 'enemyTurn', '', 'del enemyTurn')
s = sub_func(s, 'enemyStrike', '''function foeHit(f, intent) {
  const I = intent || { type: "attack", dmg: 6 };
  if (I.type === "guard") {
    f.guard = true;
    addFx(iShield, { x: f.F.x, y: GROUND + f.def.lift - 30, seed: 3 });
    log("sys", f.def.name + " 举盾 · 伤害 -40%");
    paintStatus();
    return;
  }
  if (I.type === "debuff") {
    S.poison = 3;
    addFx(sPoison, { x: pPos, y: GROUND, seed: 11 });
    hint("中毒 3 回合");
    log("hurt", f.def.name + " · 放毒");
    paintStatus();
    return;
  }
  let dmg = I.dmg;
  if (S.shield > 0) {
    const ab = Math.min(S.shield, dmg);
    S.shield -= ab; dmg -= ab;
  }
  if (dmg > 0) { S.hp = Math.max(0, S.hp - dmg); S.combo = 0; }
  addEnergy(6);
  const heavy = I.type === "heavy";
  playerHit = 0.26;
  impact(heavy ? 3 : 1, "player");
  sfxHurt();
  addFx(heavy ? uCrit : uDmg, { x: pPos + ri(-6, 6), y: GROUND - 58, text: "-" + dmg });
  addFx(heavy ? iCrit : iBlunt, { x: pPos + 16, y: GROUND - 24, seed: ri(1, 900) });
  if (heavy) addFx(iFrame, { x: pPos, y: GROUND - 34, seed: ri(1, 900) });
  flash("red");
  hint(f.def.name + (heavy ? " 重击 " : " 攻击 ") + dmg);
  log("hurt", f.def.name + " · " + (heavy ? "重击 -" : "攻击 -") + dmg);
  paintBars();
}
''', 'foeHit')

# ---------- 8. 意图生成（替换 pickActor 的用法，新增 rollIntents） ----------
s = sub_func(s, 'pickActor', '''function rollIntents() {
  S.intents = [];
  const list = alive();
  list.forEach((f, i) => {
    const it = rollIntent(f);
    const r = Math.random();
    // 信息分层：第 1 只全公开；第 2 只一半只显示图标；第 3 只多数彻底未知
    const hide = i === 0 ? 0 : i === 1 ? (r < 0.5 ? 1 : 0) : (r < 0.7 ? 2 : 1);
    S.intents.push({ foe: f, type: it.type, dmg: it.dmg, hide });
    f.intent = it;
    if (it.type === "heavy") {
      f.alertFx = createFx(uAlert, { x: f.F.x, y: GROUND + f.def.oy + f.def.lift - 6, seed: ri(1, 900) });
    }
  });
  for (const g of foes) if (!list.includes(g)) g.intent = null;
  paintFoeBars(); paintStatus();
}
''', 'rollIntents')

open(p, 'w').write(s)
print("done:", len(done), done)
