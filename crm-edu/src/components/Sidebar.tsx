import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart2,
  Users,
  Building2,
  BookOpen,
  Calendar,
  GraduationCap,
  Layers,
  Clock,
  ClipboardList,
  CheckSquare,
  Wifi,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Nav configuration ────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: 'Tổng quan',
    items: [
      { to: '/', label: 'Tổng quan', icon: BarChart2 },
    ],
  },
  {
    groupLabel: 'Quản lý đào tạo',
    items: [
      { to: '/students', label: 'Sinh viên', icon: Users },
      { to: '/departments', label: 'Khoa / Bộ môn', icon: Building2 },
      { to: '/programs', label: 'Chương trình', icon: BookOpen },
      { to: '/terms', label: 'Học kỳ', icon: Calendar },
      { to: '/courses', label: 'Môn học', icon: GraduationCap },
      { to: '/offerings', label: 'Lớp học phần', icon: Layers },
      { to: '/sessions', label: 'Buổi học', icon: Clock },
    ],
  },
  {
    groupLabel: 'Sinh viên',
    items: [
      { to: '/enrollments', label: 'Đăng ký học phần', icon: ClipboardList },
      { to: '/attendance', label: 'Điểm danh', icon: CheckSquare },
    ],
  },
  {
    groupLabel: 'Hệ thống',
    items: [
      { to: '/connection', label: 'Kết nối Frappe', icon: Wifi },
      { to: '/settings', label: 'Cài đặt', icon: Settings },
    ],
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// ─── Component ────────────────────────────────────────────────────────────────

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={[
        'fixed top-0 left-0 h-full bg-white border-r border-gray-100 flex flex-col z-40',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[60px]' : 'w-60',
      ].join(' ')}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div
        className={[
          'flex items-center h-14 border-b border-gray-100 flex-shrink-0 overflow-hidden',
          collapsed ? 'justify-center px-0' : 'px-4 gap-2.5',
        ].join(' ')}
      >
        {/* Orange square logo */}
        <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm leading-none">E</span>
        </div>

        {/* Text — hidden when collapsed */}
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="block text-sm font-bold text-gray-900 leading-tight whitespace-nowrap">
              CRM EDU
            </span>
            <span className="block text-[10px] text-gray-400 whitespace-nowrap">
              Hệ thống quản lý
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-thin">
        {NAV_GROUPS.map((group) => (
          <div key={group.groupLabel} className="mb-1">
            {/* Group label — hidden when collapsed */}
            {!collapsed && (
              <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 select-none">
                {group.groupLabel}
              </p>
            )}
            {collapsed && (
              /* Divider between groups when collapsed */
              <div className="mx-3 my-2 border-t border-gray-100" />
            )}

            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  [
                    'flex items-center h-9 rounded-lg mx-2 mb-0.5 transition-colors',
                    collapsed ? 'justify-center px-0' : 'gap-2.5 px-3',
                    isActive
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={18}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      className="flex-shrink-0"
                    />
                    {!collapsed && (
                      <span
                        className={`text-sm truncate ${
                          isActive ? 'font-semibold' : 'font-medium'
                        }`}
                      >
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── User info + Logout ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-gray-100">
        {/* User row */}
        <div
          className={[
            'flex items-center py-3 overflow-hidden',
            collapsed ? 'justify-center px-0' : 'px-3 gap-2.5',
          ].join(' ')}
        >
          {/* Avatar */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold leading-none">
              {user?.full_name ? getInitials(user.full_name) : 'U'}
            </span>
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                {user?.full_name ?? 'Người dùng'}
              </p>
              <p className="text-[11px] text-gray-400 truncate leading-tight">
                {user?.role ?? 'Quản trị viên'}
              </p>
            </div>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Đăng xuất' : undefined}
          className={[
            'w-full flex items-center h-9 rounded-lg mx-2 mb-2 text-gray-500',
            'hover:bg-red-50 hover:text-red-600 transition-colors',
            collapsed ? 'justify-center' : 'gap-2.5 px-3',
          ].join(' ')}
          style={{ width: collapsed ? 'calc(100% - 16px)' : 'calc(100% - 16px)' }}
        >
          <LogOut size={17} strokeWidth={1.8} className="flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm font-medium">Đăng xuất</span>
          )}
        </button>
      </div>

      {/* ── Toggle button (edge of sidebar) ──────────────────────────────── */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        className={[
          'absolute top-1/2 -translate-y-1/2 -right-3',
          'w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm',
          'flex items-center justify-center text-gray-400 hover:text-gray-700',
          'hover:border-gray-300 transition-colors z-50',
        ].join(' ')}
      >
        {collapsed ? (
          <ChevronRight size={13} strokeWidth={2.5} />
        ) : (
          <ChevronLeft size={13} strokeWidth={2.5} />
        )}
      </button>
    </aside>
  );
};

export { Sidebar };
export default Sidebar;
