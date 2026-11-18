import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  Chart, BarElement, CategoryScale, LinearScale, Tooltip,
  LineController, LineElement, PointElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  Plus, ArrowRight, ChevronRight, ChevronDown, ChevronUp, Database,
  TriangleAlert, CircleAlert, CircleCheck, CircleDashed, Timer,
} from 'lucide-react';
import useStore from '../store/useStore';
import { db } from '../store/db';
import { PRODUCTS, PRODUCT_TONES } from '../constants/defaults';
import { formatDate, fmtNum, todayStr } from '../lib/calc';
import { buildDashboard } from '../lib/dashboard';
import { buildStory } from '../lib/story';
import StoryLoop from '../components/StoryLoop';
import { Skel } from '../components/LoadState';
import MaterialIcon from '../components/MaterialIcon';

const MejaInokulasi3D = lazy(() => import('../components/MejaInokulasi3D'));

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, LineController, LineElement, PointElement);
Chart.defaults.font.family = 'Plus Jakarta Sans, sans-serif';

const C = { paper: '#ECE9E2', steel: '#B3BBBE', dim: '#959EA2', faint: '#808A8E', raised: '#1B2125', grid: 'rgba(255,255,255,0.06)' }; // = token tailwind
const fmt1 = n => n.toLocaleString('id-ID', { maximumFractionDigits: 1 });
const pctOf = (v, max) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const stagger = i => ({ '--i': i });

// Angka naik dari nilai sebelumnya ke target (ease-out cubic). Reduced motion: langsung ke target.
function useCountUp(target, ms = 700) {
  const [shown, setShown] = useState(REDUCED ? target : 0);
  const from = useRef(REDUCED ? target : 0);
  useEffect(() => {
    const a = from.current;
    const start = performance.now();
    let raf;
    const tick = now => {
      const t = REDUCED ? 1 : Math.min(1, (now - start) / ms);
      const v = a + (target - a) * (1 - (1 - t) ** 3);
      from.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return shown;
}

const STATUS = {
  crit:  { Icon: TriangleAlert, label: 'Kritis', icon: 'text-danger', fill: 'bg-danger' },
  warn:  { Icon: CircleAlert, label: 'Rendah', icon: 'text-signal', fill: 'bg-signal' },
  ok:    { Icon: CircleCheck, label: 'Aman', icon: 'text-success', fill: 'bg-steel' },
  unset: { Icon: CircleDashed, label: 'Min belum diatur', icon: 'text-steel-faint', fill: 'bg-steel-dim' },
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

function Empty({ children, action }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 px-6 text-center">
      <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-steel-faint">
        <Database size={14} />
      </span>
      <p className="max-w-[260px] text-xs leading-relaxed text-steel-faint">{children}</p>
      {action}
    </div>
  );
}

function Delta({ value, label }) {
  if (value === null) return <span>belum ada pembanding</span>;
  return (
    <>
      <span className="font-bold text-paper">{value >= 0 ? '▲' : '▼'} {fmt1(Math.abs(value))}%</span>
      <span>vs {label}</span>
    </>
  );
}

function Spark({ values }) {
  const max = Math.max(...values);
  if (max <= 0) return <div className="h-[26px]" />;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 118 + 1, 23 - (v / max) * 20]);
  const [lx, ly] = pts.at(-1);
  return (
    <svg viewBox="0 0 120 26" className="h-[26px] w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline className="anim-draw" pathLength="1" fill="none" stroke={C.steel} strokeWidth="1.5" vectorEffect="non-scaling-stroke" points={pts.map(p => p.join(',')).join(' ')} />
      <circle cx={lx} cy={ly} r="2.5" fill={C.paper} />
    </svg>
  );
}

function Mix({ parts }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <div className="my-2.5 flex h-1.5 gap-0.5 overflow-hidden rounded-[2px] bg-white/[0.06]">
      {total > 0 && parts.filter(p => p.value > 0).map((p, i) => (
        <i key={p.key} className="anim-grow rounded-[2px]" style={{ ...stagger(i + 2), flex: p.value, backgroundColor: p.color }} title={`${p.key}: ${p.value}`} />
      ))}
    </div>
  );
}

