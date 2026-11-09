import { useEffect, useState } from 'react';
import { effBonFinal, fmtNum } from '../lib/calc';

export default function StockTubes({ lines, stokMinimum = {} }) {
  const [drained, setDrained] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrained(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-steel-dim">
      <span><i className="mr-1 inline-block h-2 w-2 bg-success" />Sisa stok</span>
      <span><i className="mr-1 inline-block h-2 w-2 bg-success/25" />Rencana bon</span>
      <span><i className="mr-1 inline-block h-2 w-2 bg-orange-500/45" />Setelah pemakaian</span>
    </div>
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {lines.map(l => {
        const cap = l.sisaStok + effBonFinal(l);
        const sisa = Math.max(0, cap - l.totalTepat);
        const min = stokMinimum[l.material] ?? 0;
        const pct = cap > 0 ? Math.min(100, (sisa / cap) * 100) : 0;
        const stokPct = cap > 0 ? Math.min(100, (l.sisaStok / cap) * 100) : 0;
        const minPct = cap > 0 ? Math.min(100, (min / cap) * 100) : 0;
        const low = min > 0 && sisa < min;

        return (
          <div key={l.material} className="well flex flex-col items-center text-center">
            <div className="relative h-32 w-14 overflow-hidden rounded-[3px] border border-white/[0.16] bg-iron-950/80">
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(to top, rgba(255,255,255,0.45) 0 1px, transparent 1px 16px)',
                }}
              />
              {/* rencana bon: hijau transparan, dari sisa stok sampai kapasitas */}
              <div className="absolute inset-x-0 bottom-0 bg-success/25" style={{ height: '100%' }} />
              {/* sesudah pemakaian: orange transparan */}
              <div
                className="absolute inset-x-0 bottom-0 bg-orange-500/45 transition-[height] duration-[800ms] ease-out"
                style={{ height: `${drained ? pct : 100}%` }}
              />
              {/* sisa stok sebelum bon: hijau solid, paling bawah & paling atas z-order */}
              <div className="absolute inset-x-0 bottom-0 bg-success" style={{ height: `${stokPct}%` }} />
              <div
                className="absolute inset-x-0 border-t border-orange-400"
                style={{ bottom: `${drained ? pct : 100}%` }}
              />
              {min > 0 && (
                <div
                  className="absolute inset-x-0 border-t border-dashed border-danger"
                  style={{ bottom: `${minPct}%` }}
                  title={`Minimum ${fmtNum(min)} kg`}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-sm font-semibold tabular-nums text-paper drop-shadow">
                  {cap > 0 ? `${Math.round(pct)}%` : '—'}
                </span>
              </div>
            </div>
            <div className="mt-2 w-full truncate text-[11px] font-semibold text-paper">{l.material}</div>
            <div className={`text-[11px] tabular-nums ${low ? 'font-semibold text-danger' : 'text-steel-dim'}`}>
              {fmtNum(sisa)} kg
            </div>
            {low && (
              <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-danger">
                di bawah minimum
              </div>
            )}
          </div>
        );
      })}
    </div>
    </>
  );
}
