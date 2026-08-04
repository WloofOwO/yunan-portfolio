from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "avatar-atlas-v3-source.png"
WALK_SOURCE = ROOT / "assets" / "walk-cycle-v6-bidirectional-source.png"
OUT = ROOT / "public" / "avatar-v2"
POSE_OUT = ROOT / "assets" / "avatar-v2-poses"
SHEET_OUT = OUT / "sheets"
CANVAS = (128, 160)
TARGET_HEIGHT = 134

POSES = [
    "idle", "blink", "walk_contact", "walk_passing",
    "start", "stop", "turn_left", "turn_right",
    "look", "glasses", "bag", "read",
    "type", "point", "wave", "celebrate",
]

ACTION_POSES = {
    "look": "look", "glasses": "glasses", "bag": "bag", "read": "read",
    "type": "type", "point": "point", "wave": "wave", "celebrate": "celebrate",
    "turn_left": "turn_left", "turn_right": "turn_right",
}

ACTION_FPS = {
    "idle": 8,
    "walk_right": 8, "walk_left": 8,
    "start_right": 12, "start_left": 12,
    "stop_right": 12, "stop_left": 12,
    "look": 12, "glasses": 12, "bag": 12, "read": 12,
    "type": 12, "point": 12, "wave": 12, "celebrate": 12,
    "turn_left": 12, "turn_right": 12,
}

