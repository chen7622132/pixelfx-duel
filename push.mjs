// 用 GitHub API 建仓 + 一次性提交全部文件 + 开 Pages
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const TOKEN = process.env.GH_TOKEN;
const OWNER = "chen7622132";
const REPO = "pixelfx-duel";
const ROOT = "/sandbox/workspace/pixelfx-duel";
const API = "https://api.github.com";

const H = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
  "User-Agent": "ima-copilot",
};

async function call(method, path, body) {
  const r = await fetch(API + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  let j = null;
  try { j = txt ? JSON.parse(txt) : null; } catch { j = { raw: txt }; }
  if (!r.ok) console.log("!!", method, path, r.status, JSON.stringify(j).slice(0, 200));
  return { ok: r.ok, status: r.status, json: j };
}

// 1. 建仓库（已存在则复用）
let repo = await call("GET", `/repos/${OWNER}/${REPO}`);
if (!repo.ok) {
  console.log("creating repo…");
  repo = await call("POST", "/user/repos", {
    name: REPO,
    description: "像素对决 — 用 pixelfx 的 27 个特效做的 320×180 回合制像素对战 DEMO",
    homepage: `https://${OWNER}.github.io/${REPO}/`,
    private: false, has_issues: true, has_wiki: false,
  });
  if (!repo.ok) process.exit(1);
} else console.log("repo exists");

// 2. 空仓库要先有一个提交，才能写 blob
let base = await call("GET", `/repos/${OWNER}/${REPO}/git/ref/heads/main`);
if (!base.ok) {
  console.log("initialising empty repo…");
  await call("PUT", `/repos/${OWNER}/${REPO}/contents/README.md`, {
    message: "init", content: Buffer.from("# pixelfx-duel\n").toString("base64"), branch: "main",
  });
  base = await call("GET", `/repos/${OWNER}/${REPO}/git/ref/heads/main`);
  if (!base.ok) process.exit(1);
}
const parentSha = base.json.object.sha;

// 3. 收集文件
const files = [];
function walk(dir) {
  for (const e of readdirSync(dir)) {
    if (["node_modules", "shots", ".git"].includes(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(relative(ROOT, p).split("\\").join("/"));
  }
}
walk(ROOT);
files.push(".nojekyll");
console.log("files:", files.length);

// 4. blobs -> tree -> commit -> ref
const entries = [];
for (const f of files) {
  const buf = f === ".nojekyll" ? Buffer.from("") : readFileSync(join(ROOT, f));
  const b = await call("POST", `/repos/${OWNER}/${REPO}/git/blobs`, { content: buf.toString("base64"), encoding: "base64" });
  if (!b.ok) process.exit(1);
  entries.push({ path: f, mode: "100644", type: "blob", sha: b.json.sha });
}
const tree = await call("POST", `/repos/${OWNER}/${REPO}/git/trees`, { tree: entries });
if (!tree.ok) process.exit(1);
const commit = await call("POST", `/repos/${OWNER}/${REPO}/git/commits`, {
  message: "像素对决 v1：320×180 回合制对战，27 个 pixelfx 特效\n\n- 4 招（疾斩/突刺/碎地锤/回旋斩）+ 冷却 + 断招\n- 三只 critter 递进：史莱姆/蝙蝠/幽魂\n- 命中震屏、伤害飘字、暴击、击晕/流血/中毒\n- 击杀 burn-away 全屏转场 + 回血\n- check.mjs 自动自检（playwright）",
  tree: tree.json.sha, parents: [parentSha],
});
if (!commit.ok) process.exit(1);
const ref = await call("PATCH", `/repos/${OWNER}/${REPO}/git/refs/heads/main`, { sha: commit.json.sha, force: true });
if (!ref.ok) process.exit(1);

// 5. Pages
let pages = await call("GET", `/repos/${OWNER}/${REPO}/pages`);
if (!pages.ok) pages = await call("POST", `/repos/${OWNER}/${REPO}/pages`, { source: { branch: "main", path: "/" } });
console.log("pages:", pages.status);
console.log("commit:", commit.json.sha.slice(0, 8), "| files:", entries.length);
console.log("url: https://" + OWNER + ".github.io/" + REPO + "/");
