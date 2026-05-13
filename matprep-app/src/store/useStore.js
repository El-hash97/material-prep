import { create } from 'zustand';
import { todayStr } from '../lib/calc';

const getSidebarCollapsed = () => { try { return JSON.parse(localStorage.getItem('matprep_sidebar_collapsed') ?? 'false'); } catch { return false; } };

// Always dark
document.documentElement.classList.add('dark');

const useStore = create((set) => ({
  page: 'dashboard',
  navigate: (page) => set({ page, sidebarMobileOpen: false }),

  currentBonId: null,
  setCurrentBonId: (id) => set({ currentBonId: id }),

  sidebarCollapsed: getSidebarCollapsed(),
  toggleSidebarCollapsed: () => set((s) => {
    const next = !s.sidebarCollapsed;
    localStorage.setItem('matprep_sidebar_collapsed', JSON.stringify(next));
    return { sidebarCollapsed: next };
  }),

  sidebarMobileOpen: false,
  setSidebarMobileOpen: (v) => set({ sidebarMobileOpen: v }),

  // Planning form
  planForm: {
    tanggal: todayStr(),
    shift: 'Red',
    waktu: 'Day',
    lotKecilMap: { '2TR': 0, '1TR': 0, 'KAI': 0, 'CRANK': 0 },
  },
  updatePlanForm: (patch) =>
    set((s) => ({ planForm: { ...s.planForm, ...patch } })),
  updateLotKecil: (produk, val) =>
    set((s) => ({
      planForm: {
        ...s.planForm,
        lotKecilMap: { ...s.planForm.lotKecilMap, [produk]: val },
      },
    })),
  resetPlanForm: () =>
    set({
      planForm: {
        tanggal: todayStr(),
        shift: 'Red',
        waktu: 'Day',
        lotKecilMap: { '2TR': 0, '1TR': 0, 'KAI': 0, 'CRANK': 0 },
      },
      calculatedBonLines: [],
      calculatedLotBesarMap: {},
      bonSaved: false,
      currentBonId: null,
    }),

  calculatedBonLines: [],
  calculatedLotBesarMap: {},
  setCalculatedBon: (bonLines, lotBesarMap) =>
    set({ calculatedBonLines: bonLines, calculatedLotBesarMap: lotBesarMap, bonSaved: false }),
  updateOverride: (idx, val) =>
    set((s) => {
      const lines = [...s.calculatedBonLines];
      lines[idx] = { ...lines[idx], bonFinalOverride: val };
      return { calculatedBonLines: lines };
    }),

  bonSaved: false,
  setBonSaved: (v) => set({ bonSaved: v }),

  modal: { open: false, title: '', body: '', onOk: null },
  showModal: (title, body, onOk) =>
    set({ modal: { open: true, title, body, onOk } }),
  closeModal: () =>
    set({ modal: { open: false, title: '', body: '', onOk: null } }),
}));

export default useStore;
