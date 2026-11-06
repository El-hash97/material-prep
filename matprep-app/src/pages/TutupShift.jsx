import { useState } from 'react';
import { CheckCircle, ArrowLeft, AlertTriangle, Package, ClipboardCheck } from 'lucide-react';
import useStore from '../store/useStore';
import { db } from '../store/db';
import { effBonFinal, fmtNum, formatDate } from '../lib/calc';

function prepareBon(id) {
  if (!id) return { bon: null, pemakaian: {} };
  const b = db.getShiftById(id);
  if (!b) return { bon: null, pemakaian: {} };

  let changed = false;
  b.bonLines.forEach(l => {
    if (l.pemakaianAktual === null) {
      l.pemakaianAktual = l.totalTepat;
      changed = true;
    }
  });
  if (changed) db.updateShift(id, { bonLines: b.bonLines });

  const pemakaian = {};
  b.bonLines.forEach((l, i) => { pemakaian[i] = l.pemakaianAktual ?? ''; });
  return { bon: { ...b }, pemakaian };
}

export default function TutupShift() {
  const { currentBonId, navigate, showModal } = useStore();
  const [view, setView] = useState(() => prepareBon(currentBonId));
  const { bon, pemakaian } = view;

  function onPemakaianChange(idx, val) {
    setView(v => ({ ...v, pemakaian: { ...v.pemakaian, [idx]: val } }));
    const v = parseFloat(val);
    const b = db.getShiftById(currentBonId);
    if (!b) return;
    b.bonLines[idx].pemakaianAktual = isNaN(v) || val === '' ? null : v;
    db.updateShift(currentBonId, { bonLines: b.bonLines });
    setView(prev => ({ ...prev, bon: { ...b } }));
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
      setView(v => ({ ...v, bon: db.getShiftById(currentBonId) }));
    };

    showModal(
      'Konfirmasi Tutup Shift',
      `Tutup shift ${bon.shift} ${formatDate(bon.tanggal)}? Sisa stok akan diteruskan ke shift berikutnya.`,
      doClose,
    );
  }

  if (!currentBonId || !bon) {
    return (
      <div className="mx-auto max-w-[1480px] p-4 md:p-7">
        <div className="page-head">
          <div>
            <h1 className="page-title">Tutup Shift</h1>
            <p className="page-sub">Serah terima sisa stok ke shift berikutnya.</p>
          </div>
        </div>
        <section className="tile">
          <div className="tile-body flex min-h-[300px] flex-col items-center justify-center text-center">
            <Package size={40} className="mb-3 text-steel-faint/50" />
            <h2 className="font-display text-xl font-semibold text-paper">Tidak ada bon yang dipilih</h2>
            <p className="mt-1 text-sm text-steel-faint">Pilih bon dari halaman Riwayat untuk menutup shift.</p>
            <button className="btn btn-outline mt-4" onClick={() => navigate('riwayat')}>
              <ArrowLeft size={14} />Ke Riwayat
            </button>
          </div>
        </section>
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
    <div className="mx-auto max-w-[1480px] p-4 md:p-7">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tutup Shift</h1>
          <p className="page-sub">
            {formatDate(bon.tanggal)}
            <span className="mx-2 text-steel-faint">·</span>
            Shift {bon.shift}
            {bon.waktu ? ` · ${bon.waktu}` : ''}
          </p>
        </div>
        <span className={`badge badge-${isClosed ? 'closed' : 'open'}`}>{bon.status}</span>
      </div>

      <div className="bento">
        <section className="tile md:col-span-12">
          <div className="tile-body !py-3">
            {isClosed ? (
              <div className="alert alert-success !mb-0">
                <CheckCircle size={16} className="mt-0.5 shrink-0" />
                <span>Shift sudah ditutup. Sisa stok telah disimpan untuk shift berikutnya.</span>
              </div>
            ) : (
              <div className="alert alert-info !mb-0">
                <ClipboardCheck size={16} className="mt-0.5 shrink-0" />
                <span>
                  Pemakaian aktual telah diisi otomatis sesuai total tepat.
                  Anda dapat mengubah nilai jika ada perbedaan aktual.
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="tile md:col-span-12">
          <div className="grid grid-cols-2 divide-x divide-white/[0.06] md:grid-cols-4">
            {[
              { label: 'Bon Final', value: fmtNum(totFinal), unit: 'kg', tone: 'text-paper' },
              { label: 'Total Tersedia', value: fmtNum(totTersedia), unit: 'kg', tone: 'text-info' },
              { label: 'Pemakaian Aktual', value: hasAktual ? fmtNum(totAktual) : '—', unit: 'kg', tone: 'text-signal' },
              { label: 'Sisa Akhir', value: hasAktual ? fmtNum(totSisa) : '—', unit: 'kg', tone: 'text-success' },
            ].map((item, i) => (
              <div key={item.label} className={`p-4 ${i >= 2 ? 'border-t border-white/[0.06] md:border-t-0' : ''}`}>
                <div className="tile-label">{item.label}</div>
                <div className={`readout mt-2 text-3xl ${item.tone}`}>
                  {item.value}
                  <span className="ml-1 text-xs font-medium text-steel-faint">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="tile md:col-span-12">
          <div className="tile-head">
            <div>
              <div className="tile-label">Rekonsiliasi Material</div>
              <div className="mt-1.5 text-[11px] text-steel-faint">
                {bon.bonLines.length} material · pemakaian aktual vs total tersedia
              </div>
            </div>
          </div>
          <div className="tile-body">
            <div className="-mx-4 overflow-x-auto px-4">
              <p className="mb-2 text-[10px] text-steel-faint md:hidden">Geser tabel ke samping untuk melihat kolom lainnya.</p>
              <table className="data-table min-w-[900px]">
                <thead>
                  <tr className="table-header">
                    <th className="px-3 py-2.5 text-left">Material</th>
                    <th className="px-3 py-2.5 text-left">Produk</th>
                    <th className="px-3 py-2.5 text-right">Sisa Sebelum</th>
                    <th className="px-3 py-2.5 text-right">Bon Final</th>
                    <th className="px-3 py-2.5 text-right">Total Tersedia</th>
                    <th className="px-3 py-2.5 text-right">Pemakaian Aktual</th>
                    <th className="px-3 py-2.5 text-right">Sisa Akhir</th>
                    <th className="px-3 py-2.5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bon.bonLines.map((l, idx) => {
                    const eff = effBonFinal(l);
                    const aktVal = l.pemakaianAktual;
                    const totalTersedia = (l.sisaStok ?? 0) + eff;
                    const isOver = aktVal !== null && aktVal > totalTersedia;
                    const sisa = aktVal !== null ? Math.max(0, totalTersedia - aktVal) : null;
                    const produkStr = l.produkRincian.map(r => r.produk).join(' + ');
                    return (
                      <tr
                        key={l.material}
                        className={`table-row ${isOver ? 'bg-danger/[0.06]' : ''}`}
                      >
                        <td className="px-3 py-2.5 font-semibold text-paper">{l.material}</td>
                        <td className="px-3 py-2.5 text-xs text-steel-dim">{produkStr}</td>
                        <td className="num-cell px-3 py-2.5 tabular-nums">
                          {(l.sisaStok ?? 0) > 0
                            ? <span className="font-semibold text-success">{fmtNum(l.sisaStok)}</span>
                            : <span className="text-steel-faint">—</span>}
                        </td>
                        <td className="num-cell px-3 py-2.5 font-bold tabular-nums text-paper">{fmtNum(eff)}</td>
                        <td className="num-cell px-3 py-2.5 font-bold tabular-nums text-info">{fmtNum(totalTersedia)}</td>
                        <td className="px-3 py-2.5 text-right">
                          {isClosed ? (
                            <span className="tabular-nums text-steel">{fmtNum(aktVal)}</span>
                          ) : (
                            <input
                              type="number" min="0" step="0.1"
                              className="form-control w-28 py-1.5 text-right text-xs"
                              value={pemakaian[idx] ?? ''} placeholder="0"
                              aria-label={`Pemakaian aktual ${l.material}`}
                              onChange={e => onPemakaianChange(idx, e.target.value)}
                            />
                          )}
                        </td>
                        <td className="num-cell px-3 py-2.5 tabular-nums">
                          {sisa !== null ? (
                            <strong className={isOver ? 'text-danger' : 'text-success'}>
                              {isOver ? '0' : fmtNum(sisa)}
                            </strong>
                          ) : (
                            <span className="text-steel-faint">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {isOver ? (
                            <span className="badge badge-over">
                              <AlertTriangle size={10} />Over-Use
                            </span>
                          ) : sisa !== null ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                              <CheckCircle size={12} />OK
                            </span>
                          ) : (
                            <span className="text-xs text-steel-faint">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="table-foot">
                    <td colSpan={2} className="px-3 py-2.5 text-[10px] uppercase tracking-[0.14em] text-steel-dim">Total</td>
                    <td />
                    <td className="num-cell px-3 py-2.5 tabular-nums">{fmtNum(totFinal)}</td>
                    <td className="num-cell px-3 py-2.5 tabular-nums text-info">{fmtNum(totTersedia)}</td>
                    <td className="num-cell px-3 py-2.5 tabular-nums text-signal">{hasAktual ? fmtNum(totAktual) : '—'}</td>
                    <td className="num-cell px-3 py-2.5 tabular-nums text-success">{hasAktual ? fmtNum(totSisa) : '—'}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
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
        </section>
      </div>
    </div>
  );
}
