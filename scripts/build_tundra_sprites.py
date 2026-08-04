from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "tmp" / "tundra-sprites"
OUTPUT_DIR = ROOT / "public" / "tundra-sprites"
NAMES = ("basalt", "tundra", "waterfall", "mist", "beacon")
COLS = 4
ROWS = 4


def build_strip(name: str) -> dict[str, int | str]:
    source = Image.open(SOURCE_DIR / f"{name}-alpha.png").convert("RGBA")
    cell_width = source.width // COLS
    cell_height = source.height // ROWS
    frame_count = COLS * ROWS
    strip = Image.new("RGBA", (cell_width * frame_count, cell_height), (0, 0, 0, 0))

    for frame in range(frame_count):
        column = frame % COLS
        row = frame // COLS
        frame_image = source.crop(
            (
                column * cell_width,
                row * cell_height,
                (column + 1) * cell_width,
                (row + 1) * cell_height,
            )
        )
        strip.alpha_composite(frame_image, (frame * cell_width, 0))

    output_path = OUTPUT_DIR / f"{name}-16.png"
    strip.save(output_path, optimize=True)
    return {
        "file": f"/tundra-sprites/{output_path.name}",
        "frames": frame_count,
        "frameWidth": cell_width,
        "frameHeight": cell_height,
        "stripWidth": strip.width,
        "stripHeight": strip.height,
    }


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {name: build_strip(name) for name in NAMES}
    (OUTPUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
