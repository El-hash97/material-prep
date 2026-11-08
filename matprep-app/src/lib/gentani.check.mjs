// Jalankan: node src/lib/gentani.check.mjs  (modul dimuat lewat Vite karena import tanpa ekstensi)
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { gentaniUsage, calcGentani } = await vite.ssrLoadModule('/src/lib/calc.js');
const { DEFAULT_SETTINGS } = await vite.ssrLoadModule('/src/constants/defaults.js');

// 2 kg/lot besar ÷ 3 ÷ 15 pcs = 0,0444 kg/pcs
const example = {
  ...DEFAULT_SETTINGS,
  rasioKonversi: 3,
  pcsPerLotKecil: { ...DEFAULT_SETTINGS.pcsPerLotKecil, '2TR': 15 },
  materials: { ...DEFAULT_SETTINGS.materials, '2TR': { ...DEFAULT_SETTINGS.materials['2TR'], LMC: 2 } },
};
assert.ok(Math.abs(calcGentani(example)['2TR'].LMC - 2 / 3 / 15) < 1e-12);

// 90 kg/lot besar ÷ 3 ÷ 15 pcs = 2 kg/pcs
const settings = {
  ...example,
  materials: { ...example.materials, '2TR': { ...example.materials['2TR'], LMC: 90 } },
};
assert.equal(calcGentani(settings)['2TR'].LMC, 2);

const shift = (aktual) => ({
  lotKecilMap: { '2TR': 2 },
  bonLines: [{ material: 'LMC', pemakaianAktual: aktual }],
});
const lmc = (s) => gentaniUsage(s, settings).find(r => r.material === 'LMC');

// 2 lot kecil × 15 pcs × 2 kg = batas 60
assert.equal(lmc([shift(10)]).batas, 60);
assert.equal(lmc([shift(10)]).status, 'ok');
assert.equal(lmc([shift(55)]).status, 'warn');
assert.equal(lmc([shift(61)]).status, 'over');
assert.equal(lmc([shift(null)]).batas, 0);
assert.equal(lmc([shift(null)]).status, 'off');
console.log('gentani ok');
await vite.close();
