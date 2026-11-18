import { PRODUCTS } from '../constants/defaults';
import { getAllMaterials, effBonFinal, gentaniUsage } from './calc';

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
const COVER_DAYS = 7; // jendela rata-rata pemakaian untuk "cukup untuk N hari"

// Stok per material: shift Open = sisa + bon − pemakaian setengah shift (stok di meja sekarang); tanpa shift Open = sisa akhir shift
// Closed terakhir. Status & "cukup untuk" dari stok sekarang. Proyeksi akhir shift (stok − kebutuhan tepat)
// hanya informasi: bon dihitung pas kebutuhan, jadi proyeksi hampir selalu di bawah minimum.
export function stockRows(shifts, settings, today) {
  const mats = getAllMaterials(settings);
  const open = shifts.find(s => s.status === 'Open');
  const lastClosed = shifts.find(s => s.status === 'Closed');
  const lineOf = m => open?.bonLines.find(l => l.material === m);
  const sisaClosed = m => (lastClosed?.bonLines ?? [])
    .filter(l => l.material === m).reduce((a, l) => a + (l.sisaAkhir ?? 0), 0);

  // rata-rata pemakaian per hari kerja (hari yang punya pemakaian aktual) dalam COVER_DAYS terakhir
  const from = addDays(today, -(COVER_DAYS - 1));
  const recent = shifts.filter(s => s.status === 'Closed' && inRange(s, from, today));

  const rows = mats.map(material => {
    const line = lineOf(material);
    // Pemakaian setengah shift (bila dicatat) sudah keluar dari meja, dan paruh kedua diproyeksi
    // dengan laju yang sama (sama dengan tengahShift di Buat Bon). Belum dicatat: sisa = kebutuhan rencana.
    const tengah = open?.pemakaianTengah?.[material];
    const dicatat = typeof tengah === 'number' && tengah >= 0;
    const stok = line ? Math.max(0, line.sisaStok + effBonFinal(line) - (dicatat ? tengah : 0)) : sisaClosed(material);
    const akhir = line ? stok - (dicatat ? tengah : line.totalTepat) : stok;
    const min = settings.stokMinimum?.[material] ?? 0;
    const days = new Set();
    let used = 0;
    for (const s of recent) {
      const l = s.bonLines.find(x => x.material === material);
      if (l?.pemakaianAktual > 0) { used += l.pemakaianAktual; days.add(s.tanggal); }
    }
    const perDay = days.size ? used / days.size : 0;
    const status = min <= 0 ? 'unset' : stok < min ? 'crit' : stok < 1.5 * min ? 'warn' : 'ok';
    return {
      material, stok, akhir, min, status,
      cap: settings.kapasitasTabung?.[material] || 3 * min || 0,
      cover: perDay > 0 ? stok / perDay : null,
      projected: Boolean(line),
    };
  });

  const shared = Math.max(1, ...rows.map(r => r.stok));
  for (const r of rows) r.cap = Math.max(r.cap || shared, r.stok);
  return rows.sort((a, b) =>
    SEVERITY[a.status] - SEVERITY[b.status]
    || (a.min > 0 && b.min > 0 ? a.stok / a.min - b.stok / b.min : 0));
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

  const stock = stockRows(shifts, settings, today);
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
  };
}
