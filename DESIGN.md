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

| Token | Hex | Pakai |
|---|---|---|
| `iron-950` | `#090B0C` | latar halaman |
| `iron-900` | `#0D1012` | sidebar, input, well |
| `iron-850` | `#111518` | permukaan tile |
| `iron-800` | `#171C1F` | header tabel |
| `iron-700` | `#2B3439` | border kuat, scrollbar |
| `paper` | `#ECE9E2` | teks utama |
| `steel` | `#A7B0B3` | teks sekunder |
| `steel-dim` | `#7C8588` | label |
| `steel-faint` | `#5A6366` | metadata |
| `signal` | `#F0A32A` | aksi, waspada, aksen |
| `danger` | `#E2574C` | over-use, hapus |
| `success` | `#4DBE8A` | aman, selesai |
| `info` | `#6E9FE8` | informasi |

Warna produk: 2TR `#6E9FE8`, 1TR `#E2574C`, KAI `#F0A32A`, CRANK `#4DBE8A`, dengan versi `soft` rgba 0.16 untuk latar.

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
- Dashboard: grafik 8 kolom, status gentani 4 kolom; empat metrik 3 kolom; pareto 7, pengebonan 5; donut 5, aktivitas 7.
- Planning: info shift 4, input lot 8; sisa stok 5, visualisasi 7; tabel 12.
- Riwayat: filter 8, ringkasan 4; setiap bon 12.
- Pengaturan: rasio 5, ringkasan 7; kebutuhan material 12; ukuran karung 6, stok minimum 6; gentani 12.
- Sidebar desktop 236px (ciut 68px); mobile drawer 260px. Konten bergeser dengan margin yang sama.

## Komponen

- `tile` + `tile-head` + `tile-body`; judul memakai `tile-label`, metrik memakai `readout`.
- `page-head`: judul, subjudul, aksi kanan; garis bawah.
- `chip` untuk status ringan; `badge` untuk status bon/over-use.
- `segmented` untuk rentang waktu dan pilihan shift.
- Tombol: `btn-primary` amber, `btn-warning` amber outline, `btn-outline`, `btn-ghost`; ukuran `btn-sm`/`btn-xs`.
- Form: `form-control` gelap dengan fokus amber; `form-label` uppercase.
- Tabel: `data-table` + `table-header` + `table-row` + `table-foot`; angka rata kanan.
- `alert-*` untuk pesan; `meter` untuk gentani; `well` untuk blok dalam tile.
- Chart.js: batang amber, garis pareto merah, donut warna produk, grid `rgba(255,255,255,0.055)`, skala log dengan tick pangkat 10 saja.

## Gerak

- Transisi 150ms untuk kontrol, 500-700ms ease-out untuk meter dan chart.
- Tidak ada animasi masuk yang menghalangi; halaman langsung terbaca.
- `prefers-reduced-motion` belum ditangani khusus; hindari animasi dekoratif.

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
