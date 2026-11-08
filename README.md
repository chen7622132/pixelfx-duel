# 像素对决 · pixelfx duel

用 [**pixelfx**](https://github.com/patch-gg/pixelfx)（244 个代码驱动的像素特效）做的**回合制像素对战 DEMO**。
没有美术资源、没有游戏引擎，整个游戏只有一个 320×180 的像素缓冲 + 30 个特效模块 + 12 个完整招式演出。

**▶ 在线试玩：** https://chen7622132.github.io/pixelfx-duel/

![终结技](docs/screenshot.png)

---

## 怎么玩

| 键 | 招式 | 伤害 | 特性 |
|---|---|---|---|
| `1` | 疾斩 | 11–15 | 快、无冷却，稳的 |
| `2` | 突刺 | 14–18 | 冷却 1 回合，**识破蓄力可打断**（×1.5） |
| `3` | 碎地锤 | 28–34 | 冷却 2 回合，30% 击晕（对手跳回合） |
| `4` | 回旋斩 | 13–17 | 冷却 1 回合，附加流血（每回合 −3） |
| `5` | **终结技** | 38–67 | 能量满才可用，进电影化演出 |

- **能量**：命中 +14，挨打 +8，满 100 解锁。一场战斗大概能放 2–3 次。
- 敌人每回合有 30% 概率蓄力（头顶弹 `!`），那一下伤害 ×1.8；**看到感叹号就用 `2` 突刺打断**——这是唯一的"读招"决策。
- 三只怪递进：史莱姆 → 蝙蝠 → 幽魂，每击杀一只回血 14–18。
- 每只怪有 4 个专属终结技，12 个招式在一局里全部能摸到。

## 12 个终结技

每个都是 pixelfx `moves/` 里完整的"蓄力→出手→命中→收招"演出，自带靶子距离（`act.target`）。

| 招式 | id | 元素 | 时长 | 靶距 |
|---|---|---|---|---|
| 火球投掷 | `fireball-throw` | FIRE | 6.81s | 190 |
| 召唤陨石 | `meteor-call` | METEOR | 6.43s | 170 |
| 火箭筒 | `rocket-launcher` | BLAST | 6.56s | 200 |
| 引雷 | `lightning-call` | THUNDER | 3.00s | 130 |
| 冰枪投掷 | `ice-lance-throw` | FROST | 4.34s | 170 |
| 圣光制裁 | `holy-smite` | HOLY | 2.80s | 118 |
| 大地践踏 | `earth-stomp` | EARTH | 3.46s | 112 |
| 坠落重击 | `ground-pound` | IMPACT | 3.82s | 80 |
| 三段连斩 | `sword-combo` | BLADE | 2.98s | 118 |
| 疾风突袭 | `dash-strike` | BLADE | 2.30s | 176 |
| 三连射 | `pistol-shots` | SHOT | 2.60s | 180 |
| 穿云箭 | `arrow-shot` | ARROW | 1.90s | 180 |

## 技术要点

### 1. 320 屏塞不下 480 宽的招式，怎么办

`moves/` 的特效宽 252–480px（`rocket-launcher` 是 480），而舞台只有 320。硬塞就是一坨出界。

关键发现：**每个招式自带 `act.target`——作者设计好的靶子距离**（80–200px）。所以正确做法不是缩放（`Painter` 根本没有缩放能力），而是**把敌人搬到那个靶位上**：

```js
S.cinePX = clamp(262 - F.target, 34, 200);   // 玩家左移，让整条演出线落进屏内
S.cineEX = S.cinePX + F.target;              // 敌人永远站在靶位 262 附近
```

副作用正好是想要的：打不同招式时玩家会左右移动，看起来像**镜头在跟**。演出结束再插值回常规站位（`1 - Math.exp(-dt * 9)` 的指数缓动，不需要手写 tween）。

### 2. 电影化靠 5 层廉价手段，不靠渲染

| 手段 | 实现 |
|---|---|
| 电影黑边 | 直接在像素缓冲上填两行 `0xff000000`（`frame.color.fill`），高度从 0 缓动到 16px |
| 暗角 | DOM 层径向渐变，`.cine.on` 时 opacity 1 |
| 大字 | DOM（不是像素字体，所以中文能显示），`clamp(20px,6vw,30px)` + 字距 + 三重投影 |
| 慢动作 | 命中瞬间 `S.slow = 0.16`，0.16 秒内 `dt × 0.22` |
| 白闪 | DOM 一层白色径向渐变，160ms |

黑边压在**像素缓冲**上而不是 DOM 上——这样震屏的时候黑边跟着一起抖，不会穿帮。

### 3. 渲染管线

- **内部 320×180，显示整数倍放大到 1280×720**（`image-rendering: pixelated`）。定 320 是因为 pixelfx 的 10 个全屏转场全是 320×180 且不可缩放。
- **一块共享 frame**：所有特效、角色、火把画进同一个 `{color, light}` 双缓冲，`composite()` 一次出 RGBA，`putImageData` 到离屏 canvas，再 `drawImage` 放大。绝不每个特效一块 frame。
- **分层顺序**：背景 → 火把 back → 敌人 back → 招式 back → 角色 → 招式 front → 敌人 front → 状态 → 飘字 → 全屏转场 → 黑边。
- 特效 `update(dt)` 内部固定 120Hz 步进，帧率波动不影响表现；`cine` 阶段整体 ×1.1 加速。

## 目录

```
index.html            页面
style.css             UI（含终结技大字、能量按钮、黑边之外的暗角）
src/game.js           ≈620 行，全部游戏逻辑
vendor/pixelfx/       完整 244 个特效源码 + core（照抄，未改一行）
check.mjs             全流程自检（本地）
check-live.mjs        线上冒烟自检
check-cine.mjs        终结技专项自检
push.mjs              一条命令重新部署到 GitHub Pages
```

## 本地跑

```bash
python3 -m http.server 8000
# http://127.0.0.1:8000/
```

无构建、无依赖：`index.html` 用原生 ESM 直接 `import` `vendor/pixelfx/` 里的模块。

## 自检

```bash
npm i playwright && npx playwright install chromium-headless-shell
node check.mjs        # 110 秒自动打完全程，验证不卡死、无报错、能通关
node check-cine.mjs   # 三个终结技逐个放，验证演出与伤害
```

## 许可

- 本项目代码：MIT。
- `vendor/pixelfx/` 来自 [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx)，**MIT**，Copyright (c) 2026 Patch / Hugo Duprez，见 `vendor/pixelfx/LICENSE` 与 `NOTICE.md`。
- **Patch Pixel 字体不在 MIT 范围内**，本仓库不包含该字体。

## 接下来

- [ ] 元素相克：火 / 冰 / 雷 / 奥术 / 圣光 / 暗影，同一招换 `palette` 就变"蓝火""毒火"
- [ ] `pickups/` 掉落 + `ui/level-up` 成长
- [ ] 存活模式：无限怪，比回合数
- [ ] 敌方也能放终结技（`moves/` 反打玩家，把靶子换成玩家位置）
