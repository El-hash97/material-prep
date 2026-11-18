# MatPrep — Panduan Logo (ringkas)

## 1. Logo
- **Ide**: monogram **MP**. M dan P berbagi satu tiang; lubang P berbentuk kompartemen persegi, seperti kompartemen meja material. Evolusi dari kotak "MP" lama: wadah persegi dan amber tetap, huruf kini dikonstruksi sendiri (diagonal M tepat 60°, tangkai seragam), bukan font yang diketik.
- **Versi**: simbol · lockup horizontal · lockup bertumpuk · wordmark saja.
- **File** (`kit/`):

| Pakai untuk | File |
|---|---|
| Simbol berwarna (utama) | `matprep-symbol.svg` |
| Simbol ≤ 32 px (favicon, ikon kecil) | `matprep-symbol-small.svg` |
| Lockup horizontal di latar gelap / terang | `matprep-horizontal-on-dark.svg` · `matprep-horizontal-on-light.svg` |
| Lockup bertumpuk | `matprep-stacked-on-dark.svg` · `matprep-stacked-on-light.svg` |
| Wordmark saja | `matprep-wordmark.svg` |
| Satu warna (hitam, putih, amber) | `variants/*` |
| Web: favicon, ikon aplikasi, manifest | `web/*` (sudah dipasang di `matprep-app/public`) |

Semua master dihasilkan oleh `build_kit.py` dari satu sumber geometri. Ubah di sana, jangan edit SVG satu per satu.

## 2. Ruang bebas
Sisakan ruang kosong minimal **1 × lebar tiang M** (≈ 10 % lebar simbol) di semua sisi. Ruang ini ikut membesar bersama logo.

## 3. Ukuran minimum
| Versi | Layar | Cetak |
|---|---|---|
| Lockup horizontal | 120 px lebar | 30 mm lebar |
| Simbol | 16 px (pakai `-small`) | 6 mm |

Di bawah 32 px selalu pakai simbol versi `-small` (tangkai lebih tebal, lubang lebih besar).

## 4. Warna
| Nama | HEX | RGB | CMYK (perkiraan) | Pantone (terdekat) |
|---|---|---|---|---|
| Signal (amber) | `#F0A32A` | 240 163 42 | 0 32 83 6 | 7409 C |
| Iron 950 | `#090B0C` | 9 11 12 | 25 8 0 95 | Black 6 C |
| Paper | `#ECE9E2` | 236 233 226 | 0 1 4 7 | 9224 C |

Kontras huruf iron di atas amber: **9,4 : 1**. Nilai CMYK/Pantone adalah perkiraan; cocokkan dengan proof cetak.

**Pasangan yang disetujui**: simbol berwarna di latar gelap atau terang · wordmark paper di latar gelap · wordmark iron di latar terang · versi satu warna hitam/putih bila hanya ada satu tinta.

## 5. Tipografi
Wordmark adalah huruf yang dikonstruksi (path), bukan font. Teks antarmuka tetap Space Grotesk (judul/angka) dan Plus Jakarta Sans (isi), keduanya lisensi OFL.

## 6. Jangan
Jangan meregangkan atau memiringkan · jangan mengganti warna di luar palet · jangan memberi bayangan, garis tepi, gradien, atau efek · jangan mengubah susunan atau ukuran relatif bagian lockup · jangan mengetik ulang "MatPrep" dengan font sebagai pengganti wordmark · jangan memakai simbol besar di bawah 32 px.

## 7. Catatan serah terima
- Uji yang sudah dijalankan: audit SVG (98–100/100), render 512 px, uji piksel 16/32 px, satu warna, latar gelap/terang, mockup (website, tab, ikon aplikasi, signage, badge, kartu nama).
- Belum: pencarian merek dagang profesional (wajib sebelum dipakai di luar internal), file cetak PDF/AI/EPS.
- Presentasi: `presentation.html` dan `slides/*.png`. Konsep yang tidak dipilih: `*-v*.svg`, `concepts.png`.
