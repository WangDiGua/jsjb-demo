import type { PortalToastItem } from './portalFeedbackStore';
import { usePortalFeedbackStore } from './portalFeedbackStore';
import { PortalButton } from '../ui';

const toastStyle: Record<
  PortalToastItem['type'],
  { bar: string; icon: string; iconName: string }
> = {
  success: {
    bar: 'border-l-success bg-surface-container-lowest/95 border border-outline-variant/20 text-on-surface shadow-lg shadow-black/5',
    icon: 'bg-success/15 text-success',
    iconName: 'check_circle',
  },
  error: {
    bar: 'border-l-red-500 bg-surface-container-lowest/95 border border-red-100 text-on-surface shadow-lg shadow-red-900/10',
    icon: 'bg-red-50 text-red-600',
    iconName: 'error',
  },
  info: {
    bar: 'border-l-primary bg-surface-container-lowest/95 border border-primary/15 text-on-surface shadow-lg shadow-primary/10',
    icon: 'bg-primary/10 text-primary',
    iconName: 'info',
  },
  warning: {
    bar: 'border-l-accent bg-surface-container-lowest/95 border border-accent/25 text-on-surface shadow-lg shadow-amber-900/5',
    icon: 'bg-accent/15 text-amber-900',
    iconName: 'warning',
  },
};

export default function PortalFeedbackHost() {
  const toasts = usePortalFeedbackStore((s) => s.toasts);
  const dismissToast = usePortalFeedbackStore((s) => s.dismissToast);
  const confirm = usePortalFeedbackStore((s) => s.confirm);
  const resolveConfirm = usePortalFeedbackStore((s) => s.resolveConfirm);

  return (
    <>
      <div
        className="pointer-events-none fixed left-1/2 top-24 z-[1000] flex w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 flex-col gap-3"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const st = toastStyle[t.type];
          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto flex gap-3 rounded-2xl border-l-4 px-4 py-3 backdrop-blur-md ${st.bar} fade-in`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${st.icon}`}
              >
                <span className="material-symbols-outlined text-[20px]">{st.iconName}</span>
              </span>
              <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{t.message}</p>
              <button
                type="button"
                className="flex-shrink-0 rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-on-surface/5 hover:text-on-surface"
                aria-label="关闭"
                onClick={() => dismissToast(t.id)}
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          );
        })}
      </div>

      {confirm ? (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-on-surface/40 px-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => resolveConfirm(confirm.id, false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') resolveConfirm(confirm.id, false);
          }}
        >
          <div
            className="glass-panel w-full max-w-md rounded-2xl border border-outline-variant/30 p-6 shadow-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="portal-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="portal-confirm-title" className="font-headline text-lg font-bold text-on-surface">
              请确认
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{confirm.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <PortalButton variant="ghost" size="md" type="button" onClick={() => resolveConfirm(confirm.id, false)}>
                取消
              </PortalButton>
              <PortalButton variant="primary" size="md" type="button" onClick={() => resolveConfirm(confirm.id, true)}>
                确定
              </PortalButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
