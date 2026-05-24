import { useState, useEffect } from 'react';
import { CheckCircle, ArrowLeft, AlertTriangle, Package } from 'lucide-react';
import useStore from '../store/useStore';
import { db } from '../store/db';
import { effBonFinal, fmtNum, formatDate } from '../lib/calc';

export default function TutupShift() {
  const { currentBonId, navigate, showModal } = useStore();
  const [bon, setBon] = useState(null);
  const [pemakaian, setPemakaian] = useState({});

  useEffect(() => {
    if (!currentBonId) return;
    const b = db.getShiftById(currentBonId);
    if (!b) return;

    // Auto-generate pemakaian aktual = totalTepat if not yet set
    let changed = false;
    b.bonLines.forEach(l => {
      if (l.pemakaianAktual === null) {
        l.pemakaianAktual = l.totalTepat;
        changed = true;
      }
    });
    if (changed) db.updateShift(currentBonId, { bonLines: b.bonLines });

    setBon({ ...b });
    const init = {};
    b.bonLines.forEach((l, i) => { init[i] = l.pemakaianAktual ?? ''; });
    setPemakaian(init);
  }, [currentBonId]);

  function onPemakaianChange(idx, val) {
    setPemakaian(p => ({ ...p, [idx]: val }));
    const v = parseFloat(val);
    const b = db.getShiftById(currentBonId);
    if (!b) return;
    b.bonLines[idx].pemakaianAktual = isNaN(v) || val === '' ? null : v;
    db.updateShift(currentBonId, { bonLines: b.bonLines });
    setBon({ ...b });
  }

  function handleKonfirmasi() {
    if (!bon) return;
    const doClose = () => {
      const fresh = db.getShiftById(currentBonId);
      const updLines = fresh.bonLines.map(l => {
        const eff = effBonFinal(l);
        const a = l.pemakaianAktual ?? 0;
        const totalTersedia = (l.sisaStok ?? 0) + eff;
        return { ...l, pemakaianAktual: a, sisaAkhir: Math.max(0, totalTersedia - a) };
      });
      db.updateShift(currentBonId, {
        status: 'Closed', bonLines: updLines, closedAt: new Date().toISOString(),
      });
      setBon(db.getShiftById(currentBonId));
    };

    showModal(
      'Konfirmasi Tutup Shift',
      `Tutup shift ${bon.shift} ${formatDate(bon.tanggal)}? Sisa stok akan diteruskan ke shift berikutnya.`,
      doClose,
    );
  }

  if (!currentBonId || !bon) {
    return (
      <div className="p-4 md:p-6">
        <div className="card">
          <div className="text-center py-12 text-slate-400">
            <Package size={48} className="mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-semibold text-slate-500 dark:text-slate-400">Tidak ada bon yang dipilih</h3>
            <p className="text-sm mt-1">Pilih bon dari halaman Riwayat untuk menutup shift</p>
            <button className="btn btn-outline mt-4" onClick={() => navigate('riwayat')}>
              <ArrowLeft size={14} />Ke Riwayat
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isClosed = bon.status === 'Closed';
  let totFinal = 0, totTersedia = 0, totAktual = 0, totSisa = 0, hasAktual = false;
  bon.bonLines.forEach(l => {
    const eff = effBonFinal(l);
    totFinal += eff;
    totTersedia += (l.sisaStok ?? 0) + eff;
    if (l.pemakaianAktual !== null) { totAktual += l.pemakaianAktual; hasAktual = true; }
    if (l.sisaAkhir !== null) totSisa += l.sisaAkhir;
  });

  return (
    <div className="p-4 md:p-6 max-w-[1100px]">
      <div className="mb-5">
        <h2 className="text-[22px] font-bold text-[#1A3C6E] dark:text-blue-400">Tutup Shift</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 flex items-center gap-2 flex-wrap">
          {formatDate(bon.tanggal)} — Shift {bon.shift}
          <span className={`badge badge-${isClosed ? 'closed' : 'open'}`}>{bon.status}</span>
        </p>
      </div>

      {isClosed ? (
        <div className="alert alert-success">
          <CheckCircle size={16} className="shrink-0 mt-0.5" />
          <span>Shift sudah ditutup. Sisa stok telah disimpan untuk shift berikutnya.</span>
        </div>
      ) : (
        <div className="alert alert-info">
          <CheckCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            Pemakaian aktual telah diisi otomatis sesuai total tepat.
            Anda dapat mengubah nilai jika ada perbedaan aktual.
          </span>
        </div>
      )}

      <div className="card mb-4">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm border-collapse min-w-[860px]">
            <thead>
              <tr className="table-header">
                <th className="px-3 py-2.5 text-left font-semibold">Material</th>
                <th className="px-3 py-2.5 text-left font-semibold">Produk</th>
                <th className="px-3 py-2.5 text-right font-semibold">Sisa Sebelumnya (kg)</th>
                <th className="px-3 py-2.5 text-right font-semibold">Bon Final (kg)</th>
                <th className="px-3 py-2.5 text-right font-semibold">Total Tersedia (kg)</th>
                <th className="px-3 py-2.5 text-right font-semibold">Pemakaian Aktual (kg)</th>
                <th className="px-3 py-2.5 text-right font-semibold">Sisa Akhir (kg)</th>
                <th className="px-3 py-2.5 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {bon.bonLines.map((l, idx) => {
                const eff = effBonFinal(l);
                const aktVal = l.pemakaianAktual;
                const totalTersedia = (l.sisaStok ?? 0) + eff;
                const isOver = aktVal !== null && aktVal > totalTersedia;
                const sisa = aktVal !== null ? Math.max(0, totalTersedia - aktVal) : null;
                const produkStr = l.produkRincian.map(r => r.produk).join('+');
                return (
                  <tr
                    key={l.material}
                    className={`border-b border-slate-100 dark:border-slate-700 transition-colors ${isOver ? 'bg-red-50 dark:bg-red-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <td className="px-3 py-2.5 font-semibold">{l.material}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{produkStr}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {(l.sisaStok ?? 0) > 0
                        ? <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{fmtNum(l.sisaStok)}</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold">{fmtNum(eff)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-[#1A3C6E] dark:text-blue-400">{fmtNum(totalTersedia)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {isClosed ? (
                        <span className="tabular-nums">{fmtNum(aktVal)}</span>
                      ) : (
                        <input
                          type="number" min="0" step="0.1"
                          className="w-28 px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-right bg-white dark:bg-slate-700 dark:text-slate-100 focus:border-[#1A3C6E] focus:ring-2 focus:ring-[#1A3C6E]/15 outline-none transition-all"
                          value={pemakaian[idx] ?? ''} placeholder="0"
                          onChange={e => onPemakaianChange(idx, e.target.value)}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {sisa !== null ? (
                        <strong className={isOver ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}>
                          {isOver ? '0' : fmtNum(sisa)}
                        </strong>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {isOver ? (
                        <span className="badge badge-over flex items-center gap-1">
                          <AlertTriangle size={11} />Over-Use
                        </span>
                      ) : sisa !== null ? (
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">
                          <CheckCircle size={12} />OK
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="table-foot">
                <td colSpan={2} className="px-3 py-2.5 text-slate-600 dark:text-slate-300">TOTAL</td>
                <td />
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(totFinal)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(totTersedia)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{hasAktual ? fmtNum(totAktual) : '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{hasAktual ? fmtNum(totSisa) : '—'}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {!isClosed && (
          <button className="btn btn-success" onClick={handleKonfirmasi}>
            <CheckCircle size={15} />Konfirmasi Tutup Shift
          </button>
        )}
        <button className="btn btn-outline" onClick={() => navigate('riwayat')}>
          <ArrowLeft size={14} />Kembali ke Riwayat
        </button>
      </div>
    </div>
  );
}
