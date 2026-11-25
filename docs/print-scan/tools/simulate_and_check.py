"""Synthetic round-trip check (NOT a replacement for a real print + phone test).

Renders the test sheet, draws fake pen marks, photographs it badly (tilt, perspective, shadow, blur, JPEG),
runs read_scan.read() and compares with what was drawn.

    python -I simulate_and_check.py <sheet.png rendered at 200 dpi> <work_dir>
"""
import json, os, random, sys
import cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from read_scan import read, TEMPLATES

random.seed(7); np.random.seed(7)
sheet_png, work = sys.argv[1], sys.argv[2]
os.makedirs(work, exist_ok=True)
tpl = json.load(open(os.path.join(TEMPLATES, 'week.v1.json')))
page = cv2.imread(sheet_png)
H, W = page.shape[:2]
s = W / tpl['page_size_mm'][0]                      # px per mm of the render
PEN = (120, 40, 20)                                 # dark blue ballpoint (BGR)
P = lambda x, y: (int(x * s), int(y * s))

expect = {}
for f in tpl['fields']:
    k = f['kind']
    if k == 'dot':
        on = random.random() < 0.45
        expect[f['id']] = on
        if on:   # a quick, imperfect fill
            c = P(f['cx'] + random.uniform(-.4, .4), f['cy'] + random.uniform(-.4, .4))
            cv2.circle(page, c, int(f['r'] * s * random.uniform(.55, .85)), PEN, -1, cv2.LINE_AA)
    elif k == 'choice-boxes':
        v = random.choice([None, 'ok', 'delay', 'stuck', 'cancel'])
        expect[f['id']] = v
        for b in f['boxes']:
            if b['value'] == v:   # scribble-fill the box
                for t in range(6):
                    y = b['y'] + .5 + t * (b['s'] - 1) / 5
                    cv2.line(page, P(b['x'] + .4, y), P(b['x'] + b['s'] - .4, y + .3), PEN, max(2, int(.5 * s)), cv2.LINE_AA)
    elif k == 'symbol-circle':
        v = random.choice([None, 'ok', 'cancel'])
        expect[f['id']] = v is not None
        cx, cy, r = f['cx'], f['cy'], f['r']
        if v == 'ok':
            cv2.polylines(page, [np.int32([P(cx - r * .6, cy), P(cx - r * .1, cy + r * .5), P(cx + r * .7, cy - r * .6)])], False, PEN, max(2, int(.35 * s)), cv2.LINE_AA)
        elif v == 'cancel':
            cv2.line(page, P(cx - r * .6, cy - r * .6), P(cx + r * .6, cy + r * .6), PEN, max(2, int(.35 * s)), cv2.LINE_AA)
            cv2.line(page, P(cx + r * .6, cy - r * .6), P(cx - r * .6, cy + r * .6), PEN, max(2, int(.35 * s)), cv2.LINE_AA)
    elif k == 'text-line':
        on = random.random() < 0.5
        expect[f['id']] = on
        if on:
            cv2.putText(page, random.choice(['Call the bank', 'Gym 6pm', 'Read 10 pages', 'Math 2 ch.3']),
                        P(f['x'] + 1, f['y'] + f['h'] - 1.2), cv2.FONT_HERSHEY_SCRIPT_SIMPLEX, 3.0 * s / 22, PEN, max(2, int(.3 * s)), cv2.LINE_AA)   # ~3 mm tall, 0.3 mm pen
cv2.imwrite(os.path.join(work, 'filled.png'), page)

# "phone photo": perspective + rotation onto a table, uneven light, blur, noise, JPEG
out_w, out_h = int(W * 1.25), int(H * 1.2)
src = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
dst = np.float32([[W * .14, H * .06], [W * 1.08, H * .11], [W * 1.12, H * 1.12], [W * .06, H * 1.07]])
M = cv2.getPerspectiveTransform(src, dst)
photo = cv2.warpPerspective(page, M, (out_w, out_h), borderValue=(70, 80, 95))
yy, xx = np.mgrid[0:out_h, 0:out_w]
light = (0.62 + 0.38 * (xx / out_w)) * (0.85 + 0.15 * (yy / out_h))
photo = np.clip(photo * light[..., None], 0, 255).astype(np.uint8)
photo = cv2.GaussianBlur(photo, (3, 3), 0.9)
photo = np.clip(photo + np.random.normal(0, 6, photo.shape), 0, 255).astype(np.uint8)
jpg = os.path.join(work, 'photo.jpg')
cv2.imwrite(jpg, photo, [cv2.IMWRITE_JPEG_QUALITY, 72])

got = read(jpg, os.path.join(work, 'crops'))
if not got['ok']:
    print('READ FAILED:', got['error']); sys.exit(1)
stats = {}
for fid, exp in expect.items():
    r = got['fields'][fid]
    kind = next(f['kind'] for f in tpl['fields'] if f['id'] == fid)
    val = {'dot': r.get('filled'), 'choice-boxes': r.get('value'), 'symbol-circle': r.get('marked'), 'text-line': r.get('has_ink')}[kind]
    ok_n, tot = stats.get(kind, (0, 0))
    stats[kind] = (ok_n + (val == exp), tot + 1)
    if val != exp:
        print('MISMATCH', fid, 'expected', exp, 'got', r)
print('page id:', got['page_id'])
for k, (ok_n, tot) in stats.items():
    print(f'{k:14s} {ok_n}/{tot}')
