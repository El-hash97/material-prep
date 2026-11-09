import { useState, useEffect, useRef } from 'react';
import {
  Chart, BarElement, CategoryScale, LinearScale, ArcElement,
  Tooltip, Legend, BarController, DoughnutController,
  LineController, LineElement, PointElement, LogarithmicScale,
} from 'chart.js';
import {
  Plus, ArrowRight, ClipboardList, Package, AlertTriangle,
  Database, ChevronRight,
} from 'lucide-react';
import useStore from '../store/useStore';
import { db } from '../store/db';
import { PRODUCTS, PRODUCT_TONES } from '../constants/defaults';
import { getAllMaterials, effBonFinal, formatDate, gentaniUsage, fmtNum } from '../lib/calc';

Chart.register(BarElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend, BarController, DoughnutController, LineController, LineElement, PointElement, LogarithmicScale);

Chart.defaults.color = '#7C8588';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = 'Plus Jakarta Sans, sans-serif';

const logTicks = axis => {
  axis.ticks = axis.ticks.filter(t => Number.isInteger(Math.log10(t.value)));
};

const DONUT_COLORS = PRODUCTS.map(p => PRODUCT_TONES[p].color);
const GRID_COLOR = 'rgba(255,255,255,0.055)';
const TICK_COLOR = '#7C8588';
const TOOLTIP = {
  backgroundColor: '#111518',
  borderColor: 'rgba(255,255,255,0.14)',
  borderWidth: 1,
  titleColor: '#ECE9E2',
  bodyColor: '#A7B0B3',
  padding: 10,
  cornerRadius: 3,
  boxWidth: 8,
  boxHeight: 8,
};

function TileHead({ label, meta, children }) {
  return (
    <div className="tile-head">
      <div>
        <div className="tile-label">{label}</div>
        {meta && <div className="mt-1.5 text-[11px] font-medium text-steel-faint">{meta}</div>}
      </div>
      {children}
    </div>
  );
}

