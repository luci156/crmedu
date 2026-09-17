import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  LogOut,
  User,
  Settings,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  loading?: boolean;
  actions?: React.ReactNode;
  /** Desktop sidebar width (px) để Header offset đúng, mặc định 240 */
  leftOffset?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name: string): string =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const isConnected = (): boolean => {
  try {
    const raw = localStorage.getItem('crm_edu_profiles') || '[]'
    const profiles = JSON.parse(raw)
    const activeId = localStorage.getItem('crm_edu_active_profile')
    if (!activeId || !Array.isArray(profiles)) return false
    const profile = profiles.find((p: { id: string; apiKey?: string; apiSecret?: string; lastStatus?: string }) => p.id === activeId)
    if (!profile) return false
    // Có kết nối nếu: đã test thành công, HOẶC đã điền đủ credentials
    return profile.lastStatus === 'connected' || (!!profile.apiKey && !!profile.apiSecret)
  } catch {
    return false
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onMenuClick,
  loading = false,
  actions,
  leftOffset = 0,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [connected, setConnected] = useState<boolean>(isConnected);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Re-check connection status whenever storage changes
  useEffect(() => {
    const handler = () => setConnected(isConnected());
    window.addEventListener('storage', handler);
    // Also poll every 5s in case localStorage changes in same tab
    const interval = setInterval(() => setConnected(isConnected()), 5000);
    return () => {
      window.removeEventListener('storage', handler);
      clearInterval(interval);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Close on ESC
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [dropdownOpen]);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    setDropdownOpen(false);
    navigate('/settings');
  };

  const handleSettings = () => {
    setDropdownOpen(false);
    navigate('/settings');
  };

  return (
    <header
      className="crm-header fixed top-0 right-0 h-14 bg-white border-b border-gray-100 z-30 flex items-center px-4 gap-3 transition-all duration-300"
      style={{ left: leftOffset }}
    >
      {/* Hamburger — visible on mobile to open drawer */}
      <button
        onClick={onMenuClick}
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Mở menu"
      >
        <Menu size={20} />
      </button>

      {/* Title + subtitle */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-gray-900 truncate leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-gray-400 truncate leading-tight">{subtitle}</p>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Custom actions (e.g. Add button) */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {/* Loading spinner */}
        {loading && (
          <Loader2
            size={18}
            className="text-orange-500 animate-spin"
            aria-label="Đang tải"
          />
        )}

        {/* Connection indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100"
          title={connected ? 'Đã kết nối Frappe' : 'Chưa kết nối Frappe'}
        >
          {connected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <Wifi size={13} className="text-green-600" />
              <span className="text-[11px] font-medium text-green-700 hidden lg:inline">
                Kết nối
              </span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <WifiOff size={13} className="text-red-500" />
              <span className="text-[11px] font-medium text-red-600 hidden lg:inline">
                Chưa kết nối
              </span>
            </>
          )}
        </div>

        {/* Notification bell */}
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Thông báo"
        >
          <Bell size={18} />
          {/* Unread dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 border-2 border-white" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[11px] font-bold leading-none">
                {user?.full_name ? getInitials(user.full_name) : 'U'}
              </span>
            </div>
            {/* Name + role (hidden on small screens) */}
            <div className="hidden md:block text-left leading-tight">
              <p className="text-xs font-semibold text-gray-900 truncate max-w-[100px]">
                {user?.full_name ?? 'Người dùng'}
              </p>
              <p className="text-[10px] text-gray-400 truncate max-w-[100px]">
                {user?.role ?? 'Quản trị viên'}
              </p>
            </div>
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              className={[
                'absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-gray-100',
                'py-1 z-50',
                'animate-dropdown-in',
              ].join(' ')}
              role="menu"
            >
              {/* User info header */}
              <div className="px-4 py-2.5 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {user?.full_name ?? 'Người dùng'}
                </p>
                <p className="text-[11px] text-gray-400 truncate">
                  {user?.role ?? 'Quản trị viên'}
                </p>
              </div>

              {/* Menu items */}
              <button
                onClick={handleProfile}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem"
              >
                <User size={15} className="text-gray-400" />
                Hồ sơ
              </button>
              <button
                onClick={handleSettings}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem"
              >
                <Settings size={15} className="text-gray-400" />
                Cài đặt
              </button>

              <div className="border-t border-gray-50 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  role="menuitem"
                >
                  <LogOut size={15} />
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown animation */}
      <style>{`
        @keyframes dropdown-in {
          from { opacity: 0; transform: translateY(-4px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-dropdown-in {
          animation: dropdown-in 0.15s ease-out forwards;
        }
      `}</style>
    </header>
  );
};

export { Header };
export default Header;
