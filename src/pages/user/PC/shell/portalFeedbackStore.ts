import { create } from 'zustand';

export type PortalToastType = 'success' | 'error' | 'info' | 'warning';

export type PortalToastItem = {
  id: string;
  type: PortalToastType;
  message: string;
};

type ConfirmPayload = {
  id: number;
  message: string;
  resolve: (value: boolean) => void;
};

type PortalFeedbackState = {
  toasts: PortalToastItem[];
  confirm: ConfirmPayload | null;
  showToast: (type: PortalToastType, message: string, durationMs?: number) => void;
  dismissToast: (id: string) => void;
  requestConfirm: (message: string) => Promise<boolean>;
  resolveConfirm: (id: number, value: boolean) => void;
};

let toastCounter = 0;

export const usePortalFeedbackStore = create<PortalFeedbackState>((set, get) => ({
  toasts: [],
  confirm: null,

  showToast: (type, message, durationMs = 5200) => {
    const id = `toast_${++toastCounter}_${Date.now()}`;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    if (durationMs > 0) {
      window.setTimeout(() => get().dismissToast(id), durationMs);
    }
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  requestConfirm: (message) =>
    new Promise<boolean>((resolve) => {
      const prev = get().confirm;
      if (prev) prev.resolve(false);
      const id = Date.now() + Math.floor(Math.random() * 1e6);
      set({ confirm: { id, message, resolve } });
    }),

  resolveConfirm: (id, value) => {
    const c = get().confirm;
    if (!c || c.id !== id) return;
    c.resolve(value);
    set({ confirm: null });
  },
}));

/** 门户 PC 全局轻提示（替代 alert） */
export const portalToast = {
  success: (message: string, durationMs?: number) =>
    usePortalFeedbackStore.getState().showToast('success', message, durationMs),
  error: (message: string, durationMs?: number) =>
    usePortalFeedbackStore.getState().showToast('error', message, durationMs),
  info: (message: string, durationMs?: number) =>
    usePortalFeedbackStore.getState().showToast('info', message, durationMs),
  warning: (message: string, durationMs?: number) =>
    usePortalFeedbackStore.getState().showToast('warning', message, durationMs),
};

/** 门户 PC 全局确认（替代 confirm），返回是否确认 */
export function portalConfirm(message: string): Promise<boolean> {
  return usePortalFeedbackStore.getState().requestConfirm(message);
}