ACTION_ROUTES = {
    "look": ["idle"] * 2 + ["blink"] + ["look"] * 12 + ["blink"] + ["idle"] * 2,
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


def largest_component(cell: Image.Image) -> Image.Image:
    alpha = cell.getchannel("A")
    pixels = alpha.load()
    width, height = cell.size
    seen = bytearray(width * height)
    components: list[list[tuple[int, int]]] = []

    for y in range(height):
        for x in range(width):
            idx = y * width + x
            if seen[idx] or pixels[x, y] < 56:
                continue
            stack = [(x, y)]
            seen[idx] = 1
            component: list[tuple[int, int]] = []
            while stack:
                px, py = stack.pop()
                component.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        ni = ny * width + nx
                        if not seen[ni] and pixels[nx, ny] >= 56:
                            seen[ni] = 1
                            stack.append((nx, ny))
            components.append(component)

    main = max(components, key=len)
    mask = Image.new("L", cell.size, 0)
    mask_pixels = mask.load()
    for x, y in main:
        mask_pixels[x, y] = pixels[x, y]
    cleaned = cell.copy()
    cleaned.putalpha(mask)
    return cleaned


def remove_magenta_key(image: Image.Image) -> Image.Image:
    """Remove the flat generation key before component extraction."""
    image = image.copy().convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, _ = pixels[x, y]
            keyed = r > 150 and b > 130 and g < 165 and r - g > 28 and b - g > 20
            pixels[x, y] = (r, g, b, 0 if keyed else 255)
    return image


def extract_cells(atlas: Image.Image) -> dict[str, Image.Image]:
    poses: dict[str, Image.Image] = {}
    for index, name in enumerate(POSES):
        col, row = index % 4, index // 4
        padding = 42
        left = max(0, round(atlas.width * col / 4) - padding)
        right = min(atlas.width, round(atlas.width * (col + 1) / 4) + padding)
        top = max(0, round(atlas.height * row / 4) - padding)
        bottom = min(atlas.height, round(atlas.height * (row + 1) / 4) + padding)
        cleaned = largest_component(atlas.crop((left, top, right, bottom)))
        bbox = cleaned.getchannel("A").getbbox()
        if not bbox:
            raise RuntimeError(f"Empty pose: {name}")
        poses[name] = cleaned.crop(bbox)
    return poses


def render_pose(sprite: Image.Image, scale: float) -> Image.Image:
    width = max(1, round(sprite.width * scale))
    height = max(1, round(sprite.height * scale))
    sprite = sprite.resize((width, height), Image.Resampling.NEAREST)
    alpha = sprite.getchannel("A")
    foot_band = alpha.crop((0, max(0, height - 18), width, height))
    foot_bbox = foot_band.getbbox()
    foot_center = (foot_bbox[0] + foot_bbox[2]) // 2 if foot_bbox else width // 2
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    x = CANVAS[0] // 2 - foot_center
    y = CANVAS[1] - height - 4
    canvas.alpha_composite(sprite, (x, y))
    return crispify(canvas)


def crispify(frame: Image.Image) -> Image.Image:
    """Hard alpha and a compact arcade palette: never blur or invent half pixels."""
    frame = frame.copy().convert("RGBA")
    pixels = frame.load()
    for y in range(CANVAS[1]):
        for x in range(CANVAS[0]):
            r, g, b, a = pixels[x, y]
            if a < 128:
                pixels[x, y] = (0, 0, 0, 0)
            else:
                pixels[x, y] = (
                    min(255, round(r / 16) * 16),
                    min(255, round(g / 16) * 16),
                    min(255, round(b / 16) * 16),
                    255,
                )
    return frame


def extract_generated_walk(source: Image.Image) -> dict[str, list[Image.Image]]:
    """Extract separately drawn right/left cycles with one invariant scale."""
    sprites: list[Image.Image] = []
    for index in range(16):
        col, row = index % 4, index // 4
        left = round(source.width * col / 4)
        right = round(source.width * (col + 1) / 4)
        top = round(source.height * row / 4)
        bottom = round(source.height * (row + 1) / 4)
        cell = source.crop((left, top, right, bottom)).convert("RGBA")
        pixels = cell.load()
        for y in range(cell.height):
            for x in range(cell.width):
                r, g, b, _ = pixels[x, y]
                # Keep subject edge pixels, remove only the saturated magenta key.
                alpha = 0 if r > 155 and b > 135 and g < 155 and r - g > 32 and b - g > 24 else 255
                pixels[x, y] = (r, g, b, alpha)
        cell = largest_component(cell)
        bbox = cell.getchannel("A").getbbox()
        if not bbox:
            raise RuntimeError(f"Empty generated walk frame: {index}")
        sprite = cell.crop(bbox)
        sprites.append(sprite)
    # A single scale is the key invariant: poses may change, character size may not.
    shared_scale = TARGET_HEIGHT / max(sprite.height for sprite in sprites)
    frames = [render_pose(sprite, shared_scale) for sprite in sprites]
    return {"right": frames[:8], "left": frames[8:]}


def main() -> None:
    atlas = remove_magenta_key(Image.open(SOURCE))
    source_poses = extract_cells(atlas)
    idle_height = source_poses["idle"].height
    scale = TARGET_HEIGHT / idle_height

    POSE_OUT.mkdir(parents=True, exist_ok=True)
    SHEET_OUT.mkdir(parents=True, exist_ok=True)
    rendered = {name: render_pose(sprite, scale) for name, sprite in source_poses.items()}
    for name, image in rendered.items():
        image.save(POSE_OUT / f"{name}.png", optimize=True)

    walk_frames = extract_generated_walk(Image.open(WALK_SOURCE).convert("RGBA"))
    idle = rendered["idle"]
    blink = rendered["blink"]
    idle_frames = [idle] * 18 + [blink, blink, idle, idle, idle, idle]
    start_right = [idle, idle, rendered["start"], rendered["start"], *walk_frames["right"][:6]]
    start_left = [idle, idle, walk_frames["left"][1], walk_frames["left"][1], *walk_frames["left"][:6]]
    stop_right = [*walk_frames["right"][4:], rendered["stop"], rendered["stop"], idle, idle, idle, idle]
    stop_left = [*walk_frames["left"][4:], walk_frames["left"][1], walk_frames["left"][1], idle, idle, idle, idle]
    sequences: dict[str, dict[str, object]] = {
        "idle": {"loop": True, "frames": idle_frames},
        "walk_right": {"loop": True, "frames": walk_frames["right"]},
        "walk_left": {"loop": True, "frames": walk_frames["left"]},
        "start_right": {"loop": False, "frames": start_right},
        "start_left": {"loop": False, "frames": start_left},
        "stop_right": {"loop": False, "frames": stop_right},
        "stop_left": {"loop": False, "frames": stop_left},
    }
    for action in ACTION_POSES:
        frames = [rendered[name] for name in ACTION_ROUTES[action]]
        sequences[action] = {"loop": False, "frames": frames}

    manifest = {}
    for action, config in sequences.items():
        action_dir = OUT / action
        if action_dir.exists():
            shutil.rmtree(action_dir)
        frames = config["frames"]
        sheet = Image.new("RGBA", (CANVAS[0] * len(frames), CANVAS[1]), (0, 0, 0, 0))
        for index, frame in enumerate(frames):
            sheet.alpha_composite(frame, (index * CANVAS[0], 0))
        sheet_path = SHEET_OUT / f"{action}.png"
        sheet.save(sheet_path, optimize=True)
        manifest[action] = {
            "fps": ACTION_FPS[action],
            "loop": config["loop"],
            "frame_count": len(frames),
            "sheet": f"/avatar-v2/sheets/{action}.png",
        }

    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Built {sum(item['frame_count'] for item in manifest.values())} frames across {len(manifest)} action sheets")


if __name__ == "__main__":
    main()
