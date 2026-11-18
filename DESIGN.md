# Design

<!-- impeccable:design-schema 1 -->

## Arah

Dark industrial control panel. Permukaan besi gelap, tipografi rapat, angka besar sebagai fokus, dan aksen amber hanya untuk tindakan atau peringatan. Komposisi memakai bento grid 12 kolom: setiap layar adalah satu papan operasi, bukan kumpulan kartu generik.

## Prinsip

1. Angka dulu, label kemudian. Pembacaan utama memakai `readout` besar.
2. Satu aksen tindakan: amber. Merah untuk over-use/destruktif, hijau untuk aman/selesai, biru untuk informasi.
3. Kepadatan tinggi tetapi berirama: tile besar untuk grafik, tile kecil untuk metrik, tabel untuk detail.
4. Warna produk konsisten di seluruh aplikasi; jangan pakai warna produk untuk status.
5. Garis rambut dan bayangan dalam, bukan bayangan melayang. Tidak ada glassmorphism.

## Token

### Warna

Semua rasio diukur (WCAG 2.x). Target: teks ≥ 4.5:1, batas komponen UI ≥ 3:1. Tile solid (tanpa alfa) agar rasio bisa diprediksi.

**Permukaan (elevasi naik, hue baja dingin)**

| Token | Hex | Pakai |
|---|---|---|
| `iron-950` | `#090B0C` | latar halaman |
| `iron-900` | `#0E1214` | sidebar, input, `well` |
| `iron-850` | `#14191C` | tile, card |
| `iron-800` | `#1B2125` | header tabel, tooltip, permukaan raised |
| `iron-750` | `#222A2E` | hover (jangan beri teks `steel-faint`: hanya 4.1:1) |
| `iron-700` | `#2C353A` | track meter, scrollbar (dekoratif) |
| `iron-600` | `#3A444A` | scrollbar hover |
| `iron-500` | `#59636A` | border input, 3.1:1 di `iron-900` |

Garis rambut `white/[0.06–0.08]` hanya pemisah dekoratif; komponen yang bisa diisi wajib border `iron-500`.

**Teks (rasio di tile / raised)**

| Token | Hex | Rasio | Pakai |
|---|---|---|---|
| `paper` | `#ECE9E2` | 14.6 / 13.4 | teks utama, angka, sorotan data |
| `steel` | `#B3BBBE` | 9.1 / 8.3 | teks sekunder |
| `steel-dim` | `#959EA2` | 6.5 / 6.0 | label, judul tile |
| `steel-faint` | `#808A8E` | 5.0 / 4.6 | metadata, satuan, tick sumbu (terendah yang lolos AA) |

**Aksen dan status (rasio di tile; teks di atasnya selalu `iron-950`)**

| Token | Hex | Rasio | Teks `iron-950` di atasnya | Pakai |
|---|---|---|---|---|
| `signal` | `#F0A32A` | 8.4 | 9.4 | tombol aksi, fokus, waspada |
| `danger` | `#EB6A5F` | 5.7 | 6.4 | over-use, kritis, hapus |
| `success` | `#4DBE8A` | 7.6 | 8.5 | aman, selesai |
| `info` | `#7AA8EE` | 7.3 | n/a | informasi |

Teks status di atas tint 10% warnanya sendiri tetap ≥ 5.0:1. Status selalu disertai ikon + teks, tidak pernah warna saja.

**Produk (kategorikal):** 2TR `#3987E5`, 1TR `#D55181`, KAI `#9085E9`, CRANK `#199E70`, dengan versi `soft` rgba 0.16 untuk latar. Tervalidasi CVD di tile `#14191C`, urutan tetap. Warna produk hanya untuk swatch, bar, dan border; nama produk ditulis `paper` (1TR cuma 4.2:1 di raised). Pengecualian: judul produk ≥ 24px (teks besar, cukup 3:1).

### Tipografi

- UI/body: **Barlow** 400/500/600/700.
- Display/angka/label: **Barlow Condensed** 500/600/700.
- Judul halaman 34-40px, judul tile 10px uppercase tracking 0.2em, readout 28-40px, body 13-14px, metadata 10-11px.
- Angka selalu `tabular-nums`.

### Bentuk dan ruang

