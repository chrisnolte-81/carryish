#!/usr/bin/env python3
"""
Standardize a transparent product cutout onto a consistent canvas.

Input:  a tightly-cropped RGBA PNG (typically produced by remove-bg.py)
Output: a 1600×1200 pure white WebP with the product centered and padded.

Usage:
    standardize.py <input_png> <output_webp>
"""
import sys
from pathlib import Path

from PIL import Image


# Keep existing catalog dimensions so we don't invalidate prior work.
CANVAS_W = 1600
CANVAS_H = 1200

# The product fills this fraction of the canvas (matches existing scripts).
CONTENT_W = int(CANVAS_W * 0.80)  # 1280
CONTENT_H = int(CANVAS_H * 0.75)  # 900

# Pure white background.
BG = (255, 255, 255, 255)

# Slightly above center — leaves more breathing room below the product.
VERTICAL_NUDGE = -12

# Ground shadow tuning (subtle, not decorative).
SHADOW_OPACITY = 38   # 0-255
SHADOW_BLUR = 18
SHADOW_H_RATIO = 0.035  # shadow height as fraction of content height
SHADOW_W_RATIO = 0.70   # shadow width as fraction of product width


def fit_inside(im: Image.Image, max_w: int, max_h: int) -> Image.Image:
    w, h = im.size
    scale = min(max_w / w, max_h / h)
    new_w = max(1, round(w * scale))
    new_h = max(1, round(h * scale))
    return im.resize((new_w, new_h), Image.LANCZOS)


def make_shadow(width: int, height: int) -> Image.Image:
    """Create a soft elliptical drop shadow sized for the product."""
    from PIL import ImageDraw, ImageFilter

    pad = SHADOW_BLUR * 3
    sw = width + pad * 2
    sh = height + pad * 2
    layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse(
        (pad, pad, pad + width, pad + height),
        fill=(0, 0, 0, SHADOW_OPACITY),
    )
    return layer.filter(ImageFilter.GaussianBlur(SHADOW_BLUR))


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: standardize.py <input_png> <output_webp>", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    if not input_path.exists():
        print(f"input not found: {input_path}", file=sys.stderr)
        return 1

    src = Image.open(input_path).convert("RGBA")

    # If input still has a ton of transparent border, tighten it up.
    bbox = src.getbbox()
    if bbox is not None:
        src = src.crop(bbox)

    product = fit_inside(src, CONTENT_W, CONTENT_H)
    pw, ph = product.size

    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), BG)

    center_x = (CANVAS_W - pw) // 2
    center_y = (CANVAS_H - ph) // 2 + VERTICAL_NUDGE

    # Build a subtle ground shadow anchored to the bottom of the product.
    shadow_w = int(pw * SHADOW_W_RATIO)
    shadow_h = max(6, int(ph * SHADOW_H_RATIO))
    shadow = make_shadow(shadow_w, shadow_h)
    shadow_x = (CANVAS_W - shadow.width) // 2
    shadow_y = center_y + ph - shadow.height // 2 - 8
    canvas.alpha_composite(shadow, (shadow_x, shadow_y))

    # Paste the product, using its alpha channel as the mask.
    canvas.alpha_composite(product, (center_x, center_y))

    # Flatten onto white — the final WebP does not need an alpha channel.
    final = Image.new("RGB", (CANVAS_W, CANVAS_H), BG[:3])
    final.paste(canvas, mask=canvas.split()[3])

    output_path.parent.mkdir(parents=True, exist_ok=True)
    final.save(output_path, format="WEBP", quality=88, method=6)

    print(f"ok {CANVAS_W}x{CANVAS_H} {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
