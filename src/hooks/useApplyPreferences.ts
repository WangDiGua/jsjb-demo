import { useEffect, useLayoutEffect } from 'react';
import {
  applyPreferencesToDocument,
  getResolvedDark,
  usePreferencesStore,
  type PreferencesState,
} from '@/store/preferencesStore';

/** 同步主题变量到 document；监听 system 配色、持久化恢复与跨标签偏好 */
export function useApplyPreferences(): void {
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const layoutDensity = usePreferencesStore((s) => s.layoutDensity);

  useLayoutEffect(() => {
    applyPreferencesToDocument({ themeMode, themePreset, layoutDensity });
  }, [themeMode, themePreset, layoutDensity]);

  useEffect(() => {
    return usePreferencesStore.persist.onFinishHydration((state) => {
      applyPreferencesToDocument({
        themeMode: state.themeMode,
        themePreset: state.themePreset,
        layoutDensity: state.layoutDensity,
      });
    });
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage || e.key !== 'jsjb_prefs_v1' || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as { state?: Partial<PreferencesState> };
        const s = parsed.state;
        if (s?.themeMode && s?.themePreset && s?.layoutDensity) {
          usePreferencesStore.setState({
            themeMode: s.themeMode,
            themePreset: s.themePreset,
            layoutDensity: s.layoutDensity,
            pageTransition: s.pageTransition ?? usePreferencesStore.getState().pageTransition,
          });
          applyPreferencesToDocument({
            themeMode: s.themeMode,
            themePreset: s.themePreset,
            layoutDensity: s.layoutDensity,
          });
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyPreferencesToDocument(usePreferencesStore.getState());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themeMode]);
}

export function useResolvedThemeDark(): boolean {
  const themeMode = usePreferencesStore((s) => s.themeMode);
  return getResolvedDark(themeMode);
}
