from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TRANSITION_DIR = ROOT / "public" / "scene-assets" / "transitions"
TARGET_SIZE = (720, 405)
FRAME_DURATION_MS = 50


def optimize(path: Path) -> None:
    source = Image.open(path)
    frames: list[Image.Image] = []
    for index in range(source.n_frames):
        source.seek(index)
        frames.append(
            source.convert("RGBA").resize(TARGET_SIZE, Image.Resampling.NEAREST)
        )

    temporary = path.with_suffix(".optimized.webp")
    frames[0].save(
        temporary,
        save_all=True,
        append_images=frames[1:],
        duration=[FRAME_DURATION_MS] * len(frames),
        loop=1,
        format="WEBP",
        quality=82,
        method=3,
        exact=True,
    )
    temporary.replace(path)
    print(f"{path.name}: {len(frames)} frames, {path.stat().st_size:,} bytes")


def main() -> None:
    for path in sorted(TRANSITION_DIR.glob("*.webp")):
        optimize(path)


if __name__ == "__main__":
    main()
