import React from 'react';

// ─── Default color maps ───────────────────────────────────────────────────────

/**
 * Tailwind bg + text class pairs for student statuses.
 * Key: status value from Frappe
 * Value: Tailwind classes string
 */
export const STUDENT_STATUS_COLORS: Record<string, string> = {
  // English keys (Frappe default)
  Active: 'bg-green-100 text-green-700',
  Inactive: 'bg-gray-100 text-gray-600',
  Graduated: 'bg-blue-100 text-blue-700',
  Dropped: 'bg-red-100 text-red-700',
  'On Leave': 'bg-yellow-100 text-yellow-700',
  Suspended: 'bg-orange-100 text-orange-700',
  // Vietnamese keys
  'Đang học': 'bg-green-100 text-green-700',
  'Nghỉ học': 'bg-red-100 text-red-700',
  'Tốt nghiệp': 'bg-blue-100 text-blue-700',
  'Bảo lưu': 'bg-yellow-100 text-yellow-700',
  'Đình chỉ': 'bg-orange-100 text-orange-700',
};

/**
 * Tailwind bg + text class pairs for attendance statuses.
 */
export const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  // English
  Present: 'bg-green-100 text-green-700',
  Absent: 'bg-red-100 text-red-700',
  Late: 'bg-yellow-100 text-yellow-700',
  Excused: 'bg-blue-100 text-blue-700',
  'Half Day': 'bg-purple-100 text-purple-700',
  // Vietnamese
  'Có mặt': 'bg-green-100 text-green-700',
  'Vắng mặt': 'bg-red-100 text-red-700',
  'Đi muộn': 'bg-yellow-100 text-yellow-700',
  'Có phép': 'bg-blue-100 text-blue-700',
};

/**
 * Default fallback color map for arbitrary statuses.
 */
const DEFAULT_COLOR_MAP: Record<string, string> = {
  ...STUDENT_STATUS_COLORS,
  ...ATTENDANCE_STATUS_COLORS,
  // Common generic statuses
  Draft: 'bg-gray-100 text-gray-600',
  Open: 'bg-blue-100 text-blue-700',
  Closed: 'bg-gray-100 text-gray-500',
  Cancelled: 'bg-red-100 text-red-600',
  Completed: 'bg-green-100 text-green-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  'Nháp': 'bg-gray-100 text-gray-600',
  'Hoàn thành': 'bg-green-100 text-green-700',
  'Đang xử lý': 'bg-blue-100 text-blue-700',
  'Đã hủy': 'bg-red-100 text-red-600',
  'Chờ xử lý': 'bg-yellow-100 text-yellow-700',
};

const FALLBACK_CLASS = 'bg-gray-100 text-gray-600';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatusBadgeProps {
  status: string;
  /** Override or extend the color map. Values should be Tailwind class strings. */
  colorMap?: Record<string, string>;
  /** Map status keys to display labels. If omitted, status key is used as-is. */
  labelMap?: Record<string, string>;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  colorMap,
  labelMap,
  className = '',
}) => {
  const effectiveColorMap = colorMap
    ? { ...DEFAULT_COLOR_MAP, ...colorMap }
    : DEFAULT_COLOR_MAP;

  const colorClass = effectiveColorMap[status] ?? FALLBACK_CLASS;
  const label = labelMap?.[status] ?? status;

  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
