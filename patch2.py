p = 'src/game.js'
s = open(p).read()
s = s.replace("function startFinisher() {", "function startFinisher(forceId) {")
s = s.replace("""  const pool = FOES[S.foeIx].pool.filter((k) => !S.usedFins.has(k));
  const id = (pool.length ? pool : FOES[S.foeIx].pool)[ri(0, (pool.length ? pool : FOES[S.foeIx].pool).length - 1)];""",
"""  const pool = FOES[S.foeIx].pool.filter((k) => !S.usedFins.has(k));
  const pick = pool.length ? pool : FOES[S.foeIx].pool;
  const id = forceId && FINISHERS[forceId] ? forceId : pick[ri(0, pick.length - 1)];""")
s = s.replace("  addEnergy, // 自检用", "  addEnergy, startFinisher, // 自检用")
open(p, 'w').write(s)
print("startFinisher(forceId):", s.count("startFinisher(forceId)"), "| exposed:", s.count("addEnergy, startFinisher"))
