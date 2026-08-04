from __future__ import annotations

import argparse
from pathlib import Path
from zipfile import ZipFile

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "scene-assets"
SCENE_SIZE = (960, 540)
FRAME_DURATION_MS = 40
SCENES = {
    "amsterdam": "scenes/01_amsterdam_canal/",
    "hillside-campus": "scenes/02_hillside_campus/",
    "cuhk-shenzhen": "scenes/03_cuhk_shenzhen_gate/",
}
LOGOS = {
    "omtech": "logos/01_omtech_pixel_transparent.png",
    "uva": "logos/02_university_of_amsterdam_pixel_transparent.png",
    "cuhk": "logos/03_cuhk_crest_pixel_transparent.png",
    "handshake": "logos/04_handshake_pixel_transparent.png",
}


def source_names(source: Path | ZipFile) -> list[str]:
    if isinstance(source, ZipFile):
        return [name.removeprefix("pixel_assets/") for name in source.namelist()]
    return [path.relative_to(source).as_posix() for path in source.rglob("*.png")]


def read_image(source: Path | ZipFile, name: str) -> Image.Image:
    if isinstance(source, ZipFile):
        archive_name = name if name in source.namelist() else f"pixel_assets/{name}"
        with source.open(archive_name) as file:
            return Image.open(file).convert("RGBA")
    return Image.open(source / name).convert("RGBA")


def build_scene(source: Path | ZipFile, key: str, prefix: str) -> None:
    names = sorted(
        name for name in source_names(source)
        if name.startswith(prefix) and "/frame_" in name and name.endswith(".png")
    )
    if len(names) != 32:
        raise ValueError(f"{key}: expected 32 scene frames, found {len(names)}")
    frames = [read_image(source, name).resize(SCENE_SIZE, Image.Resampling.NEAREST) for name in names]
    folder = OUTPUT / key
    folder.mkdir(parents=True, exist_ok=True)
    frames[0].save(folder / "day.png", optimize=True)
    frames[-1].save(folder / "night.png", optimize=True)
    frames[0].save(
        folder / "day-to-night.webp",
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_DURATION_MS,
        loop=1,
        lossless=False,
        quality=90,
        method=3,
    )


def build_logos(source: Path | ZipFile) -> None:
    folder = OUTPUT / "logos"
    folder.mkdir(parents=True, exist_ok=True)
    for key, name in LOGOS.items():
        image = read_image(source, name)
        image.save(folder / f"{key}.png", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Asset directory or ZIP archive")
    args = parser.parse_args()
    if args.source.is_dir():
        for key, prefix in SCENES.items():
            build_scene(args.source, key, prefix)
        build_logos(args.source)
    else:
        with ZipFile(args.source) as archive:
            for key, prefix in SCENES.items():
                build_scene(archive, key, prefix)
            build_logos(archive)


if __name__ == "__main__":
    main()
