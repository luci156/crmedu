import React, { useCallback, useRef, useState } from 'react';
import { AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';
import { Modal } from './Modal';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfirmVariant = 'danger' | 'warning' | 'default';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

// ─── Variant config ───────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  ConfirmVariant,
  {
    icon: React.ReactNode;
    iconWrapClass: string;
    confirmClass: string;
    defaultConfirmLabel: string;
  }
> = {
  danger: {
    icon: <AlertOctagon size={28} />,
    iconWrapClass: 'bg-red-100 text-red-600',
    confirmClass:
      'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    defaultConfirmLabel: 'Xóa',
  },
  warning: {
    icon: <AlertTriangle size={28} />,
    iconWrapClass: 'bg-yellow-100 text-yellow-600',
    confirmClass:
      'bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-400',
    defaultConfirmLabel: 'Xác nhận',
  },
  default: {
    icon: <HelpCircle size={28} />,
    iconWrapClass: 'bg-blue-100 text-blue-600',
    confirmClass:
      'bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-400',
    defaultConfirmLabel: 'Xác nhận',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Hủy',
  variant = 'default',
}) => {
  const [loading, setLoading] = useState(false);
  const cfg = VARIANT_CONFIG[variant];
  const effectiveConfirmLabel = confirmLabel ?? cfg.defaultConfirmLabel;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await Promise.resolve(onConfirm());
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="" size="sm">
      <div className="flex flex-col items-center text-center gap-4 py-2">
        {/* Icon */}
        <div
          className={`flex items-center justify-center w-16 h-16 rounded-full ${cfg.iconWrapClass}`}
        >
          {cfg.icon}
        </div>

        {/* Title */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700
              bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300
              disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2
              disabled:opacity-50 transition-colors ${cfg.confirmClass}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Đang xử lý…
              </span>
            ) : (
              effectiveConfirmLabel
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── useConfirm hook ──────────────────────────────────────────────────────────

interface UseConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

interface UseConfirmReturn {
  open: boolean;
  confirm: (options: UseConfirmOptions) => Promise<boolean>;
  dialogProps: ConfirmDialogProps;
}

export const useConfirm = (): UseConfirmReturn => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<UseConfirmOptions>({
    title: '',
    message: '',
  });

  // Resolver ref to resolve the Promise when the user makes a choice
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: UseConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  const dialogProps: ConfirmDialogProps = {
    open,
    onClose: handleClose,
    onConfirm: handleConfirm,
    title: options.title,
    message: options.message,
    confirmLabel: options.confirmLabel,
    cancelLabel: options.cancelLabel,
    variant: options.variant,
  };

  return { open, confirm, dialogProps };
};

export default ConfirmDialog;
