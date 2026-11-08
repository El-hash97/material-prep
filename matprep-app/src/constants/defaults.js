export const PRODUCTS = ['2TR', '1TR', 'KAI', 'CRANK'];

export const PRODUCT_TONES = {
  '2TR':   { color: '#6E9FE8', soft: 'rgba(110, 159, 232, 0.16)', label: 'Steel Blue' },
  '1TR':   { color: '#E2574C', soft: 'rgba(226, 87, 76, 0.16)',   label: 'Signal Red' },
  'KAI':   { color: '#F0A32A', soft: 'rgba(240, 163, 42, 0.16)',  label: 'Amber' },
  'CRANK': { color: '#4DBE8A', soft: 'rgba(77, 190, 138, 0.16)',  label: 'Green' },
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
  pcsPerLotKecil: { '2TR': 15, '1TR': 15, 'KAI': 120, 'CRANK': 45 },
  ambangWaspada: 90,
  ukuranKarung: {
    'LMC': 1000, 'Inocarb': 25, 'Antimon (Sb)': 25, 'Fe Sulfur': 25,
    'Mg Denodule': 25, 'Superseed': 20, 'Sn': 50, 'Cu': 20,
    'Mg Lamet': 25, 'Ultraseed CE Inoculant': 20,
  },
};
