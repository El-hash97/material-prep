import { Menu } from 'lucide-react';
import useStore from './store/useStore';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';
import Dashboard from './pages/Dashboard';
import Planning from './pages/Planning';
import TutupShift from './pages/TutupShift';
import Riwayat from './pages/Riwayat';
import Settings from './pages/Settings';

const PAGES = {
  dashboard: Dashboard,
  planning: Planning,
  'tutup-shift': TutupShift,
  riwayat: Riwayat,
  settings: Settings,
};

export default function App() {
  const { page, sidebarCollapsed, sidebarMobileOpen, setSidebarMobileOpen, currentBonId } = useStore();
  const PageComponent = PAGES[page] ?? Dashboard;

  const mainMargin = sidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-[236px]';

  return (
    <div className="min-h-screen text-paper">

      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      <Sidebar />

      <div
        id="mobile-topbar"
        className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-3 border-b border-white/[0.08] bg-iron-900/95 px-4 backdrop-blur md:hidden"
      >
        <button
          onClick={() => setSidebarMobileOpen(true)}
          className="rounded-[4px] p-1.5 text-steel transition-colors hover:bg-white/[0.06] hover:text-paper"
          aria-label="Buka navigasi"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-[3px] border border-signal/40 bg-signal/10 font-display text-[13px] font-bold text-signal">
            MP
          </span>
          <span className="font-display text-lg font-semibold tracking-wide text-paper">MatPrep</span>
        </div>
        <span className="chip ml-auto text-steel-dim">
          <span className="chip-dot bg-success" />
          Lokal
        </span>
      </div>

      <main
        id="main-content"
        className={`min-h-screen pt-14 transition-[margin] duration-200 ${mainMargin} md:pt-0`}
      >
        <PageComponent key={page === 'tutup-shift' ? currentBonId ?? 'none' : page} />
      </main>

      <Modal />
    </div>
  );
}
