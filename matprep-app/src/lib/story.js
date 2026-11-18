import { PRODUCTS, PRODUCT_TONES, DEFAULT_SETTINGS } from '../constants/defaults';
import { buildBonLines, effBonFinal, karungOf, fmtNum } from './calc';

// Animasi alur shift di Dashboard: 9 babak, urutan tetap, angka dari shift aktif (atau terakhir).
// Fungsi murni: scene 3D dan storyboard fallback sama-sama membaca hasil buildStory().

export const BEATS = [
  { id: 'planning', title: 'Input planning produksi', dur: 3 },
  { id: 'saran',    title: 'Saran pengebonan',        dur: 3.5 },
  { id: 'bon',      title: 'Pengebonan',              dur: 3 },
  { id: 'kirim',    title: 'Kirim warehouse → melting', dur: 6 },
  { id: 'isi',      title: 'Material diisi ke meja',  dur: 5 },
  { id: 'pakai',    title: 'Material dipakai dari meja', dur: 4.5 },
  { id: 'input',    title: 'Input di aplikasi produksi', dur: 4 },
  { id: 'stok',     title: 'Stok MatPrep berkurang',  dur: 4 },
  { id: 'tutup',    title: 'Tutup shift',             dur: 3 },
];
export const LOOP_STARTS = BEATS.map((_, i) => BEATS.slice(0, i).reduce((a, b) => a + b.dur, 0));
export const LOOP = BEATS.reduce((a, b) => a + b.dur, 0);
// Integrasi aplikasi produksi (PLAN-pemakaian-lot.md) belum dibangun: babak 7–8 diberi label "alur target".
export const INTEGRASI_AKTIF = false;
export const PALLET_MAX = 12; // karung yang digambar di palet; label tetap jumlah asli

// Waktu loop t (detik) → { index, local (0..1) } babak yang sedang tampil.
export function beatAt(t) {
  const x = ((t % LOOP) + LOOP) % LOOP;
  let i = BEATS.length - 1;
  while (i > 0 && LOOP_STARTS[i] > x) i--;
  return { index: i, local: Math.min(1, (x - LOOP_STARTS[i]) / BEATS[i].dur) };
}

const SAMPLE_LOT = { '2TR': 12, '1TR': 9, KAI: 9, CRANK: 6 };
const kg = n => `${fmtNum(Math.round(n))} kg`;
const top = (entries, n) => [...entries].sort((a, b) => b[1] - a[1]).slice(0, n);

