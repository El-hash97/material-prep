// Jalankan: node src/lib/dashboard.check.mjs  (modul dimuat lewat Vite karena import tanpa ekstensi)
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true } });
const { buildDashboard, addDays, deltaPct, planSummary } = await vite.ssrLoadModule('/src/lib/dashboard.js');
const { DEFAULT_SETTINGS } = await vite.ssrLoadModule('/src/constants/defaults.js');
const { karungOf, karungKeMinimum, tengahShift } = await vite.ssrLoadModule('/src/lib/calc.js');

// Pemakaian setengah shift: tersedia = sisa 20 + bon 100 = 120, rencana 100
const tl = { sisaStok: 20, bonFinal: 100, bonFinalOverride: null, totalTepat: 100 };
assert.deepEqual(tengahShift(tl, null), { tersedia: 120, stokSekarang: 120, proyeksi: null, kurang: 0, status: null });
assert.equal(tengahShift(tl, 40).status, 'ok');          // proyeksi 80 ≤ rencana
assert.equal(tengahShift(tl, 55).status, 'diatas');      // proyeksi 110 > rencana, ≤ 120
assert.deepEqual(tengahShift(tl, 70), { tersedia: 120, stokSekarang: 50, proyeksi: 140, kurang: 20, status: 'habis' });
assert.equal(tengahShift(tl, 200).stokSekarang, 0);

// Saran bon per karung
assert.equal(karungOf(0, 25), 0);
assert.equal(karungOf(25, 25), 1);
assert.equal(karungOf(26, 25), 2);
assert.equal(karungOf(10, 0), 1); // ukuran kosong → 25 kg
const bonLine = { sisaStok: 10, bonFinal: 50, bonFinalOverride: null, totalTepat: 55, ukuranKarung: 25 };
assert.equal(karungKeMinimum(bonLine, 0), 0); // minimum belum diatur
assert.equal(karungKeMinimum(bonLine, 5), 0); // sisa setelah 5 ≥ 5
assert.equal(karungKeMinimum(bonLine, 30), 1); // kurang 25 → 1 karung
assert.equal(karungKeMinimum({ ...bonLine, bonFinalOverride: 75 }, 30), 0); // override sudah menutup

assert.equal(addDays('2026-11-01', -1), '2026-10-31');
assert.equal(addDays('2026-12-31', 1), '2027-01-01');
assert.equal(deltaPct(110, 100), 10);
assert.equal(deltaPct(5, 0), null);

const settings = {
  ...DEFAULT_SETTINGS,
  stokMinimum: { LMC: 100, Sn: 10, Cu: 10 },
  kapasitasTabung: { LMC: 1000 },
};
const line = (material, o) => ({
  material, sisaStok: 0, bonFinal: 0, bonFinalOverride: null, totalTepat: 0, pemakaianAktual: null, sisaAkhir: null, ...o,
});
const closed = (tanggal, shift, lines, lot = 0) => ({
  id: tanggal + shift, tanggal, shift, status: 'Closed', lotBesarMap: { '2TR': lot }, lotKecilMap: {}, bonLines: lines,
});
const today = '2026-11-18';

// Tanpa shift Open: stok = sisa akhir shift Closed terakhir (terbaru di depan).
const shifts = [
  closed('2026-11-18', 'Red', [line('LMC', { pemakaianAktual: 50, sisaAkhir: 120 }), line('Sn', { pemakaianAktual: 4, sisaAkhir: 6 }), line('Cu', { sisaAkhir: 14 })], 10),
  closed('2026-11-17', 'White', [line('LMC', { pemakaianAktual: 30, sisaAkhir: 170 })], 5),
  closed('2026-11-17', 'Red', [line('LMC', { pemakaianAktual: 20 })]),
  closed('2026-11-11', 'Red', [line('LMC', { pemakaianAktual: 40 })], 20), // periode 7 hari sebelumnya
];
const d = buildDashboard(shifts, settings, 7, today);

