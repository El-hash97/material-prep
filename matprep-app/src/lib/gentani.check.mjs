// Jalankan: node src/lib/gentani.check.mjs  (modul dimuat lewat Vite karena import tanpa ekstensi)
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { gentaniUsage } = await vite.ssrLoadModule('/src/lib/calc.js');
const { DEFAULT_SETTINGS } = await vite.ssrLoadModule('/src/constants/defaults.js');

const settings = { ...DEFAULT_SETTINGS, gentani: { '2TR': { LMC: 10 } } };
const shift = (aktual) => ({
  lotKecilMap: { '2TR': 2 },
  bonLines: [{ material: 'LMC', pemakaianAktual: aktual }],
});
const lmc = (s) => gentaniUsage(s, settings).find(r => r.material === 'LMC');

// 2 lot kecil × 15 pcs × 10 kg = batas 300
assert.equal(lmc([shift(100)]).batas, 300);
assert.equal(lmc([shift(100)]).status, 'ok');
assert.equal(lmc([shift(270)]).status, 'warn');
assert.equal(lmc([shift(301)]).status, 'over');
assert.equal(lmc([shift(null)]).batas, 0);
assert.equal(lmc([shift(null)]).status, 'off');
assert.equal(gentaniUsage([shift(1)], DEFAULT_SETTINGS).find(r => r.material === 'LMC').status, 'off');
console.log('gentani ok');
await vite.close();
