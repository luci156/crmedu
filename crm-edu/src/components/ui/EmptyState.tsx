import React from 'react';
import { Inbox } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
  /** Optional: custom icon element; defaults to Inbox icon */
  icon?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  actionLabel = 'Thêm mới',
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Icon */}
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-orange-50 text-orange-400 mb-5">
        {icon ?? <Inbox size={40} strokeWidth={1.5} />}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-800 mb-1.5">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-5">
          {description}
        </p>
      )}

      {/* Action button */}
      {action && (
        <button
          onClick={action}
          className="btn-primary px-5 py-2 text-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
