"""Generator master logo MatPrep (arah A: monogram MP). Python murni, tanpa dependensi.

Jalankan dari folder ini:  python build_kit.py   → menulis kit/*.svg
Semua geometri ada di sini supaya simbol, versi kecil, wordmark, dan lockup tetap konsisten.
"""
from pathlib import Path

AMBER = "#F0A32A"   # signal (token aplikasi)
IRON = "#090B0C"    # iron-950
PAPER = "#ECE9E2"   # paper
OUT = Path(__file__).parent / "kit"

CONTAINER = "M64 16 H192 A48 48 0 0 1 240 64 V192 A48 48 0 0 1 192 240 H64 A48 48 0 0 1 16 192 V64 A48 48 0 0 1 64 16 Z"
CONTAINER_SMALL = "M56 16 H200 A40 40 0 0 1 240 56 V200 A40 40 0 0 1 200 240 H56 A40 40 0 0 1 16 200 V56 A40 40 0 0 1 56 16 Z"

# Huruf MP di wadah 256: M dan P berbagi tiang tengah; diagonal M tepat 60°; lubang P = kompartemen persegi.
# Dinaikkan 2 px dari pusat geometris (pusat optis).
LETTERS = ("M40 64 H66 L93 110.77 L120 64 H148 V184 H120 V109 L93 155.77 L66 109 V184 H40 Z "
           "M148 64 H170 A46 46 0 0 1 170 156 H148 Z M148 90 V130 H190 V90 Z")
# Versi kecil (≤ 32 px): tangkai 30, diagonal lebih tebal, lubang lebih besar, sudut wadah lebih kecil.
LETTERS_SMALL = ("M36 64 H66 L91 107.3 L116 64 H146 V184 H116 V116 L91 159.3 L66 116 V184 H36 Z "
                 "M146 64 H170 A50 50 0 0 1 170 164 H146 Z M146 92 V136 H192 V92 Z")

# Wordmark "MatPrep": tinggi kapital 120 (y 36–156), x-height 88 (68–156), turunan sampai 192, tangkai 22.
# Setiap huruf satu kontur tanpa tumpang tindih → aman untuk fill-rule evenodd.
WORDMARK = " ".join([
    # M (0–104), diagonal 60°
    "M0 36 H22 L52 87.96 L82 36 H104 V156 H82 V74.1 L52 126.1 L22 74.1 V156 H0 Z",
    # a satu tingkat: cakram + tiang kanan, lubang bundar menempel tiang (116–204)
    "M182 68 H204 V156 H182 V150.1 A44 44 0 1 1 182 73.9 Z M138 112 A22 22 0 1 0 182 112 A22 22 0 1 0 138 112 Z",
    # t (216–262)
    "M226 44 H248 V68 H262 V88 H248 V156 H226 V88 H216 V68 H226 Z",
    # P dengan lubang kompartemen persegi, sama dengan simbol (276–360)
    "M276 36 H298 V156 H276 Z M298 36 H318 A42 42 0 0 1 318 120 H298 Z M298 58 V98 H338 V58 Z",
    # r (374–456)
    "M374 68 H426 A30 30 0 0 1 456 98 V100 H434 V98 A8 8 0 0 0 426 90 H396 V156 H374 Z",
    # e: cincin + palang, bukaan kanan bawah (468–556)
    "M545.71 140.28 A44 44 0 1 1 555.07 121 L491.91 121 A22 22 0 0 0 528.85 126.14 Z M491.91 103 A22 22 0 0 1 532.09 103 Z",
    # p (568–656)
    "M568 68 H590 V73.9 A44 44 0 1 1 590 150.1 V192 H568 Z M590 112 A22 22 0 1 0 634 112 A22 22 0 1 0 590 112 Z",
])
WM_W, WM_TOP, WM_CAP_BOTTOM, WM_BOTTOM = 656, 36, 156, 192


def svg(view_box, body, title="MatPrep"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" role="img" aria-label="{title}">\n'
            f"  <title>{title}</title>\n{body}\n</svg>\n")


def symbol_colour(small=False, at=""):
    c, l = (CONTAINER_SMALL, LETTERS_SMALL) if small else (CONTAINER, LETTERS)
    return f'  <g{at}><path fill="{AMBER}" d="{c}"/><path fill="{IRON}" fill-rule="evenodd" d="{l}"/></g>'


def symbol_knockout(small=False, fill="#000"):
    c, l = (CONTAINER_SMALL, LETTERS_SMALL) if small else (CONTAINER, LETTERS)
    return f'  <path fill="{fill}" fill-rule="evenodd" d="{c} {l}"/>'


def wordmark(fill, s=1.0, dx=0.0, dy=0.0):
    return f'  <path fill="{fill}" fill-rule="evenodd" transform="translate({dx:g} {dy:g}) scale({s:g})" d="{WORDMARK}"/>'


def main():
    OUT.mkdir(exist_ok=True)
    files = {
        "matprep-symbol.svg": svg("0 0 256 256", symbol_colour(), "MatPrep"),
        "matprep-symbol-small.svg": svg("0 0 256 256", symbol_colour(small=True), "MatPrep"),
        "matprep-symbol-knockout.svg": svg("0 0 256 256", symbol_knockout(), "MatPrep"),
        "matprep-symbol-small-knockout.svg": svg("0 0 256 256", symbol_knockout(small=True), "MatPrep"),
        "matprep-wordmark.svg": svg(f"-4 {WM_TOP - 6} {WM_W + 8} {WM_BOTTOM - WM_TOP + 12}", wordmark("#000"), "MatPrep"),
    }
    # Lockup horizontal: tinggi kapital wordmark = 0,44 × simbol; dipusatkan ke tengah tinggi kapital.
    s = 112 / (WM_CAP_BOTTOM - WM_TOP)
    dy = 128 - (WM_TOP + WM_CAP_BOTTOM) / 2 * s
    width = 256 + 52 + WM_W * s
    for name, word in [("on-dark", PAPER), ("on-light", IRON)]:
        files[f"matprep-horizontal-{name}.svg"] = svg(
            f"0 0 {width:.1f} 256", symbol_colour() + "\n" + wordmark(word, s, 256 + 52, dy))
    files["matprep-horizontal-knockout.svg"] = svg(
        f"0 0 {width:.1f} 256", symbol_knockout() + "\n" + wordmark("#000", s, 256 + 52, dy))
    # Lockup bertumpuk: wordmark selebar 1,7 × simbol di bawahnya.
    s2 = 256 * 1.7 / WM_W
    sw = WM_W * s2
    x_sym = (sw - 256) / 2
    y_word = 256 + 44 - WM_TOP * s2
    height = 256 + 44 + (WM_BOTTOM - WM_TOP) * s2
    for name, word in [("on-dark", PAPER), ("on-light", IRON)]:
        files[f"matprep-stacked-{name}.svg"] = svg(
            f"0 0 {sw:.1f} {height:.1f}",
            symbol_colour(at=f' transform="translate({x_sym:g} 0)"') + "\n" + wordmark(word, s2, 0, y_word))
    for fname, text in files.items():
        (OUT / fname).write_text(text, encoding="utf-8")
        print("wrote", OUT / fname)


if __name__ == "__main__":
    main()
