#!/usr/bin/env python3
"""Generate Android and iOS app icons/splash assets from the MzansiServe logo."""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
LOGO_PATH = ROOT / "src/assets/logo.jpeg"
MOBILE_ASSET_DIR = ROOT / "src/assets/mobile"
ICON_SOURCE_PATH = MOBILE_ASSET_DIR / "app-icon-source.png"
ANDROID_RES_DIR = ROOT / "android/app/src/main/res"
IOS_ASSETS_DIR = ROOT / "ios/App/App/Assets.xcassets"
EXPO_ASSET_DIR = ROOT.parent / "apps/mobile/assets"
PUBLIC_DIR = ROOT / "public"
WEB_MARK_PATH = ROOT / "src/assets/brand-mark.png"
GOOGLE_PLAY_ICON_PATH = MOBILE_ASSET_DIR / "app-icon-google-play-512.png"

WHITE = (255, 255, 255, 255)

ANDROID_ICON_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}


def is_non_white(pixel: tuple[int, int, int, int], threshold: int = 245) -> bool:
    r, g, b, a = pixel
    return a > 0 and (r < threshold or g < threshold or b < threshold)


def content_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    rgba = image.convert("RGBA")
    xs: list[int] = []
    ys: list[int] = []
    for y in range(rgba.height):
        for x in range(rgba.width):
            if is_non_white(rgba.getpixel((x, y))):
                xs.append(x)
                ys.append(y)

    if not xs or not ys:
        raise ValueError("Could not find non-white logo content in source image.")

    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1)


def trim_whitespace(image: Image.Image) -> Image.Image:
    return image.crop(content_bbox(image))


def split_mark_and_wordmark(image: Image.Image) -> int:
    rgba = image.convert("RGBA")
    row_counts: list[int] = []
    for y in range(rgba.height):
        count = 0
        for x in range(rgba.width):
            if is_non_white(rgba.getpixel((x, y))):
                count += 1
        row_counts.append(count)

    start = max(1, int(rgba.height * 0.45))
    end = max(start + 1, int(rgba.height * 0.9))
    split = min(range(start, end), key=row_counts.__getitem__)
    if row_counts[split] > max(row_counts) * 0.35:
        split = int(rgba.height * 0.78)
    return max(1, split - 6)


def resize_to_fit(image: Image.Image, max_width: int, max_height: int) -> Image.Image:
    ratio = min(max_width / image.width, max_height / image.height)
    new_size = (
        max(1, int(round(image.width * ratio))),
        max(1, int(round(image.height * ratio))),
    )
    return image.resize(new_size, Image.Resampling.LANCZOS)


def centered_canvas(
    artwork: Image.Image,
    canvas_size: tuple[int, int],
    background: tuple[int, int, int, int] = WHITE,
) -> Image.Image:
    canvas = Image.new("RGBA", canvas_size, background)
    left = (canvas.width - artwork.width) // 2
    top = (canvas.height - artwork.height) // 2
    canvas.alpha_composite(artwork, (left, top))
    return canvas


def load_logo_variants() -> tuple[Image.Image, Image.Image]:
    source = Image.open(LOGO_PATH).convert("RGBA")
    full_logo = trim_whitespace(source)
    if ICON_SOURCE_PATH.exists():
        emblem = trim_whitespace(Image.open(ICON_SOURCE_PATH).convert("RGBA"))
    else:
        split_row = split_mark_and_wordmark(full_logo)
        emblem = trim_whitespace(full_logo.crop((0, 0, full_logo.width, split_row)))
    return full_logo, emblem


def write_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG")


def render_icon_masters(full_logo: Image.Image, emblem: Image.Image) -> None:
    MOBILE_ASSET_DIR.mkdir(parents=True, exist_ok=True)

    icon_master = centered_canvas(
        resize_to_fit(emblem, 760, 760),
        (1024, 1024),
    )
    foreground_master = centered_canvas(
        resize_to_fit(emblem, 820, 820),
        (1024, 1024),
        background=(255, 255, 255, 0),
    )
    splash_master = centered_canvas(
        resize_to_fit(full_logo, 1140, 900),
        (2732, 2732),
    )

    write_png(icon_master, MOBILE_ASSET_DIR / "app-icon-master.png")
    write_png(foreground_master, MOBILE_ASSET_DIR / "app-icon-foreground-master.png")
    write_png(splash_master, MOBILE_ASSET_DIR / "splash-master.png")


def monochrome_icon(emblem: Image.Image, size: int) -> Image.Image:
    fitted = resize_to_fit(emblem.convert("RGBA"), int(size * 0.82), int(size * 0.82))
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    left = (size - fitted.width) // 2
    top = (size - fitted.height) // 2
    pixels = fitted.load()
    silhouette = Image.new("RGBA", fitted.size, (0, 0, 0, 0))
    target = silhouette.load()
    for y in range(fitted.height):
        for x in range(fitted.width):
            r, g, b, a = pixels[x, y]
            if a > 0 and (r < 245 or g < 245 or b < 245):
                target[x, y] = (0, 0, 0, a)
    result.alpha_composite(silhouette, (left, top))
    return result


