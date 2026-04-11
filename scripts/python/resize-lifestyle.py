#!/usr/bin/env python3
"""Resize a lifestyle image to max 1600px wide, save as WebP q=85."""
import sys
from pathlib import Path
from PIL import Image

MAX_W = 1600
QUALITY = 85


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: resize-lifestyle.py <input> <output_webp>", file=sys.stderr)
        return 2

    src = Image.open(sys.argv[1]).convert("RGB")
    if src.width > MAX_W:
        new_h = round(src.height * (MAX_W / src.width))
        src = src.resize((MAX_W, new_h), Image.LANCZOS)

    out = Path(sys.argv[2])
    out.parent.mkdir(parents=True, exist_ok=True)
    src.save(out, format="WEBP", quality=QUALITY, method=6)
    print(f"ok {src.width}x{src.height} {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