// value: angka (dihitung naik) atau null (tampil "—"). Pembaca layar mendapat nilai akhir saja.
function Kpi({ label, value, unit, children, foot }) {
  const n = useCountUp(value ?? 0);
  return (
    <div className="flex min-w-0 flex-col bg-iron-850 px-4 py-3.5">
      <div className="tile-label">{label}</div>
      <div className="readout mt-2 flex flex-wrap items-baseline text-[24px] sm:text-[28px]">
        {value === null ? '—' : (
          <>
            <span aria-hidden="true">{fmtNum(Math.round(n))}</span>
            <span className="sr-only">{fmtNum(value)}</span>
          </>
        )}
        {unit && <span className="ml-1 text-xs font-medium text-steel-faint">{unit}</span>}
      </div>
      {children}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-steel-dim">{foot}</div>
    </div>
  );
}

function StockRow({ r, i }) {
  const st = STATUS[r.status];
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-white/[0.05] py-2.5 first:border-t-0 sm:grid-cols-[28px_minmax(110px,1.1fr)_minmax(120px,2fr)_76px_92px]">
      <MaterialIcon material={r.material} />
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-paper">{r.material}</div>
        <div className="truncate text-[11px] text-steel-faint">
          <span className="sm:hidden">{fmtNum(r.stok)} kg · </span>
          {r.min > 0 ? `min ${fmtNum(r.min)} kg` : 'minimum belum diatur'}
          {r.projected && (r.akhir < 0
            ? <span className="font-semibold text-danger"> · akhir shift kurang ±{fmtNum(Math.round(-r.akhir))} kg</span>
            : ` · akhir shift ≈ ${fmtNum(Math.round(r.akhir))} kg`)}
        </div>
      </div>
      <div
        className="relative col-span-2 col-start-2 h-[18px] sm:col-span-1 sm:col-start-auto"
        title={`${fmtNum(r.stok)} kg dari kapasitas ${fmtNum(r.cap)} kg${r.min > 0 ? `, minimum ${fmtNum(r.min)} kg` : ''}`}
      >
        <span className="absolute inset-x-0 top-[7px] h-1 rounded-[2px] bg-iron-700" />
        <span className={`anim-grow absolute left-0 top-[5px] h-2 rounded-r-[4px] transition-[width] duration-700 ease-out ${st.fill}`} style={{ ...stagger(i), width: pctOf(r.stok, r.cap) }} />
        {r.min > 0 && <span className="absolute inset-y-px w-0.5 rounded-[1px] bg-paper" style={{ left: pctOf(r.min, r.cap) }} />}
      </div>
      <div className="readout hidden text-right text-[13px] sm:block">{fmtNum(r.stok)}<span className="ml-0.5 text-[10px] font-medium text-steel-faint">kg</span></div>
      <div className="col-start-3 row-start-1 text-right sm:col-start-auto sm:row-start-auto">
        <div className="readout text-[13px]">{r.cover === null ? '—' : `${fmt1(r.cover)} hari`}</div>
        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-steel-dim">
          <st.Icon size={11} className={st.icon} />{st.label}
        </div>
      </div>
    </div>
  );
}

