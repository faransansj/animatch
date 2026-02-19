"""Tarot card image generation helper for AniMatch.

Parses docs/tarot-prompts.md, validates generated images, and converts formats.

Usage:
    python ml/generate_tarot_images.py --dry-run     # Print parsed prompts
    python ml/generate_tarot_images.py --validate    # Check public/images/tarot/ for missing/invalid files
    python ml/generate_tarot_images.py --convert DIR  # Convert PNG files in DIR to WebP (quality 85)
"""

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
PROMPTS_PATH = ROOT / "docs" / "tarot-prompts.md"
TAROT_DIR = ROOT / "public" / "images" / "tarot"

VALID_IDS = [
    2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36,
    38, 40, 42, 44, 46, 48, 50, 52, 54, 58, 60, 62, 64, 66, 68, 72, 74,
    76, 78, 80, 82, 84, 94, 96, 102, 104, 106, 112, 114,
]

MIN_SIZE_KB = 50
MAX_SIZE_KB = 300


def parse_prompts() -> dict[int, dict]:
    """Parse tarot-prompts.md and extract character prompts."""
    text = PROMPTS_PATH.read_text(encoding="utf-8")
    pattern = r'### ID:(\d+)\s*[—–-]\s*(.+?)\n.*?```\n(.*?)```'
    entries = {}
    for m in re.finditer(pattern, text, re.DOTALL):
        hid = int(m.group(1))
        name = m.group(2).strip()
        prompt = m.group(3).strip()
        entries[hid] = {"name": name, "prompt": prompt}
    return entries


def cmd_dry_run():
    entries = parse_prompts()
    print(f"Parsed {len(entries)} character prompts:\n")
    for hid in sorted(entries.keys()):
        e = entries[hid]
        print(f"[{hid}] {e['name']}")
        print(f"  Prompt: {e['prompt'][:120]}...")
        print()

    missing = set(VALID_IDS) - set(entries.keys())
    if missing:
        print(f"WARNING: Missing prompts for IDs: {sorted(missing)}")
    extra = set(entries.keys()) - set(VALID_IDS)
    if extra:
        print(f"WARNING: Extra IDs in prompts: {sorted(extra)}")


def cmd_validate():
    TAROT_DIR.mkdir(parents=True, exist_ok=True)
    missing = []
    invalid = []
    ok = []

    for hid in VALID_IDS:
        path = TAROT_DIR / f"{hid}.webp"
        if not path.exists():
            missing.append(hid)
            continue
        size_kb = path.stat().st_size / 1024
        if size_kb < MIN_SIZE_KB or size_kb > MAX_SIZE_KB:
            invalid.append((hid, f"{size_kb:.0f}KB"))
        else:
            ok.append((hid, f"{size_kb:.0f}KB"))

    print(f"Tarot image validation ({TAROT_DIR}):\n")
    print(f"  OK: {len(ok)} / {len(VALID_IDS)}")
    for hid, size in ok:
        print(f"    [{hid}] {size}")

    if invalid:
        print(f"\n  Size warning ({MIN_SIZE_KB}-{MAX_SIZE_KB}KB expected): {len(invalid)}")
        for hid, size in invalid:
            print(f"    [{hid}] {size}")

    if missing:
        print(f"\n  Missing: {len(missing)}")
        print(f"    IDs: {missing}")

    return len(missing) == 0 and len(invalid) == 0


def cmd_convert(src_dir: str):
    try:
        from PIL import Image
    except ImportError:
        print("ERROR: Pillow is required. Install with: pip install Pillow")
        sys.exit(1)

    src = Path(src_dir)
    TAROT_DIR.mkdir(parents=True, exist_ok=True)

    pngs = list(src.glob("*.png"))
    if not pngs:
        print(f"No PNG files found in {src}")
        return

    converted = 0
    for png in pngs:
        stem = png.stem
        try:
            hid = int(stem)
        except ValueError:
            print(f"  Skip: {png.name} (filename is not a number)")
            continue

        out = TAROT_DIR / f"{hid}.webp"
        img = Image.open(png)
        img.save(out, "WEBP", quality=85)
        size_kb = out.stat().st_size / 1024
        print(f"  [{hid}] {png.name} → {out.name} ({size_kb:.0f}KB)")
        converted += 1

    print(f"\nConverted {converted} images.")


def main():
    parser = argparse.ArgumentParser(description="AniMatch tarot image helper")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="Print parsed prompts")
    group.add_argument("--validate", action="store_true", help="Validate images in public/images/tarot/")
    group.add_argument("--convert", metavar="DIR", help="Convert PNG images in DIR to WebP")
    args = parser.parse_args()

    if args.dry_run:
        cmd_dry_run()
    elif args.validate:
        ok = cmd_validate()
        sys.exit(0 if ok else 1)
    elif args.convert:
        cmd_convert(args.convert)


if __name__ == "__main__":
    main()
