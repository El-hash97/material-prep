export const PRODUCTS = ['2TR', '1TR', 'KAI', 'CRANK'];

export const DEFAULT_SETTINGS = {
  rasioKonversi: 3,
  materials: {
    '2TR':   { 'LMC': 100, 'Inocarb': 15, 'Antimon (Sb)': 5, 'Fe Sulfur': 10 },
    '1TR':   { 'LMC': 80,  'Inocarb': 12, 'Antimon (Sb)': 4, 'Fe Sulfur': 8  },
    'KAI':   { 'Mg Denodule': 8, 'Superseed': 3, 'Sn': 2, 'Cu': 4 },
    'CRANK': { 'Mg Lamet': 6,   'Ultraseed CE Inoculant': 3, 'Sn': 2, 'Cu': 4 },
  },
  ukuranKarung: {
    'LMC': 1000, 'Inocarb': 25, 'Antimon (Sb)': 25, 'Fe Sulfur': 25,
    'Mg Denodule': 25, 'Superseed': 20, 'Sn': 50, 'Cu': 20,
    'Mg Lamet': 25, 'Ultraseed CE Inoculant': 20,
  },
};
