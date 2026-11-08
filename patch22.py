p = 'src/game.js'
s = open(p).read()
done = []


def rep(a, b, tag, cnt=1):
    global s
    if a not in s:
        print("MISS:", tag)
        return
    s = s.replace(a, b, cnt)
    done.append(tag)


rep("function draw() {\n  clearFrame(frame);",
    '''function draw() {
  const curA = S.exec ? S.exec.list[S.exec.ix] : null;
  const lungeOf = (f) => (S.phase === "exec" && curA && curA.side === "foe" && curA.foe === f)
    ? Math.sin(Math.min(1, S.exec.t / 0.72) * Math.PI) * 40 : 0;
  clearFrame(frame);''', 'lungeOf def')

rep('''  const f = pickActor();
  S.phase = "plan"; S.t = 0;
  paintBars(); paintButtons(); paintFin(); paintStatus(); paintProgress();
  hint((f ? intentHint(f) : "选一招") + "   [" + STAGES[S.stage].name + " " + (S.wave + 1) + "/3]");''',
'''  rollIntents();
  S.phase = "plan"; S.t = 0; S.slots = [null, null, null, null];
  paintBars(); paintButtons(); paintFin(); paintStatus(); paintProgress(); renderSlots();
  hint("编排行动 [" + STAGES[S.stage].name + " " + (S.wave + 1) + "/3]");''', 'startWave plan')

rep('''  renderSkills();
  setStageFx(true);
  spawnWave();
  const f = pickActor();
  S.phase = "plan"; S.t = 0;
  paintBars(); paintButtons(); paintFin(); paintStatus();
  hint(f ? intentHint(f) : "选一招");''',
'''  renderSkills();
  setStageFx(true);
  spawnWave();
  rollIntents();
  S.phase = "plan"; S.t = 0; S.slots = [null, null, null, null];
  paintBars(); paintButtons(); paintFin(); paintStatus(); renderSlots();
  hint("编排行动 —— 点技能填进槽位");''', 'restart plan')

rep('btns.forEach((b) => b.addEventListener("click", () => chooseMove(+b.dataset.i)));',
'''btns.forEach((b) => b.addEventListener("click", () => {
  const i = +b.dataset.i;
  if (i >= S.skills.length) chooseMove(i); else fillSlot(S.skills[i]);
}));
$("execBtn").addEventListener("click", buildExec);''', 'btn bind')

rep('''  const i = "123456".indexOf(e.key);
  if (i >= 0) { e.preventDefault(); chooseMove(i); }
  if (e.key === "q" || e.key === "Q" || e.key === " ") { e.preventDefault(); chooseMove(S.skills.length); }''',
'''  const i = "123456".indexOf(e.key);
  if (i >= 0) {
    e.preventDefault();
    if (i < S.skills.length) fillSlot(S.skills[i]);
    else chooseMove(i);
  }
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); buildExec(); }
  if (e.key === "q" || e.key === "Q") { e.preventDefault(); chooseMove(S.skills.length); }
  if (e.key === "Backspace") { e.preventDefault(); clearSlot(3); }''', 'keydown')

s = s.replace('S.phase === "ready"', 'S.phase === "plan"')

rep('''const f0 = pickActor();
paintBars(); paintButtons(); paintFin(); paintStatus(); paintProgress();
hint(f0 ? intentHint(f0) : "选一招");''',
'''rollIntents();
S.phase = "plan";
paintBars(); paintButtons(); paintFin(); paintStatus(); paintProgress(); renderSlots();
hint("编排行动 —— 点技能填进槽位，再点执行");''', 'boot')

rep("  paintButtons, previewOf, log, applyUpgrade, offerUpgrade, nextWave, offerRoute, pickRoute, setStageFx, startWave,",
    "  paintButtons, previewOf, log, applyUpgrade, offerUpgrade, nextWave, offerRoute, pickRoute, setStageFx, startWave,\n  fillSlot, clearSlot, buildExec, rollIntents,", 'expose')

rep("    target: S.target, actor: S.actor, upChoices: S.upChoices && S.upChoices.map((u) => u.id),",
    "    target: S.target, actor: S.actor, upChoices: S.upChoices && S.upChoices.map((u) => u.id),\n    slots: S.slots.slice(), execIx: S.exec ? S.exec.ix : -1, execLen: S.exec ? S.exec.list.length : 0,\n    intents: S.intents.map((i) => i.type + (i.hide ? \"(h\" + i.hide + \")\" : \"\") + \":\" + i.dmg),", 'dbg')

open(p, 'w').write(s)
print("done:", len(done), done)
