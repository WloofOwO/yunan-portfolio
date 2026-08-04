from __future__ import annotations

from pathlib import Path
from math import pi, sin
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
BACKGROUND = ROOT / "public" / "cover-assets" / "expedition-tundra-v1.png"
SPRITES = ROOT / "public" / "cover-assets" / "cover-fauna-sprites-v1.png"
OUTPUT = ROOT / "public" / "cover-assets" / "expedition-tundra-ambient-v2.webp"
FRAME_COUNT = 72
FRAME_MS = 160
OUTPUT_SIZE = (1280, 720)


def crop_sprite(sheet: Image.Image, column: int, row: int) -> Image.Image:
    cell_w = sheet.width // 4
    cell_h = sheet.height // 2
    cell = sheet.crop((column * cell_w, row * cell_h, (column + 1) * cell_w, (row + 1) * cell_h))
    box = cell.getchannel("A").getbbox()
    if not box:
        raise RuntimeError(f"Empty sprite cell {column}, {row}")
    return cell.crop(box)


def scaled(image: Image.Image, width: int) -> Image.Image:
    height = max(1, round(image.height * width / image.width))
    return image.resize((width, height), Image.Resampling.NEAREST)


def main() -> None:
    background = Image.open(BACKGROUND).convert("RGBA")
    sheet = Image.open(SPRITES).convert("RGBA")
    cryptobiotes = [scaled(crop_sprite(sheet, i, 0), 30) for i in range(4)]
    lizards = [scaled(crop_sprite(sheet, i, 1), 56) for i in range(4)]
    frames: list[Image.Image] = []

    for index in range(FRAME_COUNT):
        frame = background.copy()

        # All atmosphere is baked into each full-scene raster frame. No DOM
        # element moves independently at runtime.
        atmosphere = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        atmosphere_draw = ImageDraw.Draw(atmosphere)
        mist_shift = (index * 5) % 420
        mist_alpha = round(7 + 4 * (1 + sin(index / FRAME_COUNT * pi * 2)))
        atmosphere_draw.polygon(
            [
                (-260 + mist_shift, 615),
                (90 + mist_shift, 600),
                (345 + mist_shift, 617),
                (165 + mist_shift, 636),
                (-180 + mist_shift, 632),
            ],
            fill=(201, 218, 221, mist_alpha),
        )

        # The locator gives one restrained cyan heartbeat every loop.
        beacon = max(0.0, sin((index - 8) / FRAME_COUNT * pi * 2)) ** 5
        if beacon > 0.04:
            atmosphere_draw.rectangle((1350, 690, 1354, 718), fill=(72, 224, 238, round(72 + 150 * beacon)))
            atmosphere_draw.rectangle((1348, 686, 1356, 721), outline=(119, 234, 244, round(40 + 90 * beacon)))

        # Wet basalt catches a few cold highlights; each line changes only one
        # or two pixels between frames, preserving the quiet landscape.
        glint = round(24 + 18 * (1 + sin(index / 9.0)))
        atmosphere_draw.rectangle((520, 878, 594, 880), fill=(188, 219, 223, glint))
        atmosphere_draw.rectangle((743, 851, 792, 852), fill=(178, 211, 216, glint // 2))
        frame.alpha_composite(atmosphere)

        # A brief, distant pass. The creature is intentionally small and the
        # long empty interval keeps the cover calm rather than constantly busy.
        if 7 <= index <= 22:
            progress = (index - 7) / 15
            sprite = cryptobiotes[(index - 7) % 4]
            x = round(120 + progress * 560)
            y = round(590 - 5 * (1 - abs(progress * 2 - 1)))
            frame.alpha_composite(sprite, (x, y))

        # Slow foreground crawl late in the loop; position advances in small,
        # even pixel increments while the four authored limb frames cycle.
        if 40 <= index <= 63:
            progress = (index - 40) / 23
            sprite = lizards[(index - 40) % 4]
            x = round(990 + progress * 330)
            y = 804 - sprite.height
            frame.alpha_composite(sprite, (x, y))

        # A three-beat distant insect silhouette, deliberately much smaller
        # than the foreground fauna.
        if 27 <= index <= 34:
            drift = index - 27
            draw = ImageDraw.Draw(frame)
            x = 715 + drift * 19
            y = 588 - (drift % 3) * 2
            draw.rectangle((x, y, x + 3, y + 1), fill=(37, 48, 49, 150))
            draw.point((x - 2, y + (drift % 2)), fill=(56, 66, 63, 120))
            draw.point((x + 5, y + ((drift + 1) % 2)), fill=(56, 66, 63, 120))

        frames.append(frame.convert("RGB").resize(OUTPUT_SIZE, Image.Resampling.NEAREST))

    frames[0].save(
        OUTPUT,
        save_all=True,
        append_images=frames[1:],
        duration=[FRAME_MS] * FRAME_COUNT,
        loop=0,
        format="WEBP",
        quality=88,
        method=4,
        minimize_size=True,
        allow_mixed=True,
    )
    print(f"Built {OUTPUT} ({FRAME_COUNT} generated raster frames)")


if __name__ == "__main__":
    main()
