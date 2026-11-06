# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Operator dan supervisor persiapan material di Divisi Casting PT Toyota Motor Manufacturing Indonesia (TMMIN). Mereka bekerja di lantai produksi, berpindah antar-shift Red/White, dan membutuhkan angka persediaan yang bisa dipercaya saat serah terima shift.

## Product Purpose

MatPrep menghitung kebutuhan bon material dari jumlah lot kecil per produk, memantau pemakaian aktual terhadap batas gentani, meneruskan sisa stok ke shift berikutnya, dan mencetak bon untuk gudang. Keberhasilan berarti shift berikutnya menerima angka sisa stok yang benar tanpa hitung ulang manual.

## Positioning

Satu alur kerja yang menyatukan perencanaan lot, konversi bon, pemakaian gentani, dan sisa stok antarshift — bukan sekadar kalkulator bon atau pencatat stok terpisah.

## Operating Context

- Produk: 2TR, 1TR, KAI, CRANK.
- Material awal: LMC, Inocarb, Antimon (Sb), Fe Sulfur, Mg Denodule, Superseed, Sn, Cu, Mg Lamet, Ultraseed CE Inoculant.
- Shift Red/White, waktu Day/Night; bon berstatus Open sampai ditutup.
- Bon dicetak dalam format A4 untuk diserahkan ke gudang.
- Data tersimpan lokal di perangkat (localStorage); aplikasi dipakai di browser desktop dan ponsel di area kerja.

## Capabilities and Constraints

- Perhitungan bon: lot kecil ÷ rasio konversi = lot besar; kebutuhan per lot besar × material per produk; pembulatan per ukuran karung; pengurangan sisa stok shift sebelumnya; override bon final per material.
- Pemantauan gentani: batas = pcs produksi × kg/pcs; status ok/warn/over; ambang waspada dapat diatur.
- Tutup shift menyimpan sisa akhir dan meneruskannya ke shift berikutnya.
- Riwayat bon dapat difilter, diperluas, dicetak, dihapus, dan dibuka kembali untuk ditutup.
- Pengaturan mencakup rasio konversi, kebutuhan material per lot besar, ukuran karung, pcs per lot kecil, gentani, ambang waspada, dan stok minimum.
- Stack: React 19 + Vite + Tailwind CSS + Chart.js + Zustand; tanpa backend.
- Tidak boleh mengarang data produksi nyata; data contoh hanya untuk keadaan kosong.

## Brand Commitments

- Nama produk: MatPrep; konteks: PT TMMIN — Divisi Casting.
- Bahasa antarmuka: Indonesia.
- Arah visual yang diminta pengguna: dark industrial dengan komposisi bento grid, diterapkan ke seluruh aplikasi.

## Evidence on Hand

- `matprep-app/src/constants/defaults.js` — produk, material, rasio, ukuran karung, pcs, ambang.
- `matprep-app/src/lib/calc.js` — logika bon, gentani, format tanggal/angka.
- `MatPrep_PRD_v1.0.docx` — dokumen kebutuhan produk.
- `matprep.html` — prototipe lama sebagai bukti alur kerja, bukan acuan visual.

## Product Principles

1. Angka shift harus terbaca dalam sekali pandang, termasuk saat terburu-buru.
2. Peringatan gentani adalah sinyal tindakan, bukan hiasan.
3. Serah terima shift tidak boleh kehilangan konteks sisa stok.
4. Konsistensi antar-layar lebih penting daripada variasi dekoratif.
5. Data tetap di perangkat; antarmuka harus jujur tentang status lokal.

## Accessibility & Inclusion

Target kontras WCAG AA untuk teks, fokus keyboard yang terlihat, target sentuh yang nyaman di ponsel, dan label form yang eksplisit. Belum ada standar formal yang ditetapkan pengguna.
