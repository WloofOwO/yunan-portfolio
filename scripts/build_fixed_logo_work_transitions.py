from __future__ import annotations

from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SCENE_DIR = ROOT / "public" / "scene-assets" / "hillside-campus"
TRANSITION_DIR = ROOT / "public" / "scene-assets" / "transitions"
BACKUP_DIR = TRANSITION_DIR / "legacy-logo-motion"
SIZE = (720, 405)
FRAME_MS = 50
FRAME_COUNT = 52


def scene_frames() -> list[Image.Image]:
    source = Image.open(SCENE_DIR / "day-to-night.webp")
    frames: list[Image.Image] = []
    for index in range(source.n_frames):
        source.seek(index)
        frames.append(source.convert("RGBA").resize(SIZE, Image.Resampling.NEAREST))
    return frames


def with_alpha(image: Image.Image, opacity: float) -> Image.Image:
    result = image.copy()
    alpha = result.getchannel("A").point(lambda value: round(value * opacity))
    result.putalpha(alpha)
    return result


def incoming(frames: list[Image.Image]) -> list[Image.Image]:
    blank = Image.new("RGBA", SIZE)
    hold = FRAME_COUNT - len(frames)
    result: list[Image.Image] = []
    # A virtually transparent alternating marker prevents WebP encoders from
    # collapsing the deliberate hold into a shorter animation.
    for index in range(hold):
        frame = blank.copy()
        frame.putpixel((index % 2, 0), (0, 0, 0, 1))
        result.append(frame)
    reversed_frames = list(reversed(frames))
    for index, frame in enumerate(reversed_frames):
        fade = min(1.0, index / 9)
        result.append(with_alpha(frame, fade))
    return result


def outgoing(frames: list[Image.Image]) -> list[Image.Image]:
    result = [frame.copy() for frame in frames]
    tail = FRAME_COUNT - len(frames)
    night = frames[-1]
    for index in range(tail):
        result.append(with_alpha(night, 1 - (index + 1) / tail))
    return result


def save(name: str, frames: list[Image.Image]) -> None:
    path = TRANSITION_DIR / name
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backup = BACKUP_DIR / name
    if path.exists() and not backup.exists():
        shutil.copy2(path, backup)
    temporary = path.with_suffix(".fixed.webp")
    frames[0].save(
        temporary,
        save_all=True,
        append_images=frames[1:],
        duration=[FRAME_MS] * len(frames),
        loop=1,
        format="WEBP",
        quality=82,
        method=4,
        exact=True,
    )
    temporary.replace(path)
    print(f"{name}: {len(frames)} fixed-background frames")


def main() -> None:
    frames = scene_frames()
    for name in (
        "omtech-to-cuhk-research.webp",
        "mercado-libre-to-cuhk-research.webp",
    ):
        save(name, incoming(frames))
    for name in (
        "cuhk-research-to-omtech.webp",
        "cuhk-research-to-mercado-libre.webp",
    ):
        save(name, outgoing(frames))


if __name__ == "__main__":
    main()