// Urutan status: crit (Sn 6 < 10) → warn (LMC 120 < 150, Cu 14 < 15) → unset; dalam status: rasio stok/min terkecil dulu.
assert.deepEqual(d.stock.slice(0, 3).map(r => [r.material, r.status]), [['Sn', 'crit'], ['LMC', 'warn'], ['Cu', 'warn']]);
assert.ok(d.stock.slice(3).every(r => r.status === 'unset'));
// Hari cukup = stok / rata-rata per hari kerja: LMC (50 + 30 + 20) kg dalam 2 hari = 50 kg/hari → 120/50.
assert.equal(d.stock.find(r => r.material === 'LMC').cover, 2.4);
assert.equal(d.stock.find(r => r.material === 'Cu').cover, null); // belum ada pemakaian
assert.equal(d.stock.find(r => r.material === 'LMC').cap, 1000);

// KPI + delta vs 7 hari sebelumnya.
assert.equal(d.kpis.usage.value, 104);
assert.equal(d.kpis.usage.delta, 160); // 104 vs 40
assert.equal(d.kpis.lot.value, 15);
assert.equal(d.kpis.lot.delta, -25); // 15 vs 20
assert.deepEqual(d.kpis.bon, { value: 3, closed: 3, open: 0 });
assert.equal(d.daily.length, 7);
assert.deepEqual(d.daily.at(-2), { date: '2026-11-17', red: 20, white: 30, total: 50 });
assert.equal(buildDashboard(shifts, settings, 1, today).daily.length, 7);
assert.ok(d.attention.some(a => a.level === 'crit' && a.text === 'Sn di bawah minimum'));

// Shift Open: stok = sisa + bon; status dari stok sekarang, proyeksi akhir shift hanya informasi.
const open = { ...closed(today, 'White', [line('LMC', { sisaStok: 120, bonFinal: 100, totalTepat: 150 })]), status: 'Open' };
const lmc = buildDashboard([open, ...shifts], settings, 7, today).stock.find(r => r.material === 'LMC');
assert.equal(lmc.stok, 220);
assert.equal(lmc.akhir, 70);
assert.equal(lmc.status, 'ok');
assert.equal(lmc.cover, 4.4); // 220 / 50 kg per hari

// Pemakaian setengah shift mengurangi stok di meja: 220 − 80 = 140; paruh kedua dengan laju sama → akhir 140 − 80 = 60.
const openTengah = { ...open, pemakaianTengah: { LMC: 80 } };
const lmcT = buildDashboard([openTengah, ...shifts], settings, 7, today).stock.find(r => r.material === 'LMC');
assert.equal(lmcT.stok, 140);
assert.equal(lmcT.akhir, 60);

// Ringkasan planning: 2TR 6 lot kecil × 15 pcs = 90 pcs; bon 50 kg / 25 kg = 2 karung + 1000 kg / 1000 = 1.
const planShift = {
  id: 'p1', tanggal: today, shift: 'Red', waktu: 'Day', status: 'Open',
  lotKecilMap: { '2TR': 6, KAI: 3 }, lotBesarMap: { '2TR': 2, KAI: 1 },
  bonLines: [
    { material: 'Inocarb', bonFinal: 50, bonFinalOverride: null, ukuranKarung: 25 },
    { material: 'LMC', bonFinal: 0, bonFinalOverride: 1000, ukuranKarung: 1000 },
    { material: 'Sn', bonFinal: 0, bonFinalOverride: null, ukuranKarung: 50 },
  ],
  pemakaianTengah: { LMC: 400 }, pemakaianTengahAt: '2026-11-18T05:00:00.000Z',
};
const plan = planSummary(planShift, { ...settings, pcsPerLotKecil: { '2TR': 15, KAI: 120 } });
assert.deepEqual(plan.products.find(x => x.p === '2TR'), { p: '2TR', lotKecil: 6, lotBesar: 2, pcs: 90 });
assert.deepEqual(plan.total, { lotKecil: 9, lotBesar: 3, pcs: 450 });
assert.equal(plan.bonKg, 1050);
assert.equal(plan.karung, 3);
assert.equal(plan.materials, 2);
assert.deepEqual(plan.tengah, { at: '2026-11-18T05:00:00.000Z', dicatat: 1, total: 3 });
assert.equal(planSummary(null, settings), null);
assert.equal(buildDashboard([planShift, ...shifts], settings, 7, today).plan.id, 'p1');

await vite.close();
console.log('dashboard.check: ok');