def generate_shared_assets() -> None:
    full_logo, emblem = load_logo_variants()
    icon_master = centered_canvas(
        resize_to_fit(emblem, 760, 760),
        (1024, 1024),
    )
    splash_icon = centered_canvas(
        resize_to_fit(full_logo, 900, 760),
        (1024, 1024),
    )

    write_png(icon_master.convert("RGB"), EXPO_ASSET_DIR / "icon.png")
    write_png(
        icon_master.resize((512, 512), Image.Resampling.LANCZOS).convert("RGB"),
        GOOGLE_PLAY_ICON_PATH,
    )
    write_png(splash_icon, EXPO_ASSET_DIR / "splash-icon.png")
    write_png(icon_master.resize((192, 192), Image.Resampling.LANCZOS), EXPO_ASSET_DIR / "favicon.png")
    write_png(Image.new("RGBA", (512, 512), WHITE), EXPO_ASSET_DIR / "android-icon-background.png")
    write_png(
        centered_canvas(
            resize_to_fit(emblem, 820, 820),
            (1024, 1024),
            background=(255, 255, 255, 0),
        ),
        EXPO_ASSET_DIR / "android-icon-foreground.png",
    )
    write_png(monochrome_icon(emblem, 432), EXPO_ASSET_DIR / "android-icon-monochrome.png")

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    icon_master.resize((256, 256), Image.Resampling.LANCZOS).save(
        WEB_MARK_PATH,
        format="PNG",
        optimize=True,
    )
    icon_master.resize((256, 256), Image.Resampling.LANCZOS).save(
        PUBLIC_DIR / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (128, 128), (256, 256)],
    )


def generate_android_assets() -> None:
    full_logo, emblem = load_logo_variants()

    for density_dir, icon_size in ANDROID_ICON_SIZES.items():
        icon = centered_canvas(
            resize_to_fit(emblem, int(icon_size * 0.74), int(icon_size * 0.74)),
            (icon_size, icon_size),
        )
        foreground = centered_canvas(
            resize_to_fit(emblem, int(icon_size * 0.8), int(icon_size * 0.8)),
            (icon_size, icon_size),
            background=(255, 255, 255, 0),
        )

        target_dir = ANDROID_RES_DIR / density_dir
        write_png(icon, target_dir / "ic_launcher.png")
        write_png(icon, target_dir / "ic_launcher_round.png")
        write_png(foreground, target_dir / "ic_launcher_foreground.png")

    splash_targets = list(ANDROID_RES_DIR.glob("**/splash.png"))
    for splash_path in splash_targets:
        with Image.open(splash_path) as existing:
            splash = centered_canvas(
                resize_to_fit(
                    full_logo,
                    int(existing.width * 0.52),
                    int(existing.height * 0.34),
                ),
                existing.size,
            )
        write_png(splash, splash_path)

    render_icon_masters(full_logo, emblem)


def generate_ios_assets() -> None:
    full_logo, emblem = load_logo_variants()

    app_icon_path = IOS_ASSETS_DIR / "AppIcon.appiconset" / "AppIcon-512@2x.png"
    icon = centered_canvas(
        resize_to_fit(emblem, 760, 760),
        (1024, 1024),
    )
    write_png(icon.convert("RGB"), app_icon_path)

    for splash_path in (IOS_ASSETS_DIR / "Splash.imageset").glob("*.png"):
        with Image.open(splash_path) as existing:
            splash = centered_canvas(
                resize_to_fit(
                    full_logo,
                    int(existing.width * 0.42),
                    int(existing.height * 0.34),
                ),
                existing.size,
            )
        write_png(splash, splash_path)

    render_icon_masters(full_logo, emblem)


def main() -> None:
    if not LOGO_PATH.exists():
        raise FileNotFoundError(f"Logo source not found: {LOGO_PATH}")

    generate_android_assets()
    generate_ios_assets()
    generate_shared_assets()

    generated_paths: Iterable[Path] = (
        MOBILE_ASSET_DIR / "app-icon-master.png",
        MOBILE_ASSET_DIR / "app-icon-foreground-master.png",
        MOBILE_ASSET_DIR / "splash-master.png",
        IOS_ASSETS_DIR / "AppIcon.appiconset" / "AppIcon-512@2x.png",
        EXPO_ASSET_DIR / "icon.png",
        GOOGLE_PLAY_ICON_PATH,
        WEB_MARK_PATH,
        PUBLIC_DIR / "favicon.ico",
    )
    print("Generated branded mobile assets:")
    for path in generated_paths:
        print(f" - {path.relative_to(ROOT.parent)}")


if __name__ == "__main__":
    main()
