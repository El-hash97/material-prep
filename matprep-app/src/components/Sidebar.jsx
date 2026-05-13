import { useEffect, useState } from 'react';
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
      className={[
        'w-full flex items-center gap-3 text-sm text-left',
        'transition-all duration-150 cursor-pointer border-none',
        'relative border-l-[3px]',
        collapsed ? 'justify-center px-0 py-3' : 'px-4 py-2.5',
        active
          ? 'bg-white/[0.13] text-white border-l-sky-400 font-semibold'
          : 'text-zinc-400 border-l-transparent hover:bg-white/8 hover:text-white font-medium',
      ].join(' ')}
    >
      <Icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && notif && hasNotif && (
        <span className="w-2 h-2 bg-red-400 rounded-full ml-auto shrink-0 animate-pulse" />
      )}
      {collapsed && notif && hasNotif && (
        <span className="absolute top-2 right-3 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
      )}
    </button>
  );
}

export default function Sidebar() {
  const {
    page, navigate,
    sidebarCollapsed, toggleSidebarCollapsed,
    sidebarMobileOpen, setSidebarMobileOpen,
  } = useStore();

  const [hasOpen, setHasOpen] = useState(false);
  useEffect(() => { setHasOpen(db.hasOpenShift()); }, [page]);

  const sidebarBase = [
    'fixed top-0 left-0 h-full z-40 flex flex-col',
    'bg-zinc-900',
    'transition-all duration-200 ease-in-out',
    'shadow-xl',
  ].join(' ');

  // ---- Desktop sidebar ----
  const desktopCls = [
    sidebarBase,
    'hidden md:flex',
    sidebarCollapsed ? 'w-16' : 'w-[220px]',
  ].join(' ');

  // ---- Mobile sidebar (overlay drawer) ----
  const mobileCls = [
    sidebarBase,
    'flex md:hidden w-[220px]',
    sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full',
  ].join(' ');

  function SidebarContent({ collapsed = false, mobile = false }) {
    return (
      <>
        {/* Header */}
        <div className={[
          'flex items-center border-b border-white/10 shrink-0',
          collapsed ? 'h-14 justify-center' : 'h-14 px-4 gap-2',
        ].join(' ')}>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-lg leading-none">MatPrep</div>
              <div className="text-[#93C5FD]/70 text-[9px] mt-0.5 leading-tight font-medium truncate">
                PT TMMIN — Divisi Casting
              </div>
            </div>
          )}
          {collapsed && (
            <span className="text-white font-bold text-lg">M</span>
          )}
          {mobile && (
            <button
              onClick={() => setSidebarMobileOpen(false)}
              className="ml-auto text-white/60 hover:text-white p-1 rounded transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
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

        {/* Footer controls */}
        <div className="border-t border-white/10 p-2 flex flex-col gap-1 shrink-0">
          {/* Collapse toggle — desktop only */}
          {!mobile && (
            <button
              onClick={toggleSidebarCollapsed}
              className={[
                'flex items-center gap-2.5 rounded-lg text-xs font-medium',
                'text-zinc-400 hover:bg-white/8 hover:text-white',
                'transition-all duration-150 cursor-pointer',
                collapsed ? 'justify-center p-3' : 'px-3 py-2.5',
              ].join(' ')}
            >
              {sidebarCollapsed
                ? <ChevronRight size={15} strokeWidth={2} className="shrink-0" />
                : <ChevronLeft size={15} strokeWidth={2} className="shrink-0" />}
              {!collapsed && <span>Collapse</span>}
            </button>
          )}

          {!collapsed && (
            <div className="px-3 pt-1 text-[10px] text-white/20 font-medium">
              MatPrep v1.0
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={desktopCls}>
        <SidebarContent collapsed={sidebarCollapsed} mobile={false} />
      </aside>

      {/* Mobile sidebar */}
      <aside className={mobileCls}>
        <SidebarContent collapsed={false} mobile={true} />
      </aside>
    </>
  );
}
