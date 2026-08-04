from __future__ import annotations

import json
import shutil
from pathlib import Path
from statistics import median

import cv2
import numpy as np
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "avatar-v3"
CANVAS = (128, 160)
SAFE = 6
INTERPOLATION_SAFE = 9
GROUND_Y = 153
OUTPUT_CORE_HEIGHT = 127
POSES = [
    "idle", "blink", "walk_contact", "walk_passing",
    "start", "stop", "turn_left", "turn_right",
    "look", "glasses", "bag", "read",
    "type", "point", "wave", "celebrate",
]
OUTFITS = {
    "casual": {
        "actions": ROOT / "assets" / "avatar-atlas-v3-source.png",
        "walk_v35": ROOT / "assets" / "walk-casual-two-step-v35-alpha.png",
        "right": ROOT / "assets" / "walk-casual-right-v3-source.png",
        "right_mid": ROOT / "assets" / "walk-casual-right-inbetweens-v1-source.png",
        "left": ROOT / "assets" / "walk-casual-left-v2-source.png",
        "left_mid": ROOT / "assets" / "walk-casual-left-inbetweens-v1-source.png",
    },
    "student": {
        "actions": ROOT / "assets" / "avatar-student-action-v1-source.png",
        "walk_v35": ROOT / "assets" / "walk-student-two-step-v35-alpha.png",
        "right": ROOT / "assets" / "walk-student-right-v1-source.png",
        "right_mid": ROOT / "assets" / "walk-student-right-inbetweens-v1-source.png",
        "left": ROOT / "assets" / "walk-student-left-v1-source.png",
        "left_mid": ROOT / "assets" / "walk-student-left-inbetweens-v1-source.png",
    },
    "formal": {
        "actions": ROOT / "assets" / "avatar-formal-action-v1-source.png",
        "walk_v35": ROOT / "assets" / "walk-formal-two-step-v35-alpha.png",
        "right": ROOT / "assets" / "walk-formal-right-v2-source.png",
        "right_mid": ROOT / "assets" / "walk-formal-right-inbetweens-v1-source.png",
        "left": ROOT / "assets" / "walk-formal-left-v2-source.png",
        "left_mid": ROOT / "assets" / "walk-formal-left-inbetweens-v1-source.png",
    },
}
WARDROBE_SOURCES = {
    "casual": ROOT / "assets" / "wardrobe-casual-v1-source.png",
    "student": ROOT / "assets" / "wardrobe-student-v1-source.png",
    "formal": ROOT / "assets" / "wardrobe-formal-v1-source.png",
}
WARDROBE_MID_SOURCES = {
    "casual": ROOT / "assets" / "wardrobe-casual-inbetweens-v1-source.png",
    "student": ROOT / "assets" / "wardrobe-student-inbetweens-v1-source.png",
    "formal": ROOT / "assets" / "wardrobe-formal-inbetweens-v1-source.png",
}
GENERATED_WALK_SOURCES = [
    ROOT / "assets" / "walk-cycle-natural-left-alpha.png",
    # Opposite anatomical lead foot, generated from the same locked character
    # sheet. The previous second strip repeated nearly the same leg overlap,
    # so the two-step cycle still read as one foot leading twice.
    ROOT / "assets" / "walk-cycle-opposite-v3-alpha.png",
]
GENERATED_WALK_ROWS = {"casual": 0, "student": 1, "formal": 2}
WARDROBE_CANVAS = (320, 208)
WARDROBE_BOOTH_HEIGHT = 172
WARDROBE_BOOTH_ANCHOR = (237, 197)
ACTION_FPS = {
    "idle": 6, "walk_right": 12, "walk_left": 12,
    "start_right": 12, "start_left": 12, "stop_right": 12, "stop_left": 12,
    "look": 10, "glasses": 10, "bag": 10, "read": 10, "type": 10,
    "point": 10, "wave": 10, "celebrate": 10, "turn_left": 10, "turn_right": 10,
}
# The generated in-between atlases are not indexed as temporal midpoints.
# These audited cyclic orders minimize silhouette/torso discontinuities while
# retaining every distinct drawing. Each cycle is rotated near idle below so
# start and stop transitions share the quietest part of the gait.
WALK_FRAME_ORDERS = {
    ("casual", "left"): [15, 23, 29, 22, 19, 16, 18, 21, 31, 27, 28, 30, 24, 26, 25, 20, 9, 17, 14, 7, 5, 8, 10, 12, 11, 3, 0, 2, 1, 4, 6, 13],
    ("casual", "right"): [17, 13, 11, 8, 9, 23, 29, 25, 19, 27, 31, 5, 7, 28, 2, 21, 24, 26, 10, 16, 14, 12, 3, 15, 18, 20, 22, 0, 30, 4, 6, 1],
    ("student", "left"): [29, 28, 31, 30, 8, 2, 0, 1, 3, 5, 7, 4, 6, 25, 10, 16, 12, 14, 23, 22, 15, 17, 19, 21, 20, 18, 26, 24, 13, 27, 9, 11],
    ("student", "right"): [14, 18, 16, 13, 15, 11, 20, 6, 4, 10, 1, 5, 29, 27, 21, 17, 23, 28, 26, 30, 24, 25, 31, 19, 0, 8, 2, 7, 22, 9, 3, 12],
    ("formal", "left"): [6, 5, 31, 17, 21, 10, 27, 13, 30, 26, 28, 20, 18, 22, 0, 24, 8, 25, 29, 15, 4, 2, 3, 7, 16, 14, 9, 1, 23, 19, 11, 12],
    ("formal", "right"): [7, 2, 30, 0, 5, 1, 11, 24, 22, 28, 23, 15, 26, 18, 12, 29, 21, 19, 27, 31, 17, 4, 13, 6, 10, 16, 25, 8, 14, 20, 3, 9],
}
# Cyclic orders computed only from each outfit's single original 16-drawing
# atlas.  Unlike WALK_FRAME_ORDERS these never cross into an independently
# redrawn in-between set, so hands, sleeves and accessories remain coherent.
BASE_WALK_ORDERS = {
    "casual": [14, 4, 3, 2, 15, 0, 8, 7, 10, 6, 13, 11, 9, 1, 5, 12],
    "student": [4, 3, 1, 2, 5, 7, 8, 9, 10, 15, 14, 13, 6, 11, 12, 0],
    "formal": [6, 7, 13, 5, 2, 10, 1, 3, 4, 8, 0, 12, 15, 14, 11, 9],
}
WALK_V35_FACES = {"casual": "left", "student": "right", "formal": "right"}
ACTION_ROUTES = {
    # One click produces one readable action arc. The old alternating
    # blink/look route visibly repeated the same movement six times.
    "look": ["idle"] * 2 + ["blink"] + ["look"] * 9 + ["blink"] + ["idle"] * 5,
    "glasses": ["idle"] * 2 + ["look"] * 3 + ["glasses"] * 8 + ["look"] * 3 + ["idle"] * 2,
    "bag": ["idle"] * 2 + ["stop"] * 3 + ["bag"] * 8 + ["stop"] * 3 + ["idle"] * 2,
    "read": ["idle"] * 2 + ["look"] * 2 + ["read"] * 10 + ["look"] * 2 + ["idle"] * 2,
    "type": ["idle"] * 2 + ["read"] * 3 + ["type"] * 8 + ["read"] * 3 + ["idle"] * 2,
    "point": ["idle"] * 2 + ["look"] * 2 + ["point"] * 10 + ["look"] * 2 + ["idle"] * 2,
    "wave": ["idle"] * 2 + ["point"] * 2 + ["wave"] * 10 + ["point"] * 2 + ["idle"] * 2,
    "celebrate": ["idle"] * 2 + ["wave"] * 3 + ["celebrate"] * 8 + ["wave"] * 3 + ["idle"] * 2,
    "turn_left": ["idle"] * 2 + ["stop"] * 2 + ["turn_left"] * 10 + ["stop"] * 2 + ["idle"] * 2,
    "turn_right": ["idle"] * 2 + ["stop"] * 2 + ["turn_right"] * 10 + ["stop"] * 2 + ["idle"] * 2,
}


