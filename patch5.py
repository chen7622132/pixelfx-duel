import re
p = 'src/game.js'
s = open(p).read()
ok = []


def rep(a, b, tag):
    global s
    if a not in s:
        print("MISS:", tag)
        return
    s = s.replace(a, b, 1)
    ok.append(tag)


# 1) 日志状态
rep("  usedFins: new Set(),", "  usedFins: new Set(),\n  log: [],", "state")

# 2) hint 带回合号
rep("""const hintEl = $("hint");
function hint(s) { hintEl.textContent = s; }""",
    """const hintEl = $("hint");
function hint(s) { hintEl.textContent = "R" + S.round + " · " + s; }

function log(kind, text) {
  S.log.unshift({ kind, text, r: S.round });
  if (S.log.length > 6) S.log.pop();
  $("log").innerHTML = S.log
    .map((e) => '<li class="' + e.kind + '"><span>R' + e.r + '</span><b>' + e.text + '</b></li>')
    .join("");
}""", "hint+log")

# 3) 伤害预览
rep("""const btns = [...document.querySelectorAll(".mv")];""",
    """function previewOf(i) {
  const m = MOVES[i];
  let lo = m.dmg[0], hi = m.dmg[1];
  if (S.foeGuard) { lo = Math.round(lo * 0.6); hi = Math.round(hi * 0.6); }
  const critHi = Math.round(hi * 1.35);
  return { lo, hi, critHi, kill: lo >= S.fhp, chance: critHi >= S.fhp };
}

const btns = [...document.querySelectorAll(".mv")];""", "previewOf")

rep("""    b.querySelector("u").style.width = cool ? "100%" : "0";
    if (i === 1) b.classList.toggle("hint-break", canBreak && !cool);""",
    """    b.querySelector("u").style.width = cool ? "100%" : "0";
    if (i === 1) b.classList.toggle("hint-break", canBreak && !cool);
    const pv = previewOf(i);
    const dmgEl = b.querySelector("s");
    if (dmgEl) dmgEl.textContent = pv.lo + "-" + pv.hi;
    b.classList.toggle("lethal", pv.kill && S.phase === "ready");
    b.classList.toggle("chance", !pv.kill && pv.chance && S.phase === "ready");""", "paintButtons preview")

# 4) 终结技伤害范围显示
rep("""  $("finTip").textContent = armed ? "就绪 · 按 5 释放" : "能量 " + Math.round(S.energy) + " / " + MAX_ENERGY;""",
    """  $("finTip").textContent = armed ? "就绪 · 按 5 释放" : "能量 " + Math.round(S.energy) + " / " + MAX_ENERGY;
  const pool = FOES[S.foeIx].pool.map((k) => FINISHERS[k]);
  const flo = Math.round(Math.min(...pool.map((f) => f.dmg[0])) * 1.35);
  const fhi = Math.round(Math.max(...pool.map((f) => f.dmg[1])) * 1.35);
  const fd = $("finDmg");
  if (fd) fd.textContent = flo + "-" + fhi;
  b.classList.toggle("lethal", armed && flo >= S.fhp && S.phase === "ready");""", "fin dmg")

# 5) 各处写日志
rep("""  hint(broke ? "识破！打断蓄力，造成 " + dmg : guarded ? "被护盾吸收，仅 " + dmg : crit ? "暴击 " + dmg : "命中 " + dmg);""",
    """  hint(broke ? "识破！打断蓄力，造成 " + dmg : guarded ? "被护盾吸收，仅 " + dmg : crit ? "暴击 " + dmg : "命中 " + dmg);
  log("hit", m.name + " · " + dmg + (broke ? "（打断）" : guarded ? "（被盾吸收）" : crit ? "（暴击）" : "") + (S.fhp <= 0 ? " · 击杀" : ""));""", "log hit")

rep("""    hint("对手举起了护盾");
    paintStatus();""",
    """    hint("对手举起了护盾");
    log("sys", "对手举盾 · 下次伤害 -40%");
    paintStatus();""", "log guard")

rep("""    hint("你中毒了（3 回合）");
    paintStatus();""",
    """    hint("你中毒了（3 回合）");
    log("hurt", "中毒 3 回合 · 每回合 -3");
    paintStatus();""", "log poison")

rep("""  hint(heavy ? "重击 " + dmg + "！" : "受到 " + dmg + " 伤害");
  paintBars();""",
    """  hint(heavy ? "重击 " + dmg + "！" : "受到 " + dmg + " 伤害");
  log("hurt", (heavy ? "重击" : "攻击") + " · -" + dmg);
  paintBars();""", "log hurt")

rep("""  if (dot) {
    S.fhp = Math.max(0, S.fhp - dot);
    addFx(uDmg, { x: ePos + ri(-8, 8), y: GROUND - 66, text: "-" + dot });""",
    """  if (dot) {
    S.fhp = Math.max(0, S.fhp - dot);
    addFx(uDmg, { x: ePos + ri(-8, 8), y: GROUND - 66, text: "-" + dot });
    log("hit", "流血持续 -" + dot);""", "log dot")

rep("""  hint("击败 " + FOES[S.foeIx].name);""",
    """  hint("击败 " + FOES[S.foeIx].name);
  log("win", "击败 " + FOES[S.foeIx].name);""", "log kill")

# 6) 暴露给自检
rep("  S, chooseMove, MOVES, FINISHERS, addEnergy, startFinisher, paintButtons,",
    "  S, chooseMove, MOVES, FINISHERS, addEnergy, startFinisher, paintButtons, previewOf, log,", "expose")

open(p, 'w').write(s)
print("patched:", ok)
print("missing:", 7 - len([x for x in ok if True]))
