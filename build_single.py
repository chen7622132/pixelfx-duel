import subprocess, re, os, pathlib

ROOT = pathlib.Path('/sandbox/workspace/pixelfx-duel')
ESB = '/sandbox/workspace/pfxrepo/node_modules/.bin/esbuild'
out = '/tmp/game.bundle.js'

r = subprocess.run([ESB, 'src/game.js', '--bundle', '--format=esm',
                    '--minify', '--target=es2020', '--outfile=' + out],
                   cwd=str(ROOT), capture_output=True, text=True)
print('esbuild rc=', r.returncode)
print(r.stdout[-1500:])
print(r.stderr[-3000:])
if r.returncode != 0:
    raise SystemExit(1)

js = open(out, encoding='utf-8').read()
css = (ROOT / 'style.css').read_text(encoding='utf-8')
html = (ROOT / 'index.html').read_text(encoding='utf-8')

# 防止提前闭合 script
js_safe = js.replace('</script', '<\\/script')

html2 = html.replace('<link rel="stylesheet" href="style.css">',
                     '<style>\n' + css + '\n</style>')
html2 = html2.replace('<script type="module" src="src/game.js"></script>',
                      '<script type="module">\n' + js_safe + '\n</script>')
assert 'src/game.js' not in html2, 'script tag not replaced'
assert 'href="style.css"' not in html2, 'css tag not replaced'

dst = ROOT / 'pixelfx-duel-standalone.html'
dst.write_text(html2, encoding='utf-8')
print('bundle js bytes:', len(js))
print('css bytes:', len(css))
print('standalone bytes:', len(html2))
print('output:', dst)
