import re
p = 'src/game.js'
s = open(p).read()

HITS = {"火球投掷": 1.41, "大地践踏": 0.06, "坠落重击": 0.62, "三段连斩": 0.06, "引雷": 0.76,
        "冰枪投掷": 1.14, "疾风突袭": 0.22, "召唤陨石": 1.52, "圣光制裁": 0.47, "火箭筒": 0.6,
        "三连射": 0.26, "穿云箭": 0.8}
out = []
for line in s.split('\n'):
    m = re.search(r'name: "([^"]+)".*target: (\d+) \},$', line)
    if m and m.group(1) in HITS:
        line = line.replace('target: ' + m.group(2) + ' },',
                            'target: ' + m.group(2) + ', hit: ' + str(HITS[m.group(1)]) + ' },')
    out.append(line)
s = '\n'.join(out)

s = s.replace("""  let d = dt;
  if (S.slow > 0) { S.slow -= dt; d = dt * 0.22; }
  S.t += d;""", """  let d = dt;
  if (S.slow > 0) { S.slow -= dt; d = dt * 0.22; }
  const dEff = S.phase === "cine" ? d * 1.1 : d;
  S.t += dEff;""")
for a, b in [("foeFx.update(d)", "foeFx.update(dEff)"),
             ("foeDotFx.update(d)", "foeDotFx.update(dEff)"),
             ("alertFx.update(d)", "alertFx.update(dEff)"),
             ('atkFx.update(S.phase === "cine" ? d * 1.1 : d)', "atkFx.update(dEff)"),
             ("transFx.update(d)", "transFx.update(dEff)"),
             ("floats[i].update(d)", "floats[i].update(dEff)")]:
    s = s.replace(a, b)

s = s.replace('S.fin = { id, ...F, hit: 0.5, done: false };', 'S.fin = { id, ...F };')
s = s.replace('S.phase = "cineIn"; S.t = 0;', 'S.phase = "cineIn"; S.t = 0; S.hit = false;')
open(p, 'w').write(s)
print("hit fields:", s.count("hit: 1.41") + s.count("hit: 0.76"), "| dEff:", s.count("dEff"))
