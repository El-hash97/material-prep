import { useState, useEffect, useRef } from 'react';
import {
  Chart, BarElement, CategoryScale, LinearScale, ArcElement,
  Tooltip, Legend, BarController, DoughnutController,
} from 'chart.js';
import { db } from '../store/db';
import { PRODUCTS } from '../constants/defaults';
import { getAllMaterials, effBonFinal, formatDate } from '../lib/calc';

Chart.register(BarElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend, BarController, DoughnutController);

const DONUT_COLORS = ['#1E40AF', '#EF4444', '#EAB308', '#16A34A'];
const GRID_COLOR = 'rgba(63,63,70,0.8)';
const TICK_COLOR = '#71717a';

function StatCard({ title, value, sub, valueClass = '' }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className={`text-2xl md:text-3xl font-bold text-blue-400 ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const barRef    = useRef(null);
  const donutRef  = useRef(null);
  const bonRef    = useRef(null);
  const barInst   = useRef(null);
  const donutInst = useRef(null);
  const bonInst   = useRef(null);

  const [period, setPeriod]     = useState(7);
  const [bonShift, setBonShift] = useState('Red');

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - (period - 1));
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const shifts        = db.getShifts();
  const periodShifts  = shifts.filter(s => (s.tanggal ?? '') >= cutoffStr);
  const closedInPeriod = periodShifts.filter(s => s.status === 'Closed');
  const totalLB = periodShifts.reduce((a, s) => {
    for (const p of PRODUCTS) a += s.lotBesarMap?.[p] ?? 0;
    return a;
  }, 0);
  const periodLabel = period === 1 ? 'Hari Ini' : `${period} Hari Terakhir`;

  // Today's bons for the selected shift (for the Total Pengebonan chart)
  const todayBons = shifts.filter(s => s.tanggal === todayStr && s.shift === bonShift);

  // Pemakaian bar chart + Donut — respond to period
  useEffect(() => {
    const settings = db.getSettings();
    const allMats = getAllMaterials(settings);
    const allShifts = db.getShifts();

    const co = new Date();
    co.setDate(co.getDate() - (period - 1));
    const coStr = co.toISOString().slice(0, 10);
    const pShifts = allShifts.filter(s => (s.tanggal ?? '') >= coStr);
    const pClosed = pShifts.filter(s => s.status === 'Closed');

    const matPem = Object.fromEntries(allMats.map(m => [m, 0]));
    for (const s of pClosed) {
      for (const l of s.bonLines) {
        if (l.pemakaianAktual !== null) {
          matPem[l.material] = (matPem[l.material] ?? 0) + l.pemakaianAktual;
        }
      }
    }

    barInst.current?.destroy();
    barInst.current = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: allMats,
        datasets: [{
          label: 'Pemakaian (kg)',
          data: allMats.map(m => matPem[m] ?? 0),
          backgroundColor: '#3b82f6',
          borderRadius: 5,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR } },
          x: { grid: { display: false }, ticks: { color: TICK_COLOR, font: { size: 10 } } },
        },
      },
    });

    const prodLot = Object.fromEntries(PRODUCTS.map(p => [p, 0]));
    for (const s of pShifts) for (const p of PRODUCTS) prodLot[p] += s.lotBesarMap?.[p] ?? 0;

    donutInst.current?.destroy();
    donutInst.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: {
        labels: PRODUCTS,
        datasets: [{ data: PRODUCTS.map(p => prodLot[p]), backgroundColor: DONUT_COLORS }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: TICK_COLOR, padding: 12, font: { size: 11 } } },
        },
      },
    });

    return () => { barInst.current?.destroy(); donutInst.current?.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Total Pengebonan chart — responds to bonShift (today's bons per material)
  useEffect(() => {
    const settings = db.getSettings();
    const allMats = getAllMaterials(settings);
    const allShifts = db.getShifts();
    const today = new Date().toISOString().slice(0, 10);
    const todaySelected = allShifts.filter(s => s.tanggal === today && s.shift === bonShift);

    const matBon = Object.fromEntries(allMats.map(m => [m, 0]));
    for (const s of todaySelected) {
      for (const l of s.bonLines) {
        matBon[l.material] = (matBon[l.material] ?? 0) + effBonFinal(l);
      }
    }

    bonInst.current?.destroy();
    bonInst.current = new Chart(bonRef.current, {
      type: 'bar',
      data: {
        labels: allMats,
        datasets: [{
          label: 'Bon Final (kg)',
          data: allMats.map(m => matBon[m] ?? 0),
          backgroundColor: bonShift === 'Red' ? '#ef4444aa' : '#8b5cf6aa',
          borderRadius: 5,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR } },
          x: { grid: { display: false }, ticks: { color: TICK_COLOR, font: { size: 10 } } },
        },
      },
    });

    return () => { bonInst.current?.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bonShift]);

  const recent = shifts.slice(0, 5);

  return (
    <div className="p-4 md:p-6 max-w-[1100px]">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h2 className="text-[22px] font-bold text-blue-400">Dashboard</h2>
          <p className="text-zinc-500 text-sm mt-1">
            {now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-1.5">
          {[1, 7, 30].map(d => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === d
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {d === 1 ? '1 Hari' : `${d} Hari`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
        <StatCard title={`Bon ${periodLabel}`} value={periodShifts.length}
          sub={`${closedInPeriod.length} selesai · ${periodShifts.length - closedInPeriod.length} open`} />
        <StatCard title="Total Lot Besar" value={totalLB} sub={periodLabel} />
        <StatCard title="Shift Red" value={periodShifts.filter(s => s.shift === 'Red').length}
          sub={periodLabel} valueClass="!text-red-400" />
        <StatCard title="Shift White" value={periodShifts.filter(s => s.shift === 'White').length}
          sub={periodLabel} valueClass="!text-violet-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="card-title">Pemakaian Material (kg)</div>
          <div className="relative h-[200px] md:h-[220px]"><canvas ref={barRef} /></div>
        </div>
        <div className="card">
          <div className="card-title">Distribusi Produksi per Produk</div>
          <div className="relative h-[200px] md:h-[220px]"><canvas ref={donutRef} /></div>
        </div>
      </div>

      {/* Total Pengebonan — today, per material, shift selectable */}
      <div className="card mb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="card-title mb-0">Total Pengebonan Hari Ini (kg)</div>
          <div className="flex gap-1.5">
            {['Red', 'White'].map(s => (
              <button
                key={s}
                onClick={() => setBonShift(s)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  bonShift === s
                    ? s === 'Red' ? 'bg-red-600 text-white' : 'bg-violet-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="relative h-[180px] md:h-[200px]">
          {todayBons.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">
              Tidak ada bon hari ini untuk Shift {bonShift}
            </div>
          ) : (
            <canvas ref={bonRef} />
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title mb-3">Aktivitas 5 Shift Terakhir</div>
        {recent.length === 0 ? (
          <div className="text-center py-8 text-zinc-600">
            <div className="text-sm">Belum ada aktivitas — mulai dengan membuat bon pertama</div>
          </div>
        ) : (
          <div>
            {recent.map(s => {
              const lots = PRODUCTS.filter(p => (s.lotBesarMap?.[p] ?? 0) > 0)
                .map(p => `${p}:${s.lotBesarMap[p]}`).join(' · ');
              return (
                <div key={s.id} className="flex justify-between items-center py-2.5 border-b border-zinc-800 last:border-b-0 text-sm">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-slate-100">{formatDate(s.tanggal)}</strong>
                      <span className={`badge badge-${s.shift === 'Red' ? 'red' : 'white'}`}>Shift {s.shift}</span>
                      {s.waktu && <span className="text-xs text-zinc-500">{s.waktu}</span>}
                    </div>
                    <div className="text-xs text-zinc-600 mt-0.5">{lots}</div>
                  </div>
                  <span className={`badge badge-${s.status === 'Open' ? 'open' : 'closed'}`}>{s.status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
