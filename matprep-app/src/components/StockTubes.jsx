import { useEffect, useState } from 'react';
import { effBonFinal, fmtNum } from '../lib/calc';

// Kapasitas tabung = sisaStok + bon efektif; cairan = sisa setelah bon.
export default function StockTubes({ lines, stokMinimum = {} }) {
  const [drained, setDrained] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrained(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {lines.map(l => {
        const cap = l.sisaStok + effBonFinal(l);
        const sisa = Math.max(0, cap - l.totalTepat);
        const min = stokMinimum[l.material] ?? 0;
        const pct = cap > 0 ? Math.min(100, (sisa / cap) * 100) : 0;
        const minPct = cap > 0 ? Math.min(100, (min / cap) * 100) : 0;
        const low = min > 0 && sisa < min;
        return (
          <div key={l.material} className="flex flex-col items-center text-center">
            <div className="relative w-12 h-36 rounded-b-2xl rounded-t-md border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 overflow-hidden">
              <div
                className={`absolute bottom-0 inset-x-0 transition-[height] duration-[800ms] ease-out ${low ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ height: `${drained ? pct : 100}%` }}
              />
              {min > 0 && (
                <div
                  className="absolute inset-x-0 border-t-2 border-dashed border-red-600"
                  style={{ bottom: `${minPct}%` }}
                  title={`Minimum ${fmtNum(min)} kg`}
                />
              )}
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">{l.material}</div>
            <div className={`text-xs tabular-nums ${low ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
              {fmtNum(sisa)} kg{cap > 0 ? ` · ${Math.round(pct)}%` : ''}
            </div>
            {low && <div className="text-[10px] text-red-600 dark:text-red-400">di bawah minimum ({fmtNum(min)})</div>}
          </div>
        );
      })}
    </div>
  );
}
