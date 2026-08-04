from __future__ import annotations

from math import atan2, cos, pi, sin, sqrt
from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "interaction-assets" / "ground-contour-scan-v1.png"
SMALL = (480, 250)
SCALE = 2
FRAME_COUNT = 38
FRAME_MS = 68
ORIGIN = (SMALL[0] // 2, SMALL[1] - 9)


def terrain_height(x: int, y: int) -> float:
    # A synthetic height field creates irregular, terrain-following contour
    # lines instead of generic radar circles.
    ridge = 7.0 * sin(x / 31.0) + 4.0 * sin((x + y) / 19.0)
    rock_a = 34.0 / (1.0 + ((x - 135) / 34.0) ** 2 + ((y - 128) / 26.0) ** 2)
    rock_b = 28.0 / (1.0 + ((x - 340) / 40.0) ** 2 + ((y - 103) / 31.0) ** 2)
    return y + ridge + rock_a + rock_b


def build_contours() -> Image.Image:
    image = Image.new("L", SMALL, 0)
    pixels = image.load()
    for y in range(SMALL[1]):
        for x in range(SMALL[0]):
            value = terrain_height(x, y)
            band = value % 15.0
            if band < 1.35 or band > 13.65:
                pixels[x, y] = 255
    return image


def in_fan(x: int, y: int) -> tuple[bool, float]:
    dx = x - ORIGIN[0]
    dy = ORIGIN[1] - y
    if dy < 0:
        return False, 0.0
    angle = atan2(dx, dy)
    radial = sqrt(dx * dx + (dy * 1.42) ** 2)
    return abs(angle) <= pi / 3, radial


def main() -> None:
    contours = build_contours()
    contour_pixels = contours.load()
    max_radius = 365.0
    frames: list[Image.Image] = []

    for index in range(FRAME_COUNT):
        progress = index / (FRAME_COUNT - 1)
        front = progress * max_radius
        frame = Image.new("RGBA", SMALL, (0, 0, 0, 0))
        pixels = frame.load()

        for y in range(SMALL[1]):
            for x in range(SMALL[0]):
                inside, radial = in_fan(x, y)
                if not inside:
                    continue
                distance = front - radial
                if -4.0 <= distance <= 3.0:
                    # Bright white-blue leading edge.
                    alpha = round(238 * (1 - abs(distance) / 5.0))
                    pixels[x, y] = (206, 246, 255, max(0, alpha))
                elif 0.0 < distance < 142.0:
                    # Brief ground darkening behind the wave.
                    fade = 1.0 - distance / 142.0
                    pixels[x, y] = (8, 40, 55, round(34 * fade))
                    if contour_pixels[x, y]:
                        pixels[x, y] = (42, 191, 235, round(188 * fade + 34))

        draw = ImageDraw.Draw(frame)
        # Sparse traversal markers appear only after the scan reaches them.
        markers = [((151, 154), (244, 190, 62, 210), "triangle"), ((331, 124), (239, 91, 74, 220), "square")]
        for (mx, my), color, kind in markers:
            _, radial = in_fan(mx, my)
            if front > radial + 12 and front - radial < 135:
                if kind == "triangle":
                    draw.polygon([(mx, my - 5), (mx - 5, my + 4), (mx + 5, my + 4)], outline=color)
                else:
                    draw.rectangle((mx - 4, my - 4, mx + 4, my + 4), outline=color, width=1)

        enlarged = frame.resize((SMALL[0] * SCALE, SMALL[1] * SCALE), Image.Resampling.NEAREST)
        frames.append(enlarged)

    frames[0].save(
        OUTPUT,
        save_all=True,
        append_images=frames[1:],
        duration=[FRAME_MS] * FRAME_COUNT,
        loop=0,
        disposal=1,
        blend=0,
        optimize=False,
    )
    print(f"Built {OUTPUT} ({FRAME_COUNT} ground-contour scan frames)")


if __name__ == "__main__":
    main()
