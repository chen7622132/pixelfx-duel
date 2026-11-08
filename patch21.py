import re
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


# ---------- 1. 动作启动/结算 ----------
rep("function killFoe(f) {", '''function startAction(a) {
  if (a.side === "me") {
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
  }
}
function doAction(a) {
  if (a.side === "me") { meHit(a.id, a.chain); atkFx = null; }
  else if (a.foe && a.foe.alive) {
    const it = S.intents[a.ix];
    foeHit(a.foe, { type: it.type, dmg: it.dmg });
  }
}

function killFoe(f) {''', 'startAction')

# ---------- 2. step 的 switch ----------
rep('''  switch (S.phase) {
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
      break;''',
'''  switch (S.phase) {
    case "exec": {
      const ex = S.exec;
      if (!ex) { endRound(); break; }
      const a = ex.list[ex.ix];
      if (!a) { endRound(); break; }
      if (!ex.started) { startAction(a); ex.started = true; ex.t = 0; ex.hit = false; }
      ex.t += dEff;
      if (!ex.hit && ex.t >= a.hitAt) { ex.hit = true; doAction(a); }
      if (ex.t >= a.dur) {
        ex.ix += 1; ex.started = false; ex.hit = false;
        if (ex.ix >= ex.list.length) endRound();
      }
      break;
    }''', 'step switch')

# ---------- 3. 绘制：谁在出手谁前冲 ----------
rep('''  const lunge = S.phase === "enemy" ? Math.sin(Math.min(1, S.t / 0.9) * Math.PI) * 42 : 0;''',
'''  const curA = S.exec ? S.exec.list[S.exec.ix] : null;
  const lungeOf = (f) => (S.phase === "exec" && curA && curA.side === "foe" && curA.foe === f)
    ? Math.sin(Math.min(1, S.exec.t / 0.72) * Math.PI) * 40 : 0;''', 'lunge fn')
rep('''    if (f.fx) {
      f.fx.options.x = F.x + (f.hitT > 0 ? rnd(-1.5, 1.5) : 0);
      f.fx.options.y = GROUND + f.def.oy + f.def.lift + F.y + (f.sink || 0);
      f.fx.draw(frame, "back");
    }''',
'''    if (f.fx) {
      f.fx.options.x = F.x - lungeOf(f) + (f.hitT > 0 ? rnd(-1.5, 1.5) : 0);
      f.fx.options.y = GROUND + f.def.oy + f.def.lift + F.y + (f.sink || 0);
      f.fx.draw(frame, "back");
    }''', 'lunge back')
rep('''    if (f.fx) {
      f.fx.options.x = F.x + (f.hitT > 0 ? rnd(-1.5, 1.5) : 0);
      f.fx.options.y = GROUND + f.def.oy + f.def.lift + F.y + (f.sink || 0);
      f.fx.draw(frame, "front");
    }''',
'''    if (f.fx) {
      f.fx.options.x = F.x - lungeOf(f) + (f.hitT > 0 ? rnd(-1.5, 1.5) : 0);
      f.fx.options.y = GROUND + f.def.oy + f.def.lift + F.y + (f.sink || 0);
      f.fx.draw(frame, "front");
    }''', 'lunge front')

# ---------- 4. 玩家冲刺判定改 phase ----------
rep('const pTarget = cineLike ? S.cinePX : (S.phase === "player" || S.phase === "pause") ? (S.dashTo ?? PX) : PX;',
    'const pTarget = cineLike ? S.cinePX : (S.phase === "exec" || S.phase === "plan") ? (S.dashTo ?? PX) : PX;', 'p target')
rep('const pYTarget = (S.phase === "player" || S.phase === "pause") && fr ? Math.max(-52, Math.min(0, fr.F.y)) : 0;',
    'const pYTarget = (S.phase === "exec") && fr ? Math.max(-52, Math.min(0, fr.F.y)) : 0;', 'p y')
rep('  const dashing = (S.phase === "player" || S.phase === "pause") && Math.abs(pT - pPos) > 5;',
    '  const dashing = S.phase === "exec" && Math.abs(pT - pPos) > 5;', 'dashing')
rep('  const lean = S.phase === "player" ? Math.sin(Math.min(1, S.t / 0.9) * Math.PI) * 7 : 0;',
    '  const lean = S.phase === "exec" && curA && curA.side === "me" ? Math.sin(Math.min(1, S.exec.t / 0.8) * Math.PI) * 7 : 0;', 'lean')

# ---------- 5. 槽位渲染 ----------
rep("function paintBars() {", '''function renderSlots() {
  const box = $("slots");
  box.innerHTML = S.slots.map((id, i) => {
    const k = id ? SKILL_POOL[id] : null;
    const ch = id && chainOf(S.slots[i - 1], id);
    return '<div class="slot' + (k ? " filled" : "") + (ch ? " chain" : "") + '" data-i="' + i + '">'
      + '<span class="n">' + (i + 1) + "</span>"
      + (k ? "<b>" + k.name + "</b><i>" + (ch ? "连携!" : (k.area ? "全体" : "单体")) + "</i>" : "空")
      + "</div>";
  }).join("");
  box.querySelectorAll(".slot").forEach((el) => el.addEventListener("click", () => clearSlot(+el.dataset.i)));
  const b = $("execBtn");
  b.disabled = S.phase !== "plan" || !S.slots.some(Boolean);
}

function paintBars() {''', 'renderSlots')

open(p, 'w').write(s)
print("done:", len(done), done)
