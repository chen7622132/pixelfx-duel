import sys
P = '/sandbox/workspace/pixelfx-duel/src/game.js'
s = open(P, encoding='utf-8').read()
def rep(o, n, t):
    global s
    if s.count(o) != 1:
        print('!! FAIL', t, s.count(o)); sys.exit(1)
    s = s.replace(o, n); print('ok', t)

rep('''  const list = [];
  const n = Math.max(S.slots.filter(Boolean).length, S.intents.length);
  for (let i = 0; i < n; i++) {
    const sid = S.slots[i];
    if (sid) list.push({ side: "me", id: sid, chain: chainOf(S.slots[i - 1], sid) });
    if (S.intents[i]) list.push({ side: "foe", ix: i });
  }''',
'''  // 动作块：我方连打 2 招 → 敌群扑上来（最多 2 只并行）→ 再连打
  const mine = S.slots.filter(Boolean);
  const list = [];
  let mi = 0, fi = 0;
  while (mi < mine.length || fi < S.intents.length) {
    for (let k = 0; k < 2 && mi < mine.length; k++, mi++) {
      list.push({ side: "me", id: mine[mi], chain: chainOf(mine[mi - 1], mine[mi]) });
    }
    if (fi < S.intents.length) {
      const grp = [];
      for (let t = 0; t < 2 && fi < S.intents.length; t++, fi++) grp.push(fi);
      list.push({ side: "foe", group: grp });
    }
  }
  // 连段紧接：连续两个我方动作之间不留停顿
  for (let i = 0; i < list.length - 1; i++) {
    if (list[i].side === "me" && list[i + 1].side === "me") list[i].quick = true;
  }''', 'buildExec 动作块')

rep('''  if (a.side === "me") {
    const m = SKILL_POOL[a.id];
    const f = tgt();
    S.dashTo = Math.max(30, Math.min(150, f.F.x - 62));
    atkFx = createFx(m.mod, { x: pPos, y: GROUND, seed: ri(1, 900) });
    a.hitAt = m.hit;
    a.dur = Math.min(1.15, m.hit + 0.6);
  } else {
    const it = S.intents[a.ix];
    a.foe = it ? it.foe : null;
    a.hitAt = 0.22;
    a.dur = 0.72;
    if (a.foe) S.dashTo = PX;
  }''',
'''  if (a.side === "me") {
    const m = SKILL_POOL[a.id];
    const f = tgt();
    S.dashTo = Math.max(30, Math.min(160, f.F.x - 92));
    atkFx = createFx(m.mod, { x: pPos, y: GROUND, seed: ri(1, 900) });
    a.hitAt = Math.max(0.26, m.hit + 0.2);
    a.dur = a.hitAt + (a.quick ? 0.2 : 0.3);
  } else {
    a.foes = (a.group || []).map((ix) => {
      const it = S.intents[ix];
      return it && it.foe && it.foe.alive ? { foe: it.foe, it } : null;
    }).filter(Boolean);
    a.hitAt = 0.3;
    a.dur = 0.6;
    if (a.foes.length) S.dashTo = PX;
  }''', 'startAction 节奏')

rep('''function doAction(a) {
  if (a.side === "me") { meHit(a.id, a.chain); atkFx = null; }
  else if (a.foe && a.foe.alive) {
    const it = S.intents[a.ix];
    foeHit(a.foe, { type: it.type, dmg: it.dmg });
  }
}''',
'''function doAction(a) {
  if (a.side === "me") { meHit(a.id, a.chain); atkFx = null; }
  else {
    // 敌群同时扑上来，同一帧结算
    for (const g of a.foes || []) {
      if (g.foe.alive) foeHit(g.foe, { type: g.it.type, dmg: g.it.dmg });
    }
  }
}''', 'doAction 并行')

rep('''  const lungeOf = (f) => (S.phase === "exec" && curA && curA.side === "foe" && curA.foe === f)
    ? Math.sin(Math.min(1, S.exec.t / 0.72) * Math.PI) * 40 : 0;''',
'''  const lungeOf = (f) => (S.phase === "exec" && curA && curA.side === "foe"
    && curA.foes && curA.foes.some((g) => g.foe === f))
    ? Math.sin(Math.min(1, S.exec.t / Math.max(0.24, (curA.hitAt || 0.3) * 1.6)) * Math.PI) * 46 : 0;''', 'lungeOf group')

open(P, 'w', encoding='utf-8').write(s)
print('--- part1 done')
