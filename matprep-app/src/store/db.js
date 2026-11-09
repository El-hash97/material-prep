import { DEFAULT_SETTINGS } from '../constants/defaults';

// Data disimpan di Neon lewat /api (Netlify Function). Cache memori diisi sekali oleh db.init(),
// sehingga pembacaan tetap sinkron; penulisan memperbarui cache lalu dikirim ke server berurutan.
const OLD_SHIFTS_KEY   = 'matprep_shifts';
const OLD_SETTINGS_KEY = 'matprep_settings';

const deepCopy = o => JSON.parse(JSON.stringify(o));

let settings = null;   // null = belum pernah disimpan, pakai default
let shifts = [];       // terbaru di depan

async function call(method, path, body) {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${method} /${path} gagal (${res.status})`);
  return res.json();
}

let queue = Promise.resolve();
let warned = false;
function persist(method, path, body) {
  queue = queue.then(() => call(method, path, body)).catch(e => {
    console.error(e);
    if (!warned) { warned = true; alert('Gagal menyimpan ke database. Periksa koneksi lalu muat ulang halaman.'); }
  });
}

function readOld(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

export const db = {
  async init() {
    const remote = await call('GET', 'data');
    settings = remote.settings;
    shifts = remote.shifts;
    // Impor sekali: database kosong tapi localStorage lama berisi data.
    if (settings === null && shifts.length === 0) {
      const oldSettings = readOld(OLD_SETTINGS_KEY, null);
      const oldShifts = readOld(OLD_SHIFTS_KEY, []);
      if (oldSettings || oldShifts.length) {
        const r = await call('POST', 'import', { settings: oldSettings, shifts: oldShifts });
        if (r.imported) { settings = oldSettings; shifts = oldShifts; }
      }
    }
  },

  getSettings() { return deepCopy(settings ?? DEFAULT_SETTINGS); },
  saveSettings(s) { settings = deepCopy(s); persist('PUT', 'settings', settings); },

  getShifts() { return deepCopy(shifts); },
  addShift(shift) {
    shifts.unshift(deepCopy(shift));
    persist('POST', 'shifts', shift);
  },
  updateShift(id, updates) {
    const i = shifts.findIndex(s => s.id === id);
    if (i < 0) return;
    Object.assign(shifts[i], deepCopy(updates));
    persist('PATCH', `shifts/${encodeURIComponent(id)}`, updates);
  },
  getShiftById(id) { const s = shifts.find(x => x.id === id); return s ? deepCopy(s) : null; },
  deleteShift(id) {
    shifts = shifts.filter(s => s.id !== id);
    persist('DELETE', `shifts/${encodeURIComponent(id)}`);
  },
  getLastClosed() { const s = shifts.find(x => x.status === 'Closed'); return s ? deepCopy(s) : null; },
  hasOpenShift() { return shifts.some(s => s.status === 'Open'); },
};
