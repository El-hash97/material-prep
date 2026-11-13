import { RefreshCw, Save, Printer, Package, Plus, AlertTriangle, Info, Scale } from 'lucide-react';
import useStore from '../store/useStore';
import { db } from '../store/db';
import { PRODUCTS, PRODUCT_TONES } from '../constants/defaults';
import { buildBonLines, calcLotBesar, getAllMaterials, effBonFinal, fmtNum, formatDate, genId, todayStr } from '../lib/calc';
import { printBon } from '../lib/print';
import { lazy, Suspense } from 'react';
const MejaInokulasi3D = lazy(() => import('../components/MejaInokulasi3D'));

export default function Planning() {
  const {
    planForm, updatePlanForm, updateLotKecil,
    calculatedBonLines, calculatedLotBesarMap,
    setCalculatedBon, updateOverride, bonSaved, setBonSaved,
    currentBonId, setCurrentBonId, navigate, resetPlanForm,
  } = useStore();

  const settings = db.getSettings();
  const openShift = db.getShifts().find(s => s.status === 'Open');
  const lastClosed = db.getLastClosed();
  const prevSisaMap = {};
  if (lastClosed) {
    for (const l of lastClosed.bonLines) {
      if (l.sisaAkhir) prevSisaMap[l.material] = (prevSisaMap[l.material] ?? 0) + l.sisaAkhir;
    }
  }
  const hasPrevSisa = Object.values(prevSisaMap).some(v => v > 0);

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
  const tubeMode = hasBon ? 'plan' : calculatedBonLines.length > 0 ? 'saved' : 'pre';
  const tubeLines = calculatedBonLines.length > 0
    ? calculatedBonLines
    : getAllMaterials(settings).map(material => ({
        material, sisaStok: prevSisaMap[material] ?? 0, totalTepat: 0, bonFinal: 0, bonFinalOverride: null,
      }));
  const zeroMats =calculatedBonLines.filter(l => effBonFinal(l) === 0 && l.totalTepat > 0).map(l => l.material);

  let totTepat = 0, totFinal = 0, totSisa = 0;
  calculatedBonLines.forEach(l => {
    totTepat += l.totalTepat;
    const eff = effBonFinal(l);
    totFinal += eff;
    totSisa += l.sisaStok + eff - l.totalTepat;
  });

  const totalLotKecil = PRODUCTS.reduce((a, p) => a + (planForm.lotKecilMap[p] ?? 0), 0);
  const totalLotBesar = PRODUCTS.reduce((a, p) => a + calcLotBesar(planForm.lotKecilMap[p] ?? 0, settings.rasioKonversi), 0);

  return (
    <div className="mx-auto max-w-[1480px] p-4 md:p-7">
      <div className="page-head">
        <div>
          <h1 className="page-title">Buat Bon Material</h1>
          <p className="page-sub">
            Masukkan lot per produk — sistem menghitung kebutuhan bon, sisa stok, dan karung secara otomatis.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip text-steel-dim">
            <Scale size={12} />
            Rasio {settings.rasioKonversi}:1
          </span>
          <span className="chip text-steel-dim">
            {totalLotKecil} lot kecil · {totalLotBesar} lot besar
          </span>
        </div>
      </div>

      {openShift && (
        <div className="mb-3">
          <div className="alert alert-warning !mb-0">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              Bon <strong>{formatDate(openShift.tanggal)} — Shift {openShift.shift}</strong> masih OPEN.{' '}
              <button
                className="cursor-pointer border-none bg-transparent font-bold underline hover:opacity-80"
                onClick={() => { setCurrentBonId(openShift.id); navigate('tutup-shift'); }}
              >
                Tutup sekarang
              </button>
            </span>
          </div>
        </div>
      )}

      <div className="bento">
        <section className="tile md:col-span-4">
          <div className="tile-head">
            <div>
              <div className="tile-label">Informasi Shift</div>
              <div className="mt-1.5 text-[11px] text-steel-faint">Tanggal, shift, dan waktu kerja</div>
            </div>
          </div>
          <div className="tile-body space-y-3">
            <div>
              <label className="form-label" htmlFor="plan-date">Tanggal</label>
              <input
                id="plan-date"
                type="date"
                className="form-control"
                value={planForm.tanggal ?? todayStr()}
                onChange={e => updatePlanForm({ tanggal: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="plan-shift">Shift</label>
              <select
                id="plan-shift"
                className="form-control cursor-pointer"
                value={planForm.shift}
                onChange={e => updatePlanForm({ shift: e.target.value })}
              >
                <option value="Red">Red</option>
                <option value="White">White</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="plan-time">Waktu</label>
              <select
                id="plan-time"
                className="form-control cursor-pointer"
                value={planForm.waktu ?? 'Day'}
                onChange={e => updatePlanForm({ waktu: e.target.value })}
              >
                <option value="Day">Day</option>
                <option value="Night">Night</option>
              </select>
            </div>
            <div className="well">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel-faint">Status bon</div>
              <div className="mt-1 flex items-center gap-2 text-[13px] font-semibold text-paper">
                <span className={`h-1.5 w-1.5 rounded-full ${bonSaved ? 'bg-success' : 'bg-signal'}`} />
                {bonSaved ? 'Tersimpan — menunggu cetak' : hasBon ? 'Belum disimpan' : 'Belum dihitung'}
              </div>
            </div>
          </div>
        </section>

        <section className="tile md:col-span-8">
          <div className="tile-head">
            <div>
              <div className="tile-label">Input Lot Kecil per Produk</div>
              <div className="mt-1.5 text-[11px] text-steel-faint">
                {settings.rasioKonversi} lot kecil = 1 lot besar
              </div>
            </div>
            <span className="chip text-steel-dim">{totalLotBesar} lot besar</span>
          </div>
          <div className="tile-body">
            <div className="grid grid-cols-2 gap-2.5 md:gap-3">
              {PRODUCTS.map(p => {
                const lk = planForm.lotKecilMap[p] ?? 0;
                const lb = calcLotBesar(lk, settings.rasioKonversi);
                const tone = PRODUCT_TONES[p];
                return (
                  <div
                    key={p}
                    className="rounded-[4px] border bg-iron-900/70 p-3 transition-colors"
                    style={{
                      borderColor: lk > 0 ? tone.color : 'rgba(255,255,255,0.09)',
                      backgroundColor: lk > 0 ? tone.soft : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-display text-2xl font-semibold leading-none" style={{ color: tone.color }}>{p}</div>
                      <div className="text-right">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-steel-faint">Lot besar</div>
                        <div className="font-display text-xl font-semibold leading-none text-paper">{lb}</div>
                      </div>
                    </div>
                    <label className="form-label mt-3" htmlFor={`lot-${p}`}>Lot kecil</label>
                    <input
                      id={`lot-${p}`}
                      type="number" min="0"
                      className="form-control text-right font-semibold"
                      value={lk || ''} placeholder="0"
                      onChange={e => updateLotKecil(p, parseInt(e.target.value) || 0)}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
              <p className="text-[11px] text-steel-faint">
                Total {totalLotKecil} lot kecil akan dikonversi menjadi {totalLotBesar} lot besar.
              </p>
              <button className="btn btn-primary btn-sm" onClick={hitung}>
                <RefreshCw size={14} />Hitung Bon
              </button>
            </div>
          </div>
        </section>

        {hasPrevSisa && (
          <section className="tile md:col-span-12">
            <div className="tile-head">
              <div>
                <div className="tile-label">Sisa Stok Sebelumnya</div>
                <div className="mt-1.5 text-[11px] text-steel-faint">
                  {formatDate(lastClosed.tanggal)} — Shift {lastClosed.shift}
                </div>
              </div>
              <Package size={15} className="text-success" />
            </div>
            <div className="tile-body">
              <p className="mb-3 text-[11px] leading-relaxed text-steel-faint">
                Bon dikurangi otomatis agar material yang sudah cukup tidak dibon ulang.
              </p>
              <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(prevSisaMap).filter(([, v]) => v > 0).map(([mat, sisa]) => (
                  <div key={mat} className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-2">
                    <span className="truncate text-[13px] font-semibold text-paper">{mat}</span>
                    <span className="shrink-0 font-display text-lg font-semibold tabular-nums text-success">
                      {fmtNum(sisa)} <span className="text-[11px] font-medium text-steel-faint">kg</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="tile md:col-span-12">
          <div className="tile-head">
            <div>
              <div className="tile-label">Visualisasi Stok · Meja Inokulasi 3D</div>
              <div className="mt-1.5 text-[11px] text-steel-faint">
                Isi kompartemen = stok (kg). {hasBon ? 'Orange transparan = rencana bon, jadi hijau setelah bon disimpan.' : 'Tekan Hitung Bon untuk melihat rencana bon.'}
              </div>
            </div>
            <span className="chip text-steel-dim">Batas minimum</span>
          </div>
          <div className="tile-body">
            <Suspense fallback={<div className="h-[420px] animate-pulse rounded-[4px] bg-iron-900/70 md:h-[500px]" />}>
              <MejaInokulasi3D lines={tubeLines} stokMinimum={settings.stokMinimum} kapasitas={settings.kapasitasTabung} mode={tubeMode} />
            </Suspense>
          </div>
        </section>

        {hasBon && (
          <section className="tile md:col-span-12">
            <div className="tile-head">
              <div>
                <div className="tile-label">Tabel Bon Material</div>
                <div className="mt-1.5 text-[11px] text-steel-faint">
                  {calculatedBonLines.length} material · override bon final per baris
                </div>
              </div>
              <div className="flex items-center gap-2 text-right">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-steel-faint">Total bon</div>
                  <div className="font-display text-xl font-semibold leading-none text-signal">{fmtNum(totFinal)} kg</div>
                </div>
              </div>
            </div>
            <div className="tile-body">
              {zeroMats.length > 0 && (
                <div className="alert alert-info !mb-3">
                  <Info size={16} className="mt-0.5 shrink-0" />
                  <span>Stok sudah mencukupi, tidak perlu dibon: <strong>{zeroMats.join(', ')}</strong></span>
                </div>
              )}
              <div className="-mx-4 overflow-x-auto px-4">
                <table className="data-table min-w-[820px]">
                  <thead>
                    <tr className="table-header">
                      {['Material', 'Produk', 'Total Tepat', 'Sisa Sebelum', 'Bon Final', 'Sisa Setelah', 'Override', 'Karung'].map((h, i) => (
                        <th key={h} className={`px-3 py-2.5 ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calculatedBonLines.map((l, idx) => {
                      const eff = effBonFinal(l);
                      const sisaSetelah = l.sisaStok + eff - l.totalTepat;
                      const produkStr = l.produkRincian.map(r => `${r.produk}(${r.lotBesar})`).join(', ');
                      return (
                        <tr key={l.material} className={`table-row ${eff === 0 ? 'opacity-55' : ''}`}>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-paper">{l.material}</div>
                            <div className="text-[10px] text-steel-faint">{fmtNum(l.ukuranKarung)} kg/karung</div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-steel-dim">{produkStr}</td>
                          <td className="num-cell px-3 py-2.5 tabular-nums text-steel">{fmtNum(l.totalTepat)}</td>
                          <td className="num-cell px-3 py-2.5 tabular-nums">
                            {l.sisaStok > 0
                              ? <span className="font-semibold text-success">{fmtNum(l.sisaStok)}</span>
                              : <span className="text-steel-faint">—</span>}
                          </td>
                          <td className="num-cell px-3 py-2.5 font-bold tabular-nums text-paper">
                            {eff === 0
                              ? <span className="text-[11px] font-semibold text-success">Cukup</span>
                              : fmtNum(eff)}
                          </td>
                          <td className="num-cell px-3 py-2.5 tabular-nums">
                            {sisaSetelah > 0
                              ? <span className="font-semibold text-success">{fmtNum(sisaSetelah)}</span>
                              : <span className="text-steel-faint">0</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <input
                              type="number" min="0" step={l.ukuranKarung}
                              className="form-control w-24 py-1.5 text-right text-xs"
                              value={l.bonFinalOverride ?? ''} placeholder={String(l.bonFinal)}
                              aria-label={`Override bon final ${l.material}`}
                              onChange={e => {
                                const v = parseFloat(e.target.value);
                                updateOverride(idx, isNaN(v) || e.target.value === '' ? null : v);
                              }}
                            />
                          </td>
                          <td className="num-cell px-3 py-2.5 text-xs text-steel-dim">
                            {eff > 0 ? `${fmtNum(eff / l.ukuranKarung)} krgn` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="table-foot">
                      <td colSpan={2} className="px-3 py-2.5 text-[10px] uppercase tracking-[0.14em] text-steel-dim">Total</td>
                      <td className="num-cell px-3 py-2.5 tabular-nums">{fmtNum(totTepat)}</td>
                      <td />
                      <td className="num-cell px-3 py-2.5 tabular-nums text-signal">{fmtNum(totFinal)}</td>
                      <td className="num-cell px-3 py-2.5 tabular-nums">{fmtNum(totSisa)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button className="btn btn-primary" onClick={simpan}><Save size={14} />Simpan Bon</button>
                <button className="btn btn-outline" onClick={resetPlanForm}><RefreshCw size={14} />Reset</button>
              </div>
            </div>
          </section>
        )}

        {bonSaved && (
          <section className="tile md:col-span-12">
            <div className="tile-body">
              <div className="alert alert-success">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>Bon berhasil disimpan dengan status <strong>OPEN</strong>. Cetak bon untuk diserahkan ke gudang.</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  className="btn btn-primary"
                  onClick={() => { const b = db.getShiftById(currentBonId); if (b) printBon(b); }}
                >
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
          </section>
        )}
      </div>
    </div>
  );
}