- Radius tile 5px, kontrol 4px, badge 3px. Tidak ada radius pil kecuali meter/chip bulat.
- Border 1px `rgba(255,255,255,0.08)`; pemisah internal `0.06`.
- Grid gap 12px; padding tile 16px; padding halaman 16px mobile, 28px desktop; lebar maksimum 1480px.
- Bayangan: inset highlight 1px + drop 30px sangat gelap; tanpa glow.

## Layout

- `.bento`: 1 kolom di mobile, 12 kolom di `md`.
- Dashboard: header (status shift + satu aksi kontekstual) → strip "perlu tindakan" → 4 KPI dengan delta → stok material 8 + meja 3D 4 (dimuat saat diklik) → gentani 7 + tren harian 5 → mix produksi 5 + aktivitas 7. Data dari `lib/dashboard.js` (`buildDashboard`).
- Planning: info shift 4, input lot 8; sisa stok 5, visualisasi 7; tabel 12.
- Riwayat: filter 8, ringkasan 4; setiap bon 12.
- Pengaturan: rasio 5, ringkasan 7; kebutuhan material 12; ukuran karung 6, stok minimum 6; gentani 12.
- Sidebar desktop 236px (ciut 68px); mobile drawer 260px. Konten bergeser dengan margin yang sama.

## Komponen

- `tile` + `tile-head` + `tile-body`; judul memakai `tile-label`, metrik memakai `readout`.
- `page-head`: judul, subjudul, aksi kanan; garis bawah.
- `chip` untuk status ringan; `badge` untuk status bon/over-use.
- `segmented` untuk rentang waktu dan pilihan shift.
- Tombol: `btn-primary` amber, `btn-success` hijau, `btn-danger` merah (semua teks `iron-950`), `btn-warning` amber outline, `btn-outline`, `btn-ghost`; ukuran `btn-sm`/`btn-xs`. Fokus keyboard: outline amber 2px offset 2px.
- Form: `form-control` di `iron-900` dengan border `iron-500` (3:1) dan fokus amber; `form-label` uppercase.
- Tabel: `data-table` + `table-header` + `table-row` + `table-foot`; angka rata kanan.
- `alert-*` untuk pesan; `meter` untuk gentani; `well` untuk blok dalam tile.
- Visualisasi: satu sumbu y linear; tanpa skala log, sumbu ganda, atau donut. Data biasa abu baja, sorotan `paper`; merah/amber/hijau hanya untuk status (selalu dengan ikon + teks). Bar status (stok, gentani) memakai HTML/CSS; Chart.js hanya untuk tren harian. Grid `rgba(255,255,255,0.055)`.

## Gerak

- Transisi 150ms untuk kontrol, 500-700ms ease-out untuk meter dan chart.
- Tidak ada animasi masuk yang menghalangi; halaman langsung terbaca.
- Animasi masuk data: bar/meter tumbuh dari kiri (`.anim-grow`, stagger 40ms via `--i`), sparkline tergambar (`.anim-draw`), angka KPI menghitung naik ±700ms, kolom tren Chart.js stagger hanya saat pertama tampil. Hanya transform/stroke; nilai akhir selalu ada di DOM.
- `prefers-reduced-motion: reduce` mematikan semua animasi di atas (CSS + JS). Hindari animasi dekoratif.

## Responsif

- Tile selalu full width di mobile; jangan memaksa 2 kolom untuk data padat kecuali metrik pendek.
- Tabel lebar menggulir horizontal di dalam tile, dengan petunjuk geser di mobile.
- Target sentuh minimum 40px untuk aksi utama; ikon hapus diberi area tombol.
- Sidebar menjadi drawer; topbar mobile menampilkan merek dan status lokal.

## Cetak

- `#print-area` hanya tampil saat print; sidebar, topbar, dan `.no-print` disembunyikan.
- Latar putih, teks hitam; tabel dan angka tetap terbaca.

## Jangan

- Jangan memakai gradien dekoratif, grid-line background, atau glow.
- Jangan memakai warna produk untuk status.
- Jangan menambah kartu di dalam kartu; gunakan `well` atau pemisah.
- Jangan memakai teks abu di atas amber; gunakan `iron-950`.
- Jangan mengubah alur, label Indonesia, atau data default tanpa alasan produk.

## Berkas Acuan

- `matprep-app/src/index.css` — seluruh kelas sistem.
- `matprep-app/tailwind.config.js` — token warna, font, animasi.
- `matprep-app/src/constants/defaults.js` — produk dan warna produk.
