import { useState } from 'react';
import { Save, RotateCcw, CheckCircle, Info, Plus, Trash2, AlertTriangle, SlidersHorizontal, FlaskConical, Boxes } from 'lucide-react';
import { db } from '../store/db';
import { DEFAULT_SETTINGS, PRODUCTS, PRODUCT_TONES } from '../constants/defaults';
import { getAllMaterials, calcGentani, fmtGentani } from '../lib/calc';
import useStore from '../store/useStore';

export default function Settings() {
  const { showModal } = useStore();
  const [settings, setSettings] = useState(() => db.getSettings());
  const [notif, setNotif] = useState('');
  const [draft, setDraft] = useState({ nama: '', produks: ['2TR'], ukuran: 25 });
  const [formErr, setFormErr] = useState('');

  const allMats = getAllMaterials(settings);
  const materialAssignments = PRODUCTS.reduce((a, p) => a + Object.keys(settings.materials[p] ?? {}).length, 0);
  const gentaniAuto = calcGentani(settings);
  const activeGentani = PRODUCTS.reduce(
    (a, p) => a + Object.keys(settings.materials[p] ?? {}).filter(m => (settings.materials[p][m] ?? 0) > 0).length,
    0,
  );

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
      setDraft({ nama: '', produks: ['2TR'], ukuran: 25 });
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
    if (!draft.produks.length) {
      setFormErr('Pilih minimal 1 produk.');
      return;
    }
    const dup = draft.produks.filter(p => settings.materials[p]?.[finalName] !== undefined);
    if (dup.length) {
      setFormErr(`Material "${finalName}" sudah ada untuk produk ${dup.join(', ')}.`);
      return;
    }
    setSettings(s => ({
      ...s,
      materials: {
        ...s.materials,
        ...Object.fromEntries(draft.produks.map(p => [p, { ...(s.materials[p] ?? {}), [finalName]: 0 }])),
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

  return (
    <div className="mx-auto max-w-[1480px] p-4 md:p-7">
      <div className="page-head">
        <div>
          <h1 className="page-title">Pengaturan</h1>
          <p className="page-sub">Rasio konversi, kebutuhan material, ukuran karung, gentani, dan batas stok.</p>
        </div>
        <span className="chip text-steel-dim">
          <SlidersHorizontal size={12} />{allMats.length} material · {materialAssignments} pemetaan
        </span>
      </div>

      <div className="bento">
        <section className="tile md:col-span-5">
          <div className="tile-head">
            <div>
              <div className="tile-label">Rasio & Ambang</div>
              <div className="mt-1.5 text-[11px] text-steel-faint">Dasar perhitungan bon dan peringatan</div>
            </div>
            <FlaskConical size={15} className="text-steel-faint" />
          </div>
          <div className="tile-body space-y-3">
            <div>
              <label className="form-label" htmlFor="rasio">Rasio konversi</label>
              <input
                id="rasio" type="number" min="1" step="1" className="form-control text-right"
                value={settings.rasioKonversi}
                onChange={e => setSettings(s => ({ ...s, rasioKonversi: parseInt(e.target.value) || 1 }))}
              />
              <p className="mt-1 text-[10px] text-steel-faint">Default 3 — misal 9 lot kecil menjadi 3 lot besar.</p>
            </div>
            <div>
              <label className="form-label" htmlFor="ambang">Ambang waspada gentani (%)</label>
              <input
                id="ambang" type="number" min="1" max="100" step="1" className="form-control text-right"
                value={settings.ambangWaspada ?? 90}
                onChange={e => setSettings(s => ({ ...s, ambangWaspada: parseFloat(e.target.value) || 90 }))}
              />
              <p className="mt-1 text-[10px] text-steel-faint">Warna waspada muncul saat pemakaian mencapai persentase ini.</p>
            </div>
          </div>
        </section>

        <section className="tile md:col-span-7">
          <div className="tile-head">
            <div>
              <div className="tile-label">Ringkasan Konfigurasi</div>
              <div className="mt-1.5 text-[11px] text-steel-faint">Cakupan data yang sedang aktif</div>
            </div>
            <Boxes size={15} className="text-steel-faint" />
          </div>
          <div className="tile-body">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Material', value: allMats.length },
                { label: 'Pemetaan', value: materialAssignments },
                { label: 'Gentani aktif', value: activeGentani },
                { label: 'Ukuran karung', value: Object.keys(settings.ukuranKarung ?? {}).length },
              ].map(item => (
                <div key={item.label} className="well">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-steel-faint">{item.label}</div>
                  <div className="readout mt-1 text-3xl">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRODUCTS.map(p => (
                <span key={p} className="chip" style={{ color: PRODUCT_TONES[p].color, borderColor: PRODUCT_TONES[p].soft }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRODUCT_TONES[p].color }} />
                  {p}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="tile md:col-span-12">
          <div className="tile-head">
            <div>
              <div className="tile-label">Kebutuhan Material per Lot Besar</div>
              <div className="mt-1.5 text-[11px] text-steel-faint">kg material untuk setiap lot besar per produk</div>
            </div>
          </div>
          <div className="tile-body">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {PRODUCTS.map(p => {
                const mats = settings.materials[p] ?? {};
                const tone = PRODUCT_TONES[p];
                return (
                  <div key={p} className="min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone.color }} />
                        <span className="font-display text-lg font-semibold" style={{ color: tone.color }}>{p}</span>
                      </div>
                      <span className="text-[10px] text-steel-faint">{Object.keys(mats).length} material</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {Object.entries(mats).map(([mat, val]) => (
                        <div key={mat}>
                          <div className="mb-1 flex items-center justify-between gap-1">
                            <label className="block truncate text-[10px] font-semibold text-steel-dim" title={mat}>{mat}</label>
                            <button
                              type="button"
                              onClick={() => removeMaterial(p, mat)}
                              className="shrink-0 text-steel-faint transition-colors hover:text-danger"
                              title={`Hapus ${mat} dari ${p}`}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                          <input
                            type="number" min="0" step="0.1" className="form-control py-1.5 text-right text-xs"
                            value={val}
                            aria-label={`${mat} per lot besar ${p}`}
                            onChange={e => setSettings(s => ({
                              ...s,
                              materials: { ...s.materials, [p]: { ...s.materials[p], [mat]: parseFloat(e.target.value) || 0 } },
                            }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="tile md:col-span-12">
          <div className="tile-head">
            <div>
              <div className="tile-label">Tambah Jenis Material</div>
              <div className="mt-1.5 text-[11px] text-steel-faint">Material baru mulai dari kebutuhan 0 kg/lot besar</div>
            </div>
          </div>
          <div className="tile-body">
            <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_120px_auto]">
              <div>
                <label className="form-label" htmlFor="draft-nama">Nama material</label>
                <input
                  id="draft-nama" type="text" className="form-control" placeholder="misal: Ferro Silicon"
                  value={draft.nama}
                  onChange={e => { setDraft(d => ({ ...d, nama: e.target.value })); setFormErr(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') addMaterial(); }}
                />
              </div>
              <div>
                <span className="form-label">Produk</span>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 py-1.5">
                  {PRODUCTS.map(p => (
                    <label key={p} className="flex cursor-pointer items-center gap-1.5 text-xs text-paper">
                      <input
                        type="checkbox" className="cursor-pointer accent-[#F0A32A]"
                        checked={draft.produks.includes(p)}
                        onChange={e => {
                          setDraft(d => ({
                            ...d,
                            produks: e.target.checked ? [...d.produks, p] : d.produks.filter(x => x !== p),
                          }));
                          setFormErr('');
                        }}
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label" htmlFor="draft-ukuran">Karung (kg)</label>
                <input
                  id="draft-ukuran" type="number" min="1" step="1" className="form-control text-right"
                  value={draft.ukuran}
                  onChange={e => setDraft(d => ({ ...d, ukuran: e.target.value }))}
                />
              </div>
              <button type="button" className="btn btn-outline" onClick={addMaterial}>
                <Plus size={14} />Tambah
              </button>
            </div>
            {formErr && (
              <div className="alert alert-danger mt-3 !mb-0">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{formErr}</span>
              </div>
            )}
          </div>
        </section>

        <section className="tile md:col-span-6">
          <div className="tile-head">
            <div>
              <div className="tile-label">Ukuran Karung</div>
              <div className="mt-1.5 text-[11px] text-steel-faint">kg per karung untuk pembulatan bon</div>
            </div>
          </div>
          <div className="tile-body">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {allMats.map(mat => (
                <div key={mat}>
                  <label className="mb-1 block truncate text-[10px] font-semibold text-steel-dim" title={mat}>{mat}</label>
                  <input
                    type="number" min="1" step="1" className="form-control py-1.5 text-right text-xs"
                    value={settings.ukuranKarung[mat] ?? 25}
                    aria-label={`Ukuran karung ${mat}`}
                    onChange={e => setSettings(s => ({
                      ...s,
                      ukuranKarung: { ...s.ukuranKarung, [mat]: parseFloat(e.target.value) || 25 },
                    }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="tile md:col-span-6">
          <div className="tile-head">
            <div>
              <div className="tile-label">Batas Stok Minimum</div>
              <div className="mt-1.5 text-[11px] text-steel-faint">Isi 0 untuk menonaktifkan peringatan</div>
            </div>
          </div>
          <div className="tile-body">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {allMats.map(mat => (
                <div key={mat}>
                  <label className="mb-1 block truncate text-[10px] font-semibold text-steel-dim" title={mat}>{mat}</label>
                  <input
                    type="number" min="0" step="1" className="form-control py-1.5 text-right text-xs"
                    value={settings.stokMinimum?.[mat] ?? 0}
                    aria-label={`Stok minimum ${mat}`}
                    onChange={e => setSettings(s => ({
                      ...s,
                      stokMinimum: { ...s.stokMinimum, [mat]: parseFloat(e.target.value) || 0 },
                    }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="tile md:col-span-12">
          <div className="tile-head">
            <div>
              <div className="tile-label">Gentani</div>
              <div className="mt-1.5 text-[11px] text-steel-faint">Otomatis: kg/lot besar ÷ rasio ÷ pcs per lot kecil · di bawah 10 kg ditampilkan g/pcs</div>
            </div>
            <span className="chip text-steel-dim">{activeGentani} material aktif</span>
          </div>
          <div className="tile-body">
            <div className="mb-5">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-steel-dim">Pcs per lot kecil</div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {PRODUCTS.map(p => (
                  <div key={p}>
                    <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: PRODUCT_TONES[p].color }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRODUCT_TONES[p].color }} />
                      {p}
                    </label>
                    <input
                      type="number" min="1" step="1" className="form-control py-1.5 text-right text-xs"
                      value={settings.pcsPerLotKecil?.[p] ?? DEFAULT_SETTINGS.pcsPerLotKecil[p]}
                      aria-label={`Pcs per lot kecil ${p}`}
                      onChange={e => setSettings(s => ({
                        ...s,
                        pcsPerLotKecil: { ...s.pcsPerLotKecil, [p]: parseInt(e.target.value) || 1 },
                      }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <p className="mb-5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[10px] leading-relaxed text-steel-faint">
              Gentani dihitung otomatis dari kebutuhan material:{' '}
              <span className="text-steel-dim">kg per lot besar ÷ rasio ({settings.rasioKonversi}) ÷ pcs per lot kecil</span>.
              Nilai di bawah 10 kg/pcs ditampilkan dalam g/pcs — contoh 2 kg ÷ {settings.rasioKonversi} ÷ 15 pcs = 44,44 g/pcs.
            </p>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {PRODUCTS.map(p => {
                const mats = settings.materials[p] ?? {};
                const pcsPerLot = settings.pcsPerLotKecil?.[p] ?? DEFAULT_SETTINGS.pcsPerLotKecil[p];
                return (
                  <div key={p} className="min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRODUCT_TONES[p].color }} />
                        <span className="font-display text-lg font-semibold" style={{ color: PRODUCT_TONES[p].color }}>{p}</span>
                      </div>
                      <span className="text-[10px] text-steel-faint">{pcsPerLot} pcs/lot kecil</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {allMats.map(mat => {
                        const perLot = mats[mat] ?? 0;
                        const shown = fmtGentani(gentaniAuto[p]?.[mat] ?? 0);
                        return (
                          <div key={mat} className={`well ${mats[mat] === undefined ? 'opacity-40' : ''}`}>
                            <label
                              className="mb-1 block truncate text-[10px] font-semibold text-steel-dim"
                              title={`${perLot} kg/lot besar ÷ ${settings.rasioKonversi} ÷ ${pcsPerLot} pcs`}
                            >
                              {mat}
                            </label>
                            <div className="readout text-base">
                              {shown.value.toLocaleString('id-ID', { maximumFractionDigits: shown.unit === 'g/pcs' ? 2 : 3 })}
                            </div>
                            <div className="text-[9px] uppercase tracking-[0.1em] text-steel-faint">{shown.unit}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="tile md:col-span-12">
          <div className="tile-body">
            <div className="flex flex-wrap gap-2.5">
              <button className="btn btn-primary" onClick={save}><Save size={14} />Simpan Pengaturan</button>
              <button className="btn btn-outline" onClick={reset}><RotateCcw size={14} />Reset ke Default</button>
            </div>
            {notif === 'success' && (
              <div className="alert alert-success mt-4 !mb-0">
                <CheckCircle size={16} className="shrink-0" />
                <span>Pengaturan berhasil disimpan.</span>
              </div>
            )}
            {notif === 'info' && (
              <div className="alert alert-info mt-4 !mb-0">
                <Info size={16} className="shrink-0" />
                <span>Pengaturan direset ke nilai default.</span>
              </div>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-steel-faint">
              Perubahan disimpan di perangkat ini. Material baru ditambahkan dengan kebutuhan 0 kg/lot besar — isi nilainya lalu simpan.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
