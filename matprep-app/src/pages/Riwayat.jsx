import { useState } from 'react';
import { ClipboardList, Package, Printer, Trash2, FolderOpen, AlertTriangle } from 'lucide-react';
import useStore from '../store/useStore';
import { db } from '../store/db';
import { PRODUCTS } from '../constants/defaults';
import { effBonFinal, fmtNum, formatDate } from '../lib/calc';
import { printBon } from '../lib/print';

export default function Riwayat() {
  const { navigate, setCurrentBonId, showModal } = useStore();
  const [filterBulan, setFilterBulan] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expanded, setExpanded] = useState({});
  const [, forceUpdate] = useState(0);

  const shifts = db.getShifts();
  const months = [...new Set(shifts.map(s => s.tanggal?.slice(0, 7)).filter(Boolean))].sort().reverse();

  let list = shifts;
  if (filterBulan)  list = list.filter(s => s.tanggal?.startsWith(filterBulan));
  if (filterShift)  list = list.filter(s => s.shift === filterShift);
  if (filterStatus) list = list.filter(s => s.status === filterStatus);

  function hapus(id) {
    const bon = db.getShiftById(id);
    if (!bon) return;
    showModal(
      'Hapus Bon',
      `Hapus bon ${formatDate(bon.tanggal)} — Shift ${bon.shift}? Tindakan ini tidak bisa dibatalkan.`,
      () => { db.deleteShift(id); forceUpdate(n => n + 1); },
    );
  }

  const selectCls = 'px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:border-[#1A3C6E] dark:focus:border-blue-400 focus:ring-2 focus:ring-[#1A3C6E]/15 outline-none transition-all cursor-pointer';

  return (
    <div className="p-4 md:p-6 max-w-[1100px]">
      <div className="mb-5">
        <h2 className="text-[22px] font-bold text-[#1A3C6E] dark:text-blue-400">Riwayat Bon</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Daftar semua bon yang telah dibuat</p>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        {[
          { value: filterBulan, set: setFilterBulan, opts: [['', 'Semua Bulan'], ...months.map(m => [m, m])] },
          { value: filterShift, set: setFilterShift, opts: [['', 'Semua Shift'], ['Red', 'Red'], ['White', 'White']] },
          { value: filterStatus, set: setFilterStatus, opts: [['', 'Semua Status'], ['Open', 'Open'], ['Closed', 'Closed']] },
        ].map(({ value, set, opts }, i) => (
          <select key={i} className={selectCls} value={value} onChange={e => set(e.target.value)}>
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <FolderOpen size={48} className="mx-auto mb-3 opacity-30" />
          <h3 className="text-base font-semibold text-slate-500 dark:text-slate-400">Tidak ada data</h3>
          <p className="text-sm mt-1">Belum ada bon yang sesuai filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(s => {
            const totFinal = s.bonLines.reduce((a, l) => a + effBonFinal(l), 0);
            const lotStr = PRODUCTS.filter(p => (s.lotBesarMap?.[p] ?? 0) > 0)
              .map(p => `${p}: ${s.lotBesarMap[p]}`).join(' · ');
            const hasOver = s.bonLines.some(l => l.pemakaianAktual !== null && l.pemakaianAktual > (l.sisaStok ?? 0) + effBonFinal(l));
            const isOpen = expanded[s.id];

            return (
              <div key={s.id} className="card hover:shadow-md transition-shadow duration-150">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <strong className="text-[15px] text-slate-800 dark:text-slate-100">{formatDate(s.tanggal)}</strong>
                      <span className={`badge badge-${s.shift === 'Red' ? 'red' : 'white'}`}>Shift {s.shift}</span>
                      {s.waktu && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">{s.waktu}</span>}
                      <span className={`badge badge-${s.status === 'Open' ? 'open' : 'closed'}`}>{s.status}</span>
                      {hasOver && (
                        <span className="badge badge-over flex items-center gap-1">
                          <AlertTriangle size={10} />Over-Use
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {lotStr} · Total Bon: <strong className="text-slate-700 dark:text-slate-300">{fmtNum(totFinal)} kg</strong>
                    </div>
                    {s.closedAt && (
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        Ditutup: {new Date(s.closedAt).toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <button className="btn btn-outline btn-sm"
                      onClick={() => setExpanded(e => ({ ...e, [s.id]: !e[s.id] }))}>
                      <ClipboardList size={13} />{isOpen ? 'Tutup' : 'Detail'}
                    </button>
                    {s.status === 'Open' && (
                      <button className="btn btn-warning btn-sm"
                        onClick={() => { setCurrentBonId(s.id); navigate('tutup-shift'); }}>
                        <Package size={13} />Tutup Shift
                      </button>
                    )}
                    <button className="btn btn-outline btn-sm"
                      onClick={() => printBon(db.getShiftById(s.id))}>
                      <Printer size={13} />Cetak
                    </button>
                    <button
                      className="btn btn-outline btn-sm text-red-600 border-red-200 hover:border-red-500 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:border-red-600 dark:hover:bg-red-950/30"
                      onClick={() => hapus(s.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 overflow-x-auto border-t border-slate-100 dark:border-slate-700 pt-3 -mx-5 px-5">
                    <table className="w-full text-xs border-collapse min-w-[440px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/50">
                          {['Material','Total Tepat','Sisa Stok (Prev)','Bon Final',
                            ...(s.status === 'Closed' ? ['Total Pemakaian','Sisa Akhir'] : [])
                          ].map(h => (
                            <th key={h} className={`px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 ${h === 'Material' ? 'text-left' : 'text-right'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s.bonLines.map(l => {
                          const eff = effBonFinal(l);
                          return (
                            <tr key={l.material} className="border-t border-slate-100 dark:border-slate-700">
                              <td className="px-3 py-2 font-medium">{l.material}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{fmtNum(l.totalTepat)}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                                {(l.sisaStok ?? 0) > 0 ? fmtNum(l.sisaStok) : <span className="text-slate-400">—</span>}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-bold">{fmtNum(eff)}</td>
                              {s.status === 'Closed' && <>
                                <td className="px-3 py-2 text-right tabular-nums">{fmtNum(l.pemakaianAktual)}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">{fmtNum(l.sisaAkhir)}</td>
                              </>}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
