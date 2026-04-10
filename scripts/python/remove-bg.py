#!/usr/bin/env python3
"""
Remove background from a product image using rembg.

Usage:
    remove-bg.py <input_path> <output_path>

Input:  any image (jpg/png/webp)
Output: RGBA PNG with transparent background, tightly cropped to content bounds
"""
import sys
from pathlib import Path
from io import BytesIO

from rembg import remove, new_session
from PIL import Image


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: remove-bg.py <input> <output>", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    if not input_path.exists():
        print(f"input not found: {input_path}", file=sys.stderr)
        return 1

    # isnet-general-use is the most accurate general-purpose model. It's slower
    # but produces clean edges on bikes/products.
    session = new_session("isnet-general-use")

    with Image.open(input_path) as im:
        # Convert to RGB first — rembg prefers a straight RGB input.
        if im.mode != "RGB":
            im = im.convert("RGB")

        buf = BytesIO()
        im.save(buf, format="PNG")
        raw = buf.getvalue()

    # Alpha matting dramatically improves edge quality on thin parts (spokes,
    # cables, racks). The thresholds below are tuned for product photography.
    cut = remove(
        raw,
        session=session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=5,
        post_process_mask=True,
    )

    result = Image.open(BytesIO(cut)).convert("RGBA")

    # Crop to the non-transparent bounding box so downstream scaling is precise.
    bbox = result.getbbox()
    if bbox is not None:
        result = result.crop(bbox)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    result.save(output_path, format="PNG", optimize=True)

    w, h = result.size
    print(f"ok {w}x{h} {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
