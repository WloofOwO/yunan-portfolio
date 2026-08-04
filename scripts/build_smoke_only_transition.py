from __future__ import annotations

from math import pi, sin
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "avatar-smoke" / "transitions" / "smoke_casual_to_formal.png"
OUTPUT = ROOT / "public" / "avatar-smoke" / "transitions" / "smoke-only.png"
CANVAS = (320, 208)
CENTER_X = 160
BASELINE_Y = 197
FRAME_COUNT = 48
FRAME_MS = 50


def ease_out_cubic(value: float) -> float:
    return 1 - (1 - value) ** 3


def opacity(image: Image.Image, value: float) -> Image.Image:
    result = image.copy()
    result.putalpha(result.getchannel("A").point(lambda alpha: round(alpha * value)))
    return result


def main() -> None:
    source = Image.open(SOURCE)
    source.seek(24)
    dense = source.convert("RGBA")
    box = dense.getchannel("A").getbbox()
    if not box:
        raise RuntimeError("Dense smoke frame has no alpha content")
    texture = dense.crop(box)

    frames: list[Image.Image] = []
    for index in range(FRAME_COUNT):
        progress = index / (FRAME_COUNT - 1)
        if progress < .36:
            local = progress / .36
            scale = .18 + ease_out_cubic(local) * .84
            alpha = min(1.0, local * 1.45)
            lift = round((1 - local) * 9)
        elif progress < .61:
            local = (progress - .36) / .25
            # The cloud breathes in place; its center never translates.
            scale = 1.02 + sin(local * pi * 2) * .012
            alpha = 1.0
            lift = round(sin(local * pi) * 2)
        else:
            local = (progress - .61) / .39
            scale = 1.02 + ease_out_cubic(local) * .11
            alpha = max(0.0, (1 - local) ** .78)
            lift = -round(ease_out_cubic(local) * 8)

        width = max(1, round(texture.width * scale))
        height = max(1, round(texture.height * scale))
        cloud = texture.resize((width, height), Image.Resampling.NEAREST)
        cloud = opacity(cloud, alpha)
        frame = Image.new("RGBA", CANVAS)
        x = CENTER_X - width // 2
        y = BASELINE_Y - height + lift
        frame.alpha_composite(cloud, (x, y))
        frames.append(frame)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
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
    print(f"Built {OUTPUT} ({FRAME_COUNT} smoke-only frames)")


if __name__ == "__main__":
    main()