export function buildStory(shift, settings) {
  const contoh = !shift;
  const src = shift ?? {
    shift: 'Red', status: 'Open', lotKecilMap: SAMPLE_LOT,
    ...buildBonLines(SAMPLE_LOT, settings, null),
  };
  const lines = src.bonLines ?? [];
  const pcsPer = { ...DEFAULT_SETTINGS.pcsPerLotKecil, ...settings.pcsPerLotKecil };

  const products = PRODUCTS.map(p => ({ p, lotKecil: src.lotKecilMap?.[p] ?? 0, color: PRODUCT_TONES[p].color }));
  const lotBesar = PRODUCTS.reduce((a, p) => a + (src.lotBesarMap?.[p] ?? 0), 0);
  const pcs = products.reduce((a, x) => a + x.lotKecil * (pcsPer[x.p] ?? 0), 0);
  const aktif = products.filter(x => x.lotKecil > 0);

  const saran = lines.filter(l => l.bonFinal > 0).map(l => [l, l.bonFinal]);
  const bonKg = lines.reduce((a, l) => a + effBonFinal(l), 0);
  const karung = lines.reduce((a, l) => a + karungOf(effBonFinal(l), l.ukuranKarung), 0);
  const deltaKarung = karung - lines.reduce((a, l) => a + karungOf(l.bonFinal, l.ukuranKarung), 0);

  // Babak 7: pemakaian ½ shift bila tercatat; selain itu contoh 1 lot besar produk aktif pertama.
  const tengah = src.pemakaianTengah && Object.keys(src.pemakaianTengah).length ? src.pemakaianTengah : null;
  const contohProduk = aktif[0]?.p ?? PRODUCTS[0];
  const input = tengah ?? Object.fromEntries(
    Object.entries(settings.materials?.[contohProduk] ?? {}).filter(([m]) => lines.some(l => l.material === m)));

  const filled = lines.map(l => (l.sisaStok ?? 0) + effBonFinal(l));
  const shared = Math.max(1, ...filled);
  const bars = lines.slice(0, 10).map((l, i) => {
    const min = settings.stokMinimum?.[l.material] ?? 0;
    const full = filled[i];
    const after = Math.max(0, full - (input[l.material] ?? 0));
    const cap = Math.max(settings.kapasitasTabung?.[l.material] || 3 * min || shared, full);
    return { material: l.material, before: (l.sisaStok ?? 0) / cap, full: full / cap, after: after / cap, low: min > 0 && after < min };
  });
  const stokFull = filled.reduce((a, v) => a + v, 0);
  const inputKg = Object.values(input).reduce((a, v) => a + v, 0);
  const sisaTutup = src.status === 'Closed'
    ? lines.reduce((a, l) => a + (l.sisaAkhir ?? 0), 0)
    : lines.reduce((a, l, i) => a + Math.max(0, filled[i] - l.totalTepat), 0);

  const text = {
    planning: [
      (aktif.map(x => `${x.p} ${fmtNum(x.lotKecil)}`).join(' · ') || '—') + ' lot kecil',
      `${fmtNum(lotBesar)} lot besar · ${fmtNum(pcs)} pcs`,
    ],
    saran: top(saran, 3).map(([l, v]) => `${l.material} ${kg(v)} · ${karungOf(v, l.ukuranKarung)} karung`),
    bon: [
      `Bon ${kg(bonKg)} · ${fmtNum(karung)} karung · ${lines.filter(l => effBonFinal(l) > 0).length} material`,
      deltaKarung ? `${deltaKarung > 0 ? '+' : ''}${fmtNum(deltaKarung)} karung disesuaikan operator` : 'Sesuai saran',
    ],
    kirim: ['Forklift: warehouse → melting', `${fmtNum(karung)} karung di palet`],
    isi: [`${bars.length} kompartemen terisi`, `Stok di meja ${kg(stokFull)}`],
    pakai: [`Produksi ${aktif.map(x => x.p).join(' · ') || '—'}`, 'Material masuk ke tungku'],
    input: [
      top(Object.entries(input), 3).map(([m, v]) => `${m} ${kg(v)}`).join(' · ') || '—',
      tengah ? 'Dari pemakaian ½ shift tercatat' : `Contoh: 1 lot besar ${contohProduk}`,
    ],
    stok: [`Stok di meja ${kg(stokFull)} → ${kg(Math.max(0, stokFull - inputKg))}`, 'Diperbarui dari aplikasi produksi'],
    tutup: src.status === 'Closed'
      ? [`Shift ${src.shift} ditutup`, `Sisa ${kg(sisaTutup)} diteruskan ke shift berikutnya`]
      : [`Shift ${src.shift} · proyeksi sisa ${kg(sisaTutup)}`, 'Diteruskan ke shift berikutnya'],
  };
  if (!text.saran.length) text.saran = ['Stok cukup, tidak ada saran bon'];

  return {
    contoh,
    beats: BEATS.map(b => ({ ...b, lines: text[b.id], target: !INTEGRASI_AKTIF && (b.id === 'input' || b.id === 'stok') })),
    scene: {
      boardBars: products.map(x => ({ color: x.color, v: x.lotKecil / Math.max(1, ...products.map(y => y.lotKecil)) })),
      // isi layar monitor planning (babak 1–3): plan produksi → saran bon → bon tersimpan
      screen: {
        shift: src.shift ?? 'Red',
        plan: products.map(x => ({ p: x.p, color: x.color, lotKecil: x.lotKecil, lotBesar: src.lotBesarMap?.[x.p] ?? 0, pcs: x.lotKecil * (pcsPer[x.p] ?? 0) })),
        total: { lotBesar, pcs },
        saran: top(saran, 5).map(([l, v]) => ({ material: l.material, kg: v, karung: karungOf(v, l.ukuranKarung) })),
        bon: { kg: bonKg, karung, materials: lines.filter(l => effBonFinal(l) > 0).length, delta: deltaKarung },
      },
      karung,
      palletSacks: Math.min(PALLET_MAX, karung),
      inputRows: top(Object.entries(input), 4), // isi layar tablet aplikasi produksi (babak 7)
      bars,
      shiftFrom: src.shift ?? 'Red',
      shiftTo: src.shift === 'White' ? 'Red' : 'White',
    },
  };
}
