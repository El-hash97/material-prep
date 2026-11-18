import { PRODUCTS, DEFAULT_SETTINGS } from '../constants/defaults';
import { getAllMaterials, effBonFinal, gentaniUsage, karungOf } from './calc';

// Tanggal disimpan sebagai 'YYYY-MM-DD'; aritmetika hari memakai UTC agar tidak bergeser zona waktu.
export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const inRange = (s, from, to) => (s.tanggal ?? '') >= from && (s.tanggal ?? '') <= to;
const sumLot = s => PRODUCTS.reduce((a, p) => a + (s.lotBesarMap?.[p] ?? 0), 0);
const usageOf = s => s.bonLines.reduce((a, l) => a + (l.pemakaianAktual ?? 0), 0);
export const deltaPct = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

const SEVERITY = { crit: 0, warn: 1, ok: 2, unset: 3 };

// Stok per material: shift Open = sisa + bon − pemakaian setengah shift (stok di meja sekarang); tanpa shift Open = sisa akhir shift
// Closed terakhir. Status & "cukup untuk" dari stok sekarang. Proyeksi akhir shift (stok − kebutuhan tepat)
// hanya informasi: bon dihitung pas kebutuhan, jadi proyeksi hampir selalu di bawah minimum.
// "Cukup untuk" = stok sekarang ÷ kebutuhan material per lot besar (kgPerLot, mix plan shift aktif/terakhir).

// Kebutuhan material untuk 1 lot besar (kg). Material dipakai beberapa produk dengan takaran berbeda,
// jadi ditimbang dengan mix lot besar plan; tanpa plan (mix 0) → rata-rata biasa produk pemakainya.
// null bila tidak ada produk yang memakai material ini.
export function kgPerLot(material, settings, mix = {}) {
  const uses = PRODUCTS.map(p => [p, settings.materials?.[p]?.[material] ?? 0]).filter(([, kg]) => kg > 0);
  if (!uses.length) return null;
  const w = uses.map(([p]) => mix[p] ?? 0);
  const W = w.reduce((a, x) => a + x, 0);
  return W > 0
    ? uses.reduce((a, [, kg], i) => a + kg * w[i], 0) / W
    : uses.reduce((a, [, kg]) => a + kg, 0) / uses.length;
}

export function stockRows(shifts, settings) {
  const mats = getAllMaterials(settings);
  const open = shifts.find(s => s.status === 'Open');
  const lastClosed = shifts.find(s => s.status === 'Closed');
  const lineOf = m => open?.bonLines.find(l => l.material === m);
  const sisaClosed = m => (lastClosed?.bonLines ?? [])
    .filter(l => l.material === m).reduce((a, l) => a + (l.sisaAkhir ?? 0), 0);

  const mix = (open ?? shifts[0])?.lotBesarMap ?? {};
  const planned = PRODUCTS.some(p => (mix[p] ?? 0) > 0);

  const rows = mats.map(material => {
    const line = lineOf(material);
    // Pemakaian setengah shift (bila dicatat) sudah keluar dari meja, dan paruh kedua diproyeksi
    // dengan laju yang sama (sama dengan tengahShift di Buat Bon). Belum dicatat: sisa = kebutuhan rencana.
    const tengah = open?.pemakaianTengah?.[material];
    const dicatat = typeof tengah === 'number' && tengah >= 0;
    const stok = line ? Math.max(0, line.sisaStok + effBonFinal(line) - (dicatat ? tengah : 0)) : sisaClosed(material);
    const akhir = line ? stok - (dicatat ? tengah : line.totalTepat) : stok;
    const min = settings.stokMinimum?.[material] ?? 0;
    const perLot = kgPerLot(material, settings, mix);
    const status = min <= 0 ? 'unset' : stok < min ? 'crit' : stok < 1.5 * min ? 'warn' : 'ok';
    return {
      material, stok, akhir, min, status,
      cap: settings.kapasitasTabung?.[material] || 3 * min || 0,
      perLot,
      coverBasis: planned ? 'mix plan' : 'rata-rata produk',
      cover: perLot > 0 ? stok / perLot : null, // dalam lot besar
      projected: Boolean(line),
    };
  });

  const shared = Math.max(1, ...rows.map(r => r.stok));
  for (const r of rows) r.cap = Math.max(r.cap || shared, r.stok);
  return rows.sort((a, b) =>
    SEVERITY[a.status] - SEVERITY[b.status]
    || (a.min > 0 && b.min > 0 ? a.stok / a.min - b.stok / b.min : 0));
}

