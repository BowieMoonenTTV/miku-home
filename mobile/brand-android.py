"""Replace Capacitor's default launcher icons and splash with Miku Home's icon.
Run after `npx cap add android`. Needs Pillow (pip install pillow)."""
from pathlib import Path
from PIL import Image

RES = Path("android/app/src/main/res")
SRC = Image.open("../app/icons/icon-512.png").convert("RGBA")
MASK = Image.open("../app/icons/maskable-512.png").convert("RGBA")
legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
for d, px in legacy.items():
    folder = RES / f"mipmap-{d}"
    SRC.resize((px, px), Image.LANCZOS).save(folder / "ic_launcher.png")
    SRC.resize((px, px), Image.LANCZOS).save(folder / "ic_launcher_round.png")
    fg = int(px * 108 / 48)
    MASK.resize((fg, fg), Image.LANCZOS).save(folder / "ic_launcher_foreground.png")
bg = RES / "values" / "ic_launcher_background.xml"
if bg.exists():
    bg.write_text('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#000000</color>\n</resources>\n')
for splash in RES.glob("drawable*/splash.png"):
    w, h = Image.open(splash).size
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    s = min(w, h) // 3
    canvas.paste(SRC.resize((s, s), Image.LANCZOS), ((w - s) // 2, (h - s) // 2), SRC.resize((s, s), Image.LANCZOS))
    canvas.convert("RGB").save(splash)
print("Branded launcher icons and splash screens")
