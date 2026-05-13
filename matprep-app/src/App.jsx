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
  const { page, sidebarCollapsed, sidebarMobileOpen, setSidebarMobileOpen } = useStore();
  const PageComponent = PAGES[page] ?? Dashboard;

  const mainMargin = sidebarCollapsed ? 'md:ml-16' : 'md:ml-[220px]';

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100">

      {/* Mobile overlay */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      <Sidebar />

      {/* Mobile top bar */}
      <div
        id="mobile-topbar"
        className="md:hidden fixed top-0 left-0 right-0 h-14 bg-zinc-900 z-20 flex items-center px-4 gap-3 shadow-md border-b border-zinc-800"
      >
        <button
          onClick={() => setSidebarMobileOpen(true)}
          className="text-white p-1.5 rounded-md hover:bg-white/10 transition-colors"
        >
          <Menu size={20} />
        </button>
        <span className="text-white font-bold text-lg flex-1">MatPrep</span>
      </div>

      {/* Main content */}
      <main
        id="main-content"
        className={`transition-all duration-200 ${mainMargin} pt-14 md:pt-0 min-h-screen`}
      >
        <PageComponent />
      </main>

      <Modal />
    </div>
  );
}
