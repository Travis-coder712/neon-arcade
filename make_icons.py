#!/usr/bin/env python3
"""Generate Neon Arcade PWA icons (no external assets)."""
from PIL import Image, ImageDraw, ImageFilter

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def draw_icon(size):
    S = size
    img = Image.new("RGBA", (S, S), (0, 0, 0, 255))
    px = img.load()
    top = (26, 6, 54)      # synthwave purple
    bot = (4, 26, 30)      # circuit teal
    for y in range(S):
        c = lerp(top, bot, y / S)
        for x in range(S):
            px[x, y] = (c[0], c[1], c[2], 255)

    cx = S / 2
    vy = S * 0.46          # horizon / vanishing line

    # --- glow layer (blurred) ---
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)

    # sun
    sun_r = S * 0.19
    sun_cy = vy - sun_r * 0.35
    sun = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sun)
    steps = int(sun_r)
    for i in range(steps):
        t = i / steps
        col = lerp((255, 225, 77), (255, 45, 149), t)  # yellow -> magenta
        r = sun_r * (1 - t)
        sd.ellipse([cx - r, sun_cy - r, cx + r, sun_cy + r], fill=(col[0], col[1], col[2], 255))
    # horizontal cut bars
    bar = ImageDraw.Draw(sun)
    n = 7
    for i in range(n):
        yy = sun_cy + sun_r * 0.15 + i * (sun_r * 0.13)
        h = 2 + i * (S * 0.004)
        bar.rectangle([cx - sun_r, yy, cx + sun_r, yy + h], fill=(0, 0, 0, 0))
    img.alpha_composite(sun)
    gd.ellipse([cx - sun_r, sun_cy - sun_r, cx + sun_r, sun_cy + sun_r], fill=(255, 90, 168, 120))

    # road
    bw = S * 0.46
    tw = S * 0.045
    road = [(cx - bw, S), (cx + bw, S), (cx + tw, vy), (cx - tw, vy)]
    ImageDraw.Draw(img).polygon(road, fill=(9, 7, 24, 255))

    # neon edges (cyan left, magenta right) + glow
    lw = max(3, int(S * 0.018))
    d = ImageDraw.Draw(img)
    d.line([(cx - bw, S), (cx - tw, vy)], fill=(0, 240, 255, 255), width=lw)
    d.line([(cx + bw, S), (cx + tw, vy)], fill=(255, 61, 240, 255), width=lw)
    gd.line([(cx - bw, S), (cx - tw, vy)], fill=(0, 240, 255, 160), width=lw * 3)
    gd.line([(cx + bw, S), (cx + tw, vy)], fill=(255, 61, 240, 160), width=lw * 3)
    # center dashes (amber)
    dashes = 7
    for i in range(dashes):
        t0 = i / dashes; t1 = t0 + 0.5 / dashes
        y0 = vy + (S - vy) * (t0 ** 1.6); y1 = vy + (S - vy) * (t1 ** 1.6)
        w = lw * (0.4 + t0)
        d.line([(cx, y0), (cx, y1)], fill=(255, 210, 61, 255), width=max(2, int(w)))

    glow = glow.filter(ImageFilter.GaussianBlur(S * 0.02))
    img.alpha_composite(glow)

    # subtle neon grid on the teal ground (below horizon, outside road)
    grid = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gr = ImageDraw.Draw(grid)
    for gx in range(0, S, int(S * 0.09)):
        gr.line([(gx, vy), (gx, S)], fill=(43, 255, 158, 40), width=1)
    for i in range(6):
        yy = int(vy + (S - vy) * (i / 6) ** 1.5)
        gr.line([(0, yy), (S, yy)], fill=(43, 255, 158, 40), width=1)
    img.alpha_composite(grid)
    # re-draw road over grid so grid doesn't cross the tarmac
    ImageDraw.Draw(img).polygon(road, fill=(9, 7, 24, 235))
    d2 = ImageDraw.Draw(img)
    d2.line([(cx - bw, S), (cx - tw, vy)], fill=(0, 240, 255, 255), width=lw)
    d2.line([(cx + bw, S), (cx + tw, vy)], fill=(255, 61, 240, 255), width=lw)
    for i in range(dashes):
        t0 = i / dashes; t1 = t0 + 0.5 / dashes
        y0 = vy + (S - vy) * (t0 ** 1.6); y1 = vy + (S - vy) * (t1 ** 1.6)
        d2.line([(cx, y0), (cx, y1)], fill=(255, 210, 61, 255), width=max(2, int(lw * (0.4 + t0))))

    return img

import os
out = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(out, exist_ok=True)
base = draw_icon(512)
base.save(os.path.join(out, "icon-512.png"))
base.save(os.path.join(out, "icon-512-maskable.png"))
base.resize((192, 192), Image.LANCZOS).save(os.path.join(out, "icon-192.png"))
base.resize((180, 180), Image.LANCZOS).save(os.path.join(out, "apple-touch-icon.png"))
print("icons written to", out)
