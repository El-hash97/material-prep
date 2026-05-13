import { useState } from 'react';
import { Save, RotateCcw, CheckCircle, Info } from 'lucide-react';
import { db } from '../store/db';
import { DEFAULT_SETTINGS, PRODUCTS } from '../constants/defaults';
import { getAllMaterials } from '../lib/calc';
import useStore from '../store/useStore';

export default function Settings() {
  const { showModal } = useStore();
  const [settings, setSettings] = useState(() => db.getSettings());
  const [notif, setNotif] = useState('');

  const allMats = getAllMaterials(settings);

  function save() {
    db.saveSettings(settings);
    setNotif('success');
    setTimeout(() => setNotif(''), 3000);
  }

  function reset() {
    showModal('Reset Pengaturan', 'Reset semua pengaturan ke nilai default? Nilai yang sudah diubah akan hilang.', () => {
      const def = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      db.saveSettings(def);
      setSettings(def);
      setNotif('info');
      setTimeout(() => setNotif(''), 3000);
    });
  }

  const produkColors = {
    '2TR': 'text-[#1A3C6E] dark:text-blue-400',
    '1TR': 'text-green-700 dark:text-green-400',
    'KAI': 'text-green-600 dark:text-green-400',
    'CRANK': 'text-amber-700 dark:text-amber-400',
  };

  return (
    <div className="p-4 md:p-6 max-w-[900px]">
      <div className="mb-5">
        <h2 className="text-[22px] font-bold text-[#1A3C6E] dark:text-blue-400">Pengaturan</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Konfigurasi rasio konversi, kebutuhan material, dan ukuran karung
        </p>
      </div>

      <div className="card">
        {/* Rasio */}
        <div className="mb-7">
          <h3 className="text-sm font-bold text-[#1A3C6E] dark:text-blue-400 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">
            Rasio Konversi Lot
          </h3>
          <div className="max-w-[220px]">
            <label className="form-label">Lot Kecil ÷ Rasio = Lot Besar</label>
            <input type="number" min="1" step="1" className="form-control text-right"
              value={settings.rasioKonversi}
              onChange={e => setSettings(s => ({ ...s, rasioKonversi: parseInt(e.target.value) || 1 }))} />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Default: 3 (misal: 9 lot kecil → 3 lot besar)</p>
          </div>
        </div>

        {/* Material per lot besar */}
        <div className="mb-7">
          <h3 className="text-sm font-bold text-[#1A3C6E] dark:text-blue-400 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">
            Kebutuhan Material per Lot Besar (kg/lot besar)
          </h3>
          {PRODUCTS.map(p => {
            const mats = settings.materials[p] ?? {};
            return (
              <div key={p} className="mb-5">
                <div className={`text-xs font-bold mb-2 ${produkColors[p]}`}>{p}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(mats).map(([mat, val]) => (
                    <div key={mat}>
                      <label className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold block mb-1">{mat}</label>
                      <input type="number" min="0" step="0.1" className="form-control text-right"
                        value={val}
                        onChange={e => setSettings(s => ({
                          ...s,
                          materials: { ...s.materials, [p]: { ...s.materials[p], [mat]: parseFloat(e.target.value) || 0 } },
                        }))} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ukuran karung */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-[#1A3C6E] dark:text-blue-400 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">
            Ukuran Karung per Material (kg/karung)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {allMats.map(mat => (
              <div key={mat}>
                <label className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold block mb-1">{mat}</label>
                <input type="number" min="1" step="1" className="form-control text-right"
                  value={settings.ukuranKarung[mat] ?? 25}
                  onChange={e => setSettings(s => ({
                    ...s,
                    ukuranKarung: { ...s.ukuranKarung, [mat]: parseFloat(e.target.value) || 25 },
                  }))} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button className="btn btn-primary" onClick={save}><Save size={14} />Simpan Pengaturan</button>
          <button className="btn btn-outline" onClick={reset}><RotateCcw size={14} />Reset ke Default</button>
        </div>

        {notif === 'success' && (
          <div className="alert alert-success mt-4">
            <CheckCircle size={16} className="shrink-0" />
            <span>Pengaturan berhasil disimpan.</span>
          </div>
        )}
        {notif === 'info' && (
          <div className="alert alert-info mt-4">
            <Info size={16} className="shrink-0" />
            <span>Pengaturan direset ke nilai default.</span>
          </div>
        )}
      </div>
    </div>
  );
}
