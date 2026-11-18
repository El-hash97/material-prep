import { useState } from 'react';
import { Save, TriangleAlert, CircleAlert, CircleCheck, Timer } from 'lucide-react';
import { db } from '../store/db';
import { tengahShift, fmtNum, formatDate } from '../lib/calc';
import MaterialIcon from './MaterialIcon';

const STATUS = {
  habis:  { Icon: TriangleAlert, cls: 'text-danger', label: 'Habis sebelum akhir shift' },
  diatas: { Icon: CircleAlert, cls: 'text-signal', label: 'Di atas rencana' },
  ok:     { Icon: CircleCheck, cls: 'text-success', label: 'Sesuai rencana' },
};
const jam = iso => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

// Input pemakaian aktual setengah shift untuk shift Open. Disimpan di shift.pemakaianTengah
// ({ material: kg }) + pemakaianTengahAt. Kosong = belum dicatat (key tidak disimpan).
export default function PemakaianTengah({ shift }) {
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(shift.bonLines.map(l => [l.material, shift.pemakaianTengah?.[l.material] ?? ''])));
  const [savedAt, setSavedAt] = useState(shift.pemakaianTengahAt ?? null);
  const [dirty, setDirty] = useState(false);

  const rows = shift.bonLines.map(l => ({ line: l, ...tengahShift(l, draft[l.material]) }));
  const habis = rows.filter(r => r.status === 'habis');
  const diisi = rows.filter(r => r.status !== null).length;

  function simpan() {
    const map = {};
    for (const [m, v] of Object.entries(draft)) {
      const n = parseFloat(v);
      if (v !== '' && !isNaN(n) && n >= 0) map[m] = n;
    }
    const at = new Date().toISOString();
    db.updateShift(shift.id, { pemakaianTengah: map, pemakaianTengahAt: at });
    setSavedAt(at);
    setDirty(false);
  }

  return (
    <section className="tile md:col-span-12" aria-labelledby="tengah-title">
      <div className="tile-head">
        <div>
          <div id="tengah-title" className="tile-label">Pemakaian Aktual Setengah Shift</div>
          <div className="mt-1.5 text-[11px] text-steel-faint">
            Shift {shift.shift} {formatDate(shift.tanggal)} · isi kg yang sudah terpakai sampai tengah shift; proyeksi 1 shift = × 2
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-steel-dim" role="status">
          <Timer size={13} />
          {dirty ? 'Belum disimpan' : savedAt ? `Tersimpan ${jam(savedAt)}` : 'Belum dicatat'}
        </span>
      </div>
      <div className="tile-body">
        {habis.length > 0 && (
          <div className="alert alert-danger !mb-3">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <span>
              Diproyeksi habis sebelum akhir shift: <strong>{habis.map(r => `${r.line.material} (kurang ±${fmtNum(Math.round(r.kurang))} kg)`).join(', ')}</strong>. Pertimbangkan bon susulan.
            </span>
          </div>
        )}
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr className="table-header">
                {['Material', 'Tersedia', 'Rencana 1 Shift', 'Terpakai ½ Shift', 'Proyeksi 1 Shift', 'Stok Sekarang'].map((h, i) => (
                  <th key={h} className={`px-3 py-2.5 ${i ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const st = STATUS[r.status];
                return (
                  <tr key={r.line.material} className={`table-row ${r.status === 'habis' ? 'bg-danger/[0.06]' : ''}`}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <MaterialIcon material={r.line.material} />
                        <span className="font-semibold text-paper">{r.line.material}</span>
                      </div>
                    </td>
                    <td className="num-cell px-3 py-2 tabular-nums text-steel">{fmtNum(r.tersedia)}</td>
                    <td className="num-cell px-3 py-2 tabular-nums text-steel">{fmtNum(r.line.totalTepat)}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number" min="0" step="0.1" inputMode="decimal"
                        className="form-control w-28 py-1.5 text-right text-xs"
                        value={draft[r.line.material]}
                        placeholder={fmtNum(Math.round(r.line.totalTepat / 2))}
                        aria-label={`Pemakaian setengah shift ${r.line.material} (kg)`}
                        onChange={e => { setDraft(d => ({ ...d, [r.line.material]: e.target.value })); setDirty(true); }}
                      />
                    </td>
                    <td className="num-cell px-3 py-2">
                      {r.proyeksi === null ? <span className="text-steel-faint">—</span> : (
                        <>
                          <div className="font-semibold tabular-nums text-paper">{fmtNum(Math.round(r.proyeksi))}</div>
                          <div className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold ${st.cls}`}>
                            <st.Icon size={11} />{st.label}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="num-cell px-3 py-2 font-semibold tabular-nums text-paper">{fmtNum(Math.round(r.stokSekarang))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
          <p className="text-[11px] text-steel-faint">
            {diisi} dari {rows.length} material diisi. Yang kosong tidak dicatat. Placeholder = setengah rencana.
          </p>
          <button className="btn btn-primary btn-sm" onClick={simpan} disabled={!dirty}>
            <Save size={14} />Simpan Pemakaian ½ Shift
          </button>
        </div>
      </div>
    </section>
  );
}
