import { PRODUCTS } from '../constants/defaults';

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
