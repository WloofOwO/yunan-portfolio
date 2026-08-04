from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "avatar-smoke" / "source"
FRAME_DIR = ROOT / "public" / "avatar-smoke" / "frames"
TRANSITION_DIR = ROOT / "public" / "avatar-smoke" / "transitions"

CANVAS = (320, 208)
BASELINE_Y = 197
CHARACTER_HEIGHT = 160
FRAME_DURATION_MS = 50
COVER_FRAME_COUNT = 20
BRIDGE_FRAME_COUNT = 8
REVEAL_FRAME_COUNT = 20

# Match the visible lower-body root of the regular 128 px avatar after the
# 320 px smoke canvas is displayed at 254 px.  This keeps the handoff visually
# fixed instead of snapping every outfit to the mathematical canvas center.
OUTFIT_ROOT_X = {"casual": 164, "formal": 163, "student": 164}

SHEETS = {
    "casual": {
        "path": SOURCE_DIR / "casual-sheet-green.png",
        "cover_end": 16,
        "reveal_start": 14,
        "reveal_end": 26,
    },
    "formal": {
        "path": SOURCE_DIR / "formal-sheet-green.png",
        "cover_end": 18,
        "reveal_start": 18,
        "reveal_end": 26,
    },
    "student": {
        "path": SOURCE_DIR / "student-sheet-green.png",
        "cover_end": 26,
        "reveal_start": 24,
        "reveal_end": 35,
    },
}


