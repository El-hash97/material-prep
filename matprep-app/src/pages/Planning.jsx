import { RefreshCw, Save, Printer, Package, Plus, AlertTriangle, Info } from 'lucide-react';
import useStore from '../store/useStore';
import { db } from '../store/db';
import { PRODUCTS } from '../constants/defaults';
import { buildBonLines, calcLotBesar, effBonFinal, fmtNum, formatDate, genId, todayStr } from '../lib/calc';
import { printBon } from '../lib/print';

const PRODUCT_COLORS = {
  '2TR':   { border: 'border-[#1A3C6E]', title: 'text-[#1A3C6E] dark:text-blue-400' },
  '1TR':   { border: 'border-red-600',   title: 'text-red-600 dark:text-red-400' },
  'KAI':   { border: 'border-yellow-500', title: 'text-yellow-600 dark:text-yellow-400' },
  'CRANK': { border: 'border-green-600', title: 'text-green-700 dark:text-green-400' },
};

export default function Planning() {
  const {
    planForm, updatePlanForm, updateLotKecil,
    calculatedBonLines, calculatedLotBesarMap,
    setCalculatedBon, updateOverride, bonSaved, setBonSaved,
    currentBonId, setCurrentBonId, navigate, resetPlanForm,
  } = useStore();

  const settings = db.getSettings();
  const openShift = db.getShifts().find(s => s.status === 'Open');

  function hitung() {
    const hasAny = PRODUCTS.some(p => (planForm.lotKecilMap[p] ?? 0) > 0);
    if (!hasAny) { alert('Minimal 1 produk harus memiliki lot kecil > 0.'); return; }
    const { bonLines, lotBesarMap } = buildBonLines(planForm.lotKecilMap, settings, db.getLastClosed());
    setCalculatedBon(bonLines, lotBesarMap);
  }

  function simpan() {
    if (!planForm.tanggal) { alert('Pilih tanggal shift.'); return; }
    if (!calculatedBonLines.length) { alert('Hitung bon terlebih dahulu.'); return; }
    const id = genId();
    db.addShift({
      id,
      tanggal: planForm.tanggal,
      shift: planForm.shift,
      waktu: planForm.waktu,
      status: 'Open',
      lotKecilMap: { ...planForm.lotKecilMap },
      lotBesarMap: { ...calculatedLotBesarMap },
      bonLines: JSON.parse(JSON.stringify(calculatedBonLines)),
      createdAt: new Date().toISOString(),
      closedAt: null,
    });
    setCurrentBonId(id);
    setBonSaved(true);
  }

  const hasBon = calculatedBonLines.length > 0 && !bonSaved;
  const zeroMats = calculatedBonLines.filter(l => effBonFinal(l) === 0 && l.totalTepat > 0).map(l => l.material);

  let totTepat = 0, totFinal = 0, totSisa = 0;
  calculatedBonLines.forEach(l => {
    totTepat += l.totalTepat;
    const eff = effBonFinal(l);
    totFinal += eff;
    totSisa += eff - l.totalTepat;
  });

  return (
    <div className="p-4 md:p-6 max-w-[1100px]">
      <div className="mb-5">
        <h2 className="text-[22px] font-bold text-[#1A3C6E] dark:text-blue-400">Buat Bon Material</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Masukkan planning lot per produk — sistem menghitung kebutuhan bon secara otomatis
        </p>
      </div>

      {openShift && (
        <div className="alert alert-warning mb-4">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            Bon <strong>{formatDate(openShift.tanggal)} — Shift {openShift.shift}</strong> masih OPEN.{' '}
            <button
              className="underline font-bold bg-transparent border-none cursor-pointer hover:opacity-80"
              onClick={() => { setCurrentBonId(openShift.id); navigate('tutup-shift'); }}
            >
              → Tutup Sekarang
            </button>
          </span>
        </div>
      )}

      {/* Shift info — sequential dropdowns */}
      <div className="card mb-4">
        <div className="card-title mb-3">Informasi Shift</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="form-label">Tanggal</label>
            <input
              type="date"
              className="form-control"
              value={planForm.tanggal ?? todayStr()}
              onChange={e => updatePlanForm({ tanggal: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">Shift</label>
            <select
              className="form-control cursor-pointer"
              value={planForm.shift}
              onChange={e => updatePlanForm({ shift: e.target.value })}
            >
              <option value="Red">Red</option>
              <option value="White">White</option>
            </select>
          </div>
          <div>
            <label className="form-label">Waktu</label>
            <select
              className="form-control cursor-pointer"
              value={planForm.waktu ?? 'Day'}
              onChange={e => updatePlanForm({ waktu: e.target.value })}
            >
              <option value="Day">Day</option>
              <option value="Night">Night</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lot inputs */}
      <div className="card mb-4">
        <div className="card-title mb-3">Input Lot Kecil per Produk</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-4">
          {PRODUCTS.map(p => {
            const lk = planForm.lotKecilMap[p] ?? 0;
            const lb = calcLotBesar(lk, settings.rasioKonversi);
            const c = PRODUCT_COLORS[p];
            return (
              <div
                key={p}
                className={[
                  'border-2 rounded-xl p-3 md:p-4 text-center transition-all duration-150',
                  'bg-white dark:bg-slate-700/50',
                  lk > 0 ? c.border : 'border-slate-200 dark:border-slate-600 hover:border-slate-300',
                ].join(' ')}
              >
                <div className={`text-lg md:text-xl font-bold mb-2 md:mb-3 ${c.title}`}>{p}</div>
                <label className="form-label">Lot Kecil</label>
                <input
                  type="number" min="0" className="form-control text-right"
                  value={lk || ''} placeholder="0"
                  onChange={e => updateLotKecil(p, parseInt(e.target.value) || 0)}
                />
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Lot Besar: <strong className="text-[#1A3C6E] dark:text-blue-400 text-base">{lb}</strong>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          Rasio: <strong>{settings.rasioKonversi}</strong> lot kecil = 1 lot besar
        </p>
        <button className="btn btn-primary" onClick={hitung}>
          <RefreshCw size={14} />Hitung Bon
        </button>
      </div>

      {/* Bon table */}
      {hasBon && (
        <div className="card mb-4">
          <div className="card-title mb-3">Tabel Bon Material</div>
          {zeroMats.length > 0 && (
            <div className="alert alert-info mb-3">
              <Info size={16} className="shrink-0 mt-0.5" />
              <span>Tidak perlu bon (total tepat = 0): <strong>{zeroMats.join(', ')}</strong></span>
            </div>
          )}
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm border-collapse min-w-[600px]">
              <thead>
                <tr className="table-header">
                  {['Material', 'Produk', 'Total Tepat (kg)', 'Bon Final (kg)', 'Sisa Stok (kg)', 'Override', 'Karung'].map((h, i) => (
                    <th key={h} className={`px-3 py-2.5 font-semibold ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calculatedBonLines.map((l, idx) => {
                  const eff = effBonFinal(l);
                  const sisaStok = eff - l.totalTepat;
                  const produkStr = l.produkRincian.map(r => `${r.produk}(${r.lotBesar})`).join(', ');
                  return (
                    <tr key={l.material} className={`table-row ${eff === 0 ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold">{l.material}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{fmtNum(l.ukuranKarung)} kg/karung</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{produkStr}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(l.totalTepat)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-bold">{fmtNum(eff)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {sisaStok > 0
                          ? <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{fmtNum(sisaStok)}</span>
                          : '0'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number" min="0" step={l.ukuranKarung}
                          className="w-24 px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-right bg-white dark:bg-slate-700 dark:text-slate-100 focus:border-[#1A3C6E] focus:ring-2 focus:ring-[#1A3C6E]/15 outline-none transition-all"
                          value={l.bonFinalOverride ?? ''} placeholder={String(l.bonFinal)}
                          onChange={e => { const v = parseFloat(e.target.value); updateOverride(idx, isNaN(v) || e.target.value === '' ? null : v); }}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-slate-500 dark:text-slate-400">
                        {eff > 0 ? `${fmtNum(eff / l.ukuranKarung)} krgn` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="table-foot">
                  <td colSpan={2} className="px-3 py-2.5 text-slate-600 dark:text-slate-300">TOTAL</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(totTepat)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(totFinal)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(totSisa)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex gap-3 mt-4 flex-wrap">
            <button className="btn btn-primary" onClick={simpan}><Save size={14} />Simpan Bon</button>
            <button className="btn btn-outline" onClick={resetPlanForm}><RefreshCw size={14} />Reset</button>
          </div>
        </div>
      )}

      {bonSaved && (
        <div className="card">
          <div className="alert alert-success mb-4">
            <Info size={16} className="shrink-0 mt-0.5" />
            <span>Bon berhasil disimpan dengan status <strong>OPEN</strong>. Cetak bon untuk diserahkan ke gudang.</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button className="btn btn-primary" onClick={() => { const b = db.getShiftById(currentBonId); if (b) printBon(b); }}>
              <Printer size={14} />Cetak Bon
            </button>
            <button className="btn btn-warning" onClick={() => navigate('tutup-shift')}>
              <Package size={14} />Tutup Shift
            </button>
            <button className="btn btn-outline" onClick={resetPlanForm}>
              <Plus size={14} />Bon Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