function TileEmpty({ children }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-iron-850/70 px-6 text-center">
      <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-steel-faint">
        <Database size={14} />
      </span>
      <p className="max-w-[230px] text-xs leading-relaxed text-steel-faint">{children}</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useStore(s => s.navigate);
  const setCurrentBonId = useStore(s => s.setCurrentBonId);

  const barRef = useRef(null);
  const donutRef = useRef(null);
  const bonRef = useRef(null);
  const paretoRef = useRef(null);
  const barInst = useRef(null);
  const donutInst = useRef(null);
  const bonInst = useRef(null);
  const paretoInst = useRef(null);

  const [period, setPeriod] = useState(7);
  const [bonShift, setBonShift] = useState('Red');

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - (period - 1));
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const settings = db.getSettings();
  const allMats = getAllMaterials(settings);
  const shifts = db.getShifts();
  const periodShifts = shifts.filter(s => (s.tanggal ?? '') >= cutoffStr);
  const closedInPeriod = periodShifts.filter(s => s.status === 'Closed');
  const openCount = periodShifts.length - closedInPeriod.length;
  const redCount = periodShifts.filter(s => s.shift === 'Red').length;
  const whiteCount = periodShifts.filter(s => s.shift === 'White').length;
  const totalLB = periodShifts.reduce((a, s) => {
    for (const p of PRODUCTS) a += s.lotBesarMap?.[p] ?? 0;
    return a;
  }, 0);
  const periodLabel = period === 1 ? 'Hari Ini' : `${period} Hari Terakhir`;
  const activeShift = shifts.find(s => s.status === 'Open');

  const matPem = Object.fromEntries(allMats.map(m => [m, 0]));
  for (const s of closedInPeriod) {
    for (const l of s.bonLines) {
      if (l.pemakaianAktual !== null && l.pemakaianAktual !== undefined) {
        matPem[l.material] = (matPem[l.material] ?? 0) + l.pemakaianAktual;
      }
    }
  }
  const usageTotal = Object.values(matPem).reduce((a, v) => a + v, 0);
  const hasUsage = usageTotal > 0;

  const sortedMats = allMats
    .map(m => ({ name: m, value: matPem[m] ?? 0 }))
    .filter(m => m.value > 0)
    .sort((a, b) => b.value - a.value);
  const topShare = sortedMats.length && usageTotal > 0
    ? (sortedMats[0].value / usageTotal) * 100
    : 0;

  const prodTotals = PRODUCTS.map(p => ({
    p,
    value: periodShifts.reduce((a, s) => a + (s.lotBesarMap?.[p] ?? 0), 0),
  }));

  const gentaniRows = gentaniUsage(closedInPeriod, settings);
  const gentaniActive = gentaniRows.filter(r => r.status !== 'off');
  const gentaniOver = gentaniActive.filter(r => r.status === 'over');
  const gentaniWarn = gentaniActive.filter(r => r.status === 'warn');
  const gentaniOff = gentaniRows.filter(r => r.status === 'off').map(r => r.material);
  const ambang = settings.ambangWaspada ?? 90;

  const todayBons = shifts.filter(s => s.tanggal === todayStr && s.shift === bonShift);
  const bonTotalToday = todayBons.reduce(
    (a, s) => a + s.bonLines.reduce((x, l) => x + effBonFinal(l), 0), 0,
  );

  const recent = shifts.slice(0, 5);

  useEffect(() => {
    const allShifts = db.getShifts();
    const co = new Date();
    co.setDate(co.getDate() - (period - 1));
    const coStr = co.toISOString().slice(0, 10);
    const pShifts = allShifts.filter(s => (s.tanggal ?? '') >= coStr);
    const pClosed = pShifts.filter(s => s.status === 'Closed');

    const localMats = getAllMaterials(db.getSettings());
    const localPem = Object.fromEntries(localMats.map(m => [m, 0]));
    for (const s of pClosed) {
      for (const l of s.bonLines) {
        if (l.pemakaianAktual !== null && l.pemakaianAktual !== undefined) {
          localPem[l.material] = (localPem[l.material] ?? 0) + l.pemakaianAktual;
        }
      }
    }

    barInst.current?.destroy();
    barInst.current = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: localMats,
        datasets: [{
          label: 'Pemakaian (kg)',
          data: localMats.map(m => localPem[m] ?? 0),
          backgroundColor: '#F0A32A',
          hoverBackgroundColor: '#FFB84D',
          borderRadius: 2,
          maxBarThickness: 34,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 500, easing: 'easeOutQuart' },
        plugins: { legend: { display: false }, tooltip: TOOLTIP },
        scales: {
          y: {
            type: 'logarithmic',
            grid: { color: GRID_COLOR },
            border: { display: false },
            afterBuildTicks: logTicks,
            ticks: { color: TICK_COLOR, font: { size: 10 }, callback: v => (v >= 1000 ? `${v / 1000}k` : v) },
          },
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: TICK_COLOR, font: { size: 10 }, maxRotation: 32, minRotation: 0, autoSkip: false },
          },
        },
      },
    });

    const localProd = Object.fromEntries(PRODUCTS.map(p => [p, 0]));
    for (const s of pShifts) for (const p of PRODUCTS) localProd[p] += s.lotBesarMap?.[p] ?? 0;

    donutInst.current?.destroy();
    donutInst.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: {
        labels: PRODUCTS,
        datasets: [{
          data: PRODUCTS.map(p => localProd[p]),
          backgroundColor: DONUT_COLORS,
          borderColor: '#111518',
          borderWidth: 3,
          hoverOffset: 3,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '72%',
        animation: { duration: 550, easing: 'easeOutQuart' },
        plugins: { legend: { display: false }, tooltip: TOOLTIP },
      },
    });

    const localSorted = localMats
      .map(m => ({ name: m, value: localPem[m] ?? 0 }))
      .filter(m => m.value > 0)
      .sort((a, b) => b.value - a.value);

    const totalPem = localSorted.reduce((sum, m) => sum + m.value, 0);
    let cumulative = 0;
    const paretoLine = localSorted.map(m => {
      cumulative += m.value;
      return totalPem > 0 ? (cumulative / totalPem) * 100 : 0;
    });

    paretoInst.current?.destroy();
    paretoInst.current = new Chart(paretoRef.current, {
      type: 'bar',
      data: {
        labels: localSorted.length ? localSorted.map(m => m.name) : ['Belum ada data'],
        datasets: localSorted.length ? [
          {
            type: 'line',
            label: 'Kumulatif (%)',
            data: paretoLine,
            borderColor: '#E2574C',
            backgroundColor: '#E2574C',
            yAxisID: 'y1',
            tension: 0.2,
            pointRadius: 2,
            pointHoverRadius: 4,
            borderWidth: 2,
          },
          {
            type: 'bar',
            label: 'Pemakaian (kg)',
            data: localSorted.map(m => m.value),
            backgroundColor: 'rgba(240,163,42,0.72)',
            hoverBackgroundColor: '#F0A32A',
            borderRadius: 2,
            yAxisID: 'y',
            maxBarThickness: 28,
          },
        ] : [],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 500, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            display: true, position: 'bottom',
            labels: { color: TICK_COLOR, boxWidth: 8, boxHeight: 8, padding: 14, font: { size: 10 } },
          },
          tooltip: TOOLTIP,
        },
        scales: {
          y: {
            type: 'logarithmic', position: 'left',
            grid: { color: GRID_COLOR }, border: { display: false },
            afterBuildTicks: logTicks,
            ticks: { color: TICK_COLOR, font: { size: 10 }, callback: v => (v >= 1000 ? `${v / 1000}k` : v) },
          },
          y1: {
            type: 'linear', position: 'right', max: 100, min: 0,
            grid: { display: false }, border: { display: false },
            ticks: { color: TICK_COLOR, font: { size: 10 }, callback: v => `${v}%` },
          },
          x: {
            grid: { display: false }, border: { display: false },
            ticks: { color: TICK_COLOR, font: { size: 10 }, maxRotation: 32, minRotation: 0, autoSkip: false },
          },
        },
      },
    });

    return () => {
      barInst.current?.destroy();
      donutInst.current?.destroy();
      paretoInst.current?.destroy();
    };
  }, [period]);

  useEffect(() => {
    const allShifts = db.getShifts();
    const today = new Date().toISOString().slice(0, 10);
    const todaySelected = allShifts.filter(s => s.tanggal === today && s.shift === bonShift);

    const localMats = getAllMaterials(db.getSettings());
    const matBon = Object.fromEntries(localMats.map(m => [m, 0]));
    for (const s of todaySelected) {
      for (const l of s.bonLines) {
        matBon[l.material] = (matBon[l.material] ?? 0) + effBonFinal(l);
      }
    }

    bonInst.current?.destroy();
    bonInst.current = new Chart(bonRef.current, {
      type: 'bar',
      data: {
        labels: localMats,
        datasets: [{
          label: 'Bon Final (kg)',
          data: localMats.map(m => matBon[m] ?? 0),
          backgroundColor: bonShift === 'Red' ? 'rgba(226,87,76,0.8)' : 'rgba(164,139,224,0.8)',
          hoverBackgroundColor: bonShift === 'Red' ? '#E2574C' : '#A48BE0',
          borderRadius: 2,
          maxBarThickness: 26,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 450, easing: 'easeOutQuart' },
        plugins: { legend: { display: false }, tooltip: TOOLTIP },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: GRID_COLOR }, border: { display: false },
            ticks: { color: TICK_COLOR, font: { size: 10 } },
          },
          x: {
            grid: { display: false }, border: { display: false },
            ticks: { color: TICK_COLOR, font: { size: 10 }, maxRotation: 32, minRotation: 0, autoSkip: false },
          },
        },
      },
    });

    return () => { bonInst.current?.destroy(); };
  }, [bonShift]);

  const gentaniTone = gentaniOver.length > 0
    ? 'border-danger/30 bg-danger/10 text-danger'
    : gentaniWarn.length > 0
      ? 'border-signal/30 bg-signal/10 text-signal'
      : gentaniActive.length > 0
        ? 'border-success/30 bg-success/10 text-success'
        : 'border-white/10 bg-white/[0.03] text-steel-dim';
  const gentaniLabel = gentaniOver.length > 0
    ? `${gentaniOver.length} over`
    : gentaniWarn.length > 0
      ? `${gentaniWarn.length} waspada`
      : gentaniActive.length > 0
        ? 'Aman'
        : 'Belum aktif';

  return (
    <div className="mx-auto max-w-[1480px] p-4 md:p-7">
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">
            {now.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            <span className="mx-2 text-steel-faint">·</span>
            {activeShift ? `Shift ${activeShift.shift} masih terbuka` : 'Semua shift tertutup'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="segmented" role="group" aria-label="Rentang waktu">
            {[1, 7, 30].map(d => (
              <button
                key={d}
                type="button"
                className="seg-btn"
                data-active={period === d}
                onClick={() => setPeriod(d)}
              >
                {d === 1 ? '1 Hari' : `${d} Hari`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bento">
        <section className="tile md:col-span-8 md:row-span-2">
          <TileHead label="Pemakaian Material" meta={`${closedInPeriod.length} shift tertutup · skala log`}>
            <div className="text-right">
              <div className="readout text-3xl">{fmtNum(usageTotal)}</div>
              <div className="tile-meta mt-1">kg / {periodLabel}</div>
            </div>
          </TileHead>
          <div className="tile-body">
            <div className="relative h-[280px] md:h-[330px]">
              <canvas ref={barRef} />
              {!hasUsage && <TileEmpty>Belum ada pemakaian aktual pada rentang ini.</TileEmpty>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/[0.06] pt-3 text-[11px] text-steel-faint">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                Pemakaian aktual
              </span>
              <span>{allMats.length} material dipantau</span>
              <span className="ml-auto">Satuan kilogram</span>
            </div>
          </div>
        </section>

        <section className="tile flex flex-col md:col-span-4 md:row-span-2">
          <TileHead label="Status Gentani" meta="Pemakaian vs batas">
            <span className={`chip border ${gentaniTone}`}>{gentaniLabel}</span>
          </TileHead>
          <div className="tile-body flex-1">
            {gentaniOver.length > 0 && (
              <div className="alert alert-danger !mb-2 !p-2.5 text-xs">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span><strong>{gentaniOver.length} material</strong> melewati batas gentani.</span>
              </div>
            )}
            {gentaniWarn.length > 0 && (
              <div className="alert alert-warning !mb-2 !p-2.5 text-xs">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span><strong>{gentaniWarn.length} material</strong> mendekati batas (≥ {ambang}%).</span>
              </div>
            )}
            {gentaniActive.length === 0 ? (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
                <Database size={18} className="text-steel-faint" />
                <p className="text-xs leading-relaxed text-steel-faint">
                  Belum ada data gentani. Gentani dihitung otomatis — tutup shift dengan pemakaian aktual.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05] md:max-h-[330px] md:overflow-y-auto md:pr-1">
                {gentaniActive.map(r => {
                  const pct = r.pct ?? 0;
                  const tone = r.status === 'over' ? 'bg-danger' : r.status === 'warn' ? 'bg-signal' : 'bg-success';
                  const textTone = r.status === 'over' ? 'text-danger' : r.status === 'warn' ? 'text-signal' : 'text-success';
                  return (
                    <div key={r.material} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-semibold text-paper">{r.material}</span>
                        <span className={`shrink-0 text-[11px] font-bold tabular-nums ${textTone}`}>{pct.toFixed(0)}%</span>
                      </div>
                      <div className="relative mt-1.5">
                        <div className="meter">
                          <div className={`meter-fill ${tone}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <div
                          className="pointer-events-none absolute inset-y-0 border-l border-dashed border-white/25"
                          style={{ left: `${Math.min(100, ambang)}%` }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between gap-2 text-[10px] tabular-nums text-steel-faint">
                        <span>{fmtNum(r.pemakaian)} kg terpakai</span>
                        <span>batas {fmtNum(r.batas)} kg</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {gentaniOff.length > 0 && (
              <p className="mt-3 border-t border-white/[0.06] pt-3 text-[10px] leading-relaxed text-steel-faint">
                Belum aktif: {gentaniOff.join(', ')}
              </p>
            )}
          </div>
        </section>

        <section className="tile md:col-span-3">
          <TileHead label="Bon Periode" meta={periodLabel} />
          <div className="tile-body pt-4">
            <div className="flex items-end justify-between gap-3">
              <div className="readout text-4xl">{periodShifts.length}</div>
              <div className="text-right text-[11px] leading-tight text-steel-faint">
                <div><span className="font-semibold text-success">{closedInPeriod.length}</span> selesai</div>
                <div><span className="font-semibold text-signal">{openCount}</span> open</div>
              </div>
            </div>
            <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="bg-success" style={{ width: `${periodShifts.length ? (closedInPeriod.length / periodShifts.length) * 100 : 0}%` }} />
              <div className="bg-signal" style={{ width: `${periodShifts.length ? (openCount / periodShifts.length) * 100 : 0}%` }} />
            </div>
          </div>
        </section>

        <section className="tile md:col-span-3">
          <TileHead label="Lot Besar" meta={periodLabel} />
          <div className="tile-body pt-4">
            <div className="flex items-end justify-between gap-3">
              <div className="readout text-4xl">{fmtNum(totalLB)}</div>
              <div className="text-[11px] text-steel-faint">lot</div>
            </div>
            <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              {prodTotals.map(x => (
                <div
                  key={x.p}
                  style={{ width: `${totalLB ? (x.value / totalLB) * 100 : 0}%`, backgroundColor: PRODUCT_TONES[x.p].color }}
                  title={`${x.p}: ${x.value}`}
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {prodTotals.map(x => (
                <div key={x.p} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 text-steel-dim">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRODUCT_TONES[x.p].color }} />
                    {x.p}
                  </span>
                  <span className="font-semibold tabular-nums text-paper">{x.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="tile md:col-span-3">
          <TileHead label="Distribusi Shift" meta={periodLabel} />
          <div className="tile-body pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-danger">Red</div>
                <div className="readout mt-1 text-4xl">{redCount}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A48BE0]">White</div>
                <div className="readout mt-1 text-4xl">{whiteCount}</div>
              </div>
            </div>
            <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="bg-danger" style={{ width: `${periodShifts.length ? (redCount / periodShifts.length) * 100 : 0}%` }} />
              <div className="bg-[#A48BE0]" style={{ width: `${periodShifts.length ? (whiteCount / periodShifts.length) * 100 : 0}%` }} />
            </div>
          </div>
        </section>

        <section className="tile md:col-span-3">
          <TileHead label="Aksi Cepat" meta="Alur shift" />
          <div className="tile-body pt-3">
            <div className="flex flex-col gap-2">
              <button className="btn btn-primary btn-sm justify-between" onClick={() => navigate('planning')}>
                <span className="inline-flex items-center gap-2"><Plus size={14} />Buat Bon</span>
                <ArrowRight size={14} />
              </button>
              {activeShift && (
                <button
                  className="btn btn-warning btn-sm justify-between"
                  onClick={() => { setCurrentBonId(activeShift.id); navigate('tutup-shift'); }}
                >
                  <span className="inline-flex items-center gap-2"><Package size={14} />Tutup Shift</span>
                  <ArrowRight size={14} />
                </button>
              )}
              <button className="btn btn-outline btn-sm justify-between" onClick={() => navigate('riwayat')}>
                <span className="inline-flex items-center gap-2"><ClipboardList size={14} />Riwayat Bon</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>

        <section className="tile md:col-span-7">
          <TileHead label="Dominasi Material" meta={`Kumulatif · ${sortedMats.length} material`}>
            {topShare > 0 && <span className="chip text-signal">Top {topShare.toFixed(0)}%</span>}
          </TileHead>
          <div className="tile-body">
            <div className="relative h-[240px]">
              <canvas ref={paretoRef} />
              {!hasUsage && <TileEmpty>Belum ada data untuk diagram Pareto.</TileEmpty>}
            </div>
          </div>
        </section>

        <section className="tile md:col-span-5">
          <TileHead label="Pengebonan Hari Ini" meta={`Shift ${bonShift}`}>
            <div className="segmented">
              {['Red', 'White'].map(s => (
                <button
                  key={s}
                  type="button"
                  className="seg-btn"
                  data-active={bonShift === s}
                  onClick={() => setBonShift(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </TileHead>
          <div className="tile-body">
            <div className="flex items-end justify-between gap-3">
              <div className="readout text-3xl">
                {fmtNum(bonTotalToday)}
                <span className="ml-1 text-sm font-medium text-steel-faint">kg</span>
              </div>
              <div className="tile-meta">{todayBons.length} bon</div>
            </div>
            <div className="relative mt-3 h-[180px]">
              <canvas ref={bonRef} />
              {todayBons.length === 0 && <TileEmpty>Tidak ada bon hari ini untuk Shift {bonShift}.</TileEmpty>}
            </div>
          </div>
        </section>

        <section className="tile md:col-span-5">
          <TileHead label="Distribusi Produksi" meta={`${fmtNum(totalLB)} lot besar`} />
          <div className="tile-body">
            <div className="relative h-[210px]">
              <canvas ref={donutRef} />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="readout text-4xl">{fmtNum(totalLB)}</span>
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-steel-faint">Lot besar</span>
              </div>
              {totalLB === 0 && <TileEmpty>Belum ada lot besar pada rentang ini.</TileEmpty>}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/[0.06] pt-3">
              {prodTotals.map(x => (
                <div key={x.p} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 text-steel-dim">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRODUCT_TONES[x.p].color }} />
                    {x.p}
                  </span>
                  <span className="font-semibold tabular-nums text-paper">
                    {x.value}{totalLB > 0 ? ` · ${Math.round((x.value / totalLB) * 100)}%` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="tile md:col-span-7">
          <TileHead label="Aktivitas Shift" meta="5 terakhir">
            <button className="btn btn-ghost btn-xs" onClick={() => navigate('riwayat')}>
              Semua <ChevronRight size={12} />
            </button>
          </TileHead>
          <div className="tile-body">
            {recent.length === 0 ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 text-center">
                <Database size={18} className="text-steel-faint" />
                <p className="text-xs text-steel-faint">Belum ada aktivitas. Mulai dengan membuat bon pertama.</p>
                <button className="btn btn-outline btn-sm" onClick={() => navigate('planning')}>
                  <Plus size={13} />Buat Bon
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {recent.map(s => {
                  const lots = PRODUCTS
                    .filter(p => (s.lotBesarMap?.[p] ?? 0) > 0)
                    .map(p => `${p}:${s.lotBesarMap[p]}`)
                    .join(' · ');
                  return (
                    <div key={s.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-[13px] font-semibold text-paper">{formatDate(s.tanggal)}</strong>
                          <span className={`badge badge-${s.shift === 'Red' ? 'red' : 'white'}`}>Shift {s.shift}</span>
                          {s.waktu && <span className="text-[11px] text-steel-faint">{s.waktu}</span>}
                        </div>
                        <div className="mt-1 truncate text-[11px] text-steel-faint">{lots || 'Tidak ada lot tercatat'}</div>
                      </div>
                      <span className={`badge badge-${s.status === 'Open' ? 'open' : 'closed'} shrink-0`}>{s.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
