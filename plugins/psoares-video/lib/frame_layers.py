# python3 frame_layers.py <project> [windows]: draws the plain browser frame as
# two layers for the assembler, from video.config.json (output size, the
# window's CSS size, frame.address, frame.stage, frame.gap):
#   frame/back-<n>.png   the stage, shadows and window bars, under the pictures
#   frame/front-<n>.png  the stage at the rounded corners, and the outline, over them
#   frame/boxes-<n>.json where each picture goes
# The frame copies no real browser: three grey dots and an address pill.
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def font(size):
    for f in ('/System/Library/Fonts/SFNS.ttf', '/System/Library/Fonts/Helvetica.ttc',
              '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()

def main():
    root = os.path.abspath(sys.argv[1])
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    c = json.load(open(os.path.join(root, 'video.config.json')))
    out = c.get('output', {})
    W, H = out.get('width', 3840), out.get('height', 2160)
    k = W / 3840  # the sizes below are drawn for 4K
    fr = c.get('frame', {})
    stage = rgb(fr.get('stage', '#f5f6fc'))
    address = fr.get('address', '')
    view = c.get('view', {'width': 2048, 'height': 1152})
    # A window in the frame keeps the CSS shape it was recorded at.
    win = fr.get('window') or ({'width': view['width'] // 2, 'height': view['height']} if n == 2 else view)
    GAP, BAR, R, MY = round(fr.get('gap', 40) * k), round(72 * k), round(28 * k), round(56 * k)
    ch = H - 2 * MY - BAR
    cw = round(ch * win['width'] / win['height']) // 2 * 2
    if n * cw + (n - 1) * GAP > W - 2 * MY:  # too wide: fit the width instead
        cw = ((W - 2 * MY - (n - 1) * GAP) // n) // 2 * 2
        ch = round(cw * win['height'] / win['width']) // 2 * 2
    x0 = (W - (n * cw + (n - 1) * GAP)) // 2
    y0 = (H - (BAR + ch)) // 2
    f = font(round(30 * k))
    back = Image.new('RGB', (W, H), stage)
    boxes = []
    for i in range(n):
        x, y, h = x0 + i * (cw + GAP), y0, BAR + ch
        sh = Image.new('L', (W, H), 0)
        ImageDraw.Draw(sh).rounded_rectangle((x, y + 14 * k, x + cw, y + h + 14 * k), R, fill=60)
        back.paste(Image.new('RGB', (W, H), (30, 30, 60)), (0, 0), sh.filter(ImageFilter.GaussianBlur(28 * k)))
        w = Image.new('RGB', (cw, h), (255, 255, 255))
        d = ImageDraw.Draw(w)
        for j in range(3):
            cx, r = round((40 + j * 34) * k), round(10 * k)
            d.ellipse((cx - r, BAR // 2 - r, cx + r, BAR // 2 + r), fill=(214, 216, 228))
        if address:
            pw = round(520 * k)
            d.rounded_rectangle(((cw - pw) // 2, round(16 * k), (cw + pw) // 2, BAR - round(16 * k)), round(20 * k), fill=(241, 242, 249))
            d.text((cw // 2, BAR // 2), address, fill=(120, 124, 150), font=f, anchor='mm')
        d.line((0, BAR - 1, cw, BAR - 1), fill=(232, 234, 243), width=max(1, round(2 * k)))
        mask = Image.new('L', (cw, h), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, cw - 1, h - 1), R, fill=255)
        back.paste(w, (x, y), mask)
        boxes.append({'x': x, 'y': y + BAR, 'w': cw, 'h': ch, 'top': y})
    # front: the back layer wherever the windows are not, so the pictures'
    # square corners come out rounded, plus each window's outline.
    holes = Image.new('L', (W, H), 255)
    for b in boxes:
        ImageDraw.Draw(holes).rounded_rectangle((b['x'], b['top'], b['x'] + cw - 1, b['top'] + BAR + ch - 1), R, fill=0)
    front = back.convert('RGBA')
    front.putalpha(holes)
    for b in boxes:
        ImageDraw.Draw(front).rounded_rectangle((b['x'], b['top'], b['x'] + cw - 1, b['top'] + BAR + ch - 1), R,
                                                outline=(226, 228, 240, 255), width=max(1, round(2 * k)))
    os.makedirs(os.path.join(root, 'frame'), exist_ok=True)
    back.save(os.path.join(root, 'frame', f'back-{n}.png'))
    front.save(os.path.join(root, 'frame', f'front-{n}.png'))
    json.dump(boxes, open(os.path.join(root, 'frame', f'boxes-{n}.json'), 'w'))
    print(json.dumps(boxes))

if __name__ == '__main__':
    main()
