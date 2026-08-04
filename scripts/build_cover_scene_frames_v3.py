from __future__ import annotations

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
FRAME_DIR = ROOT / "public" / "cover-assets" / "atmosphere-frames-v3"
OUTPUT = ROOT / "public" / "cover-assets" / "expedition-tundra-atmosphere-v3.webp"
OUTPUT_SIZE = (1280, 720)
STEPS_PER_TRANSITION = 24
FRAME_MS = 170


def smoothstep(value: float) -> float:
    return value * value * (3.0 - 2.0 * value)


def load_frame(number: int) -> Image.Image:
    image = Image.open(FRAME_DIR / f"frame-{number:02d}.png").convert("RGB")
    return image.resize(OUTPUT_SIZE, Image.Resampling.NEAREST)


def main() -> None:
    keyframes = [load_frame(1), load_frame(2), load_frame(3)]
    frames: list[Image.Image] = []

    # Each output is a complete, fixed-camera landscape frame. The animation
    # contains no separately composited creatures, scanner, particles or DOM
    # layers: it simply moves through full atmosphere keyframes.
    for start, end in zip(keyframes, keyframes[1:] + keyframes[:1]):
        for step in range(STEPS_PER_TRANSITION):
            progress = smoothstep(step / STEPS_PER_TRANSITION)
            frames.append(Image.blend(start, end, progress))

    frames[0].save(
        OUTPUT,
        save_all=True,
        append_images=frames[1:],
        duration=[FRAME_MS] * len(frames),
        loop=0,
        format="WEBP",
        quality=90,
        method=4,
        minimize_size=True,
        allow_mixed=True,
    )
    print(f"Built {OUTPUT} ({len(frames)} complete scene frames)")


if __name__ == "__main__":
    main()
