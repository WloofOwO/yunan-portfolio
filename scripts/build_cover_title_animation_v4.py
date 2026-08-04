from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "cover-assets" / "atmosphere-frames-v3"
OUTPUT_DIR = ROOT / "public" / "cover-assets"
KEYFRAME_DIR = OUTPUT_DIR / "cover-v4-keyframes"

WORK_SIZE = (960, 540)
OUTPUT_SIZE = (1600, 900)
SCENE_STEPS = 32
SCENE_FRAME_MS = 105
LINE_FRAMES = 16
LINE_FRAME_MS = 42

TITLE_FONT = Path(r"C:\Windows\Fonts\ARIALN.TTF")
CTA_FONT = Path(r"C:\Windows\Fonts\msyhl.ttc")

INK = (38, 50, 57, 238)
INK_SOFT = (49, 63, 70, 184)
CTA_FILL = (221, 229, 230, 74)


def smoothstep(value: float) -> float:
    return value * value * (3.0 - 2.0 * value)


def load_scene(number: int) -> Image.Image:
    source = Image.open(SOURCE_DIR / f"frame-{number:02d}.png").convert("RGB")
    return source.resize(WORK_SIZE, Image.Resampling.LANCZOS)


def tracked_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str,
                 font: ImageFont.FreeTypeFont, fill: tuple[int, ...], tracking: int) -> list[tuple[int, int, int, int]]:
    x, y = xy
    boxes: list[tuple[int, int, int, int]] = []
    for character in text:
        bbox = draw.textbbox((x, y), character, font=font, anchor="lt")
        draw.text((x, y), character, font=font, fill=fill, anchor="lt")
        boxes.append(bbox)
        x += int(draw.textlength(character, font=font)) + tracking
    return boxes


def measure_tracked(draw: ImageDraw.ImageDraw, text: str,
                    font: ImageFont.FreeTypeFont, tracking: int) -> int:
    return sum(int(draw.textlength(c, font=font)) for c in text) + tracking * (len(text) - 1)


def title_geometry() -> tuple[list[tuple[int, int, int, int]], list[tuple[int, int, int]]]:
    probe = Image.new("RGBA", WORK_SIZE)
    draw = ImageDraw.Draw(probe)
    font = ImageFont.truetype(str(TITLE_FONT), 156)
    tracking = 43
    width = measure_tracked(draw, "YUNAN", font, tracking)
    start_x = (WORK_SIZE[0] - width) // 2
    boxes = []
    x = start_x
    for character in "YUNAN":
        bbox = draw.textbbox((x, 116), character, font=font, anchor="lt")
        boxes.append(bbox)
        x += int(draw.textlength(character, font=font)) + tracking

    # Each strand is anchored to a letter bottom. The base title never moves.
    lengths = (51, 30, 64, 39, 56, 28, 47, 34)
    anchors: list[tuple[int, int, int]] = []
    placements = ((0, .54), (1, .18), (1, .80), (2, .12), (2, .88), (3, .22), (3, .82), (4, .76))
    for (letter_index, ratio), length in zip(placements, lengths):
        left, top, right, bottom = boxes[letter_index]
        anchors.append((round(left + (right - left) * ratio), bottom - 5, length))
    return boxes, anchors


TITLE_BOXES, LINE_ANCHORS = title_geometry()


def draw_fixed_title(image: Image.Image) -> Image.Image:
    canvas = image.convert("RGBA")
    draw = ImageDraw.Draw(canvas)
    title_font = ImageFont.truetype(str(TITLE_FONT), 156)
    tracking = 43
    title_width = measure_tracked(draw, "YUNAN", title_font, tracking)
    tracked_text(draw, ((WORK_SIZE[0] - title_width) // 2, 116), "YUNAN", title_font, INK, tracking)

    cta = "开始探索  →"
    cta_font = ImageFont.truetype(str(CTA_FONT), 19)
    text_box = draw.textbbox((0, 0), cta, font=cta_font)
    text_width = text_box[2] - text_box[0]
    box_width, box_height = max(194, text_width + 52), 48
    left = (WORK_SIZE[0] - box_width) // 2
    top = 366
    draw.rectangle((left, top, left + box_width, top + box_height), fill=CTA_FILL, outline=INK_SOFT, width=1)
    draw.text((WORK_SIZE[0] // 2, top + box_height // 2 - 1), cta, font=cta_font,
              fill=INK_SOFT, anchor="mm")
    return canvas


def line_frame(progress: float) -> Image.Image:
    image = Image.new("RGBA", WORK_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    remaining = 1.0 - smoothstep(progress)
    for index, (x, y, full_length) in enumerate(LINE_ANCHORS):
        length = max(2, round(full_length * remaining))
        tone = (39, 52, 59, 156 if index % 2 else 184)
        draw.line((x, y, x, y + length), fill=tone, width=1)
        if length > 8:
            draw.point((x + (1 if index % 2 else -1), y + length), fill=(63, 76, 82, 105))
    return image.resize(OUTPUT_SIZE, Image.Resampling.NEAREST)


def save_line_animations() -> None:
    retract = [line_frame(step / (LINE_FRAMES - 1)) for step in range(LINE_FRAMES)]
    extend = list(reversed(retract))
    retract[0].save(OUTPUT_DIR / "cover-lines-retract-v4.png", save_all=True,
                    append_images=retract[1:], duration=LINE_FRAME_MS, loop=1,
                    disposal=1, blend=0, optimize=True)
    extend[0].save(OUTPUT_DIR / "cover-lines-extend-v4.png", save_all=True,
                   append_images=extend[1:], duration=LINE_FRAME_MS, loop=1,
                   disposal=1, blend=0, optimize=True)
    retract[0].save(OUTPUT_DIR / "cover-lines-idle-v4.png", optimize=True)


def build_scene_frames() -> list[Image.Image]:
    sources = [load_scene(1), load_scene(2), load_scene(3)]
    frames: list[Image.Image] = []
    KEYFRAME_DIR.mkdir(parents=True, exist_ok=True)

    # 3 source scenes x 32 transitions = 96 complete 1080p raster frames.
    # Title and CTA are painted at one fixed coordinate in every frame.
    for transition, (start, end) in enumerate(zip(sources, sources[1:] + sources[:1])):
        for step in range(SCENE_STEPS):
            progress = smoothstep(step / SCENE_STEPS)
            scene = Image.blend(start, end, progress)
            authored = draw_fixed_title(scene).convert("RGB")
            output = authored.resize(OUTPUT_SIZE, Image.Resampling.NEAREST)
            frames.append(output)
            if step in (0, 8, 16, 24):
                output.save(KEYFRAME_DIR / f"frame-{transition * 4 + step // 8 + 1:02d}.png", optimize=True)
    return frames


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    save_line_animations()
    frames = build_scene_frames()
    frames[0].save(OUTPUT_DIR / "cover-static-v4.png", optimize=True)
    frames[0].save(
        OUTPUT_DIR / "expedition-title-idle-v4.webp",
        save_all=True,
        append_images=frames[1:],
        duration=[SCENE_FRAME_MS] * len(frames),
        loop=0,
        format="WEBP",
        quality=86,
        method=0,
        minimize_size=False,
        allow_mixed=True,
    )
    print(f"Built {len(frames)} complete 1600x900 scene frames and {LINE_FRAMES}-frame line interactions")


if __name__ == "__main__":
    main()
