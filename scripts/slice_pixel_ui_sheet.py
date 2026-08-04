from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tmp" / "pixel-ui-sprite-alpha.png"
OUTPUT = ROOT / "public" / "pixel-ui-v2"

REGIONS = {
    "start-neutral.png": (510, 95, 1025, 300),
    "route-education.png": (20, 405, 515, 555),
    "route-work.png": (505, 405, 1010, 555),
    "route-projects.png": (1010, 405, 1520, 555),
    "hud-education.png": (60, 690, 500, 885),
    "hud-work.png": (520, 690, 990, 885),
    "hud-projects.png": (1030, 690, 1480, 885),
}


def trim_with_padding(image: Image.Image, padding: int = 4) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError("Region contains no visible pixels")
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def main() -> None:
    sheet = Image.open(SOURCE).convert("RGBA")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for filename, region in REGIONS.items():
        sprite = trim_with_padding(sheet.crop(region))
        sprite.save(OUTPUT / filename, optimize=True)
        print(f"{filename}: {sprite.width}x{sprite.height}")


if __name__ == "__main__":
    main()
