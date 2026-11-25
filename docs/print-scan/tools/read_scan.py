"""Reference reader for scan-ready pages: photo -> page id + filled dots/boxes + cropped text lines.

    python -I read_scan.py photo.jpg [--out crops_dir]

Pipeline (the in-app scanner should follow the same steps):
 1. find the 4 ArUco corner markers (ids 0..3)            -> fails loudly if any is missing
 2. homography from marker centres (template mm) to photo  -> warp to a flat page at PX_PER_MM
 3. decode the QR -> page id "P27:<layout>:<type>:<key>"   -> load templates/<type>.v<layout>.json
 4. drop the light guide colour (keep only dark ink), then for every field:
      dot / choice-boxes -> ink ratio inside the shape  (OMR, no AI needed)
      symbol-circle      -> marked yes/no + crop for recognition/review
      text-line          -> has ink yes/no + crop for handwriting recognition/review
Nothing here is saved anywhere; it prints JSON for a review screen.
"""
import argparse, json, os, sys
import cv2, numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATES = os.path.join(os.path.dirname(HERE), 'templates')
PX_PER_MM = 8


def find_markers(gray):
    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    det = cv2.aruco.ArucoDetector(d, cv2.aruco.DetectorParameters())
    corners, ids, _ = det.detectMarkers(gray)
    found = {}
    if ids is not None:
        for c, i in zip(corners, ids.flatten()):
            found[int(i)] = c[0].mean(axis=0)
    return found


def read(path, out_dir=None):
    img = cv2.imread(path)
    if img is None:
        raise SystemExit(f'cannot read {path}')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    marks = find_markers(gray)
    missing = [i for i in range(4) if i not in marks]
    if missing:
        return {'ok': False, 'error': f'corner markers not found: {missing} (whole page must be in the photo)'}

    # page id first (QR), using the default template size to locate it roughly
    probe = json.load(open(os.path.join(TEMPLATES, 'week.v1.json')))
    src = np.float32([marks[i] for i in range(4)])
    dst_mm = np.float32([m['center'] for m in probe['markers']['items']])
    Wmm, Hmm = probe['page_size_mm']
    Hm = cv2.getPerspectiveTransform(src, dst_mm * PX_PER_MM)
    flat = cv2.warpPerspective(img, Hm, (int(Wmm * PX_PER_MM), int(Hmm * PX_PER_MM)), flags=cv2.INTER_CUBIC)

    q = probe['qr']; pad = 6
    x0, y0 = int((q['x'] - pad) * PX_PER_MM), int((q['y'] - pad) * PX_PER_MM)
    crop = flat[y0:int((q['y'] + q['size'] + pad) * PX_PER_MM), x0:int((q['x'] + q['size'] + pad) * PX_PER_MM)]
    page_id, _, _ = cv2.QRCodeDetector().detectAndDecode(crop)
    if not page_id:
        return {'ok': False, 'error': 'page code (QR) unreadable: retake the photo closer / with less glare'}
    product, layout, ptype, key = page_id.split(':')
    tpl_path = os.path.join(TEMPLATES, {'W': 'week'}.get(ptype, ptype) + f'.v{layout}.json')
    if not os.path.exists(tpl_path):
        return {'ok': False, 'error': f'unknown layout {page_id}'}
    tpl = json.load(open(tpl_path))
    th = tpl['thresholds']

    g = cv2.cvtColor(flat, cv2.COLOR_BGR2GRAY)
    # local contrast normalisation removes shadows / uneven light before the ink threshold
    bg = cv2.medianBlur(g, 41)
    norm = cv2.divide(g, bg, scale=255)
    ink = (norm < th['ink_gray_max']).astype(np.uint8)   # 1 = pen ink; light guide colour falls out

    def ratio_circle(cx, cy, r):
        m = np.zeros_like(ink); cv2.circle(m, (int(cx * PX_PER_MM), int(cy * PX_PER_MM)), int(r * PX_PER_MM * 0.8), 1, -1)
        return float((ink & m).sum() / max(1, m.sum()))

    def ratio_rect(x, y, w, h, shrink=0.15):
        sx, sy = w * shrink, h * shrink
        a = ink[int((y + sy) * PX_PER_MM):int((y + h - sy) * PX_PER_MM), int((x + sx) * PX_PER_MM):int((x + w - sx) * PX_PER_MM)]
        return float(a.mean()) if a.size else 0.0

    res = {}
    for f in tpl['fields']:
        k = f['kind']
        if k == 'dot':
            r = ratio_circle(f['cx'], f['cy'], f['r'])
            res[f['id']] = {'filled': r >= th['dot_filled_min_ratio'], 'ratio': round(r, 3)}
        elif k == 'choice-boxes':
            rs = {b['value']: ratio_rect(b['x'], b['y'], b['s'], b['s']) for b in f['boxes']}
            picked = [v for v, r in rs.items() if r >= th['box_filled_min_ratio']]
            res[f['id']] = {'value': picked[0] if len(picked) == 1 else None, 'ambiguous': len(picked) > 1,
                            'ratios': {v: round(r, 3) for v, r in rs.items()}}
        elif k == 'symbol-circle':
            r = ratio_circle(f['cx'], f['cy'], f['r'])
            res[f['id']] = {'marked': r >= 0.06, 'ratio': round(r, 3), 'value': None, 'needs_review': r >= 0.06}
        elif k == 'text-line':
            r = ratio_rect(f['x'], f['y'], f['w'], f['h'], 0.05)
            res[f['id']] = {'has_ink': r >= 0.01, 'ratio': round(r, 4)}
            if out_dir and r >= 0.01:
                os.makedirs(out_dir, exist_ok=True)
                x, y, w, h = (int(v * PX_PER_MM) for v in (f['x'], f['y'] - 1, f['w'], f['h'] + 1))
                cv2.imwrite(os.path.join(out_dir, f['id'] + '.png'), flat[y:y + h, x:x + w])
    return {'ok': True, 'page_id': page_id, 'fields': res}


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('photo'); ap.add_argument('--out')
    a = ap.parse_args()
    print(json.dumps(read(a.photo, a.out), indent=1, ensure_ascii=False))
