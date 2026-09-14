import zlib
import struct
import math
import os

def create_png(width, height, draw_func, filename):
    # RGBA image buffer
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # PNG filter type 0 (None)
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    # PNG signature
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    png.extend(struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc))
    
    # IDAT chunk
    compressed = zlib.compress(bytes(raw_data), level=9)
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    png.extend(struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc))
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    png.extend(struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc))
    
    os.makedirs(os.path.dirname(filename) or '.', exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(png)
    print(f"Generated {filename} ({width}x{height}, {len(png)} bytes)")

def draw_tactical_icon(x, y, w, h, maskable=False):
    # Normalized coords (-1 to 1)
    cx, cy = w / 2.0, h / 2.0
    nx = (x - cx) / cx
    ny = (y - cy) / cy
    dist = math.hypot(nx, ny)
    
    # If maskable, scale down into safe zone (0.75 scale)
    scale = 0.72 if maskable else 0.88
    sx = nx / scale
    sy = ny / scale
    sdist = math.hypot(sx, sy)
    
    # Deep tactical background: #020617 (slate-950) with subtle radial cyan glow
    bg_r, bg_g, bg_b = 2, 6, 23
    glow = max(0.0, 1.0 - dist * 1.1)
    r = int(min(255, bg_r + glow * 18))
    g = int(min(255, bg_g + glow * 40))
    b = int(min(255, bg_b + glow * 65))
    a = 255

    # Rounded outer perimeter border for non-maskable icons
    if not maskable:
        # Corner radius check (approx squircle)
        p = 4.0
        squircle_dist = (abs(nx)**p + abs(ny)**p)**(1.0/p)
        if squircle_dist > 0.95:
            return (0, 0, 0, 0)
        elif squircle_dist > 0.91:
            # Cyan border accent
            return (6, 182, 212, 255)

    # Outer Hexagon / Radar ring
    angle = math.atan2(sy, sx)
    hex_radius = 0.82
    ring_width = 0.04
    if abs(sdist - hex_radius) < ring_width:
        # Cyan-blue tactical ring
        alpha = max(0.0, 1.0 - abs(sdist - hex_radius) / ring_width)
        r = int(r * (1 - alpha) + 14 * alpha)
        g = int(g * (1 - alpha) + 165 * alpha)
        b = int(b * (1 - alpha) + 233 * alpha)

    # Secondary internal radar ring
    inner_ring_radius = 0.52
    if abs(sdist - inner_ring_radius) < 0.025:
        alpha = max(0.0, 1.0 - abs(sdist - inner_ring_radius) / 0.025)
        r = int(r * (1 - alpha) + 99 * alpha)
        g = int(g * (1 - alpha) + 102 * alpha)
        b = int(b * (1 - alpha) + 241 * alpha)

    # 4D Hypercube / Tesseract wireframe projection:
    # Outer diamond: |sx| + |sy| ~= 0.60
    diamond_dist = abs(sx) + abs(sy)
    if abs(diamond_dist - 0.60) < 0.035:
        alpha = max(0.0, 1.0 - abs(diamond_dist - 0.60) / 0.035)
        r = int(r * (1 - alpha) + 6 * alpha)
        g = int(g * (1 - alpha) + 182 * alpha)
        b = int(b * (1 - alpha) + 212 * alpha)

    # Inner square: max(|sx|, |sy|) ~= 0.22
    sq_dist = max(abs(sx), abs(sy))
    if abs(sq_dist - 0.22) < 0.035:
        alpha = max(0.0, 1.0 - abs(sq_dist - 0.22) / 0.035)
        r = int(r * (1 - alpha) + 56 * alpha)
        g = int(g * (1 - alpha) + 189 * alpha)
        b = int(b * (1 - alpha) + 248 * alpha)

    # Connecting hypercube struts: 45 degree diagonals from inner square to diamond
    diag_diff = abs(abs(sx) - abs(sy))
    if diag_diff < 0.03 and 0.15 <= sdist <= 0.65:
        alpha = max(0.0, 1.0 - diag_diff / 0.03) * 0.75
        r = int(r * (1 - alpha) + 168 * alpha)
        g = int(g * (1 - alpha) + 85 * alpha)
        b = int(b * (1 - alpha) + 247 * alpha)

    # Central quantum core node (glowing pulsating dot)
    if sdist < 0.10:
        core_intensity = max(0.0, 1.0 - sdist / 0.10)
        r = int(r * (1 - core_intensity) + 255 * core_intensity)
        g = int(g * (1 - core_intensity) + 255 * core_intensity)
        b = int(b * (1 - core_intensity) + 255 * core_intensity)
    elif sdist < 0.16:
        halo = max(0.0, 1.0 - (sdist - 0.10) / 0.06)
        r = int(r * (1 - halo) + 34 * halo)
        g = int(g * (1 - halo) + 211 * halo)
        b = int(b * (1 - halo) + 238 * halo)

    return (min(255, max(0, r)), min(255, max(0, g)), min(255, max(0, b)), a)

if __name__ == '__main__':
    create_png(192, 192, lambda x, y, w, h: draw_tactical_icon(x, y, w, h, False), 'public/pwa-192x192.png')
    create_png(512, 512, lambda x, y, w, h: draw_tactical_icon(x, y, w, h, False), 'public/pwa-512x512.png')
    create_png(512, 512, lambda x, y, w, h: draw_tactical_icon(x, y, w, h, True), 'public/pwa-maskable-512x512.png')
    create_png(180, 180, lambda x, y, w, h: draw_tactical_icon(x, y, w, h, False), 'public/apple-touch-icon.png')
    create_png(64, 64, lambda x, y, w, h: draw_tactical_icon(x, y, w, h, False), 'public/favicon.ico')
