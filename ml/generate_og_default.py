"""Generate the default OG image for AniMatch.

Creates a 1200x630 branded image at public/images/og-default.webp.

Usage:
    python ml/generate_og_default.py
"""

from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("ERROR: Pillow is required. Install with: pip install Pillow")
    exit(1)

ROOT = Path(__file__).parent.parent
OUT_PATH = ROOT / "public" / "images" / "og-default.webp"

W, H = 1200, 630

# Colors matching the app theme
BG_TOP = (26, 16, 64)       # #1a1040
BG_BOTTOM = (15, 23, 42)    # #0F172A
PRIMARY = (255, 107, 157)   # #FF6B9D
SECONDARY = (192, 132, 252) # #C084FC
TEXT_DIM = (148, 163, 184)  # #94A3B8


def lerp_color(c1: tuple, c2: tuple, t: float) -> tuple:
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def main():
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    # Vertical gradient background
    for y in range(H):
        t = y / H
        color = lerp_color(BG_TOP, BG_BOTTOM, t)
        draw.line([(0, y), (W, y)], fill=color)

    # Decorative card outlines (tarot motif)
    card_w, card_h = 120, 170
    positions = [(180, 200), (340, 160), (740, 160), (900, 200)]
    for cx, cy in positions:
        draw.rounded_rectangle(
            [cx, cy, cx + card_w, cy + card_h],
            radius=12,
            outline=(*SECONDARY, 40),
            width=2,
        )

    # Try to use a nice font, fall back to default
    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 72)
        sub_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28)
        small_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
    except (OSError, IOError):
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()
        small_font = ImageFont.load_default()

    # Main title
    draw.text((W // 2, 240), "AniMatch", fill=PRIMARY, font=title_font, anchor="mm")

    # Subtitle
    draw.text(
        (W // 2, 320),
        "Find Your Anime Partner with AI",
        fill=TEXT_DIM,
        font=sub_font,
        anchor="mm",
    )

    # Decorative line
    line_y = 380
    draw.line([(350, line_y), (850, line_y)], fill=(*SECONDARY, 60), width=1)

    # Bottom tagline
    draw.text(
        (W // 2, 440),
        "AI-powered anime character matching",
        fill=(*TEXT_DIM,),
        font=small_font,
        anchor="mm",
    )

    # Corner accents
    accent_size = 40
    for x, y in [(30, 30), (W - 30 - accent_size, 30), (30, H - 30 - accent_size), (W - 30 - accent_size, H - 30 - accent_size)]:
        draw.rounded_rectangle([x, y, x + accent_size, y + accent_size], radius=8, outline=PRIMARY, width=2)

    # Save
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT_PATH, "WEBP", quality=85)
    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"Generated: {OUT_PATH} ({size_kb:.0f}KB)")


if __name__ == "__main__":
    main()
