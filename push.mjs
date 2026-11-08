// 增量部署：只上传与远端 sha 不同的文件（对上 300 个文件的项目，从 4 分钟降到秒级）
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";

const TOKEN = process.env.GH_TOKEN;
const OWNER = "chen7622132";
const REPO = "pixelfx-duel";
const ROOT = "/sandbox/workspace/pixelfx-duel";
const API = "https://api.github.com";
const H = { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "ima-copilot" };

async function call(method, path, body) {
  const r = await fetch(API + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  let j = null;
  try { j = txt ? JSON.parse(txt) : null; } catch { j = { raw: txt }; }
  if (!r.ok && r.status !== 404 && r.status !== 409) console.log("!!", method, path, r.status, JSON.stringify(j).slice(0, 220));
  return { ok: r.ok, status: r.status, json: j };
}

const blobSha = (buf) => {
  const h = createHash("sha1");
  h.update("blob " + buf.length + "\0");
  h.update(buf);
  return h.digest("hex");
};

// 1. 仓库 + 父提交
let repo = await call("GET", `/repos/${OWNER}/${REPO}`);
if (!repo.ok) {
  repo = await call("POST", "/user/repos", {
    name: REPO, description: "像素对决 — 用 pixelfx 的 30 个特效做的 320×180 回合制对战 DEMO",
    homepage: `https://${OWNER}.github.io/${REPO}/`, private: false, has_issues: true, has_wiki: false,
  });
  if (!repo.ok) process.exit(1);
}
let base = await call("GET", `/repos/${OWNER}/${REPO}/git/ref/heads/main`);
if (!base.ok) {
  await call("PUT", `/repos/${OWNER}/${REPO}/contents/README.md`, { message: "init", content: Buffer.from("# pixelfx-duel\n").toString("base64"), branch: "main" });
  base = await call("GET", `/repos/${OWNER}/${REPO}/git/ref/heads/main`);
  if (!base.ok) process.exit(1);
}
const parentSha = base.json.object.sha;

// 2. 远端现有 tree
const remote = new Map();
const rt = await call("GET", `/repos/${OWNER}/${REPO}/git/trees/main?recursive=1`);
if (rt.ok) for (const e of rt.json.tree) if (e.type === "blob") remote.set(e.path, e.sha);

// 3. 收集本地文件
const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    if (["node_modules", "shots", ".git"].includes(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(relative(ROOT, p).split("\\").join("/"));
  }
})(ROOT);
files.push(".nojekyll");

// 4. 只传变了的
const entries = [];
let sent = 0, reused = 0;
for (const f of files) {
  const buf = f === ".nojekyll" ? Buffer.from("") : readFileSync(join(ROOT, f));
  const sha = blobSha(buf);
  if (remote.get(f) === sha) { entries.push({ path: f, mode: "100644", type: "blob", sha }); reused++; continue; }
  const b = await call("POST", `/repos/${OWNER}/${REPO}/git/blobs`, { content: buf.toString("base64"), encoding: "base64" });
  if (!b.ok) process.exit(1);
  entries.push({ path: f, mode: "100644", type: "blob", sha: b.json.sha });
  sent++;
}
const gone = [...remote.keys()].filter((p) => !files.includes(p));
console.log(`files ${files.length} | uploaded ${sent} | reused ${reused} | deleted ${gone.length}`);
if (!sent && !gone.length) { console.log("no changes, nothing to commit"); process.exit(0); }

// 5. tree / commit / ref
const tree = await call("POST", `/repos/${OWNER}/${REPO}/git/trees`, { tree: entries });
if (!tree.ok) process.exit(1);
const msg = process.argv[2] || "update";
const commit = await call("POST", `/repos/${OWNER}/${REPO}/git/commits`, { message: msg, tree: tree.json.sha, parents: [parentSha] });
if (!commit.ok) process.exit(1);
const ref = await call("PATCH", `/repos/${OWNER}/${REPO}/git/refs/heads/main`, { sha: commit.json.sha, force: true });
if (!ref.ok) process.exit(1);

// 6. Pages（首次才需要 POST）
const pages = await call("GET", `/repos/${OWNER}/${REPO}/pages`);
if (!pages.ok) await call("POST", `/repos/${OWNER}/${REPO}/pages`, { source: { branch: "main", path: "/" } });
console.log("commit:", commit.json.sha.slice(0, 8), "|", msg);
console.log("url: https://" + OWNER + ".github.io/" + REPO + "/");
