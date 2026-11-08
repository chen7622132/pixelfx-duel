import re, io, sys

P = '/sandbox/workspace/pixelfx-duel/src/game.js'
s = open(P, encoding='utf-8').read()
orig = s
def rep(old, new, cnt=1, tag=''):
    global s
    n = s.count(old)
    if n != cnt:
        print('!! FAIL', tag or old[:40], 'found', n, 'expect', cnt)
        sys.exit(1)
    s = s.replace(old, new)
    print('ok', tag or old[:40])

# ---------- A1. 敌人伤害 ×2~2.3 + 攻击概率提升 ----------
rep('''  slime: { mod: cSlime, name: "史莱姆", hp: 90,  dmg: [3, 5],''',
    '''  slime: { mod: cSlime, name: "史莱姆", hp: 90,  dmg: [7, 10],''', 1, 'slime')
rep('''  frog:  { mod: cFrog,  name: "沼泽蛙", hp: 105, dmg: [3, 5],''',
    '''  frog:  { mod: cFrog,  name: "沼泽蛙", hp: 105, dmg: [7, 11],''', 1, 'frog')
rep('''  bat:   { mod: cBat,   name: "蝙蝠",   hp: 105, dmg: [4, 6],''',
    '''  bat:   { mod: cBat,   name: "蝙蝠",   hp: 105, dmg: [9, 13],''', 1, 'bat')
rep('''  ghost: { mod: cGhost, name: "幽魂",   hp: 120, dmg: [4, 6],''',
    '''  ghost: { mod: cGhost, name: "幽魂",   hp: 120, dmg: [9, 14],''', 1, 'ghost')
rep('''  eye:   { mod: cEye,   name: "邪眼",   hp: 125, dmg: [5, 7],''',
    '''  eye:   { mod: cEye,   name: "邪眼",   hp: 125, dmg: [11, 16],''', 1, 'eye')
rep('''  wisp:  { mod: cWisp,  name: "鬼火",   hp: 98,  dmg: [5, 7],''',
    '''  wisp:  { mod: cWisp,  name: "鬼火",   hp: 98,  dmg: [11, 16],''', 1, 'wisp')
rep('''  snake: { mod: cSnake, name: "巨蛇",   hp: 210, dmg: [5, 8],''',
    '''  snake: { mod: cSnake, name: "巨蛇",   hp: 210, dmg: [12, 18],''', 1, 'snake')
rep('''  skull: { mod: cSkull, name: "飞行头颅", hp: 230, dmg: [6, 9],''',
    '''  skull: { mod: cSkull, name: "飞行头颅", hp: 230, dmg: [14, 21],''', 1, 'skull')

# 攻击占比 48% -> 82%
rep('''  if (r < 0.26) return { type: "heavy", dmg: Math.round(base * 1.9) };
  if (r < 0.4) return { type: "debuff", dmg: 0 };
  if (r < 0.52) return { type: "guard", dmg: 0 };''',
    '''  if (r < 0.26) return { type: "heavy", dmg: Math.round(base * 1.8) };
  if (r < 0.38) return { type: "debuff", dmg: 0 };
  if (r < 0.46) return { type: "guard", dmg: 0 };''', 1, 'rollIntent 概率')

# 层数加成更明显
rep('function dmgBonus() { return S.stage; }',
    'function dmgBonus() { return S.stage * 2; }', 1, 'dmgBonus')

# ---------- A2. 削弱回复 ----------
rep('{ id: "regen",  name: "再生",       desc: "每回合回复 4 点生命" }',
    '{ id: "regen",  name: "再生",       desc: "每回合回复 2 点生命" }', 1, 'regen desc')
rep('{ id: "heal",   name: "嗜血",       desc: "击杀敌人回复 12 点生命" }',
    '{ id: "heal",   name: "嗜血",       desc: "击杀敌人回复 8 点生命" }', 1, 'heal desc')
rep('{ id: "shield", name: "护体",       desc: "每回合开始获得 6 点护盾" }',
    '{ id: "shield", name: "护体",       desc: "每回合开始获得 4 点护盾" }', 1, 'shield desc')
rep('else if (id === "regen") M.regen += 4;', 'else if (id === "regen") M.regen += 2;', 1, 'regen val')
rep('else if (id === "heal") M.healOnKill += 12;', 'else if (id === "heal") M.healOnKill += 8;', 1, 'heal val')
rep('else if (id === "shield") M.shield += 6;', 'else if (id === "shield") M.shield += 4;', 1, 'shield val')

# 营火 45% -> 32%
rep('''      desc: "回复 45% 生命 · 能量直接充满"''',
    '''      desc: "回复 32% 生命 · 能量直接充满"''', 1, '营火 desc')
rep('''    S.hp = Math.min(S.maxhp, S.hp + Math.round(S.maxhp * 0.45));''',
    '''    S.hp = Math.min(S.maxhp, S.hp + Math.round(S.maxhp * 0.32));''', 1, '营火数值')
rep('log("sys", "营火：回满状态");', 'log("sys", "营火：回复 32% 生命");', 1, '营火文案')

# 中毒 3 -> 5
rep('S.poison -= 1; S.hp = Math.max(0, S.hp - 3); log("hurt", "中毒 -3");',
    'S.poison -= 1; S.hp = Math.max(0, S.hp - 5); log("hurt", "中毒 -5");', 1, '毒伤')

# ---------- A3. 空槽 = 格挡架势（减伤 26%/槽，最多 60%） ----------
rep('''  S.exec = { list, ix: 0, t: 0, started: false, hit: false };''',
    '''  const empty = S.slots.filter((x) => !x).length;
  S.stance = empty;
  S.exec = { list, ix: 0, t: 0, started: false, hit: false };''', 1, 'buildExec stance')

rep('''  hint("执行编排 —— 双方沿时间轴交锋");''',
    '''  hint(empty ? "执行编排 —— 留 " + empty + " 空格格挡，减伤 " + Math.min(60, empty * 26) + "%"
             : "执行编排 —— 全力进攻，没有任何格挡");''', 1, 'buildExec hint')

rep('''  let dmg = I.dmg;
  if (S.shield > 0) {''',
    '''  let dmg = I.dmg;
  const st = S.stance || 0;
  if (st > 0) dmg = Math.max(1, Math.round(dmg * (1 - Math.min(0.6, st * 0.26))));
  if (S.shield > 0) {''', 1, 'foeHit stance')

rep('''  S.exec = null;
  S.slots = [null, null, null, null];''',
    '''  S.exec = null;
  S.stance = 0;
  S.slots = [null, null, null, null];''', 1, 'endRound stance reset')

# 槽位空显示为「格挡」
rep('''      + (k ? "<b>" + k.name + "</b><i>" + (ch ? "连携!" : (k.area ? "全体" : "单体")) + "</i>" : "空")''',
    '''      + (k ? "<b>" + k.name + "</b><i>" + (ch ? "连携!" : (k.area ? "全体" : "单体")) + "</i>"
           : "<b class=\\"st\\">格挡</b><i>减伤 26%</i>")''', 1, 'slots 空=格挡')

# 状态初始化补 stance
rep('''  hp: 120, maxhp: 120, shield: 0,''',
    '''  hp: 120, maxhp: 120, shield: 0, stance: 0,''', 1, 'S 初始化')

open(P, 'w', encoding='utf-8').write(s)
print('--- done, changed bytes:', len(s) - len(orig))
