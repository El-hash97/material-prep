# Rencana: Pemakaian Material per Lot dari Aplikasi Lain

Status: **rencana, belum dikerjakan**. Dibuat 2026-11-09 dari sesi tanya-jawab.

## 1. Tujuan

Operator menginput pemakaian material per lot di aplikasi lain. MatPrep menerima catatan itu lewat API, lalu:

1. **Stok material berkurang** setiap lot diinput (tabung stok ikut turun).
2. **Gentani terekam** dari kg yang benar-benar terukur, bukan angka teoritis.

Latar belakang: sebelumnya `pemakaianAktual` diisi otomatis sama dengan kebutuhan teoritis, sehingga gentani selalu 100%. Kini prefill sudah dihapus (kosong = `null`, tidak dihitung ke gentani) dan sumber data aktual akan datang dari aplikasi lain.

## 2. Keputusan yang sudah disepakati

| # | Topik | Keputusan |
|---|-------|-----------|
| 1 | Isi catatan | Aplikasi lain mengirim **kg aktual per material** untuk satu lot. |
| 2 | Pencatatan | Setiap lot masuk ke **shift Open** sebagai catatan terpisah. Stok berjalan berkurang langsung. |
| 3 | Idempotensi | `externalId` wajib dan unik. ID sama datang lagi = 200 tanpa efek. Koreksi lewat `PUT`/`DELETE` dengan `externalId`. |
| 4 | Keamanan | `/api/pemakaian` wajib `Authorization: Bearer <INGEST_API_KEY>` (env var Netlify). Endpoint UI lain tidak berubah. |
| 5 | Nama | Material dan produk dicocokkan dengan Settings tanpa beda huruf besar/kecil dan spasi tepi. Ada yang tidak dikenal = seluruh request ditolak **422** dengan daftar nama bermasalah. Tidak ada auto-create. |
| 6 | Over-use | Tetap diterima dan dicatat. Stok ditampilkan 0, ada tanda over-use. |
| 7 | Satuan | Catatan berisi `produk`, `lotBesar` (jumlah), dan kg per material. Batas gentani = kebutuhan per lot besar x `lotBesar`. |
| 8 | Tutup Shift | Kolom pemakaian aktual **read-only** untuk material yang punya catatan lot (terisi otomatis dari jumlahnya). Tanpa catatan lot: tetap bisa diisi manual, kosong = `null`. |
| 9 | Gentani Dashboard | Dihitung dari **semua catatan lot**, termasuk shift Open. Shift lama tanpa catatan lot tetap dari `pemakaianAktual`. |
| 10 | Penyimpanan | Tabel Neon baru `pemakaian_lot`, bukan JSON di dalam shift (menghindari tertimpa `PATCH shifts/:id`). |
| 11 | Penyegaran layar | Hanya saat pindah halaman atau tombol **Segarkan**. Tanpa polling. |
| 12 | Catatan terlambat | Setelah shift ditutup, catatan tetap diterima dan masuk ke shift Open berikutnya. |
| 13 | Tanpa shift Open | Catatan diterima dengan `shift_id` kosong (status "menunggu shift"), otomatis dilampirkan ke shift berikutnya yang disimpan. Ada penanda jelas di MatPrep. |
| 14 | Satu material melayani beberapa lot | Setiap baris material boleh membawa `lotBesar` sendiri. Lot berikutnya tidak mengirim baris material itu. Ada peringatan (bukan penolakan) bila material dengan kg identik muncul di dua catatan berurutan. |

## 3. Kontrak API

Semua endpoint di bawah wajib header `Authorization: Bearer <INGEST_API_KEY>`. Tanpa/ salah kunci = `401`.

### POST `/api/pemakaian` — catat satu lot

