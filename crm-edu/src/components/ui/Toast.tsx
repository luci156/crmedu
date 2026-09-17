import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 4000;

const TOAST_CONFIG: Record<
  ToastType,
  {
    label: string;
    icon: React.ReactNode;
    containerClass: string;
    labelClass: string;
    iconClass: string;
    progressClass: string;
  }
> = {
  success: {
    label: 'Thành công',
    icon: <CheckCircle size={18} />,
    containerClass: 'bg-white border-l-4 border-green-500',
    labelClass: 'text-green-700',
    iconClass: 'text-green-500',
    progressClass: 'bg-green-500',
  },
  error: {
    label: 'Lỗi',
    icon: <XCircle size={18} />,
    containerClass: 'bg-white border-l-4 border-red-500',
    labelClass: 'text-red-700',
    iconClass: 'text-red-500',
    progressClass: 'bg-red-500',
  },
  warning: {
    label: 'Cảnh báo',
    icon: <AlertTriangle size={18} />,
    containerClass: 'bg-white border-l-4 border-yellow-500',
    labelClass: 'text-yellow-700',
    iconClass: 'text-yellow-500',
    progressClass: 'bg-yellow-500',
  },
  info: {
    label: 'Thông tin',
    icon: <Info size={18} />,
    containerClass: 'bg-white border-l-4 border-blue-500',
    labelClass: 'text-blue-700',
    iconClass: 'text-blue-500',
    progressClass: 'bg-blue-500',
  },
};

// ─── Single Toast Item ────────────────────────────────────────────────────────

interface ToastItemProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

const ToastItemComponent: React.FC<ToastItemProps> = ({ item, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const config = TOAST_CONFIG[item.type];

  // Slide in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(item.id), 300);
  }, [item.id, onDismiss]);

  // Auto-dismiss after AUTO_DISMISS_MS
  useEffect(() => {
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [dismiss]);

  return (
    <div
      role="alert"
      className={[
        'relative flex items-start gap-3 rounded-lg shadow-lg px-4 py-3 w-80 overflow-hidden',
        'transition-all duration-300 ease-out',
        config.containerClass,
        visible && !leaving
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-8',
      ].join(' ')}
    >
      {/* Icon */}
      <span className={`mt-0.5 flex-shrink-0 ${config.iconClass}`}>
        {config.icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold uppercase tracking-wide ${config.labelClass}`}>
          {config.label}
        </p>
        <p className="text-sm text-gray-700 mt-0.5 break-words">{item.message}</p>
      </div>

      {/* Close button */}
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
        aria-label="Đóng thông báo"
      >
        <X size={16} />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100">
        <div
          className={`h-full ${config.progressClass} origin-left`}
          style={{
            animation: `toast-progress ${AUTO_DISMISS_MS}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
};

// ─── Toast Container ──────────────────────────────────────────────────────────

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastItemComponent item={item} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${++counterRef.current}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, type, createdAt: Date.now() }];
      // Keep only the most recent MAX_TOASTS
      return next.slice(-MAX_TOASTS);
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {/* Inline keyframe for progress bar shrink animation */}
      <style>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
