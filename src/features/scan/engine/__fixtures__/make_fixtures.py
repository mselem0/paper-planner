"""Regenerates the scan-engine test photos + their ground truth (synthetic, see docs/print-scan/SPEC.md §10).

    pdftoppm -r 200 -png -singlefile docs/print-scan/test-sheet/week-test-sheet.pdf /tmp/sheet
    python3 -m venv venv && venv/bin/pip install opencv-python-headless
    venv/bin/python -I src/features/scan/engine/__fixtures__/make_fixtures.py /tmp/sheet.png <out_dir>

Output per variant: <name>.jpg (the "photo") and <name>.expected.json ({pageId, cells:{id: expected value}}).
Pen marks are drawn exactly like docs/print-scan/tools/simulate_and_check.py; only the photo conditions differ.
"""
import json, os, random, sys
import cv2, numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), *['..'] * 5))
tpl = json.load(open(os.path.join(ROOT, 'docs/print-scan/templates/week.v1.json')))
sheet_png, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)

# name: seed, pen BGR, corners (fractions of W,H), rot180, light (x gain lo, y gain lo), tint BGR, blur sigma, noise, jpeg q, out scale
VARIANTS = {
    'clean':  dict(seed=1, pen=(130, 50, 25), quad=[[.03, .02], [.97, .015], [.975, .985], [.025, .98]], flip=False,
                   light=(0.97, 0.98), tint=(1, 1, 1), blur=0.6, noise=2, q=85, scale=0.8),
    'bad':    dict(seed=7, pen=(120, 40, 20), quad=[[.14, .06], [1.08, .11], [1.12, 1.12], [.06, 1.07]], flip=False,
                   light=(0.62, 0.85), tint=(1, 1, 1), blur=0.9, noise=6, q=72, scale=0.6),
    'flipped': dict(seed=11, pen=(40, 40, 40), quad=[[.10, .10], [1.05, .04], [1.10, 1.06], [.05, 1.10]], flip=True,
                    light=(0.50, 0.75), tint=(1, 1, 1), blur=0.8, noise=6, q=72, scale=0.75),
    'tilt20': dict(seed=3, pen=(110, 35, 15), quad=[[.40, .02], [1.12, .30], [.72, 1.18], [-.02, .86]], flip=False,
                   light=(0.75, 0.80), tint=(0.72, 0.9, 1.0), blur=0.8, noise=5, q=75, scale=0.6),
}

def render(name, v):
    random.seed(v['seed']); np.random.seed(v['seed'])
    page = cv2.imread(sheet_png)
    H, W = page.shape[:2]
    s = W / tpl['page_size_mm'][0]
    PEN = v['pen']
    P = lambda x, y: (int(x * s), int(y * s))
    expect = {}
    for f in tpl['fields']:
        k = f['kind']
        if k == 'dot':
            on = random.random() < 0.45
            expect[f['id']] = on
            if on:
                c = P(f['cx'] + random.uniform(-.4, .4), f['cy'] + random.uniform(-.4, .4))
                cv2.circle(page, c, int(f['r'] * s * random.uniform(.55, .85)), PEN, -1, cv2.LINE_AA)
        elif k == 'choice-boxes':
            val = random.choice([None, 'ok', 'delay', 'stuck', 'cancel'])
            expect[f['id']] = val
            for b in f['boxes']:
                if b['value'] == val:
                    for t in range(6):
                        y = b['y'] + .5 + t * (b['s'] - 1) / 5
                        cv2.line(page, P(b['x'] + .4, y), P(b['x'] + b['s'] - .4, y + .3), PEN, max(2, int(.5 * s)), cv2.LINE_AA)
        elif k == 'symbol-circle':
            val = random.choice([None, 'ok', 'cancel'])
            expect[f['id']] = val is not None
            cx, cy, r = f['cx'], f['cy'], f['r']
            if val == 'ok':
                cv2.polylines(page, [np.int32([P(cx - r * .6, cy), P(cx - r * .1, cy + r * .5), P(cx + r * .7, cy - r * .6)])], False, PEN, max(2, int(.35 * s)), cv2.LINE_AA)
            elif val == 'cancel':
                cv2.line(page, P(cx - r * .6, cy - r * .6), P(cx + r * .6, cy + r * .6), PEN, max(2, int(.35 * s)), cv2.LINE_AA)
                cv2.line(page, P(cx + r * .6, cy - r * .6), P(cx - r * .6, cy + r * .6), PEN, max(2, int(.35 * s)), cv2.LINE_AA)
        elif k == 'text-line':
            on = random.random() < 0.5
            expect[f['id']] = on
            if on:
                cv2.putText(page, random.choice(['Call the bank', 'Gym 6pm', 'Read 10 pages', 'Math 2 ch.3']),
                            P(f['x'] + 1, f['y'] + f['h'] - 1.2), cv2.FONT_HERSHEY_SCRIPT_SIMPLEX, 3.0 * s / 22, PEN, max(2, int(.3 * s)), cv2.LINE_AA)
    if v['flip']:
        page = cv2.rotate(page, cv2.ROTATE_180)
    out_w, out_h = int(W * 1.25), int(H * 1.2)
    src = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
    dst = np.float32([[W * a, H * b] for a, b in v['quad']])
    photo = cv2.warpPerspective(page, cv2.getPerspectiveTransform(src, dst), (out_w, out_h), borderValue=(70, 80, 95))
    yy, xx = np.mgrid[0:out_h, 0:out_w]
    lx, ly = v['light']
    light = (lx + (1 - lx) * (xx / out_w)) * (ly + (1 - ly) * (yy / out_h))
    photo = photo * light[..., None] * np.array(v['tint'])[None, None, :]
    photo = np.clip(photo, 0, 255).astype(np.uint8)
    photo = cv2.GaussianBlur(photo, (3, 3), v['blur'])
    photo = np.clip(photo + np.random.normal(0, v['noise'], photo.shape), 0, 255).astype(np.uint8)
    photo = cv2.resize(photo, None, fx=v['scale'], fy=v['scale'], interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(out, name + '.jpg'), photo, [cv2.IMWRITE_JPEG_QUALITY, v['q']])
    json.dump({'pageId': tpl['qr']['payload'], 'cells': expect}, open(os.path.join(out, name + '.expected.json'), 'w'), indent=0)

for n, v in VARIANTS.items():
    render(n, v)
    print('wrote', n)