// Ringkasan input planning satu shift: lot kecil → lot besar → pcs per produk, total bon, progres ½ shift.
export function planSummary(shift, settings) {
  if (!shift) return null;
  const pcsPer = { ...DEFAULT_SETTINGS.pcsPerLotKecil, ...settings.pcsPerLotKecil };
  const products = PRODUCTS.map(p => {
    const lotKecil = shift.lotKecilMap?.[p] ?? 0;
    return { p, lotKecil, lotBesar: shift.lotBesarMap?.[p] ?? 0, pcs: lotKecil * (pcsPer[p] ?? 0) };
  });
  const sum = k => products.reduce((a, x) => a + x[k], 0);
  const bonLines = shift.bonLines ?? [];
  const tengah = shift.pemakaianTengah ?? null;
  return {
    id: shift.id, tanggal: shift.tanggal, shift: shift.shift, waktu: shift.waktu, status: shift.status,
    products,
    total: { lotKecil: sum('lotKecil'), lotBesar: sum('lotBesar'), pcs: sum('pcs') },
    bonKg: bonLines.reduce((a, l) => a + effBonFinal(l), 0),
    karung: bonLines.reduce((a, l) => a + karungOf(effBonFinal(l), l.ukuranKarung), 0),
    materials: bonLines.filter(l => effBonFinal(l) > 0).length,
    tengah: tengah ? { at: shift.pemakaianTengahAt ?? null, dicatat: Object.keys(tengah).length, total: bonLines.length } : null,
  };
}

// Riwayat pengebonan hari ini: bon (urut waktu dibuat) dan total per material yang dipecah per bon.
// kg = bon final efektif; karung = dibulatkan ke atas per ukuran karung tiap baris.
export function bonToday(shifts, today) {
  const bons = shifts.filter(s => s.tanggal === today).reverse(); // db: terbaru di depan → urut kronologis
  const byMat = new Map();
  const list = bons.map((s, i) => {
    let kg = 0, karung = 0;
    for (const l of s.bonLines ?? []) {
      const v = effBonFinal(l);
      if (!(v > 0)) continue;
      const k = karungOf(v, l.ukuranKarung);
      kg += v; karung += k;
      if (!byMat.has(l.material)) byMat.set(l.material, { material: l.material, kg: 0, karung: 0, parts: [] });
      const m = byMat.get(l.material);
      m.kg += v; m.karung += k;
      m.parts.push({ bon: i, kg: v, karung: k });
    }
    return { id: s.id, shift: s.shift, waktu: s.waktu ?? null, status: s.status, createdAt: s.createdAt ?? null, kg, karung };
  });
  const materials = [...byMat.values()].sort((a, b) => b.kg - a.kg);
  return {
    bons: list,
    materials,
    kg: list.reduce((a, b) => a + b.kg, 0),
    karung: list.reduce((a, b) => a + b.karung, 0),
  };
}

export function buildDashboard(shifts, settings, period, today) {
  const from = addDays(today, -(period - 1));
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(period - 1));

  const cur = shifts.filter(s => inRange(s, from, today));
  const prev = shifts.filter(s => inRange(s, prevFrom, prevTo));
  const closed = cur.filter(s => s.status === 'Closed');
  const prevClosed = prev.filter(s => s.status === 'Closed');

  const usage = closed.reduce((a, s) => a + usageOf(s), 0);
  const lot = cur.reduce((a, s) => a + sumLot(s), 0);
  const productMix = PRODUCTS.map(p => ({ p, value: cur.reduce((a, s) => a + (s.lotBesarMap?.[p] ?? 0), 0) }));

  const gentani = gentaniUsage(closed, settings);
  const gActive = gentani.filter(r => r.status !== 'off').sort((a, b) => b.pct - a.pct);
  const gCount = st => gActive.filter(r => r.status === st).length;

  // tren: minimal 7 hari agar "1 Hari" tetap punya konteks
  const span = Math.max(period, 7);
  const daily = Array.from({ length: span }, (_, i) => {
    const date = addDays(today, i - (span - 1));
    const day = shifts.filter(s => s.status === 'Closed' && s.tanggal === date);
    const red = day.filter(s => s.shift === 'Red').reduce((a, s) => a + usageOf(s), 0);
    const white = day.filter(s => s.shift === 'White').reduce((a, s) => a + usageOf(s), 0);
    return { date, red, white, total: red + white };
  });

  const stock = stockRows(shifts, settings);
  const attention = [
    ...stock.filter(r => r.status === 'crit').map(r => ({ level: 'crit', text: `${r.material} di bawah minimum` })),
    ...gActive.filter(r => r.status === 'over').map(r => ({ level: 'crit', text: `Gentani ${r.material} ${Math.round(r.pct)}%` })),
    ...gActive.filter(r => r.status === 'warn').map(r => ({ level: 'warn', text: `Gentani ${r.material} ${Math.round(r.pct)}%` })),
  ];

  return {
    attention,
    kpis: {
      usage: { value: usage, delta: deltaPct(usage, prevClosed.reduce((a, s) => a + usageOf(s), 0)) },
      bon: { value: cur.length, closed: closed.length, open: cur.length - closed.length },
      lot: { value: lot, delta: deltaPct(lot, prev.reduce((a, s) => a + sumLot(s), 0)) },
      gentani: { active: gActive.length, ok: gCount('ok'), warn: gCount('warn'), over: gCount('over'), total: gentani.length },
    },
    stock,
    gentani: gActive,
    gentaniOff: gentani.filter(r => r.status === 'off').map(r => r.material),
    daily,
    productMix,
    recent: shifts.slice(0, 5).map(s => ({ ...s, bonKg: s.bonLines.reduce((a, l) => a + effBonFinal(l), 0) })),
    activeShift: shifts.find(s => s.status === 'Open') ?? null,
    bonToday: bonToday(shifts, today),
    plan: planSummary(shifts.find(s => s.status === 'Open') ?? shifts[0], settings),
  };
}
