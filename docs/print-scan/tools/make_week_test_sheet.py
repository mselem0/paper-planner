"""Build the scan-ready WEEK page template (v1) and a printable A5 test sheet from it.

Outputs (next to this folder):
  ../templates/week.v1.json    field geometry in millimetres (what the app's scanner reads)
  ../test-sheet/week-test-sheet.html / .pdf   the printable page (PDF needs Google Chrome)

Run:  python -I make_week_test_sheet.py   (needs: qrcode, opencv-python-headless)
Everything is in mm, origin = top-left corner of the A5 page (148 x 210).
"""
import json, os, subprocess, sys
import cv2, qrcode

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
W, H = 148.0, 210.0
WEEK = '2027-01-17'                       # Sunday-key, same as the app's week id
PAGE_ID = f'P27:1:W:{WEEK}'               # product : layout version : page type : key
DROPOUT = '#b4c0e2'                       # light guide colour, filtered out when scanning
INK = '#000000'                           # markers + QR only (pure K100)

# ---------- geometry (single source of truth) ----------
MARK = 6.0                                # ArUco 4x4 marker incl. its black border
INSET = 5.0
markers = [
    {'id': 0, 'x': INSET, 'y': INSET},                         # top-left
    {'id': 1, 'x': W - INSET - MARK, 'y': INSET},              # top-right
    {'id': 2, 'x': W - INSET - MARK, 'y': H - INSET - MARK},   # bottom-right
    {'id': 3, 'x': INSET, 'y': H - INSET - MARK},              # bottom-left
]
for m in markers:
    m['size'] = MARK
    m['center'] = [round(m['x'] + MARK / 2, 3), round(m['y'] + MARK / 2, 3)]

QR = {'x': 116.0, 'y': 185.0, 'size': 13.0, 'payload': PAGE_ID, 'ecc': 'M'}

days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
fields = []
top, row_h, line_h = 26.0, 18.0, 5.6
for d, name in enumerate(days):
    y0 = top + d * row_h
    for k in range(3):
        y = y0 + 1.2 + k * line_h
        fid = f'task.{d}.{k}'
        fields.append({'id': fid, 'kind': 'text-line', 'x': 31.0, 'y': round(y, 2), 'w': 76.0, 'h': 5.0,
                       'maps_to': f'weeks[{WEEK}].days[{d}][{k}].text'})
        if d < 4:   # option A: one circle, the user draws a symbol (needs recognition + review)
            fields.append({'id': fid + '.status', 'kind': 'symbol-circle', 'cx': 118.0, 'cy': round(y + 2.6, 2), 'r': 2.3,
                           'symbols': ['ok', 'delay', 'stuck', 'cancel'],
                           'maps_to': f'weeks[{WEEK}].days[{d}][{k}].status'})
        else:       # option B: four tiny boxes, the user fills one (pure OMR)
            fields.append({'id': fid + '.status', 'kind': 'choice-boxes',
                           'boxes': [{'value': v, 'x': round(111.0 + i * 5.0, 2), 'y': round(y + 0.9, 2), 's': 3.4}
                                     for i, v in enumerate(['ok', 'delay', 'stuck', 'cancel'])],
                           'maps_to': f'weeks[{WEEK}].days[{d}][{k}].status'})

hab_top = 158.0
for i in range(4):
    y = hab_top + 6.0 + i * 6.4
    fields.append({'id': f'habit.{i}.name', 'kind': 'text-line', 'x': 12.0, 'y': round(y - 2.4, 2), 'w': 38.0, 'h': 5.0,
                   'maps_to': f'weeks[{WEEK}].habits[{i}].name'})
    for d in range(7):
        fields.append({'id': f'habit.{i}.{d}', 'kind': 'dot', 'cx': round(57.0 + d * 8.0, 2), 'cy': round(y, 2), 'r': 2.6,
                       'maps_to': f'weeks[{WEEK}].habits[{i}].done[{d}]'})

template = {
    'schema': 'p27-scan-template/1', 'product': 'P27', 'layout_version': 1, 'page_type': 'week',
    'page_size_mm': [W, H], 'units': 'mm', 'origin': 'page top-left',
    'dropout_color': DROPOUT,
    'markers': {'dictionary': 'DICT_4X4_50', 'items': markers},
    'qr': QR, 'fields': fields,
    'thresholds': {'dot_filled_min_ratio': 0.18, 'box_filled_min_ratio': 0.22, 'ink_gray_max': 140},
}
os.makedirs(os.path.join(ROOT, 'templates'), exist_ok=True)
with open(os.path.join(ROOT, 'templates', 'week.v1.json'), 'w') as f:
    json.dump(template, f, indent=1)

# ---------- SVG drawing ----------
def rect(x, y, w, h, fill, extra=''):
    return f'<rect x="{x:.3f}" y="{y:.3f}" width="{w:.3f}" height="{h:.3f}" fill="{fill}" {extra}/>'

