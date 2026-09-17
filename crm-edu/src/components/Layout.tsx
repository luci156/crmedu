import React, { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLLAPSED_KEY = 'crm_edu_sidebar_collapsed';
const SIDEBAR_EXPANDED_WIDTH = 240; // px — matches w-60 = 240px
const SIDEBAR_COLLAPSED_WIDTH = 60;  // px — matches w-[60px]

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Timestamp of last data refresh — shown in header if provided */
  lastRefresh?: Date | null;
  /** Callback to trigger a manual refresh */
  onRefreshNow?: () => void;
  /** Whether the page is currently loading data */
  loading?: boolean;
  /** Extra action buttons rendered in the header right area */
  actions?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  subtitle,
  loading = false,
  actions,
}) => {
  // Sidebar collapsed state — persisted in localStorage
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Mobile drawer open state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Overlay ref for closing drawer on click
  const overlayRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  // Close drawer on route change (listen to popstate)
  useEffect(() => {
    const handler = () => setDrawerOpen(false);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Desktop Sidebar (hidden on mobile) ─────────────────────────── */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      </div>

      {/* ── Mobile Drawer ────────────────────────────────────────────────── */}
      {/* Overlay */}
      {drawerOpen && (
        <div
          ref={overlayRef}
          className="md:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel — always expanded on mobile */}
      <div
        className={[
          'md:hidden fixed top-0 left-0 h-full z-50',
          'transition-transform duration-300 ease-in-out',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar collapsed={false} onToggle={closeDrawer} />
      </div>

      {/* ── Single Header — offset on desktop, full-width on mobile ───────── */}
      {/*
        On desktop (md+): leftOffset = sidebarWidth so Header starts after sidebar.
        On mobile: leftOffset = 0 (sidebar is a drawer, not in flow).
        Header itself uses `style={{ left: leftOffset }}` on md+ via CSS media.
      */}
      <Header
        title={title}
        subtitle={subtitle}
        onMenuClick={openDrawer}
        loading={loading}
        actions={actions}
        leftOffset={sidebarWidth}
      />

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <main
        className="transition-all duration-300 ease-in-out pt-14"
        style={{
          marginLeft: `${sidebarWidth}px`,
        }}
      >
        {/* On mobile: no left margin (sidebar is a drawer) */}
        <style>{`
          @media (max-width: 767px) {
            main { margin-left: 0 !important; }
          }
        `}</style>

        <div className="p-6">{children}</div>
        {/* Override header left on mobile */}
        <style>{`
          @media (max-width: 767px) {
            header.crm-header { left: 0 !important; }
          }
        `}</style>
      </main>
    </div>
  );
};

export { Layout };
export default Layout;
