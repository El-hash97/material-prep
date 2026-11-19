"""Buat ikon browser dari dx-team-logo.jpg (logo DX Team Digitalization).

Jalankan dari folder ini:  python build_favicon.py [folder_tujuan]
Latar putih dihapus dengan menelusuri dari tepi gambar (flood fill), tepi dihaluskan, lalu logo dipusatkan
di kanvas persegi. Butuh Pillow. Default tujuan: ../../../matprep-app/public
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).parent
SRC = HERE / "dx-team-logo.jpg"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent.parent.parent / "matprep-app" / "public"
BG_DARK = (9, 11, 12)  # iron-950: latar untuk ikon yang tidak boleh transparan (apple-touch, maskable)


def cutout(src):
    """Hapus latar putih yang tersambung ke tepi gambar; kembalikan RGBA dipotong rapat ke bentuk logo."""
    rgb = src.convert("RGB")
    w, h = rgb.size
    work = rgb.copy()
    marker = (255, 0, 255)
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    for s in seeds:
        if work.getpixel(s) != marker and sum(work.getpixel(s)) > 720:
            ImageDraw.floodfill(work, s, marker, thresh=60)
    # alpha: 0 untuk piksel latar, 255 untuk logo; kikis 2 px agar halo putih JPEG hilang, lalu haluskan
    alpha = Image.new("L", (w, h), 255)
    mpx, apx = work.load(), alpha.load()
    for y in range(h):
        for x in range(w):
            if mpx[x, y] == marker:
                apx[x, y] = 0
    alpha = alpha.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.1))
    rgba = rgb.convert("RGBA")
    rgba.putalpha(alpha)
    return rgba.crop(rgba.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())


def square(img, size, pad=0.0, bg=None):
    """Pusatkan img di kanvas size×size dengan margin pad (pecahan), latar bg (None = transparan)."""
    inner = round(size * (1 - 2 * pad))
    k = inner / max(img.size)
    r = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (*bg, 255) if bg else (0, 0, 0, 0))
    canvas.alpha_composite(r, ((size - r.width) // 2, (size - r.height) // 2))
    return canvas


def small(img, size):
    """Ukuran ≤ 48 px: unduh bertahap (kualitas) + sedikit penajaman agar huruf DX tidak melebur."""
    big = square(img, size * 4, pad=0.02)
    out = big.resize((size, size), Image.LANCZOS)
    return out.filter(ImageFilter.UnsharpMask(radius=0.8, percent=90, threshold=2))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    logo = cutout(Image.open(SRC))
    print("logo dipotong:", logo.size)
    s16, s32, s48 = (small(logo, n) for n in (16, 32, 48))
    s16.save(OUT / "favicon-16.png")
    s32.save(OUT / "favicon-32.png")
    s48.save(OUT / "favicon-48.png")
    s48.save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=[s32, s16])
    square(logo, 192, pad=0.02).save(OUT / "icon-192.png")
    square(logo, 512, pad=0.02).save(OUT / "icon-512.png")
    square(logo, 180, pad=0.08, bg=BG_DARK).convert("RGB").save(OUT / "apple-touch-icon.png")
    square(logo, 512, pad=0.2, bg=BG_DARK).convert("RGB").save(OUT / "maskable-512.png")
    for f in sorted(OUT.glob("*.png")) + [OUT / "favicon.ico"]:
        print(f.name, f.stat().st_size, "B")
