#!/usr/bin/env python3
"""Resize a component-detail image to 1200x1200 on Canvas #FAFAF8 background, save as WebP q=90.

Unlike hero images, detail shots are NOT background-removed — they're letterboxed
onto a square Canvas background at 1200x1200 for a tight, consistent gallery grid.
"""
import sys
from pathlib import Path
from PIL import Image

TARGET = 1200
CANVAS_RGB = (250, 250, 248)  # #FAFAF8
QUALITY = 90


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: resize-details.py <input> <output_webp>", file=sys.stderr)
        return 2

    src = Image.open(sys.argv[1]).convert("RGB")

    # Fit inside TARGET x TARGET preserving aspect ratio
    src.thumbnail((TARGET, TARGET), Image.LANCZOS)

    # Letterbox onto square Canvas
    canvas = Image.new("RGB", (TARGET, TARGET), CANVAS_RGB)
    offset_x = (TARGET - src.width) // 2
    offset_y = (TARGET - src.height) // 2
    canvas.paste(src, (offset_x, offset_y))

    out = Path(sys.argv[2])
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, format="WEBP", quality=QUALITY, method=6)
    print(f"ok {TARGET}x{TARGET} {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
