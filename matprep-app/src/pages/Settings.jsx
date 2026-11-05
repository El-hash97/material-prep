import { useState } from 'react';
import { Save, RotateCcw, CheckCircle, Info, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { db } from '../store/db';
import { DEFAULT_SETTINGS, PRODUCTS } from '../constants/defaults';
import { getAllMaterials } from '../lib/calc';
import useStore from '../store/useStore';

export default function Settings() {
  const { showModal } = useStore();
  const [settings, setSettings] = useState(() => db.getSettings());
  const [notif, setNotif] = useState('');
  const [draft, setDraft] = useState({ nama: '', produk: '2TR', ukuran: 25 });
  const [formErr, setFormErr] = useState('');

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
      setDraft({ nama: '', produk: '2TR', ukuran: 25 });
      setFormErr('');
      setNotif('info');
      setTimeout(() => setNotif(''), 3000);
    });
  }

  function addMaterial() {
    const nama = draft.nama.trim();
    if (!nama) {
      setFormErr('Nama material tidak boleh kosong.');
      return;
    }
    const existing = allMats.find(m => m.toLowerCase() === nama.toLowerCase());
    const finalName = existing ?? nama;
    if (settings.materials[draft.produk]?.[finalName] !== undefined) {
      setFormErr(`Material "${finalName}" sudah ada untuk produk ${draft.produk}.`);
      return;
    }
    setSettings(s => ({
      ...s,
      materials: {
        ...s.materials,
        [draft.produk]: { ...(s.materials[draft.produk] ?? {}), [finalName]: 0 },
      },
      ukuranKarung: {
        ...s.ukuranKarung,
        [finalName]: s.ukuranKarung[finalName] ?? (parseFloat(draft.ukuran) || 25),
      },
    }));
    setDraft(d => ({ ...d, nama: '' }));
    setFormErr('');
  }

  function removeMaterial(produk, material) {
    showModal(
      'Hapus Jenis Material',
      `Hapus material "${material}" dari produk ${produk}? Riwayat shift lama tidak berubah.`,
      () => {
        setSettings(s => {
          const mats = { ...(s.materials[produk] ?? {}) };
          delete mats[material];
          const masihDipakai = PRODUCTS.some(p => p !== produk && s.materials[p]?.[material] !== undefined);
          const ukuranKarung = { ...s.ukuranKarung };
          if (!masihDipakai) delete ukuranKarung[material];
          return { ...s, materials: { ...s.materials, [produk]: mats }, ukuranKarung };
        });
      },
    );
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
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold block truncate">{mat}</label>
                        <button type="button" onClick={() => removeMaterial(p, mat)}
                          className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors shrink-0"
                          title={`Hapus ${mat} dari ${p}`}>
                          <Trash2 size={12} />
                        </button>
                      </div>
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

        {/* Tambah jenis material */}
        <div className="mb-7">
          <h3 className="text-sm font-bold text-[#1A3C6E] dark:text-blue-400 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">
            Tambah Jenis Material
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_120px_auto] gap-3 items-end">
            <div>
              <label className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold block mb-1">Nama material</label>
              <input type="text" className="form-control" placeholder="misal: Ferro Silicon"
                value={draft.nama}
                onChange={e => { setDraft(d => ({ ...d, nama: e.target.value })); setFormErr(''); }}
                onKeyDown={e => { if (e.key === 'Enter') addMaterial(); }} />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold block mb-1">Produk</label>
              <select className="form-control" value={draft.produk}
                onChange={e => { setDraft(d => ({ ...d, produk: e.target.value })); setFormErr(''); }}>
                {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold block mb-1">Karung (kg)</label>
              <input type="number" min="1" step="1" className="form-control text-right"
                value={draft.ukuran}
                onChange={e => setDraft(d => ({ ...d, ukuran: e.target.value }))} />
            </div>
            <button type="button" className="btn btn-outline" onClick={addMaterial}>
              <Plus size={14} />Tambah
            </button>
          </div>
          {formErr && (
            <div className="alert alert-danger mt-3">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{formErr}</span>
            </div>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Material baru ditambahkan dengan kebutuhan 0 kg/lot besar. Isi nilainya lalu klik Simpan Pengaturan.
          </p>
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
