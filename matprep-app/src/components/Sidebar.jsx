import {
  LayoutDashboard, ClipboardList, Archive, Settings,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import useStore from '../store/useStore';
import { db } from '../store/db';

const NAV_ITEMS = [
  { key: 'dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
  { key: 'planning',  Icon: ClipboardList,   label: 'Buat Bon', notif: true },
  { key: 'riwayat',   Icon: Archive,          label: 'Riwayat' },
  { key: 'settings',  Icon: Settings,         label: 'Pengaturan' },
];

function NavButton({ item, active, collapsed, onClick, hasNotif }) {
  const { Icon, label, notif } = item;
  return (
    <button
      title={collapsed ? label : undefined}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={[
        'relative w-full border-l-2 text-left text-sm transition-all duration-150',
        'flex items-center gap-3',
        collapsed ? 'justify-center px-0 py-3' : 'px-4 py-2.5',
        active
          ? 'border-l-signal bg-[linear-gradient(90deg,rgba(240,163,42,0.14),rgba(240,163,42,0))] font-semibold text-paper'
          : 'border-l-transparent font-medium text-steel-dim hover:bg-white/[0.04] hover:text-paper',
      ].join(' ')}
    >
      <Icon size={17} strokeWidth={active ? 2.4 : 1.9} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && notif && hasNotif && (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
      )}
      {collapsed && notif && hasNotif && (
        <span className="absolute right-3 top-2 h-1.5 w-1.5 rounded-full bg-danger" />
      )}
    </button>
  );
}

function SidebarContent({
  collapsed = false, mobile = false, page, hasOpen,
  navigate, toggleSidebarCollapsed, setSidebarMobileOpen,
}) {
  return (
    <>

      <div className={[
        'flex h-16 shrink-0 items-center border-b border-white/[0.07]',
        collapsed ? 'justify-center' : 'gap-3 px-4',
      ].join(' ')}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[3px] border border-signal/40 bg-signal/10 font-display text-[15px] font-bold tracking-wide text-signal">
          MP
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="font-display text-[19px] font-semibold leading-none tracking-wide text-paper">
              MatPrep
            </div>
            <div className="mt-1 truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-steel-faint">
              PT TMMIN · Divisi Casting
            </div>
          </div>
        )}
        {mobile && (
          <button
            onClick={() => setSidebarMobileOpen(false)}
            className="ml-auto rounded-[4px] p-1 text-steel-dim transition-colors hover:bg-white/[0.06] hover:text-paper"
            aria-label="Tutup navigasi"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className={collapsed ? 'px-2 pt-4' : 'px-3 pt-4'}>
        {!collapsed && (
          <div className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-steel-faint">
            Menu Operasi
          </div>
        )}
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(item => (
            <NavButton
              key={item.key}
              item={item}
              active={page === item.key}
              collapsed={collapsed}
              hasNotif={hasOpen}
              onClick={() => navigate(item.key)}
            />
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/[0.07] p-3">
        {!collapsed ? (
          <div className="well mb-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-steel">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Data lokal aktif
            </div>
            <div className="mt-1 text-[11px] leading-snug text-steel-faint">
              {hasOpen ? 'Ada shift yang masih terbuka.' : 'Semua shift sudah tertutup.'}
            </div>
          </div>
        ) : (
          <div className="mb-3 flex justify-center" title="Data lokal aktif">
            <span className="h-2 w-2 rounded-full bg-success" />
          </div>
        )}

        {!mobile && (
          <button
            onClick={toggleSidebarCollapsed}
            className={[
              'flex w-full items-center gap-2.5 rounded-[4px] text-xs font-semibold text-steel-dim',
              'transition-all duration-150 hover:bg-white/[0.05] hover:text-paper',
              collapsed ? 'justify-center p-2.5' : 'px-2.5 py-2',
            ].join(' ')}
          >
            {collapsed
              ? <ChevronRight size={15} className="shrink-0" />
              : <ChevronLeft size={15} className="shrink-0" />}
            {!collapsed && <span>Ciutkan panel</span>}
          </button>
        )}

        {!collapsed && (
          <div className="mt-2 px-1 font-display text-[10px] uppercase tracking-[0.16em] text-steel-faint">
            MatPrep v1.0 · Offline-first
          </div>
        )}
      </div>
    </>
  );
}

export default function Sidebar() {
  const {
    page, navigate,
    sidebarCollapsed, toggleSidebarCollapsed,
    sidebarMobileOpen, setSidebarMobileOpen,
  } = useStore();

  const hasOpen = db.hasOpenShift();

  const sidebarBase =
    'fixed left-0 top-0 z-40 flex h-full flex-col border-r border-white/[0.07] bg-iron-900 transition-all duration-200 ease-in-out';

  const desktopCls = [
    sidebarBase,
    'hidden md:flex',
    sidebarCollapsed ? 'w-[68px]' : 'w-[236px]',
  ].join(' ');

  const mobileCls = [
    sidebarBase,
    'flex w-[260px] md:hidden',
    sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full',
  ].join(' ');

  return (
    <>
      <aside id="sidebar" className={desktopCls}>
        <SidebarContent
          collapsed={sidebarCollapsed}
          mobile={false}
          page={page}
          hasOpen={hasOpen}
          navigate={navigate}
          toggleSidebarCollapsed={toggleSidebarCollapsed}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />
      </aside>

      <aside className={mobileCls}>
        <SidebarContent
          collapsed={false}
          mobile={true}
          page={page}
          hasOpen={hasOpen}
          navigate={navigate}
          toggleSidebarCollapsed={toggleSidebarCollapsed}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />
      </aside>
    </>
  );
}