```json
{
  "externalId": "LOT-2026-11-09-0042",
  "produk": "2TR",
  "lotBesar": 1,
  "waktu": "2026-11-09T14:05:00+07:00",
  "bahan": [
    { "material": "LMC", "kg": 4.2 },
    { "material": "Carbon", "kg": 56, "lotBesar": 2 }
  ]
}
```

- `lotBesar` di tingkat atas = jumlah lot besar pada catatan ini.
- `bahan[].lotBesar` (opsional, default = `lotBesar` tingkat atas) = jumlah lot yang dilayani pemakaian itu. Contoh di atas: Carbon 56 kg melayani **2 lot**. Lot ke-2 tidak mengirim baris Carbon.
- `waktu` opsional (default waktu terima).

Respons:

| Status | Kondisi | Body |
|--------|---------|------|
| `201` | Tercatat | `{ "status": "created", "shiftId": "abc", "menunggu": false, "peringatan": [] }` |
| `201` | Tercatat tanpa shift Open | `{ "status": "created", "shiftId": null, "menunggu": true, "peringatan": [] }` |
| `200` | `externalId` sudah ada | `{ "status": "duplicate" }` |
| `401` | Kunci salah/ hilang | `{ "error": "tidak_berwenang" }` |
| `422` | Nama tidak dikenal / payload tidak valid | `{ "error": "nama_tidak_dikenal", "produk": ["XYZ"], "material": ["Karbon"] }` |

`peringatan` berisi teks bila ada material dengan kg identik di dua catatan berurutan, misalnya `"Carbon 56 kg sama dengan catatan sebelumnya (LOT-...-0041)"`.

### PUT `/api/pemakaian/:externalId` — koreksi

Body sama dengan POST. Menggantikan seluruh baris catatan itu. Stok dan gentani dihitung ulang dari catatan yang tersisa.

### DELETE `/api/pemakaian/:externalId` — batalkan

Menghapus seluruh baris catatan itu.

### Aturan bersama

- Pencocokan nama: `trim()` + tidak beda huruf besar/kecil terhadap `settings.materials` (nama produk terhadap `PRODUCTS`).
- Validasi: `kg` angka >= 0, `lotBesar` angka > 0, `bahan` tidak kosong.
- Over-use tidak pernah menolak request.

## 4. Skema database (Neon)

```sql
CREATE TABLE pemakaian_lot (
  id          bigserial PRIMARY KEY,
  external_id text        NOT NULL,
  shift_id    text        NULL,          -- NULL = menunggu shift
  produk      text        NOT NULL,
  material    text        NOT NULL,
  kg          numeric     NOT NULL CHECK (kg >= 0),
  lot_besar   numeric     NOT NULL CHECK (lot_besar > 0),  -- cakupan baris ini
  waktu       timestamptz NOT NULL,
  diterima_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_id, material)
);
CREATE INDEX pemakaian_lot_shift_idx ON pemakaian_lot (shift_id);
```

Satu catatan = beberapa baris (satu per material) dengan `external_id` yang sama. `PUT` dan `DELETE` bekerja pada semua baris `external_id` itu dalam satu transaksi.

Pelampiran otomatis: saat `POST /api/shifts` (bon disimpan, shift jadi Open), jalankan `UPDATE pemakaian_lot SET shift_id = :id WHERE shift_id IS NULL`.

## 5. Rumus

**Stok berjalan** per material (shift Open):

```
stok = sisaStok + bonFinal(eff) - SUM(kg catatan lot shift ini)
```

Ditampilkan minimal 0. Selisih negatif ditandai over-use.

**Pemakaian aktual** saat Tutup Shift:

```
pemakaianAktual = SUM(kg)   jika material punya catatan lot
                = input manual atau null   jika tidak
sisaAkhir       = max(0, sisaStok + bonFinal - (pemakaianAktual ?? totalTepat))
```

**Gentani** per material, per periode:

```
batas      = SUM( settings.materials[produk][material] x lot_besar )   -- tiap baris catatan
pemakaian  = SUM( kg )
gentani %  = pemakaian / batas x 100
```