// Detail input planning shift aktif (atau shift terakhir): lot kecil → lot besar → pcs, total bon, progres ½ shift.
function PlanTile({ plan, navigate }) {
  const jam = iso => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const open = plan.status === 'Open';
  return (
    <section className="tile md:col-span-12">
      <TileHead
        label="Rencana produksi"
        meta={`Shift ${plan.shift} · ${formatDate(plan.tanggal)}${plan.waktu ? ` · ${plan.waktu}` : ''} · ${open ? 'Open' : 'shift terakhir, sudah ditutup'}`}
      >
        <button className="btn btn-ghost btn-xs" onClick={() => navigate('planning')}>Buat Bon<ChevronRight size={12} /></button>
      </TileHead>
      <div className="tile-body grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-white/[0.08] bg-white/[0.08] sm:grid-cols-4">
          {plan.products.map(x => (
            <div key={x.p} className="bg-iron-850 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-paper">
                <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: PRODUCT_TONES[x.p].color }} />{x.p}
              </div>
              <div className={`readout mt-2 text-2xl ${x.lotKecil ? '' : 'text-steel-faint'}`}>
                {fmtNum(x.lotKecil)}<span className="ml-1 text-[11px] font-medium text-steel-faint">lot kecil</span>
              </div>
              <div className="mt-1 text-[11px] tabular-nums text-steel-dim">{fmtNum(x.lotBesar)} lot besar · {fmtNum(x.pcs)} pcs</div>
            </div>
          ))}
        </div>
        <dl className="grid content-start gap-x-4 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="tile-label">Total produksi</dt>
            <dd className="readout mt-1.5 text-lg">{fmtNum(plan.total.lotBesar)}<span className="ml-1 text-[11px] font-medium text-steel-faint">lot besar</span></dd>
            <dd className="text-[11px] tabular-nums text-steel-faint">{fmtNum(plan.total.lotKecil)} lot kecil · {fmtNum(plan.total.pcs)} pcs</dd>
          </div>
          <div>
            <dt className="tile-label">Bon material</dt>
            <dd className="readout mt-1.5 text-lg">{fmtNum(plan.bonKg)}<span className="ml-1 text-[11px] font-medium text-steel-faint">kg</span></dd>
            <dd className="text-[11px] tabular-nums text-steel-faint">{fmtNum(plan.karung)} karung · {plan.materials} material</dd>
          </div>
          {open && (
            <div className="well flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
              <span className="inline-flex items-center gap-2 text-[11px] text-steel">
                <Timer size={13} className="shrink-0 text-steel-dim" />
                {plan.tengah
                  ? <>½ shift dicatat{plan.tengah.at ? ` ${jam(plan.tengah.at)}` : ''} · {plan.tengah.dicatat}/{plan.tengah.total} material</>
                  : 'Pemakaian ½ shift belum dicatat'}
              </span>
              <button className="btn btn-outline btn-xs" onClick={() => navigate('planning')}>
                {plan.tengah ? 'Perbarui' : 'Isi sekarang'}<ChevronRight size={12} />
              </button>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}

function GentaniRow({ r, ambang, i }) {
  const MAX = 120;
  const fill = r.status === 'over' ? 'bg-danger' : r.status === 'warn' ? 'bg-signal' : 'bg-steel';
  return (
    <div
      className="grid grid-cols-[minmax(84px,120px)_minmax(0,1fr)_48px] items-center gap-2.5 text-xs"
      title={`${r.material}: ${fmtNum(Math.round(r.pemakaian))} kg dari batas ${fmtNum(Math.round(r.batas))} kg`}
    >
      <span className="truncate font-semibold text-paper">{r.material}</span>
      <div className="relative h-3.5">
        <span className="absolute inset-x-0 top-[5px] h-1 rounded-[2px] bg-iron-700" />
        <span className={`anim-grow absolute left-0 top-1 h-1.5 rounded-r-[4px] transition-[width] duration-700 ease-out ${fill}`} style={{ ...stagger(i), width: pctOf(r.pct, MAX) }} />
        <span className="absolute inset-y-0 w-px bg-steel-dim" style={{ left: pctOf(ambang, MAX) }} />
        <span className="absolute inset-y-0 w-0.5 bg-paper" style={{ left: pctOf(100, MAX) }} />
      </div>
      <span className="readout text-right text-xs">{r.pct > MAX && '▸'}{Math.round(r.pct)}%</span>
    </div>
  );
}

function Trend({ daily }) {
  // Stagger kolom hanya saat pertama tampil; ganti rentang waktu memakai transisi biasa Chart.js.
  const entered = useRef(false);
  const worked = daily.filter(d => d.total > 0);
  const avg = worked.length ? worked.reduce((a, d) => a + d.total, 0) / worked.length : 0;
  const last = daily.length - 1;
  const data = {
    labels: daily.map(d => d.date.slice(8)),
    datasets: [
      {
        label: 'Pemakaian',
        data: daily.map(d => d.total),
        backgroundColor: daily.map((_, i) => (i === last ? C.paper : C.faint)),
        hoverBackgroundColor: daily.map((_, i) => (i === last ? C.paper : C.steel)),
        borderRadius: { topLeft: 4, topRight: 4 },
        borderSkipped: 'bottom',
        maxBarThickness: 22,
      },
      {
        type: 'line',
        label: 'Rata-rata',
        data: daily.map(() => avg),
        borderColor: C.steel,
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    animation: REDUCED ? false : {
      duration: 700,
      easing: 'easeOutQuart',
      onComplete: () => { entered.current = true; },
      delay: ctx => (ctx.type === 'data' && ctx.mode === 'default' && !entered.current ? ctx.dataIndex * 35 : 0),
    },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: item => item.datasetIndex === 0,
        backgroundColor: C.raised, borderColor: 'rgba(255,255,255,0.14)', borderWidth: 1,
        titleColor: C.paper, bodyColor: C.steel, padding: 10, cornerRadius: 3, displayColors: false,
        callbacks: {
          title: items => formatDate(daily[items[0].dataIndex].date),
          label: item => `${fmtNum(item.raw)} kg`,
          afterLabel: item => {
            const d = daily[item.dataIndex];
            return `Red ${fmtNum(d.red)} kg · White ${fmtNum(d.white)} kg`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true, grid: { color: C.grid }, border: { display: false },
        ticks: { color: C.faint, font: { size: 10 }, maxTicksLimit: 5, callback: v => (v >= 1000 ? `${fmt1(v / 1000)}k` : v) },
      },
      x: {
        grid: { display: false }, border: { display: false },
        ticks: { color: C.faint, font: { size: 10 }, maxRotation: 0, autoSkipPadding: 8 },
      },
    },
  };
  return (
    <>
      <div className="mb-3 text-[11px] text-steel-faint">
        {avg > 0 ? <>Garis putus = rata-rata <span className="font-semibold text-steel">{fmtNum(Math.round(avg))} kg</span> per hari kerja</> : 'Belum ada pemakaian aktual'}
      </div>
      <div className="relative h-[180px] sm:h-[210px]">
        <Bar data={data} options={options} aria-label="Pemakaian harian" role="img" />
      </div>
    </>
  );
}

export default function Dashboard() {
  const navigate = useStore(s => s.navigate);
  const setCurrentBonId = useStore(s => s.setCurrentBonId);
  const [period, setPeriod] = useState(7);
  const [showAllStock, setShowAllStock] = useState(false);

  const settings = db.getSettings();
  const shifts = db.getShifts();
  const d = buildDashboard(shifts, settings, period, todayStr());
  const { kpis, activeShift } = d;
  const ambang = settings.ambangWaspada ?? 90;
  const periodLabel = period === 1 ? 'kemarin' : `${period} hari sebelumnya`;
  const hasData = shifts.length > 0;
  const lastClosed = db.getLastClosed();
  const story = buildStory(activeShift ?? shifts[0] ?? null, settings);

  // 3D: shift Open = sisa + bon (mode saved); tanpa shift Open = sisa akhir shift Closed terakhir
  const stockLines = activeShift
    ? activeShift.bonLines
    : d.stock.map(r => ({ material: r.material, totalTepat: 0, bonFinal: 0, bonFinalOverride: null, sisaStok: r.stok }));

  const stockShown = showAllStock ? d.stock : d.stock.slice(0, 6);
  const unsetCount = d.stock.filter(r => r.status === 'unset').length;
  const lotTotal = kpis.lot.value;

  return (
    <div className="mx-auto max-w-[1480px] p-4 md:p-7">
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-sub flex flex-wrap items-center gap-2">
            <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
            <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-white/[0.14] px-2 py-0.5 text-[11px] font-semibold text-paper">
              <span className={`h-1.5 w-1.5 rounded-full ${activeShift ? 'bg-success' : 'bg-steel-faint'}`} />
              {activeShift ? `Shift ${activeShift.shift} · Open${activeShift.waktu ? ` · ${activeShift.waktu}` : ''}` : 'Semua shift tertutup'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="segmented" role="group" aria-label="Rentang waktu">
            {[1, 7, 30].map(n => (
              <button key={n} type="button" className="seg-btn" data-active={period === n} aria-pressed={period === n} onClick={() => setPeriod(n)}>
                {n} Hari
              </button>
            ))}
          </div>
          {activeShift ? (
            <button className="btn btn-primary btn-sm" onClick={() => { setCurrentBonId(activeShift.id); navigate('tutup-shift'); }}>
              Tutup Shift {activeShift.shift}<ArrowRight size={14} />
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('planning')}>
              <Plus size={14} />Buat Bon
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {hasData && (d.attention.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-[5px] border border-danger/30 bg-danger/[0.07] px-3 py-2.5 text-xs text-paper" role="status">
            <span className="mr-1 font-bold">{d.attention.length} perlu tindakan</span>
            {d.attention.slice(0, 5).map(a => {
              const Icon = a.level === 'crit' ? TriangleAlert : CircleAlert;
              return (
                <span key={a.text} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[3px] border border-white/[0.14] bg-iron-850 px-2 py-1 text-[11px] font-semibold">
                  <Icon size={12} className={a.level === 'crit' ? 'text-danger' : 'text-signal'} />{a.text}
                </span>
              );
            })}
            {d.attention.length > 5 && <span className="text-[11px] text-steel">+{d.attention.length - 5} lainnya</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-[5px] border border-white/[0.08] bg-iron-850/60 px-3 py-2 text-xs text-steel" role="status">
            <CircleCheck size={14} className="shrink-0 text-success" />Semua aman: tidak ada stok di bawah minimum atau gentani di atas {ambang}%.
          </div>
        ))}

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[5px] border border-white/[0.08] bg-white/[0.08] lg:grid-cols-4">
          <Kpi label="Pemakaian" value={kpis.usage.value} unit="kg" foot={<Delta value={kpis.usage.delta} label={periodLabel} />}>
            <Spark values={d.daily.map(x => x.total)} />
          </Kpi>
          <Kpi label="Bon" value={kpis.bon.value} foot={`${kpis.bon.closed} closed · ${kpis.bon.open} open`}>
            <Mix parts={[{ key: 'Closed', value: kpis.bon.closed, color: C.dim }, { key: 'Open', value: kpis.bon.open, color: C.paper }]} />
          </Kpi>
          <Kpi label="Lot besar" value={lotTotal} foot={<Delta value={kpis.lot.delta} label={periodLabel} />}>
            <Mix parts={d.productMix.map(x => ({ key: x.p, value: x.value, color: PRODUCT_TONES[x.p].color }))} />
          </Kpi>
          <Kpi
            label="Gentani dalam batas"
            value={kpis.gentani.active ? kpis.gentani.ok : null}
            unit={kpis.gentani.active ? `/ ${kpis.gentani.active} material` : null}
            foot={kpis.gentani.active ? `${kpis.gentani.warn} waspada · ${kpis.gentani.over} over` : 'tutup shift dengan pemakaian aktual'}
          >
            <Mix parts={[
              { key: 'Aman', value: kpis.gentani.ok, color: C.dim },
              { key: 'Waspada', value: kpis.gentani.warn, color: '#F0A32A' },
              { key: 'Over', value: kpis.gentani.over, color: '#EB6A5F' },
            ]} />
          </Kpi>
        </div>

        <div className="bento">
          {d.plan && <PlanTile plan={d.plan} navigate={navigate} />}

          <section className="tile md:col-span-8">
            <TileHead
              label="Stok material"
              meta={activeShift
                ? `Shift ${activeShift.shift} ${formatDate(activeShift.tanggal)} · sisa + bon · urut dari paling kritis`
                : lastClosed ? `Sisa akhir shift ${lastClosed.shift} ${formatDate(lastClosed.tanggal)} · urut dari paling kritis` : 'Belum ada data stok'}
            />
            <div className="tile-body">
              {!hasData ? (
                <Empty action={<button className="btn btn-outline btn-sm" onClick={() => navigate('planning')}><Plus size={13} />Buat Bon</button>}>
                  Stok per material muncul setelah bon pertama dibuat.
                </Empty>
              ) : (
                <>
                  <div className="hidden grid-cols-[28px_minmax(110px,1.1fr)_minmax(120px,2fr)_76px_92px] gap-x-3 pb-2 font-display text-[9px] font-semibold uppercase tracking-[0.16em] text-steel-faint sm:grid">
                    <span /><span>Material</span><span>Stok vs kapasitas · ┃ minimum</span><span className="text-right">Stok</span><span className="text-right">Cukup untuk</span>
                  </div>
                  {stockShown.map((r, i) => <StockRow key={r.material} r={r} i={i} />)}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                    {d.stock.length > 6 ? (
                      <button className="btn btn-ghost btn-xs" onClick={() => setShowAllStock(v => !v)}>
                        {showAllStock ? <>Tampilkan 6 teratas<ChevronUp size={12} /></> : <>Tampilkan {d.stock.length - 6} material lainnya<ChevronDown size={12} /></>}
                      </button>
                    ) : <span />}
                    {unsetCount > 0 && (
                      <button className="btn btn-ghost btn-xs" onClick={() => navigate('settings')}>
                        {unsetCount} material belum punya stok minimum · Atur<ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="tile md:col-span-4">
            <TileHead label="Alur shift" meta="Animasi berulang · data shift ini" />
            <div className="tile-body"><StoryLoop story={story} /></div>
          </section>

          <section className="tile md:col-span-12">
            <TileHead
              label="Meja inokulasi"
              meta={activeShift ? `3D interaktif · shift ${activeShift.shift} · sisa + bon per kompartemen` : '3D interaktif · sisa akhir shift terakhir per kompartemen'}
            />
            <div className="tile-body">
              <Suspense fallback={<div role="status" aria-busy="true"><span className="sr-only">Memuat meja inokulasi 3D…</span><Skel className="h-[420px] w-full md:h-[500px]" /></div>}>
                <MejaInokulasi3D lines={stockLines} stokMinimum={settings.stokMinimum} kapasitas={settings.kapasitasTabung} mode={activeShift ? 'saved' : 'pre'} />
              </Suspense>
            </div>
          </section>

          <section className="tile md:col-span-7">
            <TileHead label="Pemakaian vs gentani" meta={`% dari batas · ┃ ${ambang}% waspada · ┃ 100% batas`} />
            <div className="tile-body">
              {d.gentani.length === 0 ? (
                <Empty>Belum ada data gentani pada rentang ini. Gentani dihitung saat shift ditutup dengan pemakaian aktual.</Empty>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {d.gentani.map((r, i) => <GentaniRow key={r.material} r={r} ambang={ambang} i={i} />)}
                  <div className="grid grid-cols-[minmax(84px,120px)_minmax(0,1fr)_48px] gap-2.5 text-[10px] text-steel-faint">
                    <span />
                    <div className="relative h-3">
                      <span className="absolute left-0">0%</span>
                      {[50, ambang].map(v => <span key={v} className="absolute -translate-x-1/2" style={{ left: pctOf(v, 120) }}>{v}%</span>)}
                      <span className="absolute pl-1" style={{ left: pctOf(100, 120) }}>100%</span>
                    </div>
                    <span />
                  </div>
                </div>
              )}
              {d.gentaniOff.length > 0 && (
                <p className="mt-3 border-t border-white/[0.06] pt-3 text-[10px] leading-relaxed text-steel-faint">
                  Belum ada data: {d.gentaniOff.join(', ')}
                </p>
              )}
            </div>
          </section>

          <section className="tile md:col-span-5">
            <TileHead label="Pemakaian harian" meta={`kg · ${d.daily.length} hari terakhir`} />
            <div className="tile-body"><Trend daily={d.daily} /></div>
          </section>

          <section className="tile md:col-span-5">
            <TileHead label="Mix produksi" meta={`${fmtNum(lotTotal)} lot besar`} />
            <div className="tile-body">
              {lotTotal === 0 ? (
                <Empty>Belum ada lot besar pada rentang ini.</Empty>
              ) : (
                <>
                  <div className="flex h-2.5 gap-0.5">
                    {d.productMix.filter(x => x.value > 0).map((x, i) => (
                      <i key={x.p} className="anim-grow rounded-[2px]" style={{ ...stagger(i), flex: x.value, backgroundColor: PRODUCT_TONES[x.p].color }} title={`${x.p}: ${x.value} lot`} />
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
                    {d.productMix.map(x => (
                      <div key={x.p} className="flex items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-2 text-steel">
                          <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: PRODUCT_TONES[x.p].color }} />{x.p}
                        </span>
                        <span className="readout text-xs">{x.value} · {Math.round((x.value / lotTotal) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="tile md:col-span-7">
            <TileHead label="Aktivitas shift" meta="5 terakhir">
              <button className="btn btn-ghost btn-xs" onClick={() => navigate('riwayat')}>Semua<ChevronRight size={12} /></button>
            </TileHead>
            <div className="tile-body">
              {d.recent.length === 0 ? (
                <Empty>Belum ada aktivitas. Riwayat shift muncul di sini setelah bon pertama dibuat.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-xs">
                    <thead>
                      <tr className="text-left font-display text-[9px] uppercase tracking-[0.16em] text-steel-faint">
                        <th className="pb-2 pr-3 font-semibold">Tanggal</th>
                        <th className="pb-2 pr-3 font-semibold">Shift</th>
                        <th className="pb-2 pr-3 font-semibold">Lot besar</th>
                        <th className="pb-2 pr-3 text-right font-semibold">Bon (kg)</th>
                        <th className="pb-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.recent.map(s => (
                        <tr key={s.id} className="border-t border-white/[0.05]">
                          <td className="py-2.5 pr-3 font-semibold text-paper">{formatDate(s.tanggal)}</td>
                          <td className="py-2.5 pr-3">
                            <span className="rounded-[3px] border border-white/[0.15] px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.08em] text-paper">{s.shift}</span>
                          </td>
                          <td className="py-2.5 pr-3 text-steel">
                            {PRODUCTS.filter(p => (s.lotBesarMap?.[p] ?? 0) > 0).map(p => `${p} ${s.lotBesarMap[p]}`).join(' · ') || '—'}
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums text-paper">{fmtNum(s.bonKg)}</td>
                          <td className="py-2.5">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-paper">
                              <span className={`h-1.5 w-1.5 rounded-full ${s.status === 'Open' ? 'bg-signal' : 'bg-steel-faint'}`} />{s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
