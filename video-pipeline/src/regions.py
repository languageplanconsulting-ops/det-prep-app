"""SOP §5 — spotlight regions for the rain-shadow desert process diagram.

Rectangles are in SOURCE-IMAGE pixels (807×470). The composition scales the
image to its on-screen width; scale_regions() maps them across.

Verify with:  python src/regions.py --draw work/regions-check.png
"""

import argparse
import json

SOURCE_W = 807
SOURCE_H = 470

# key -> (x, y, w, h) in source pixels
REGIONS = {
    "title": (196, 4, 424, 30),
    "stage1": (74, 240, 116, 66),
    "stage2": (188, 236, 104, 70),
    "stage3": (214, 180, 122, 76),
    "stage4": (256, 118, 96, 62),
    "stage5": (322, 44, 84, 62),
    "stage6": (462, 108, 174, 52),
    "stage7": (556, 258, 166, 56),
    "windward": (334, 194, 92, 46),
    "leeward": (458, 194, 84, 46),
    "mountain": (255, 150, 360, 200),
    "sea": (84, 330, 190, 100),
    "coast": (176, 386, 90, 34),
    "inland": (580, 348, 84, 30),
    "desert": (610, 386, 118, 52),
    "scale_bar": (196, 428, 420, 40),
    "rainclouds": (300, 78, 148, 74),
    "leeward_slope": (486, 150, 128, 200),
    "windward_slope": (250, 178, 150, 176),
    "whole": (0, 0, SOURCE_W, SOURCE_H),
}


def scale_regions(display_w: int) -> dict:
    """Map source-pixel rects onto a display width, preserving aspect."""
    k = display_w / SOURCE_W
    return {
        name: {
            "x": round(x * k, 2),
            "y": round(y * k, 2),
            "w": round(w * k, 2),
            "h": round(h * k, 2),
        }
        for name, (x, y, w, h) in REGIONS.items()
    }


def draw(out_path: str) -> None:
    from PIL import Image, ImageDraw

    img = Image.open("public/diagram.jpg").convert("RGB")
    d = ImageDraw.Draw(img)
    for name, (x, y, w, h) in REGIONS.items():
        if name == "whole":
            continue
        d.rectangle([x, y, x + w, y + h], outline=(255, 0, 0), width=2)
        d.text((x + 2, y + 2), name, fill=(0, 0, 255))
    img.save(out_path)
    print(f"wrote {out_path}  ({img.width}×{img.height})")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--draw", metavar="PNG")
    ap.add_argument("--scale", type=int, metavar="DISPLAY_W")
    args = ap.parse_args()
    if args.draw:
        draw(args.draw)
    if args.scale:
        print(json.dumps(scale_regions(args.scale), indent=2))
