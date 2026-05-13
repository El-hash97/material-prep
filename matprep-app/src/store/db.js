import { DEFAULT_SETTINGS } from '../constants/defaults';

const SHIFTS_KEY   = 'matprep_shifts';
const SETTINGS_KEY = 'matprep_settings';

function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }

export const db = {
  getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : deepCopy(DEFAULT_SETTINGS);
    } catch { return deepCopy(DEFAULT_SETTINGS); }
  },
  saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); },

  getShifts() {
    try {
      const raw = localStorage.getItem(SHIFTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },
  saveShifts(arr) { localStorage.setItem(SHIFTS_KEY, JSON.stringify(arr)); },

  addShift(shift) {
    const arr = this.getShifts();
    arr.unshift(shift);
    this.saveShifts(arr);
  },
  updateShift(id, updates) {
    const arr = this.getShifts();
    const i = arr.findIndex(s => s.id === id);
    if (i >= 0) { Object.assign(arr[i], updates); this.saveShifts(arr); }
  },
  getShiftById(id) { return this.getShifts().find(s => s.id === id) ?? null; },
  deleteShift(id)  { this.saveShifts(this.getShifts().filter(s => s.id !== id)); },
  getLastClosed()  { return this.getShifts().find(s => s.status === 'Closed') ?? null; },
  hasOpenShift()   { return this.getShifts().some(s => s.status === 'Open'); },
};
