import { lazy, Suspense, useState } from 'react';
import { createPortal } from 'react-dom';

// Ikon karung 3D per material (dirender dari src/lib/sack3d.js oleh tools/sack-icons).
const ICONS = import.meta.glob('../assets/material-icons/*.webp', { eager: true, import: 'default' });
const icon = id => ICONS[`../assets/material-icons/${id}.webp`];
const SackViewer3D = lazy(() => import('./SackViewer3D'));

// nama material di Pengaturan → id karung. Material tanpa foto memakai karung polos.
const BY_MATERIAL = {
  'LMC': 'lmc',
  'Inocarb': 'lmc', // karung sama dengan LMC
  'Ultraseed CE Inoculant': 'ultraseed',
  'Mg Lamet': 'mglamet',
  'Cu': 'cu',
  'Mg Denodule': 'mgdenodule',
};

// fallback: gambar lain bila belum ada foto karung (mis. foto isi kompartemen).
// viewable: klik ikon → karung 3D yang bisa diputar. Matikan bila ikon ada di dalam tombol lain.
export default function MaterialIcon({ material, fallback, className = 'h-7 w-7', viewable = true }) {
  const [open, setOpen] = useState(false);
  const sackId = BY_MATERIAL[material];
  const img = (
    <img
      src={sackId ? icon(sackId) : fallback ?? icon('default')}
      alt=""
      loading="lazy"
      className={`shrink-0 object-contain ${className}`}
    />
  );
  if (!viewable) return img;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Lihat karung ${material} 3D`}
        aria-label={`Lihat karung ${material} 3D`}
        className="shrink-0 rounded-[3px] transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
      >
        {img}
      </button>
      {open && createPortal(
        <Suspense fallback={null}>
          <SackViewer3D sackId={sackId ?? 'default'} material={material} onClose={() => setOpen(false)} />
        </Suspense>,
        document.body,
      )}
    </>
  );
}
