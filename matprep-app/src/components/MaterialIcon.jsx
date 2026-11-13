// Ikon karung 3D per material (dirender dari foto karung oleh tools/sack-icons).
const ICONS = import.meta.glob('../assets/material-icons/*.webp', { eager: true, import: 'default' });
const icon = id => ICONS[`../assets/material-icons/${id}.webp`];

// nama material di Pengaturan → id ikon. Material tanpa foto memakai karung polos.
const BY_MATERIAL = {
  'LMC': 'lmc',
  'Inocarb': 'lmc', // karung sama dengan LMC
  'Ultraseed CE Inoculant': 'ultraseed',
  'Mg Lamet': 'mglamet',
  'Cu': 'cu',
  'Mg Denodule': 'mgdenodule',
};

// fallback: gambar lain bila belum ada foto karung (mis. foto isi kompartemen)
export default function MaterialIcon({ material, fallback, className = 'h-7 w-7' }) {
  return (
    <img
      src={BY_MATERIAL[material] ? icon(BY_MATERIAL[material]) : fallback ?? icon('default')}
      alt=""
      loading="lazy"
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
