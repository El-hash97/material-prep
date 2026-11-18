export const PRODUCTS = ['2TR', '1TR', 'KAI', 'CRANK'];

// Palet kategorikal tervalidasi (dataviz validator, permukaan tile #14191C, urutan bersebelahan 2TR→1TR→KAI→CRANK):
// tidak memakai hue status (merah/amber/hijau). Jangan ubah urutan tanpa validasi ulang.
export const PRODUCT_TONES = {
  '2TR':   { color: '#3987E5', soft: 'rgba(57, 135, 229, 0.16)',  label: 'Blue' },
  '1TR':   { color: '#D55181', soft: 'rgba(213, 81, 129, 0.16)',  label: 'Magenta' },
  'KAI':   { color: '#9085E9', soft: 'rgba(144, 133, 233, 0.16)', label: 'Violet' },
  'CRANK': { color: '#199E70', soft: 'rgba(25, 158, 112, 0.16)',  label: 'Aqua' },
};

export const DEFAULT_SETTINGS = {
  rasioKonversi: 3,
  materials: {
    '2TR':   { 'LMC': 100, 'Inocarb': 15, 'Antimon (Sb)': 5, 'Fe Sulfur': 10 },
    '1TR':   { 'LMC': 80,  'Inocarb': 12, 'Antimon (Sb)': 4, 'Fe Sulfur': 8  },
    'KAI':   { 'Mg Denodule': 8, 'Superseed': 3, 'Sn': 2, 'Cu': 4 },
    'CRANK': { 'Mg Lamet': 6,   'Ultraseed CE Inoculant': 3, 'Sn': 2, 'Cu': 4 },
  },
  stokMinimum: {},
  kapasitasTabung: {},
  pcsPerLotKecil: { '2TR': 15, '1TR': 15, 'KAI': 120, 'CRANK': 45 },
  ambangWaspada: 90,
  ukuranKarung: {
    'LMC': 25, 'Inocarb': 25, 'Antimon (Sb)': 25, 'Fe Sulfur': 25,
    'Mg Denodule': 25, 'Superseed': 20, 'Sn': 50, 'Cu': 20,
    'Mg Lamet': 25, 'Ultraseed CE Inoculant': 20,
  },
};
