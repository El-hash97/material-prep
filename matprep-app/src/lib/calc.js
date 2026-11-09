import { PRODUCTS, DEFAULT_SETTINGS } from '../constants/defaults';

export function getAllMaterials(settings) {
  const seen = new Set();
  const list = [];
  for (const p of PRODUCTS) {
    for (const m of Object.keys(settings.materials[p] ?? {})) {
      if (!seen.has(m)) { seen.add(m); list.push(m); }
    }
  }
  return list;
}

export function calcLotBesar(lotKecil, ratio) {
  if (!lotKecil || lotKecil <= 0) return 0;
  return Math.ceil(lotKecil / ratio);
}

export function effBonFinal(line) {
  return line.bonFinalOverride !== null ? line.bonFinalOverride : line.bonFinal;
}

export function buildBonLines(lotKecilMap, settings, prevClosed) {
  const ratio = settings.rasioKonversi;
  const lotBesarMap = {};
  for (const p of PRODUCTS) {
    lotBesarMap[p] = calcLotBesar(lotKecilMap[p] ?? 0, ratio);
  }

  const prevSisa = {};
  if (prevClosed) {
    for (const l of prevClosed.bonLines) {
      if (l.sisaAkhir) prevSisa[l.material] = (prevSisa[l.material] ?? 0) + l.sisaAkhir;
    }
  }

  const lines = [];
  for (const mat of getAllMaterials(settings)) {
    const rincian = [];
    let totalTepat = 0;
    for (const p of PRODUCTS) {
      const perLot = settings.materials[p]?.[mat];
      if (perLot !== undefined) {
        const lb = lotBesarMap[p];
        const tt = lb * perLot;
        rincian.push({ produk: p, lotBesar: lb, perLot, totalTepat: tt });
        totalTepat += tt;
      }
    }
    if (!rincian.length) continue;

    const sisaStok = prevSisa[mat] ?? 0;
    const uk = settings.ukuranKarung[mat] ?? 25;
    const netKebutuhan = Math.max(0, totalTepat - sisaStok);
    const bonFinal = netKebutuhan > 0 ? Math.ceil(netKebutuhan / uk) * uk : 0;

    lines.push({
      material: mat, produkRincian: rincian, totalTepat, sisaStok,
      bonFinal, bonFinalOverride: null, ukuranKarung: uk,
      pemakaianAktual: null, sisaAkhir: null,
    });
  }
  return { bonLines: lines, lotBesarMap };
}

// Gentani otomatis (kg/pcs) = kebutuhan per lot besar ÷ rasio ÷ pcs per lot kecil.
// Contoh: 2 kg/lot besar ÷ 3 ÷ 15 pcs = 0,0444 kg/pcs untuk produk 2TR.
export function calcGentani(settings) {
  const ratio = settings.rasioKonversi > 0 ? settings.rasioKonversi : 1;
  const pcs = { ...DEFAULT_SETTINGS.pcsPerLotKecil, ...settings.pcsPerLotKecil };
  const out = {};
  for (const p of PRODUCTS) {
    const pcsPerLot = pcs[p] > 0 ? pcs[p] : 1;
    out[p] = {};
    for (const [mat, perLotBesar] of Object.entries(settings.materials[p] ?? {})) {
      out[p][mat] = (perLotBesar ?? 0) / ratio / pcsPerLot;
    }
  }
  return out;
}

// Tampilkan gentani dalam g/pcs bila nilainya di bawah 10 kg/pcs.
export function fmtGentani(kgPcs) {
  const n = Number(kgPcs) || 0;
  if (n < 10) return { value: n * 1000, unit: 'g/pcs' };
  return { value: n, unit: 'kg/pcs' };
}

// Pemakaian aktual vs batas gentani (pcs produksi × kg/pcs) dari bon Closed.
// Gentani dihitung otomatis dari kebutuhan material, rasio konversi, dan pcs per lot kecil.
// Bon dengan pemakaianAktual kosong untuk suatu material tidak dihitung untuk material itu.
export function gentaniUsage(closedShifts, settings) {
  const pcs = { ...DEFAULT_SETTINGS.pcsPerLotKecil, ...settings.pcsPerLotKecil };
  const gentani = calcGentani(settings);
  const ambang = settings.ambangWaspada ?? 90;
  return getAllMaterials(settings).map(material => {
    let pemakaian = 0, batas = 0;
    for (const s of closedShifts) {
      const line = s.bonLines.find(l => l.material === material);
      if (!line || line.pemakaianAktual === null || line.pemakaianAktual === undefined) continue;
      pemakaian += line.pemakaianAktual;
      for (const p of PRODUCTS) {
        batas += (s.lotKecilMap?.[p] ?? 0) * pcs[p] * (gentani[p]?.[material] ?? 0);
      }
    }
    const pct = batas > 0 ? (pemakaian / batas) * 100 : null;
    const status = pct === null ? 'off' : pct > 100 ? 'over' : pct >= ambang ? 'warn' : 'ok';
    return { material, pemakaian, batas, pct, status };
  });
}

export function fmtNum(n) {
  if (n === null || n === undefined || isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('id-ID');
}

export function formatDate(s) {
  if (!s) return '—';
  try {
    return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return s; }
}

export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
