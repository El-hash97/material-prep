import { Menu } from 'lucide-react';
import useStore from './store/useStore';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';
import logoSmall from './assets/brand/matprep-symbol-small.svg';
import { DashboardSkeleton, BootError } from './components/LoadState';
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

// boot: 'loading' (skeleton) | 'error' (kartu error) | 'ready' (halaman). Diatur main.jsx selama db.init().
export default function App({ boot = 'ready', onRetry }) {
  const { page, sidebarCollapsed, sidebarMobileOpen, setSidebarMobileOpen, currentBonId } = useStore();
  const PageComponent = PAGES[page] ?? Dashboard;

  const mainMargin = sidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-[236px]';

  return (
    <div className="min-h-screen text-paper">

      <Sidebar />

      <div
        id="mobile-topbar"
        className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-3 border-b border-white/[0.08] bg-iron-900/95 px-4 backdrop-blur md:hidden"
      >
        <button
          onClick={() => setSidebarMobileOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-[4px] text-steel transition-colors hover:bg-white/[0.06] hover:text-paper"
          aria-label="Buka navigasi"
          aria-expanded={sidebarMobileOpen}
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <img src={logoSmall} alt="" width="28" height="28" className="h-7 w-7" />
          <span className="font-display text-lg font-semibold tracking-wide text-paper">MatPrep</span>
        </div>
        <span className="chip ml-auto text-steel-dim">
          <span className="chip-dot bg-success" />
          Lokal
        </span>
      </div>

      <main
        id="main-content"
        className={`sb-shift min-h-screen pt-14 ${mainMargin} md:pt-0`}
      >
        {boot === 'loading' ? <DashboardSkeleton />
          : boot === 'error' ? <BootError onRetry={onRetry} />
          : <PageComponent key={page === 'tutup-shift' ? currentBonId ?? 'none' : page} />}
      </main>

      <Modal />
    </div>
  );
}
