import { useEffect, useRef } from 'react';
import {
  LayoutDashboard, ClipboardList, Archive, Settings, ChevronsLeft, X,
} from 'lucide-react';
import useStore from '../store/useStore';
import { db } from '../store/db';
import logo from '../assets/brand/matprep-symbol.svg';

const NAV_ITEMS = [
  { key: 'dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
  { key: 'planning',  Icon: ClipboardList,   label: 'Buat Bon', notif: true },
  { key: 'riwayat',   Icon: Archive,          label: 'Riwayat' },
  { key: 'settings',  Icon: Settings,         label: 'Pengaturan' },
];

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform);
const TOGGLE_KEYS = IS_MAC ? '⌘B' : 'Ctrl+B';
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Geometri: kolom ikon selalu berpusat di x = 34px (setengah lebar ciut 68px), di kedua keadaan.
// Saat melipat hanya lebar panel yang beranimasi; label memudar di tempat (.sb-fade), tidak di-unmount.

function NavItem({ item, active, hasNotif, onClick }) {
  const { Icon, label, notif } = item;
  const dot = notif && hasNotif;
  return (
    <li className="sb-item relative">
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        aria-label={dot ? `${label} (ada shift terbuka)` : label}
        className={[
          'flex h-10 w-full items-center gap-3 overflow-hidden rounded-r-[4px] border-l-2 pl-[13px] pr-3 text-left text-sm transition-colors duration-150',
          active
            ? 'border-l-signal bg-[linear-gradient(90deg,rgba(240,163,42,0.14),rgba(240,163,42,0))] font-semibold text-paper'
            : 'border-l-transparent font-medium text-steel-dim hover:bg-white/[0.04] hover:text-paper',
        ].join(' ')}
      >
        <span className="relative shrink-0">
          <Icon size={17} strokeWidth={active ? 2.4 : 1.9} />
          {dot && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-danger ring-2 ring-iron-900" />}
        </span>
        <span className="sb-fade truncate">{label}</span>
      </button>
      <span className="sb-tip" aria-hidden="true">{label}{dot && ' · shift terbuka'}</span>
    </li>
  );
}

function SidebarContent({ mobile, page, hasOpen, collapsed, navigate, onToggle, onClose, closeRef }) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 overflow-hidden border-b border-white/[0.07] px-4">
        <img src={logo} alt="" width="36" height="36" className="h-9 w-9 shrink-0" />
        <div className="sb-fade min-w-0 flex-1">
          <div className="font-display text-[19px] font-semibold leading-none tracking-wide text-paper">MatPrep</div>
          <div className="mt-1 truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-steel-faint">
            PT TMMIN · Divisi Casting
          </div>
        </div>
        {mobile && (
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] text-steel-dim transition-colors hover:bg-white/[0.06] hover:text-paper"
            aria-label="Tutup navigasi"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <nav aria-label="Menu operasi" className="px-2.5 pt-4">
        <div className="sb-fade mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-steel-faint" aria-hidden="true">
          Menu Operasi
        </div>
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(item => (
            <NavItem
              key={item.key}
              item={item}
              active={page === item.key}
              hasNotif={hasOpen}
              onClick={() => navigate(item.key)}
            />
          ))}
        </ul>
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-white/[0.07] p-2.5">
        <div className="sb-item relative">
          <div className="flex items-start gap-3 overflow-hidden py-2 pl-5 pr-2" role="status">
            <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-success" />
            <div className="sb-fade min-w-0">
              <div className="text-[11px] font-semibold text-steel">Data lokal aktif</div>
              <div className="mt-0.5 truncate text-[11px] text-steel-faint">
                {hasOpen ? 'Ada shift yang masih terbuka.' : 'Semua shift sudah tertutup.'}
              </div>
            </div>
          </div>
          <span className="sb-tip" aria-hidden="true">Data lokal aktif · {hasOpen ? 'ada shift terbuka' : 'semua shift tertutup'}</span>
        </div>

        {!mobile && (
          <div className="sb-item relative">
            <button
              type="button"
              onClick={onToggle}
              aria-controls="sidebar"
              aria-expanded={!collapsed}
              aria-keyshortcuts={IS_MAC ? 'Meta+B' : 'Control+B'}
              aria-label={collapsed ? 'Lebarkan panel' : 'Ciutkan panel'}
              className="flex h-10 w-full items-center gap-3 overflow-hidden rounded-[4px] pl-[15px] pr-2.5 text-xs font-semibold text-steel-dim transition-colors duration-150 hover:bg-white/[0.05] hover:text-paper"
            >
              <ChevronsLeft size={17} className={`sb-chevron shrink-0 ${collapsed ? 'rotate-180' : ''}`} />
              <span className="sb-fade">Ciutkan panel</span>
              <kbd className="sb-fade ml-auto rounded-[3px] border border-white/10 px-1.5 py-px font-sans text-[10px] font-semibold text-steel-faint">
                {TOGGLE_KEYS}
              </kbd>
            </button>
            <span className="sb-tip" aria-hidden="true">Lebarkan panel <span className="ml-1.5 text-steel-faint">{TOGGLE_KEYS}</span></span>
          </div>
        )}

        <div className="sb-fade px-2 pt-1 font-display text-[10px] uppercase tracking-[0.16em] text-steel-faint">
          MatPrep v1.0 · Offline-first
        </div>
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
  const drawerRef = useRef(null);
  const closeRef = useRef(null);

  // Ctrl/⌘+B: ciutkan atau lebarkan panel desktop.
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapsed();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebarCollapsed]);

  // Drawer HP: fokus masuk ke tombol tutup, Tab terkunci di drawer, Escape menutup,
  // scroll halaman dikunci, dan fokus kembali ke tombol pembuka saat ditutup.
  useEffect(() => {
    if (!sidebarMobileOpen) return;
    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = e => {
      if (e.key === 'Escape') { setSidebarMobileOpen(false); return; }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const items = [...drawerRef.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [sidebarMobileOpen, setSidebarMobileOpen]);

  const shared = { page, hasOpen, navigate };

  return (
    <>
      <aside
        id="sidebar"
        aria-label="Navigasi utama"
        data-collapsed={sidebarCollapsed}
        className={`sb fixed left-0 top-0 z-40 hidden h-full flex-col border-r border-white/[0.07] bg-iron-900 md:flex ${sidebarCollapsed ? 'w-[68px]' : 'w-[236px]'}`}
      >
        <SidebarContent {...shared} mobile={false} collapsed={sidebarCollapsed} onToggle={toggleSidebarCollapsed} />
      </aside>

      <div
        aria-hidden="true"
        onClick={() => setSidebarMobileOpen(false)}
        className={`sb-overlay no-print fixed inset-0 z-30 bg-black/60 md:hidden ${sidebarMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigasi"
        inert={!sidebarMobileOpen}
        className={`sb-drawer no-print fixed left-0 top-0 z-40 flex h-full w-[260px] flex-col border-r border-white/[0.07] bg-iron-900 md:hidden ${sidebarMobileOpen ? 'translate-x-0 shadow-[24px_0_48px_-24px_rgba(0,0,0,0.9)]' : '-translate-x-full'}`}
      >
        <SidebarContent {...shared} mobile collapsed={false} onClose={() => setSidebarMobileOpen(false)} closeRef={closeRef} />
      </aside>
    </>
  );
}
