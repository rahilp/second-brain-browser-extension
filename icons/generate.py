"""Generates placeholder PNG icons for the extension. Run once: python3 icons/generate.py"""
import struct
import zlib
import os

def make_png(size, bg_rgb, dot_rgb):
    def chunk(tag, data):
        raw = tag + data
        return struct.pack('>I', len(data)) + raw + struct.pack('>I', zlib.crc32(raw) & 0xffffffff)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))

    rows = bytearray()
    cx, cy, r = size // 2, size // 2, int(size * 0.38)
    for y in range(size):
        rows.append(0)  # filter byte
        for x in range(size):
            dx, dy = x - cx, y - cy
            dist = (dx * dx + dy * dy) ** 0.5
            # rounded rect via clamped distance
            corner = size * 0.22
            px = max(abs(dx) - (r - corner), 0)
            py = max(abs(dy) - (r - corner), 0)
            corner_dist = (px * px + py * py) ** 0.5
            inside = abs(dx) <= r and abs(dy) <= r and corner_dist <= corner
            # small white dots
            dot1 = ((dx + r * 0.28) ** 2 + (dy + r * 0.16) ** 2) ** 0.5 < r * 0.1
            dot2 = ((dx - r * 0.28) ** 2 + (dy + r * 0.16) ** 2) ** 0.5 < r * 0.1
            # arc (bottom part of brain)
            arc_r = r * 0.52
            arc_dist = ((dx) ** 2 + (dy - r * 0.08) ** 2) ** 0.5
            on_arc = abs(arc_dist - arc_r) < r * 0.09 and dy > r * 0.08

            if dot1 or dot2:
                rows += bytes([255, 255, 255])
            elif on_arc and inside:
                rows += bytes([255, 255, 255])
            elif inside:
                rows += bytes(bg_rgb)
            else:
                rows += bytes([0, 0, 0, 0])[:3] if False else bytes([242, 243, 244])

    idat = chunk(b'IDAT', zlib.compress(bytes(rows), 9))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

out_dir = os.path.dirname(os.path.abspath(__file__))
for size in [16, 48, 128]:
    data = make_png(size, [79, 70, 229], [255, 255, 255])
    path = os.path.join(out_dir, f'icon{size}.png')
    with open(path, 'wb') as f:
        f.write(data)
    print(f'Created {path}')
