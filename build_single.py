import subprocess, re, pathlib

ROOT = pathlib.Path('/sandbox/workspace/pixelfx-duel')
ESB = '/sandbox/workspace/pfxrepo/node_modules/.bin/esbuild'

# 1) 打包成单个 bundle（线上用：首屏只有 1 个 JS 请求，而不是 300 多个模块请求）
dist = ROOT / 'dist'
dist.mkdir(exist_ok=True)
r = subprocess.run([ESB, 'src/game.js', '--bundle', '--format=esm', '--minify',
                    '--target=es2020', '--outfile=dist/game.bundle.js'],
                   cwd=str(ROOT), capture_output=True, text=True)
print('esbuild rc=', r.returncode)
print(r.stderr[-1200:])
if r.returncode != 0:
    raise SystemExit(1)

# 2) 单文件离线版（内联全部，双击即玩）
out = '/tmp/game.bundle.js'
subprocess.run([ESB, 'src/game.js', '--bundle', '--format=esm', '--minify',
                '--target=es2020', '--outfile=' + out], cwd=str(ROOT), check=True,
               capture_output=True)
js = open(out, encoding='utf-8').read()
css = (ROOT / 'style.css').read_text(encoding='utf-8')
html = (ROOT / 'index.html').read_text(encoding='utf-8')
js_safe = js.replace('</script', '<\\/script')

html2 = re.sub(r'<link rel="stylesheet" href="style\.css[^"]*">',
               lambda m: '<style>\n' + css + '\n</style>', html)
html2 = re.sub(r'<script type="module" src="(?:dist/game\.bundle\.js|src/game\.js)[^"]*"></script>',
               lambda m: '<script type="module">\n' + js_safe + '\n</script>', html2)
assert 'src="src/game.js' not in html2, 'script tag not replaced'
assert 'href="style.css' not in html2, 'css tag not replaced'
(ROOT / 'pixelfx-duel-standalone.html').write_text(html2, encoding='utf-8')

print('bundle:', (dist / 'game.bundle.js').stat().st_size, 'bytes')
print('standalone:', len(html2), 'bytes')