def aruco(m):
    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    img = cv2.aruco.generateImageMarker(d, m['id'], 6)        # 6x6 cells incl. black border
    cell = MARK / 6
    out = [rect(m['x'] - 1.5, m['y'] - 1.5, MARK + 3, MARK + 3, '#fff')]   # white quiet zone
    for r in range(6):
        for c in range(6):
            if img[r, c] < 128:
                out.append(rect(m['x'] + c * cell, m['y'] + r * cell, cell + 0.01, cell + 0.01, INK))
    return ''.join(out)

def qr_svg(q):
    code = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
    code.add_data(q['payload']); code.make(fit=True)
    mtx = code.get_matrix(); n = len(mtx); cell = q['size'] / n
    q['modules'] = n
    out = [rect(q['x'] - 4 * cell, q['y'] - 4 * cell, q['size'] + 8 * cell, q['size'] + 8 * cell, '#fff')]
    for r in range(n):
        for c in range(n):
            if mtx[r][c]:
                out.append(rect(q['x'] + c * cell, q['y'] + r * cell, cell + 0.01, cell + 0.01, INK))
    return ''.join(out)

def text(x, y, s, size=3.2, fill='#5b78bd', weight=700, anchor='start', family='Arial, sans-serif'):
    return (f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{weight}" '
            f'text-anchor="{anchor}" font-family="{family}">{s}</text>')

svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">',
       rect(0, 0, W, H, '#fffef8')]
svg.append(text(16, 15, '2027', 5.5, '#5b78bd', 900))
svg.append(text(32, 15, 'Jan 17 – Jan 23', 5, '#2f3a63', 400, family="'Caveat', 'Bradley Hand', cursive"))
svg.append(text(132, 15, 'SCAN TEST · v1', 2.4, '#c0262d', 800, 'end'))
svg.append(text(16, 22, 'SUN–WED: draw ✓ → / ✗ inside the circle  ·  THU–SAT: fill ONE box', 2.2, '#8890b0', 700))
for d, name in enumerate(days):
    y0 = top + d * row_h
    svg.append(f'<rect x="10" y="{y0}" width="122" height="{row_h}" fill="none" stroke="{DROPOUT}" stroke-width=".25"/>')
    svg.append(text(12, y0 + 5, name, 3.2, '#c9c25a', 700, family="'Caveat', cursive"))
    svg.append(text(12, y0 + 9, str(17 + d), 2.6, '#5b78bd', 800))
for fl in fields:
    k = fl['kind']
    if k == 'text-line':
        svg.append(f'<line x1="{fl["x"]}" y1="{fl["y"] + fl["h"]}" x2="{fl["x"] + fl["w"]}" y2="{fl["y"] + fl["h"]}" stroke="{DROPOUT}" stroke-width=".3"/>')
    elif k == 'symbol-circle':
        svg.append(f'<circle cx="{fl["cx"]}" cy="{fl["cy"]}" r="{fl["r"]}" fill="none" stroke="{DROPOUT}" stroke-width=".35"/>')
    elif k == 'choice-boxes':
        for b, glyph in zip(fl['boxes'], ['✓', '→', '/', '✗']):
            svg.append(f'<rect x="{b["x"]}" y="{b["y"]}" width="{b["s"]}" height="{b["s"]}" rx=".4" fill="none" stroke="{DROPOUT}" stroke-width=".3"/>')
            svg.append(text(b['x'] + b['s'] / 2, b['y'] - 0.3, glyph, 1.6, DROPOUT, 700, 'middle'))
    elif k == 'dot':
        svg.append(f'<circle cx="{fl["cx"]}" cy="{fl["cy"]}" r="{fl["r"]}" fill="none" stroke="{DROPOUT}" stroke-width=".35"/>')
svg.append(text(12, hab_top + 1, 'HABIT', 4.5, '#c9c25a', 900))
for d, l in enumerate('SMTWTFS'):
    svg.append(text(57 + d * 8, hab_top + 1.8, l, 2.2, '#5b78bd', 800, 'middle'))
for m in markers:
    svg.append(aruco(m))
svg.append(qr_svg(QR))
svg.append(text(QR['x'] + QR['size'] / 2, QR['y'] + QR['size'] + 3.4, PAGE_ID, 1.6, '#8890b0', 600, 'middle'))
svg.append('</svg>')

out_dir = os.path.join(ROOT, 'test-sheet'); os.makedirs(out_dir, exist_ok=True)
html = ('<!doctype html><meta charset="utf-8"><style>@page{size:148mm 210mm;margin:0}html,body{margin:0}'
        'svg{display:block}</style>' + ''.join(svg))
html_path = os.path.join(out_dir, 'week-test-sheet.html')
with open(html_path, 'w') as f:
    f.write(html)
with open(os.path.join(ROOT, 'templates', 'week.v1.json'), 'w') as f:   # rewrite with qr module count
    json.dump(template, f, indent=1)

chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
if os.path.exists(chrome):
    pdf = os.path.join(out_dir, 'week-test-sheet.pdf')
    subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', f'--print-to-pdf={pdf}',
                    'file://' + html_path], check=True, capture_output=True)
    print('wrote', pdf)
else:
    print('Chrome not found: open the HTML and print to PDF (A5, margins none, scale 100%)', file=sys.stderr)
print('fields:', len(fields), 'qr modules:', QR['modules'])
