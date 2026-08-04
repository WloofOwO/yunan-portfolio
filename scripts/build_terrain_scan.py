from __future__ import annotations

from pathlib import Path
from math import pi, sin

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "interaction-assets" / "terrain-scan.png"
SOURCE_SIZE = 160
SCALE = 4
FRAME_COUNT = 36
FRAME_MS = 34


def ease_out_cubic(value: float) -> float:
    return 1 - (1 - value) ** 3


def rgba(alpha: int, bright: bool = False) -> tuple[int, int, int, int]:
    return ((182, 235, 238, alpha) if bright else (91, 181, 193, alpha))


def segmented_ellipse(draw: ImageDraw.ImageDraw, radius: float, alpha: int, width: int = 1) -> None:
    if radius <= 1 or alpha <= 0:
        return
    cx = cy = SOURCE_SIZE // 2
    ry = max(2, round(radius * .43))
    box = (round(cx - radius), cy - ry, round(cx + radius), cy + ry)
    for start in range(0, 360, 34):
        draw.arc(box, start=start, end=start + 22, fill=rgba(alpha, bright=start % 68 == 0), width=width)


def frame_at(index: int) -> Image.Image:
    canvas = Image.new("RGBA", (SOURCE_SIZE, SOURCE_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    progress = index / (FRAME_COUNT - 1)
    overall = max(0.0, min(1.0, (1 - progress) / .36)) if progress > .64 else 1.0

    for delay, strength in ((0.0, 1.0), (.10, .78), (.20, .56)):
        local = max(0.0, min(1.0, (progress - delay) / .68))
        if progress < delay:
            continue
        radius = 4 + ease_out_cubic(local) * 72
        alpha = round(220 * strength * (1 - local) ** .45 * overall)
        segmented_ellipse(draw, radius, alpha, width=1)

    reveal = max(0.0, min(1.0, progress / .22)) * overall
    contour_alpha = round(104 * reveal)
    # Sparse terrain contour fragments, deliberately asymmetric and quiet.
    contours = [
        [(24, 87), (35, 83), (48, 84), (60, 80), (73, 81)],
        [(88, 69), (101, 66), (117, 68), (130, 63), (143, 65)],
        [(38, 104), (51, 100), (65, 103), (78, 98), (94, 100), (111, 95)],
        [(71, 116), (86, 112), (102, 114), (119, 109), (136, 111)],
    ]
    scan_radius = ease_out_cubic(min(1.0, progress / .68)) * 76
    cx, cy = 80, 80
    for points in contours:
        visible = [point for point in points if ((point[0] - cx) ** 2 + ((point[1] - cy) / .48) ** 2) ** .5 <= scan_radius]
        if len(visible) > 1:
            draw.line(visible, fill=rgba(contour_alpha), width=1)

    marker_alpha = round(185 * max(0.0, sin(min(1.0, progress / .72) * pi)) * overall)
    for x, y in ((47, 84), (107, 69), (92, 112)):
        distance = ((x - cx) ** 2 + ((y - cy) / .48) ** 2) ** .5
        if distance <= scan_radius:
            draw.rectangle((x - 1, y - 1, x + 1, y + 1), outline=rgba(marker_alpha, True))
            draw.point((x, y), fill=(226, 250, 248, marker_alpha))

    # A short center acquisition flash grounds the pulse at the exact click.
    center_alpha = round(240 * max(0.0, 1 - progress / .28))
    if center_alpha:
        draw.line((75, 80, 85, 80), fill=rgba(center_alpha, True), width=1)
        draw.line((80, 77, 80, 83), fill=rgba(center_alpha, True), width=1)

    return canvas.resize((SOURCE_SIZE * SCALE, SOURCE_SIZE * SCALE), Image.Resampling.NEAREST)


def main() -> None:
    frames = [frame_at(index) for index in range(FRAME_COUNT)]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        OUT,
        save_all=True,
        append_images=frames[1:],
        duration=[FRAME_MS] * FRAME_COUNT,
        loop=1,
        disposal=1,
        blend=0,
        optimize=False,
    )
    print(f"Built {OUT} ({FRAME_COUNT} frames, {FRAME_MS} ms)")


if __name__ == "__main__":
    main()
