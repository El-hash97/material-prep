import { effBonFinal, fmtNum } from '../lib/calc';

// mode: 'pre' (belum hitung bon) | 'plan' (rencana bon, orange transparan) | 'saved' (bon sudah disimpan, hijau solid)
export default function StockTubes({ lines, stokMinimum = {}, kapasitas = {}, mode = 'pre' }) {
  const showPlan = mode === 'plan';
  return (
    <>
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-steel-dim">
      <span><i className="mr-1 inline-block h-2 w-2 bg-success" />Stok sekarang</span>
      {showPlan && <span><i className="mr-1 inline-block h-2 w-2 bg-orange-500/45" />Rencana bon</span>}
    </div>
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {lines.map(l => {
        const min = stokMinimum[l.material] ?? 0;
        const bon = mode === 'pre' ? 0 : effBonFinal(l);
        const solid = mode === 'saved' ? l.sisaStok + bon : l.sisaStok;
        const planTop = l.sisaStok + bon;
        // kapasitas manual dari Settings; kalau kosong: max(stok + bon, 3 × minimum)
        const cap = Math.max(kapasitas[l.material] || 3 * min, planTop);
        const pct = v => (cap > 0 ? Math.min(100, (v / cap) * 100) : 0);
        const sisaPakai = l.sisaStok + bon - l.totalTepat;
        const low = min > 0 && (mode === 'pre' ? l.sisaStok : sisaPakai) < min;

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
              {showPlan && (
                <div
                  className="absolute inset-x-0 bottom-0 bg-orange-500/45 transition-[height] duration-[800ms] ease-out"
                  style={{ height: `${pct(planTop)}%` }}
                />
              )}
              <div
                className="absolute inset-x-0 bottom-0 bg-success transition-[height] duration-[800ms] ease-out"
                style={{ height: `${pct(solid)}%` }}
              />
              {min > 0 && (
                <div
                  className="absolute inset-x-0 border-t border-dashed border-danger"
                  style={{ bottom: `${pct(min)}%` }}
                  title={`Minimum ${fmtNum(min)} kg`}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-center font-display text-sm font-semibold leading-tight tabular-nums text-paper drop-shadow">
                  {fmtNum(solid)}
                  <span className="block text-[9px] font-medium">kg</span>
                </span>
              </div>
            </div>
            <div className="mt-2 w-full truncate text-[11px] font-semibold text-paper">{l.material}</div>
            {showPlan && bon > 0 && (
              <div className="text-[10px] tabular-nums text-orange-400">+{fmtNum(bon)} kg bon</div>
            )}
            {low && (
              <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-danger">
                {mode === 'pre' ? 'di bawah minimum' : 'setelah pemakaian di bawah minimum'}
              </div>
            )}
          </div>
        );
      })}
    </div>
    </>
  );
}
