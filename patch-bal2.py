import sys
P = '/sandbox/workspace/pixelfx-duel/src/game.js'
s = open(P, encoding='utf-8').read()
def rep(old, new, tag=''):
    global s
    if s.count(old) != 1:
        print('!! FAIL', tag, s.count(old)); sys.exit(1)
    s = s.replace(old, new); print('ok', tag)

for a, b in [
    ('dmg: [7, 10]', 'dmg: [6, 9]'),
    ('dmg: [7, 11]', 'dmg: [6, 10]'),
    ('dmg: [9, 13]', 'dmg: [8, 12]'),
    ('dmg: [9, 14]', 'dmg: [8, 13]'),
    ('dmg: [11, 16],  oy: -12', 'dmg: [10, 15],  oy: -12'),
    ('dmg: [11, 16],  oy: -14', 'dmg: [10, 15],  oy: -14'),
    ('dmg: [12, 18]', 'dmg: [11, 17]'),
    ('dmg: [14, 21]', 'dmg: [13, 20]'),
]:
    rep(a, b, 'dmg ' + a)

rep('Math.min(0.6, st * 0.26)', 'Math.min(0.7, st * 0.3)', '格挡减伤')
rep('Math.min(60, empty * 26)', 'Math.min(70, empty * 30)', '格挡 hint')
rep('减伤 26%', '减伤 30%', '格挡槽文案')

rep('S.hp = Math.max(0, S.hp - 5); log("hurt", "中毒 -5");',
    'S.hp = Math.max(0, S.hp - 4); log("hurt", "中毒 -4");', '毒伤')

open(P, 'w', encoding='utf-8').write(s)
print('done')