Shift lama tanpa catatan lot: tetap rumus lama (`calc.js: gentaniUsage`) dari `pemakaianAktual`.

## 6. Perubahan di MatPrep

| Area | Perubahan |
|------|-----------|
| `netlify/functions/api.mjs` | Route `/api/pemakaian` (POST/PUT/DELETE), cek `INGEST_API_KEY`, validasi nama, transaksi; lampirkan catatan menunggu saat `POST shifts`; `GET data` mengembalikan catatan lot. |
| Neon | Buat tabel `pemakaian_lot` (migrasi). |
| `store/db.js` | Muat catatan lot ke cache pada `init()`; `refresh()` untuk tombol Segarkan; getter `getPemakaianLot(shiftId)`. |
| `lib/calc.js` | Fungsi stok berjalan; `gentaniUsage` memakai catatan lot (termasuk shift Open) dengan fallback ke `pemakaianAktual`. |
| `pages/Planning.jsx` + `StockTubes.jsx` | Tabung memakai stok berjalan (sisa setelah pemakaian lot). |
| `pages/TutupShift.jsx` | Kolom pemakaian aktual read-only bila ada catatan lot, terisi dari jumlahnya. |
| `pages/Dashboard.jsx` | Gentani dari catatan lot; tombol **Segarkan**; penanda catatan menunggu. |
| Layar baru/ tile | Daftar catatan lot per shift (hanya baca, tombol hapus opsional) dan penanda "N catatan lot menunggu shift". |
| Env Netlify | Tambah `INGEST_API_KEY`. |

## 7. Tahapan pengerjaan

1. **Fondasi:** tabel `pemakaian_lot`, endpoint POST dengan auth, validasi nama, idempotensi, pelampiran shift. Uji dengan `curl`.
2. **Stok:** rumus stok berjalan, tabung di Planning ikut turun.
3. **Tutup Shift:** pemakaian aktual dari jumlah catatan lot, read-only, `sisaAkhir`.
4. **Gentani:** `gentaniUsage` dari catatan lot (termasuk Open), dukungan `bahan[].lotBesar`, peringatan kg identik.
5. **Koreksi:** `PUT` dan `DELETE`.
6. **Tampilan:** daftar catatan lot, penanda menunggu shift, tombol Segarkan.

Setiap tahap di-commit lokal terpisah.

## 8. Ditunda / belum diputuskan

- **Aksi "Buka kembali" shift tertutup:** tidak dibuat. Catatan terlambat otomatis masuk shift berikutnya (keputusan 12).
- **`PUT`/`DELETE` untuk catatan yang shift-nya sudah Closed:** usulan awal ditolak `409` supaya `sisaAkhir` shift tertutup tidak berubah diam-diam. **Perlu konfirmasi** sebelum tahap 5.
- **Polling/ push real-time:** tidak dibuat (keputusan 11). Bisa ditambah bila tombol Segarkan terasa kurang.
- **Rotasi `INGEST_API_KEY`:** manual lewat env Netlify, belum ada mekanisme dua kunci.
- **Migrasi data lama:** shift Closed lama dengan prefill 100% tidak bisa dibedakan dari input asli dan dibiarkan.
- **Satu material, dua lot, produk berbeda:** belum ditangani (asumsi satu catatan = satu produk).

## 9. Hal yang perlu dipastikan di aplikasi lain

- Mengirim `externalId` yang stabil per lot (sama saat retry).
- Kirim ulang bila menerima `5xx`/ timeout; jangan kirim ulang bila `422` (perbaiki nama dulu).
- Untuk pemakaian yang melayani beberapa lot: kirim di satu catatan dengan `bahan[].lotBesar` = jumlah lot, dan **jangan** kirim lagi di lot berikutnya.
- Nama produk dan material persis sama dengan di Settings MatPrep (huruf besar/kecil boleh beda).