def remove_key(image: Image.Image, deep: bool = False) -> Image.Image:
    image = image.convert("RGBA")
    px = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = px[x, y]
            # The source key is vivid magenta. Keep burgundy/purple artwork such
            # as curtains, graduation-cap edges and tassels fully opaque.
            keyed = (
                r > 135 and b > 125 and g < 110
                and abs(r - b) < 80 and r - g > 60 and b - g > 60
            )
            if deep:
                keyed = keyed or (g <= 16 and r >= 64 and b >= 64 and abs(r - b) < 48)
            # Preserve alpha from already chroma-keyed v35 sources instead of
            # turning their transparent background opaque again.
            px[x, y] = (r, g, b, 0 if keyed else a)
    return image


def largest_component(cell: Image.Image) -> Image.Image:
    alpha = cell.getchannel("A")
    pixels, width, height = alpha.load(), cell.width, cell.height
    seen = bytearray(width * height)
    components: list[list[tuple[int, int]]] = []
    for y in range(height):
        for x in range(width):
            index = y * width + x
            if seen[index] or pixels[x, y] < 56:
                continue
            stack, component = [(x, y)], []
            seen[index] = 1
            while stack:
                px, py = stack.pop()
                component.append((px, py))
                for nx, ny in ((px-1, py), (px+1, py), (px, py-1), (px, py+1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        ni = ny * width + nx
                        if not seen[ni] and pixels[nx, ny] >= 56:
                            seen[ni] = 1
                            stack.append((nx, ny))
            components.append(component)
    if not components:
        raise RuntimeError("No character component found")
    main = max(components, key=len)
    mask = Image.new("L", cell.size, 0)
    out = mask.load()
    for x, y in main:
        out[x, y] = pixels[x, y]
    cleaned = cell.copy()
    cleaned.putalpha(mask)
    return cleaned


def extract_grid(path: Path, names: list[str]) -> list[Image.Image]:
    source = remove_key(Image.open(path))
    sprites = []
    for index, name in enumerate(names):
        col, row = index % 4, index // 4
        box = (
            round(source.width * col / 4), round(source.height * row / 4),
            round(source.width * (col + 1) / 4), round(source.height * (row + 1) / 4),
        )
        cell = largest_component(source.crop(box))
        bbox = cell.getchannel("A").getbbox()
        if not bbox:
            raise RuntimeError(f"Empty {name} in {path.name}")
        sprites.append(cell.crop(bbox))
    return sprites


def crispify(frame: Image.Image) -> Image.Image:
    frame = frame.convert("RGBA")
    pixels = frame.load()
    for y in range(frame.height):
        for x in range(frame.width):
            r, g, b, a = pixels[x, y]
            pixels[x, y] = (0, 0, 0, 0) if a < 128 else (
                min(255, round(r / 16) * 16), min(255, round(g / 16) * 16),
                min(255, round(b / 16) * 16), 255,
            )
    return frame


def lower_body_anchor_x(sprite: Image.Image) -> float:
    """Return a stable body-axis pivot from the head, independent of stepping feet."""
    alpha = sprite.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return sprite.width / 2
    left, top, right, bottom = bbox
    # Anchoring to the lower 30% made the whole character move backwards every
    # time the support foot changed. The head/cap band follows the torso axis
    # and stays stable while arms, legs, robe and bag move around it.
    band_bottom = min(bottom, top + max(10, round((bottom - top) * .28)))
    xs = sorted(
        x for y in range(top, band_bottom) for x in range(left, right)
        if alpha.getpixel((x, y)) >= 56
    )
    return float(median(xs)) if xs else (left + right) / 2


def normalize_sprite_height(sprite: Image.Image, target_height: int) -> Image.Image:
    """Normalize separately generated walk frames to the outfit's standing size."""
    if sprite.height == target_height:
        return sprite
    scale = target_height / sprite.height
    return sprite.resize((max(1, round(sprite.width * scale)), target_height), Image.Resampling.NEAREST)


def core_body_height(sprite: Image.Image) -> int:
    """Measure foot-to-head scale through the body axis, ignoring extended arms."""
    alpha = sprite.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return sprite.height
    anchor_x = lower_body_anchor_x(sprite)
    half_band = max(4, round(sprite.height * .08))
    x0, x1 = max(0, round(anchor_x - half_band)), min(sprite.width, round(anchor_x + half_band + 1))
    occupied_y = [
        y for y in range(bbox[1], bbox[3])
        if any(alpha.getpixel((x, y)) >= 56 for x in range(x0, x1))
    ]
    return bbox[3] - min(occupied_y) if occupied_y else bbox[3] - bbox[1]


def normalize_sprite_core_height(sprite: Image.Image, target_height: int) -> Image.Image:
    current_height = core_body_height(sprite)
    if current_height == target_height:
        return sprite
    scale = target_height / current_height
    return sprite.resize(
        (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
        Image.Resampling.NEAREST,
    )


def head_width(sprite: Image.Image) -> int:
    """Measure the head/cap band so generated in-betweens cannot pulse in size."""
    alpha = sprite.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return sprite.width
    top, bottom = bbox[1], bbox[3]
    band_bottom = min(bottom, top + max(10, round((bottom - top) * .30)))
    xs = [
        x for y in range(top, band_bottom) for x in range(bbox[0], bbox[2])
        if alpha.getpixel((x, y)) >= 56
    ]
    return max(xs) - min(xs) + 1 if xs else bbox[2] - bbox[0]


def normalize_sprite_head_width(sprite: Image.Image, target_width: int) -> Image.Image:
    current_width = head_width(sprite)
    if current_width == target_width:
        return sprite
    scale_x = target_width / current_width
    return sprite.resize(
        (max(1, round(sprite.width * scale_x)), sprite.height),
        Image.Resampling.NEAREST,
    )


def largest_alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    pixels = alpha.load()
    seen = bytearray(image.width * image.height)
    largest: list[tuple[int, int]] = []
    for y in range(image.height):
        for x in range(image.width):
            key = y * image.width + x
            if seen[key] or pixels[x, y] == 0:
                continue
            stack, component = [(x, y)], []
            seen[key] = 1
            while stack:
                px, py = stack.pop()
                component.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < image.width and 0 <= ny < image.height:
                        item = ny * image.width + nx
                        if not seen[item] and pixels[nx, ny] != 0:
                            seen[item] = 1
                            stack.append((nx, ny))
            if len(component) > len(largest):
                largest = component
    if not largest:
        raise RuntimeError("No opaque component found")
    return (
        min(x for x, _ in largest), min(y for _, y in largest),
        max(x for x, _ in largest) + 1, max(y for _, y in largest) + 1,
    )


def normalize_detached_person(frame: Image.Image, target_height: int = 172) -> Image.Image:
    """Match a detached exit character to the established wardrobe scale/baseline."""
    alpha = frame.getchannel("A")
    pixels = alpha.load()
    seen = bytearray(frame.width * frame.height)
    components: list[list[tuple[int, int]]] = []
    for y in range(frame.height):
        for x in range(frame.width):
            key = y * frame.width + x
            if seen[key] or pixels[x, y] == 0:
                continue
            stack, component = [(x, y)], []
            seen[key] = 1
            while stack:
                px, py = stack.pop()
                component.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < frame.width and 0 <= ny < frame.height:
                        item = ny * frame.width + nx
                        if not seen[item] and pixels[nx, ny] != 0:
                            seen[item] = 1
                            stack.append((nx, ny))
            components.append(component)
    components.sort(key=len, reverse=True)
    if len(components) < 2:
        return frame
    person = components[1]
    left, top = min(x for x, _ in person), min(y for _, y in person)
    right, bottom = max(x for x, _ in person) + 1, max(y for _, y in person) + 1
    # Ignore detached tassel/edge fragments. A real full-body person component
    # is tall, substantial, and sits left of the booth.
    if len(person) < 1200 or bottom - top < 96 or left > round(frame.width * .55):
        return frame
    if abs((bottom - top) - target_height) <= 2:
        return frame
    layer = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    for x, y in person:
        layer.putpixel((x, y), frame.getpixel((x, y)))
        frame.putpixel((x, y), (0, 0, 0, 0))
    crop = layer.crop((left, top, right, bottom))
    scale = target_height / crop.height
    crop = crop.resize((max(1, round(crop.width * scale)), target_height), Image.Resampling.NEAREST)
    center_x = (left + right) / 2
    frame.alpha_composite(crop, (round(center_x - crop.width / 2), WARDROBE_BOOTH_ANCHOR[1] - target_height))
    return frame


def render(sprite: Image.Image, scale: float) -> Image.Image:
    anchor_x = lower_body_anchor_x(sprite)
    size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
    sprite = sprite.resize(size, Image.Resampling.NEAREST)
    frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    paste_x = round(CANVAS[0] / 2 - anchor_x * scale)
    frame.alpha_composite(sprite, (paste_x, GROUND_Y - size[1]))
    frame = crispify(frame)
    bbox = frame.getchannel("A").getbbox()
    if bbox and bbox[3] != GROUND_Y:
        aligned = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        aligned.alpha_composite(frame, (0, GROUND_Y - bbox[3]))
        frame = aligned
    return frame


def rotate_cycle_near_idle(frames: list[Image.Image], idle: Image.Image) -> list[Image.Image]:
    """Start a cyclic gait at its closest-to-idle pose without changing order."""
    idle_alpha = list(idle.getchannel("A").getdata())
    distances = [
        sum(abs(a - b) for a, b in zip(frame.getchannel("A").getdata(), idle_alpha))
        for frame in frames
    ]
    pivot = min(range(len(frames)), key=distances.__getitem__)
    return frames[pivot:] + frames[:pivot]


_FLOW_CACHE: dict[tuple[int, int], tuple[np.ndarray, np.ndarray]] = {}


def _motion_gray(rgba: np.ndarray) -> np.ndarray:
    """Build a flow image that gives transparent pixel-art edges useful weight."""
    alpha = rgba[:, :, 3].astype(np.float32) / 255.0
    composite = rgba[:, :, :3].astype(np.float32) * alpha[:, :, None]
    gray = cv2.cvtColor(composite.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    return cv2.addWeighted(gray, 0.72, rgba[:, :, 3], 0.28, 0)


def motion_interpolate(first: Image.Image, second: Image.Image, amount: float) -> Image.Image:
    """Create one motion-compensated in-between instead of a double-exposed dissolve."""
    if amount <= 0.0001:
        return first.copy()
    if amount >= 0.9999:
        return second.copy()
    first_rgba = np.asarray(first.convert("RGBA"), dtype=np.uint8)
    second_rgba = np.asarray(second.convert("RGBA"), dtype=np.uint8)
    cache_key = (id(first), id(second))
    if cache_key not in _FLOW_CACHE:
        first_gray = _motion_gray(first_rgba)
        second_gray = _motion_gray(second_rgba)
        forward = cv2.calcOpticalFlowFarneback(first_gray, second_gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        backward = cv2.calcOpticalFlowFarneback(second_gray, first_gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        _FLOW_CACHE[cache_key] = (forward, backward)
    forward, backward = _FLOW_CACHE[cache_key]
    height, width = first_rgba.shape[:2]
    grid_x, grid_y = np.meshgrid(np.arange(width, dtype=np.float32), np.arange(height, dtype=np.float32))

    def warp(rgba: np.ndarray, flow: np.ndarray, progress: float) -> np.ndarray:
        alpha = rgba[:, :, 3:4].astype(np.float32) / 255.0
        premultiplied = np.concatenate((rgba[:, :, :3].astype(np.float32) * alpha, rgba[:, :, 3:4]), axis=2)
        return cv2.remap(
            premultiplied,
            grid_x - flow[:, :, 0] * progress,
            grid_y - flow[:, :, 1] * progress,
            cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=0,
        )

    warped_first = warp(first_rgba, forward, amount)
    warped_second = warp(second_rgba, backward, 1.0 - amount)
    mixed = warped_first * (1.0 - amount) + warped_second * amount
    alpha = np.clip(mixed[:, :, 3:4], 0, 255)
    rgb = np.divide(mixed[:, :, :3] * 255.0, alpha, out=np.zeros_like(mixed[:, :, :3]), where=alpha > 0.5)
    output = np.concatenate((np.clip(rgb, 0, 255), alpha), axis=2).astype(np.uint8)
    return Image.fromarray(output, "RGBA")


def temporal_resample(frames: list[Image.Image], output_count: int) -> list[Image.Image]:
    """Resample a motion path with unique, motion-compensated intermediate images."""
    if output_count <= 1 or len(frames) <= 1:
        return [frames[0].copy()]
    result: list[Image.Image] = []
    for index in range(output_count):
        position = index * (len(frames) - 1) / (output_count - 1)
        lower = int(position)
        upper = min(len(frames) - 1, lower + 1)
        result.append(motion_interpolate(frames[lower], frames[upper], position - lower))
    return result


def temporal_resample_nearest(frames: list[Image.Image], output_count: int) -> list[Image.Image]:
    """Increase timeline density without double-exposing two character silhouettes."""
    if output_count <= 1 or len(frames) <= 1:
        return [frames[0].copy()]
    return [
        frames[round(index * (len(frames) - 1) / (output_count - 1))].copy()
        for index in range(output_count)
    ]


def extract_generated_walk(outfit: str) -> list[Image.Image]:
    """Extract two continuous 14-drawing steps into one natural 28-frame gait."""
    row = GENERATED_WALK_ROWS[outfit]
    frames: list[Image.Image] = []
    for part, path in enumerate(GENERATED_WALK_SOURCES):
        source = Image.open(path).convert("RGBA")
        y0 = round(source.height * row / 3)
        y1 = round(source.height * (row + 1) / 3)
        strip = source.crop((0, y0, source.width, y1))
        alpha = strip.getchannel("A")
        active_columns = [
            sum(alpha.getpixel((x, y)) > 16 for y in range(strip.height)) > 5
            for x in range(strip.width)
        ]
        runs: list[tuple[int, int]] = []
        start: int | None = None
        for x, active in enumerate([*active_columns, False]):
            if active and start is None:
                start = x
            elif not active and start is not None:
                runs.append((start, x))
                start = None
        if len(runs) != 14:
            raise RuntimeError(f"{outfit}/generated-walk/{part}: expected 14 drawings, found {len(runs)}")
        for column, (left, right) in enumerate(runs):
            cell = strip.crop((max(0, left - 3), 0, min(strip.width, right + 3), strip.height))
            bbox = cell.getchannel("A").getbbox()
            if not bbox:
                raise RuntimeError(f"{outfit}/generated-walk/{part * 14 + column}: empty frame")
            frames.append(cell.crop(bbox))
    return frames


def extract_alternating_walk(outfit: str, sources: dict[str, Path], side: str) -> list[Image.Image]:
    """Load the audited 32-drawing gait with opposite leading feet."""
    base = extract_grid(sources[side], [f"{side}-{index}" for index in range(16)])
    mid = extract_grid(sources[f"{side}_mid"], [f"{side}-mid-{index}" for index in range(16)])
    combined = [*base, *mid]
    order = WALK_FRAME_ORDERS[(outfit, side)]
    return [combined[index] for index in order]


def extract_true_two_step_walk(outfit: str, sources: dict[str, Path]) -> list[Image.Image]:
    """Build one coherent two-step cycle from a single drawing set per step.

    Do not interleave the separately generated ``*_mid`` atlases here. Their
    hands, sleeves and bag straps were redrawn independently and therefore
    flickered every other frame.  Each anatomical step now comes from one
    audited base atlas; temporal interpolation happens only after every key
    drawing has been rendered on the shared fixed canvas.
    """
    base = extract_grid(sources["walk_v35"], [f"walk-v35-{index}" for index in range(16)])
    order = BASE_WALK_ORDERS[outfit]
    if len(order) != 16 or len(set(order)) != 16:
        raise RuntimeError(f"{outfit}: incomplete base walk order {order}")
    ordered = [base[index] for index in order]
    return ordered if WALK_V35_FACES[outfit] == "left" else [ImageOps.mirror(frame) for frame in ordered]


def validate(frame: Image.Image, label: str) -> None:
    bbox = frame.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError(f"{label}: empty frame")
    left, top, right, bottom = bbox
    if left < SAFE or top < SAFE or CANVAS[0] - right < SAFE or CANVAS[1] - bottom < SAFE:
        raise RuntimeError(f"{label}: unsafe edge margin {bbox}")
    if bottom != GROUND_Y:
        raise RuntimeError(f"{label}: ground mismatch {bottom} != {GROUND_Y}")


def align_rendered_ground(frame: Image.Image) -> Image.Image:
    """Return a rendered frame translated onto the shared foot baseline."""
    bbox = frame.getchannel("A").getbbox()
    if not bbox or bbox[3] == GROUND_Y:
        return frame
    aligned = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    aligned.alpha_composite(frame, (0, GROUND_Y - bbox[3]))
    return aligned


def round_flat_head_cap(frame: Image.Image) -> Image.Image:
    """Remove the generated square roof on the formal pointing hairstyle."""
    result = frame.copy()
    alpha = result.getchannel("A")
    # Find the hair crown inside the central head band. Raised hands and long
    # pointing arms may define the full sprite bbox, so using that bbox's left
    # edge previously edited empty space instead of the actual hairstyle.
    crown: tuple[int, int, int] | None = None
    for y in range(16, 66):
        active = [x for x in range(40, 88) if alpha.getpixel((x, y)) > 20]
        if len(active) >= 8:
            crown = (y, min(active), max(active) + 1)
            break
    if not crown:
        return result
    top, left, right = crown
    if right - left < 22:
        return result
    # Only touch the first four silhouette rows. The progressive inset turns
    # the 24-pixel straight edge into a rounded hair crown while retaining all
    # facial, arm and suit pixels below it.
    for row, inset in enumerate((7, 4, 2, 1)):
        y = top + row
        row_active = [x for x in range(40, 88) if alpha.getpixel((x, y)) > 20]
        if not row_active:
            continue
        row_left, row_right = min(row_active), max(row_active) + 1
        for x in range(row_left, min(row_right, row_left + inset)):
            result.putpixel((x, y), (0, 0, 0, 0))
        for x in range(max(row_left, row_right - inset), row_right):
            result.putpixel((x, y), (0, 0, 0, 0))
    return result


def restore_formal_hair_crown(frame: Image.Image) -> Image.Image:
    """Restore a small rounded crown above formal poses with a flat hair cap."""
    result = frame.copy()
    alpha = result.getchannel("A")
    crown: tuple[int, int, int] | None = None
    for y in range(16, 66):
        active = [x for x in range(40, 88) if alpha.getpixel((x, y)) > 20]
        if len(active) >= 18:
            crown = (y, min(active), max(active) + 1)
            break
    if not crown:
        return result
    top, left, right = crown
    if top < 3 or right - left < 22:
        return result

    # Extend rather than shave the silhouette.  Reusing pixels from the first
    # two hair rows keeps the native palette and pixel texture intact.
    for rise, inset, source_y in (
        (4, 10, top),
        (3, 7, top),
        (2, 4, top),
        (1, 2, min(top + 1, CANVAS[1] - 1)),
    ):
        target_y = top - rise
        for x in range(left + inset, right - inset):
            source = result.getpixel((x, source_y))
            if source[3] > 20:
                result.putpixel((x, target_y), source)
    return result


def build_outfit(outfit: str, sources: dict[str, Path]) -> dict[str, dict[str, object]]:
    action_sprites = extract_grid(sources["actions"], POSES)
    standing_core_height = core_body_height(action_sprites[0])
    # Every independently generated pose is normalized by the stable vertical
    # body axis. This prevents point/wave/project actions from appearing to
    # zoom while keeping each drawing's native aspect ratio intact.
    action_sprites = [normalize_sprite_core_height(sprite, standing_core_height) for sprite in action_sprites]

    # Build 16 coherent key drawings (eight per anatomical step), then mirror
    # the complete cycle for the other screen direction.  A fixed scale and
    # foot baseline are applied before high-frame-rate temporal resampling.
    left_sprites = [
        normalize_sprite_core_height(sprite, standing_core_height)
        for sprite in extract_true_two_step_walk(outfit, sources)
    ]
    right_sprites = [ImageOps.mirror(sprite) for sprite in left_sprites]
    every = action_sprites + right_sprites + left_sprites
    left_extent = max(lower_body_anchor_x(sprite) for sprite in every)
    right_extent = max(sprite.width - lower_body_anchor_x(sprite) for sprite in every)
    scale = min(
        (CANVAS[0] / 2 - INTERPOLATION_SAFE) / left_extent,
        (CANVAS[0] / 2 - INTERPOLATION_SAFE) / right_extent,
        (GROUND_Y - INTERPOLATION_SAFE) / max(s.height for s in every),
        OUTPUT_CORE_HEIGHT / standing_core_height,
    )
    actions = dict(zip(POSES, [render(sprite, scale) for sprite in action_sprites]))
    # Keep the generated hair silhouette intact.  The former formal-only
    # crown cleanup removed the upper hair rows and read as a clipped head in
    # raised-arm poses such as celebrate.
    if outfit == "formal":
        actions = {name: restore_formal_hair_crown(frame) for name, frame in actions.items()}
    left_keys = [render(sprite, scale) for sprite in left_sprites]
    right_keys = [ImageOps.mirror(frame) for frame in left_keys]
    # 64 unique frames at 24 fps: two complete, slow steps in 2.667 seconds.
    # Appending the first key closes the loop without a last-to-first jump.
    left = [align_rendered_ground(frame) for frame in temporal_resample([*left_keys, left_keys[0]], 64)]
    right = [align_rendered_ground(frame) for frame in temporal_resample([*right_keys, right_keys[0]], 64)]
    idle, blink = actions["idle"], actions["blink"]
    sequences: dict[str, list[Image.Image]] = {
        "idle": [idle] * 18 + [blink, blink] + [idle] * 4,
        "walk_right": right, "walk_left": left,
        "start_right": [idle, actions["start"], *right[:6]],
        "start_left": [idle, actions["start"], *left[:6]],
        "stop_right": [*right[-6:], actions["stop"], idle],
        "stop_left": [*left[-6:], actions["stop"], idle],
    }
    for action, route in ACTION_ROUTES.items():
        sequences[action] = [actions[name] for name in route]

    sheet_dir = OUT / outfit / "sheets"
    if sheet_dir.parent.exists():
        shutil.rmtree(sheet_dir.parent)
    sheet_dir.mkdir(parents=True)
    manifest: dict[str, dict[str, object]] = {}
    for action, frames in sequences.items():
        for index, frame in enumerate(frames):
            validate(frame, f"{outfit}/{action}/{index}")
        sheet = Image.new("RGBA", (CANVAS[0] * len(frames), CANVAS[1]), (0, 0, 0, 0))
        for index, frame in enumerate(frames):
            sheet.alpha_composite(frame, (index * CANVAS[0], 0))
        sheet.save(sheet_dir / f"{action}.png", optimize=True)
        manifest[action] = {
            "fps": ACTION_FPS[action], "loop": action in {"idle", "walk_left", "walk_right"},
            "frame_count": len(frames), "sheet": f"/avatar-v3/{outfit}/sheets/{action}.png",
        }
    animated_dir = OUT / outfit / "animated"
    animated_dir.mkdir(parents=True, exist_ok=True)
    for action, frames in sequences.items():
        direct_frames = list(frames)
        if action != "idle":
            direct_frames.extend([direct_frames[-1]] * 5)
        frame_duration = round(1000 / ACTION_FPS[action])
        direct_frames[0].save(
            animated_dir / f"{action}.png",
            save_all=True,
            append_images=direct_frames[1:],
            duration=frame_duration,
            loop=0 if action == "idle" else 1,
            disposal=1,
            blend=0,
            optimize=False,
        )
    for side, walk in (("right", right), ("left", left)):
        # One 32-frame cycle is one left-leading and one right-leading step.
        # Play it once, then settle at the next project.
        # Keep the anticipation and settle short. The earlier ten-frame holds
        # made the APNG wait for 720 ms at both ends while the page translation
        # used a separate ease curve, so the feet and body visibly disagreed.
        # Three frames gives the eye a clean contact pose without turning one
        # two-step walk into a stop-start sequence.
        motion_frames = walk
        animated = motion_frames
        animated[0].save(
            animated_dir / f"travel_{side}.png",
            save_all=True,
            append_images=animated[1:],
            duration=42,
            loop=1,
            disposal=1,
            blend=0,
            optimize=False,
        )
        manifest[f"travel_{side}"] = {
            "fps": 24,
            "loop": False,
            "frame_count": len(motion_frames),
            "duration_ms": 2667,
            "sheet": f"/avatar-v3/{outfit}/animated/travel_{side}.png",
        }
    return manifest


def build_wardrobe(outfit: str, source_path: Path, mid_source_path: Path) -> dict[str, object]:
    """Build the integrated person + curtain scene without per-frame recentering."""
    source_cells: list[list[Image.Image]] = []
    for path in (source_path, mid_source_path):
        source = remove_key(Image.open(path), deep=True)
        cells: list[Image.Image] = []
        for index in range(16):
            col, row = index % 4, index // 4
            box = (
                round(source.width * col / 4), round(source.height * row / 4),
                round(source.width * (col + 1) / 4), round(source.height * (row + 1) / 4),
            )
            cells.append(source.crop(box))
        source_cells.append(cells)
    # The generated intermediate atlas is not a simple cell-for-cell midpoint
    # sheet. Blindly zipping both atlases makes the character jump out of the
    # booth and then back inside. Use a visually audited chronological route:
    # enter and close with the current outfit, then open and exit with the
    # target outfit. The final source row is intentionally read in reverse so
    # the detached character keeps moving away from the booth.
    entry_sequence = [
        (0, 0), (1, 0), (0, 1), (1, 1),
        (0, 2), (1, 2), (0, 3), (1, 3),
        (1, 4), (0, 4), (1, 5), (0, 5),
        (1, 6), (0, 6), (1, 7), (0, 8),
    ]
    if outfit == "casual":
        exit_opening = [
            (0, 8), (1, 8), (0, 9), (1, 9),
            (1, 10), (0, 10), (1, 11), (0, 11),
        ]
    elif outfit == "formal":
        exit_opening = [
            (0, 8), (1, 8), (1, 9), (0, 9),
            (0, 10), (1, 10), (0, 11), (1, 11),
        ]
    else:
        exit_opening = [
            (0, 8), (1, 8), (0, 9), (1, 9),
            (0, 10), (1, 10), (0, 11), (1, 11),
        ]
    exit_walking = [
        (1, 15), (0, 15),
        (1, 14), (0, 14), (1, 13), (0, 13),
        (1, 12), (0, 12),
    ]
    sequence = entry_sequence + exit_opening + exit_walking
    integrated_cells = [source_cells[source_index][cell_index] for source_index, cell_index in sequence]
    frames: list[Image.Image] = []
    for index, cell in enumerate(integrated_cells):
        # Resize the complete cell with one shared transform. Never crop to the
        # visible pixels: that would make the booth and character teleport.
        cell = cell.resize((WARDROBE_CANVAS[1], WARDROBE_CANVAS[1]), Image.Resampling.NEAREST)
        frame = Image.new("RGBA", WARDROBE_CANVAS, (0, 0, 0, 0))
        frame.alpha_composite(cell, ((WARDROBE_CANVAS[0] - cell.width) // 2, 0))
        frame = crispify(frame)
        # Some generated rows slightly overlap the nominal cell boundary. Drop
        # only tiny edge-connected bleed; preserve the full booth, character,
        # cap and tassel components.
        alpha = frame.getchannel("A")
        pixels = alpha.load()
        seen = bytearray(frame.width * frame.height)
        for y in range(frame.height):
            for x in range(frame.width):
                key = y * frame.width + x
                if seen[key] or pixels[x, y] == 0:
                    continue
                stack, component = [(x, y)], []
                seen[key] = 1
                while stack:
                    px, py = stack.pop()
                    component.append((px, py))
                    for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                        if 0 <= nx < frame.width and 0 <= ny < frame.height:
                            item = ny * frame.width + nx
                            if not seen[item] and pixels[nx, ny] != 0:
                                seen[item] = 1
                                stack.append((nx, ny))
                touches_top = any(py == 0 for _, py in component)
                if len(component) < 40 or (touches_top and len(component) < 1000):
                    for px, py in component:
                        frame.putpixel((px, py), (0, 0, 0, 0))
        # The generated booth changes scale and position across atlas rows.
        # Register the complete integrated scene from the booth's largest solid
        # component so curtain, character and floor remain one stable bitmap.
        booth_box = largest_alpha_bbox(frame)
        booth_height = booth_box[3] - booth_box[1]
        register_scale = WARDROBE_BOOTH_HEIGHT / booth_height
        registered_size = (
            max(1, round(frame.width * register_scale)),
            max(1, round(frame.height * register_scale)),
        )
        registered_source = frame.resize(registered_size, Image.Resampling.NEAREST)
        registered = Image.new("RGBA", WARDROBE_CANVAS, (0, 0, 0, 0))
        paste_x = WARDROBE_BOOTH_ANCHOR[0] - round(booth_box[2] * register_scale)
        paste_y = WARDROBE_BOOTH_ANCHOR[1] - round(booth_box[3] * register_scale)
        registered.alpha_composite(registered_source, (paste_x, paste_y))
        frame = registered
        # Generated wardrobe atlases used different person scales by outfit.
        # Normalize every clearly detached entrance/exit character to one
        # shared height; do not enlarge only the formal outfit.
        if index in (0, 1) or index >= 24:
            frame = normalize_detached_person(frame, target_height=160)
        bbox = frame.getchannel("A").getbbox()
        if not bbox:
            raise RuntimeError(f"{outfit}/wardrobe/{index}: empty frame")
        if bbox[0] < 4 or bbox[1] < 4 or bbox[2] > WARDROBE_CANVAS[0] - 4 or bbox[3] > WARDROBE_CANVAS[1] - 4:
            raise RuntimeError(f"{outfit}/wardrobe/{index}: crop risk {bbox}")
        frames.append(frame)

    sheet = Image.new("RGBA", (WARDROBE_CANVAS[0] * len(frames), WARDROBE_CANVAS[1]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * WARDROBE_CANVAS[0], 0))
    sheet_path = OUT / outfit / "sheets" / "wardrobe.png"
    sheet.save(sheet_path, optimize=True)
    return {"fps": 16, "loop": False, "frame_count": len(frames), "sheet": f"/avatar-v3/{outfit}/sheets/wardrobe.png"}


def build_wardrobe_animations() -> None:
    transition_dir = OUT / "transitions"
    if transition_dir.exists():
        shutil.rmtree(transition_dir)
    transition_dir.mkdir(parents=True)
    wardrobe_frames: dict[str, list[Image.Image]] = {}
    for outfit in OUTFITS:
        sheet = Image.open(OUT / outfit / "sheets" / "wardrobe.png").convert("RGBA")
        wardrobe_frames[outfit] = [
            sheet.crop((index * WARDROBE_CANVAS[0], 0, (index + 1) * WARDROBE_CANVAS[0], WARDROBE_CANVAS[1]))
            for index in range(32)
        ]
    for source in OUTFITS:
        for target in OUTFITS:
            # Frame 10 reaches back out after the character is already inside;
            # frames 24-31 wander away and then back toward the booth. Omitting
            # those reversals keeps one continuous enter/change/exit direction.
            # Frames 5, 7, 8 and 9 turn the head/body back toward the viewer.
            # Close the curtain across a strictly forward-moving subset so the
            # person never visibly twists while entering the booth.
            # Use only the genuinely drawn key/in-between poses. Frames 8-10
            # contain the unwanted turn-back, while 24-31 walk away and return.
            entry_keys = [wardrobe_frames[source][index] for index in (0, 1, 2, 3, 4, 5, 6, 7, 11, 12)]
            exit_keys = [wardrobe_frames[target][index] for index in range(16, 24)]
            # The old APNG repeated every drawing twice. Although the file
            # reported 20 fps, the body only changed at roughly 10 fps. Use
            # motion-compensated unique frames for a continuous 30 fps path.
            entry_motion = temporal_resample(entry_keys, 32)
            exit_motion = temporal_resample(exit_keys, 28)
            closed_bridge = temporal_resample([entry_motion[-1], exit_motion[0]], 9)[1:-1]
            # A single continuous three-second change: enter, a very short
            # fully-covered bridge, then exit. Do not inflate this sequence to
            # 120 nearest-neighbour frames—the uneven duplicates made the same
            # drawing linger for different lengths and produced visible jerks.
            animated = [
                *entry_motion,
                *closed_bridge,
                *exit_motion,
                # The final 560 ms overlaps the CSS crossfade into the normal
                # avatar. Its canvas, booth and person remain completely fixed.
                *([exit_motion[-1]] * 17),
            ]
            grounded: list[Image.Image] = []
            for frame in animated:
                frame = frame.copy()
                frame.paste((0, 0, 0, 0), (0, WARDROBE_BOOTH_ANCHOR[1], WARDROBE_CANVAS[0], WARDROBE_CANVAS[1]))
                grounded.append(frame)
            animated = grounded
            if len(animated) != 84 or any(frame.size != WARDROBE_CANVAS for frame in animated):
                raise RuntimeError(f"{source}->{target}: invalid wardrobe timeline")
            animated[0].save(
                transition_dir / f"wardrobe_{source}_to_{target}.png",
                save_all=True,
                append_images=animated[1:],
                duration=33,
                loop=1,
                disposal=1,
                blend=0,
                optimize=False,
            )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifests = {outfit: build_outfit(outfit, sources) for outfit, sources in OUTFITS.items()}
    for outfit, source in WARDROBE_SOURCES.items():
        manifests[outfit]["wardrobe"] = build_wardrobe(outfit, source, WARDROBE_MID_SOURCES[outfit])
    build_wardrobe_animations()
    (OUT / "manifest.json").write_text(json.dumps(manifests, ensure_ascii=False, indent=2), encoding="utf-8")
    total = sum(item["frame_count"] for manifest in manifests.values() for item in manifest.values())
    print(f"Built {total} safe frames across {len(manifests)} outfits; ground={GROUND_Y}, margin>={SAFE}px")


if __name__ == "__main__":
    main()