def remove_green(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = []
    for red, green, blue, alpha in rgba.getdata():
        green_excess = green - max(red, blue)
        if green > 150 and green_excess > 55:
            alpha = 0
        elif green > 120 and green_excess > 24:
            alpha = max(0, min(alpha, int(255 * (55 - green_excess) / 31)))
            green = min(green, max(red, blue) + 18)
        pixels.append((red, green, blue, alpha))
    rgba.putdata(pixels)
    return rgba


def is_foreground(pixel: tuple[int, int, int]) -> bool:
    red, green, blue = pixel
    return not (green > 150 and green - max(red, blue) > 45)


def active_ranges(values: list[int], threshold: int, minimum_width: int) -> list[tuple[int, int]]:
    result: list[tuple[int, int]] = []
    start = None
    for index, value in enumerate(values + [0]):
        if value > threshold and start is None:
            start = index
        elif value <= threshold and start is not None:
            if index - start >= minimum_width:
                result.append((start, index))
            start = None
    return result


def padded_cells(ranges: list[tuple[int, int]], limit: int) -> list[tuple[int, int]]:
    centers = [(start + end) / 2 for start, end in ranges]
    cells: list[tuple[int, int]] = []
    for index, center in enumerate(centers):
        if index == 0:
            left = max(0, round(center - (centers[1] - center) / 2))
        else:
            left = round((centers[index - 1] + center) / 2)
        if index == len(centers) - 1:
            right = min(limit, round(center + (center - centers[index - 1]) / 2))
        else:
            right = round((center + centers[index + 1]) / 2)
        cells.append((left, right))
    return cells


def split_sheet(spec: dict) -> list[Image.Image]:
    sheet = Image.open(spec["path"]).convert("RGB")
    row_projection = [
        sum(1 for x in range(sheet.width) if is_foreground(sheet.getpixel((x, y))))
        for y in range(sheet.height)
    ]
    row_content_ranges = active_ranges(row_projection, threshold=25, minimum_width=12)
    row_cells = padded_cells(row_content_ranges, sheet.height)

    raw_frames: list[tuple[Image.Image, int]] = []
    for row_index, (top, bottom) in enumerate(row_cells):
        x_projection = [
            sum(1 for y in range(top, bottom) if is_foreground(sheet.getpixel((x, y))))
            for x in range(sheet.width)
        ]
        column_ranges = active_ranges(x_projection, threshold=8, minimum_width=13)
        for left, right in padded_cells(column_ranges, sheet.width):
            raw_frames.append((remove_green(sheet.crop((left, top, right, bottom))), row_index))

    frames = [frame for frame, _ in raw_frames]
    first_row_count = sum(1 for _, row_index in raw_frames if row_index == 0)
    initial_boxes = [frame.getbbox() for frame in frames[: min(first_row_count, 5)]]
    initial_boxes = [box for box in initial_boxes if box]
    median_height = sorted(box[3] - box[1] for box in initial_boxes)[len(initial_boxes) // 2]
    scale = CHARACTER_HEIGHT / median_height

    row_baselines: dict[int, int] = {}
    for row_index in {row_index for _, row_index in raw_frames}:
        boxes = [frame.getbbox() for frame, frame_row in raw_frames if frame_row == row_index]
        bottoms = [box[3] for box in boxes if box]
        row_baselines[row_index] = sorted(bottoms)[len(bottoms) // 2]

    normalized: list[Image.Image] = []
    for frame, row_index in raw_frames:
        resized = frame.resize(
            (max(1, round(frame.width * scale)), max(1, round(frame.height * scale))),
            Image.Resampling.NEAREST,
        )
        canvas = Image.new("RGBA", CANVAS)
        x = round((CANVAS[0] - resized.width) / 2)
        y = round(BASELINE_Y - row_baselines[row_index] * scale)
        canvas.alpha_composite(resized, (x, y))
        normalized.append(canvas)
    return normalized


def interpolate_sequence(frames: list[Image.Image], output_count: int) -> list[Image.Image]:
    if len(frames) == 1:
        return [frames[0].copy() for _ in range(output_count)]

    result: list[Image.Image] = []
    for index in range(output_count):
        position = index * (len(frames) - 1) / (output_count - 1)
        lower = int(position)
        upper = min(len(frames) - 1, lower + 1)
        amount = position - lower
        if amount < 0.06:
            frame = frames[lower].copy()
        elif amount > 0.94:
            frame = frames[upper].copy()
        else:
            frame = Image.blend(frames[lower], frames[upper], amount)
        result.append(frame)
    return result


def foot_offset(frame: Image.Image, target_x: int) -> tuple[int, int] | None:
    """Return a body-root correction only while the character's feet exist.

    Dense smoke frames intentionally return ``None``.  Re-anchoring those
    frames from the changing cloud silhouette was the source of the visible
    left/right shake.
    """
    dark_feet: list[tuple[int, int]] = []
    for y in range(BASELINE_Y - 50, CANVAS[1]):
        for x in range(CANVAS[0]):
            red, green, blue, alpha = frame.getpixel((x, y))
            if alpha > 96 and red + green + blue < 180:
                dark_feet.append((x, y))

    if len(dark_feet) < 80:
        return None

    foot_x = [x for x, _ in dark_feet]
    # Use the geometric midpoint of both shoes. Pixel-count median shifts when
    # one shoe has a larger shaded area, even though the body root is static.
    anchor_x = (min(foot_x) + max(foot_x) + 1) / 2
    anchor_bottom = max(y for _, y in dark_feet) + 1
    return round(target_x - anchor_x), BASELINE_Y - anchor_bottom


def stabilize_sequence(frames: list[Image.Image], outfit: str) -> list[Image.Image]:
    """Lock a whole action to one continuous body-root trajectory.

    Missing anchors under dense smoke are interpolated from the nearest
    visible character frames.  This keeps the generated character motion but
    prevents the smoke mass from becoming a second, unstable coordinate
    system.
    """
    # The middle drawings are intentionally smoke-heavy.  Their darker cloud
    # pixels can resemble shoes, so only trust the clean character drawings at
    # both ends of the generated sequence.  Everything between them follows a
    # single interpolated root trajectory.
    trusted_indexes = set(range(min(7, len(frames))))
    trusted_indexes.update(range(max(0, len(frames) - 7), len(frames)))
    known = [
        (index, offset)
        for index, frame in enumerate(frames)
        if index in trusted_indexes and (offset := foot_offset(frame, OUTFIT_ROOT_X[outfit]))
    ]
    if not known:
        return [frame.copy() for frame in frames]

    offsets: list[tuple[int, int]] = []
    for index in range(len(frames)):
        previous = next(((i, value) for i, value in reversed(known) if i <= index), None)
        following = next(((i, value) for i, value in known if i >= index), None)
        if previous and following and following[0] != previous[0]:
            amount = (index - previous[0]) / (following[0] - previous[0])
            dx = round(previous[1][0] + (following[1][0] - previous[1][0]) * amount)
            dy = round(previous[1][1] + (following[1][1] - previous[1][1]) * amount)
            offsets.append((dx, dy))
        elif previous:
            offsets.append(previous[1])
        else:
            offsets.append(following[1])

    stabilized: list[Image.Image] = []
    for frame, (offset_x, offset_y) in zip(frames, offsets):
        canvas = Image.new("RGBA", CANVAS)
        canvas.alpha_composite(frame, (offset_x, offset_y))
        stabilized.append(canvas)
    return stabilized


def save_apng(frames: list[Image.Image], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=[FRAME_DURATION_MS] * len(frames),
        loop=0,
        disposal=1,
        blend=0,
        optimize=False,
    )


def main() -> None:
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    TRANSITION_DIR.mkdir(parents=True, exist_ok=True)

    normalized: dict[str, list[Image.Image]] = {}
    for outfit, spec in SHEETS.items():
        frames = split_sheet(spec)
        normalized[outfit] = stabilize_sequence(frames, outfit)
        for index, frame in enumerate(frames):
            frame.save(FRAME_DIR / f"{outfit}-{index:02d}.png")

    for source, source_spec in SHEETS.items():
        cover = normalized[source][: source_spec["cover_end"] + 1]
        cover = interpolate_sequence(cover, COVER_FRAME_COUNT)
        for target, target_spec in SHEETS.items():
            reveal = normalized[target][target_spec["reveal_start"] : target_spec["reveal_end"] + 1]
            reveal = interpolate_sequence(reveal, REVEAL_FRAME_COUNT)
            bridge = [
                Image.blend(cover[-1], reveal[0], (index + 1) / (BRIDGE_FRAME_COUNT + 1))
                for index in range(BRIDGE_FRAME_COUNT)
            ]
            # All moving source frames are already aligned to the same foot
            # anchor. Re-centering the completed frames by the changing smoke
            # silhouette would reintroduce visible left/right drift.
            transition = cover + bridge + reveal
            save_apng(transition, TRANSITION_DIR / f"smoke_{source}_to_{target}.png")

    preview_names = ["casual", "student", "formal"]
    preview = Image.new("RGBA", (CANVAS[0] * 3, CANVAS[1] * 5), (248, 250, 248, 255))
    sample_indexes = [0, 5, 10, 15, 19]
    for column, outfit in enumerate(preview_names):
        spec = SHEETS[outfit]
        source = normalized[outfit][: spec["cover_end"] + 1]
        sampled = interpolate_sequence(source, COVER_FRAME_COUNT)
        for row, index in enumerate(sample_indexes):
            preview.alpha_composite(sampled[index], (column * CANVAS[0], row * CANVAS[1]))
    preview.save(ROOT / "public" / "avatar-smoke" / "smoke-preview.png")

    total_frames = COVER_FRAME_COUNT + BRIDGE_FRAME_COUNT + REVEAL_FRAME_COUNT
    print(f"Built 9 APNG transitions at {FRAME_DURATION_MS} ms × {total_frames} frames")


if __name__ == "__main__":
    main()
