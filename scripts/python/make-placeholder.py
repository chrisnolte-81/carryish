#!/usr/bin/env python3
"""
Generate a branded Carryish placeholder for a product with no image.

The placeholder is a 1600×1200 white canvas with the Carryish wordmark
("carry" in Midnight, "ish" in Coral Fire) and the product name below.

Usage:
    make-placeholder.py "<product name>" <output_webp>
    make-placeholder.py "<product name>" "<brand name>" <output_webp>
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


CANVAS_W = 1600
CANVAS_H = 1200
BG = (250, 250, 248)          # #FAFAF8 — Canvas
MIDNIGHT = (26, 26, 46)       # #1A1A2E
CORAL = (232, 93, 58)         # #E85D3A
SLATE = (122, 122, 140)       # #7A7A8C

WORDMARK_SIZE = 180
BRAND_SIZE = 46
NAME_SIZE = 72


def load_font(size: int) -> ImageFont.FreeTypeFont:
    """Try to load Fraunces; fall back to a macOS serif; finally the default."""
    candidates = [
        "/Users/chrisnolte/Library/Fonts/Fraunces-Bold.ttf",
        "/Library/Fonts/Fraunces-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Georgia Bold.ttf",
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/System/Library/Fonts/Times.ttc",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def wrap(text: str, font: ImageFont.FreeTypeFont, draw: ImageDraw.ImageDraw, max_w: int) -> list[str]:
    words = text.split()
    if not words:
        return [""]
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        w, _ = text_size(draw, candidate, font)
        if w <= max_w:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def main() -> int:
    if len(sys.argv) == 3:
        product_name = sys.argv[1]
        brand_name = None
        output_path = Path(sys.argv[2])
    elif len(sys.argv) == 4:
        product_name = sys.argv[1]
        brand_name = sys.argv[2]
        output_path = Path(sys.argv[3])
    else:
        print(
            'usage: make-placeholder.py "<product>" [<brand>] <output_webp>',
            file=sys.stderr,
        )
        return 2

    canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), BG)
    draw = ImageDraw.Draw(canvas)

    wordmark_font = load_font(WORDMARK_SIZE)
    brand_font = load_font(BRAND_SIZE)
    name_font = load_font(NAME_SIZE)

    carry_w, carry_h = text_size(draw, "carry", wordmark_font)
    ish_w, _ = text_size(draw, "ish", wordmark_font)
    wordmark_w = carry_w + ish_w
    wordmark_x = (CANVAS_W - wordmark_w) // 2
    wordmark_y = 320

    draw.text((wordmark_x, wordmark_y), "carry", font=wordmark_font, fill=MIDNIGHT)
    draw.text((wordmark_x + carry_w, wordmark_y), "ish", font=wordmark_font, fill=CORAL)

    # Thin rule beneath the wordmark, in Coral Fire.
    rule_y = wordmark_y + carry_h + 28
    rule_w = 180
    draw.rectangle(
        [(CANVAS_W - rule_w) // 2, rule_y, (CANVAS_W + rule_w) // 2, rule_y + 4],
        fill=CORAL,
    )

    text_top = rule_y + 80

    if brand_name:
        brand_upper = brand_name.upper()
        bw, bh = text_size(draw, brand_upper, brand_font)
        draw.text(
            ((CANVAS_W - bw) // 2, text_top),
            brand_upper,
            font=brand_font,
            fill=SLATE,
        )
        text_top += bh + 24

    max_name_w = int(CANVAS_W * 0.80)
    lines = wrap(product_name, name_font, draw, max_name_w)
    for line in lines:
        lw, lh = text_size(draw, line, name_font)
        draw.text(
            ((CANVAS_W - lw) // 2, text_top),
            line,
            font=name_font,
            fill=MIDNIGHT,
        )
        text_top += lh + 12

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, format="WEBP", quality=90, method=6)
    print(f"ok {CANVAS_W}x{CANVAS_H} {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
