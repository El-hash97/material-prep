import { useState } from 'react';
import { ClipboardList, Package, Printer, Trash2, FolderOpen, AlertTriangle, Filter, ChevronDown } from 'lucide-react';
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
  if (filterBulan) list = list.filter(s => s.tanggal?.startsWith(filterBulan));
  if (filterShift) list = list.filter(s => s.shift === filterShift);
  if (filterStatus) list = list.filter(s => s.status === filterStatus);

  const openCount = list.filter(s => s.status === 'Open').length;
  const closedCount = list.filter(s => s.status === 'Closed').length;
  const totalBonKg = list.reduce((a, s) => a + s.bonLines.reduce((x, l) => x + effBonFinal(l), 0), 0);

  function hapus(id) {
    const bon = db.getShiftById(id);
    if (!bon) return;
    showModal(
      'Hapus Bon',
      `Hapus bon ${formatDate(bon.tanggal)} — Shift ${bon.shift}? Tindakan ini tidak bisa dibatalkan.`,
      () => { db.deleteShift(id); forceUpdate(n => n + 1); },
    );
  }

  return (
    <div className="mx-auto max-w-[1480px] p-4 md:p-7">
      <div className="page-head">
        <div>
          <h1 className="page-title">Riwayat Bon</h1>
          <p className="page-sub">Semua bon yang pernah dibuat, lengkap dengan pemakaian dan sisa akhir.</p>
        </div>
        <span className="chip text-steel-dim">
          {list.length} dari {shifts.length} bon
        </span>
      </div>

      <div className="bento mb-3">
        <section className="tile md:col-span-8">
          <div className="tile-head">
            <div>
              <div className="tile-label">Filter Riwayat</div>
              <div className="mt-1.5 text-[11px] text-steel-faint">Persempit berdasarkan bulan, shift, atau status.</div>
            </div>
            <Filter size={15} className="text-steel-faint" />
          </div>
          <div className="tile-body">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="form-label" htmlFor="filter-bulan">Bulan</label>
                <select id="filter-bulan" className="form-control cursor-pointer" value={filterBulan} onChange={e => setFilterBulan(e.target.value)}>
                  <option value="">Semua bulan</option>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="filter-shift">Shift</label>
                <select id="filter-shift" className="form-control cursor-pointer" value={filterShift} onChange={e => setFilterShift(e.target.value)}>
                  <option value="">Semua shift</option>
                  <option value="Red">Red</option>
                  <option value="White">White</option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="filter-status">Status</label>
                <select id="filter-status" className="form-control cursor-pointer" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">Semua status</option>
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="tile md:col-span-4">
          <div className="tile-head">
            <div>
              <div className="tile-label">Ringkasan Hasil</div>
              <div className="mt-1.5 text-[11px] text-steel-faint">Setelah filter diterapkan</div>
            </div>
          </div>
          <div className="tile-body">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel-faint">Total bon</div>
                <div className="readout mt-1 text-3xl">{list.length}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel-faint">Total kg</div>
                <div className="readout mt-1 text-3xl text-signal">{fmtNum(totalBonKg)}</div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-steel-dim">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" />{openCount} open
              </div>
              <div className="flex items-center gap-2 text-[11px] text-steel-dim">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />{closedCount} closed
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="bento">
        {list.length === 0 ? (
          <section className="tile md:col-span-12">
            <div className="tile-body flex min-h-[260px] flex-col items-center justify-center text-center">
              <FolderOpen size={38} className="mb-3 text-steel-faint/50" />
              <h2 className="font-display text-xl font-semibold text-paper">Tidak ada bon yang cocok</h2>
              <p className="mt-1 text-sm text-steel-faint">Ubah filter atau buat bon baru untuk memulai riwayat.</p>
              <button className="btn btn-outline btn-sm mt-4" onClick={() => navigate('planning')}>
                <ClipboardList size={14} />Buat Bon
              </button>
            </div>
          </section>
        ) : (
          list.map(s => {
            const totFinal = s.bonLines.reduce((a, l) => a + effBonFinal(l), 0);
            const lotStr = PRODUCTS
              .filter(p => (s.lotBesarMap?.[p] ?? 0) > 0)
              .map(p => `${p}: ${s.lotBesarMap[p]}`)
              .join(' · ');
            const hasOver = s.bonLines.some(l => l.pemakaianAktual !== null && l.pemakaianAktual > (l.sisaStok ?? 0) + effBonFinal(l));
            const isOpen = expanded[s.id];

            return (
              <section key={s.id} className="tile md:col-span-12">
                <div className="tile-body">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="font-display text-lg font-semibold text-paper">{formatDate(s.tanggal)}</strong>
                        <span className={`badge badge-${s.shift === 'Red' ? 'red' : 'white'}`}>Shift {s.shift}</span>
                        {s.waktu && <span className="chip py-0.5 text-steel-dim">{s.waktu}</span>}
                        <span className={`badge badge-${s.status === 'Open' ? 'open' : 'closed'}`}>{s.status}</span>
                        {hasOver && (
                          <span className="badge badge-over">
                            <AlertTriangle size={10} />Over-Use
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 text-[11px] text-steel-faint">
                        {lotStr || 'Tidak ada lot tercatat'} · Total bon:{' '}
                        <strong className="font-semibold text-paper">{fmtNum(totFinal)} kg</strong>
                      </div>
                      {s.closedAt && (
                        <div className="mt-0.5 text-[10px] text-steel-faint">
                          Ditutup: {new Date(s.closedAt).toLocaleString('id-ID')}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => setExpanded(e => ({ ...e, [s.id]: !e[s.id] }))}
                      >
                        <ChevronDown size={12} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        {isOpen ? 'Tutup' : 'Detail'}
                      </button>
                      {s.status === 'Open' && (
                        <button
                          className="btn btn-warning btn-xs"
                          onClick={() => { setCurrentBonId(s.id); navigate('tutup-shift'); }}
                        >
                          <Package size={12} />Tutup Shift
                        </button>
                      )}
                      <button className="btn btn-outline btn-xs" onClick={() => printBon(db.getShiftById(s.id))}>
                        <Printer size={12} />Cetak
                      </button>
                      <button
                        className="btn btn-ghost btn-xs text-danger hover:bg-danger/10 hover:text-danger"
                        onClick={() => hapus(s.id)}
                        aria-label={`Hapus bon ${formatDate(s.tanggal)} shift ${s.shift}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="-mx-4 mt-4 overflow-x-auto border-t border-white/[0.06] px-4 pt-3">
                      <p className="mb-2 text-[10px] text-steel-faint md:hidden">Geser tabel ke samping untuk melihat kolom lainnya.</p>
                      <table className="data-table min-w-[520px]">
                        <thead>
                          <tr className="table-header">
                            {['Material', 'Total Tepat', 'Sisa Stok (Prev)', 'Bon Final',
                              ...(s.status === 'Closed' ? ['Total Pemakaian', 'Sisa Akhir'] : []),
                            ].map(h => (
                              <th key={h} className={`px-3 py-2 ${h === 'Material' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {s.bonLines.map(l => {
                            const eff = effBonFinal(l);
                            return (
                              <tr key={l.material} className="table-row">
                                <td className="px-3 py-2 font-semibold text-paper">{l.material}</td>
                                <td className="num-cell px-3 py-2 tabular-nums text-steel">{fmtNum(l.totalTepat)}</td>
                                <td className="num-cell px-3 py-2 font-semibold tabular-nums text-success">
                                  {(l.sisaStok ?? 0) > 0 ? fmtNum(l.sisaStok) : <span className="text-steel-faint">—</span>}
                                </td>
                                <td className="num-cell px-3 py-2 font-bold tabular-nums text-paper">{fmtNum(eff)}</td>
                                {s.status === 'Closed' && (
                                  <>
                                    <td className="num-cell px-3 py-2 tabular-nums text-signal">{fmtNum(l.pemakaianAktual)}</td>
                                    <td className="num-cell px-3 py-2 font-semibold tabular-nums text-success">{fmtNum(l.sisaAkhir)}</td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
