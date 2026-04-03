import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';
export type PageTransition = 'fade' | 'slide' | 'none';
export type ThemePreset = 'civic' | 'ocean' | 'forest' | 'violet';

/** 门户元数据展示语言（需先在管理端「系统设置 → 元数据翻译」生成对应语种包） */
export type MetadataDisplayLocale = 'zh' | 'en' | 'ja';

/** 空格分隔 RGB，供 Tailwind `rgb(var(...) / <alpha-value>)` 使用 */
export const THEME_PRESET_RGB: Record<ThemePreset, { primary: string; secondary: string }> = {
  civic: { primary: '0 82 204', secondary: '0 163 191' },
  ocean: { primary: '0 107 148', secondary: '0 168 204' },
  forest: { primary: '4 120 87', secondary: '13 148 136' },
  violet: { primary: '91 33 182', secondary: '124 58 237' },
};

export const THEME_PRESET_HEX: Record<ThemePreset, string> = {
  civic: '#0052CC',
  ocean: '#006B94',
  forest: '#047857',
  violet: '#5B21B6',
};

/** 与 THEME_PRESET_RGB 次色一致的 Hex，供 Ant Design 等非 Tailwind 场景 */
export const THEME_SECONDARY_HEX: Record<ThemePreset, string> = {
  civic: '#00A3BF',
  ocean: '#00A8CC',
  forest: '#0d9488',
  violet: '#7c3aed',
};

const LIGHT_SURF = {
  surface: '244 245 247',
  onSurface: '23 43 77',
  onSurfaceVariant: '68 84 111',
  outlineVariant: '220 223 228',
};

const DARK_SURF = {
  surface: '15 23 42',
  onSurface: '226 232 240',
  onSurfaceVariant: '148 163 184',
  outlineVariant: '51 65 85',
};

const LAYOUT = {
  compact: { max: '1200px', px: '1.25rem', pyMain: '2rem', pySection: '3rem' },
  comfortable: { max: '1600px', px: '2rem', pyMain: '2.5rem', pySection: '4rem' },
  spacious: { max: '1760px', px: '2.5rem', pyMain: '3rem', pySection: '5rem' },
} as const;

/** Material 容器阶与强调色（随明暗切换，供 Tailwind surface-container / secondary-container 等） */
function setExtendedSurfaceTokens(root: HTMLElement, dark: boolean) {
  if (dark) {
    root.style.setProperty('--tw-surface-container-lowest', '30 41 59');
    root.style.setProperty('--tw-surface-container-low', '51 65 85');
    root.style.setProperty('--tw-surface-container-high', '71 85 105');
    root.style.setProperty('--tw-secondary-container', '96 165 250');
    root.style.setProperty('--tw-primary-container', '59 130 246');
    root.style.setProperty('--tw-on-primary-container', '219 234 254');
    root.style.setProperty('--tw-page-muted', '148 163 184');
  } else {
    root.style.setProperty('--tw-surface-container-lowest', '255 255 255');
    root.style.setProperty('--tw-surface-container-low', '242 244 246');
    root.style.setProperty('--tw-surface-container-high', '230 232 234');
    root.style.setProperty('--tw-secondary-container', '83 156 254');
    root.style.setProperty('--tw-primary-container', '26 95 180');
    root.style.setProperty('--tw-on-primary-container', '203 220 255');
    root.style.setProperty('--tw-page-muted', '114 119 128');
  }
}

export function getResolvedDark(mode: ThemeMode): boolean {
  if (typeof window === 'undefined') return false;
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyPreferencesToDocument(state: {
  themeMode: ThemeMode;
  themePreset: ThemePreset;
  layoutDensity: LayoutDensity;
}): { dark: boolean; primaryHex: string } {
  const dark = getResolvedDark(state.themeMode);
  const preset = THEME_PRESET_RGB[state.themePreset];
  const surf = dark ? DARK_SURF : LIGHT_SURF;
  const layout = LAYOUT[state.layoutDensity];
  const root = document.documentElement;

  root.classList.toggle('dark', dark);
  root.setAttribute('data-layout-density', state.layoutDensity);

  root.style.setProperty('--tw-color-primary', preset.primary);
  root.style.setProperty('--tw-color-secondary', preset.secondary);
  root.style.setProperty('--tw-color-surface', surf.surface);
  root.style.setProperty('--tw-color-on-surface', surf.onSurface);
  root.style.setProperty('--tw-color-on-surface-variant', surf.onSurfaceVariant);
  root.style.setProperty('--tw-color-outline-variant', surf.outlineVariant);

  root.style.setProperty('--layout-max', layout.max);
  root.style.setProperty('--layout-px', layout.px);
  root.style.setProperty('--layout-py-main', layout.pyMain);
  root.style.setProperty('--layout-py-section', layout.pySection);

  const primaryHex = THEME_PRESET_HEX[state.themePreset];
  const secondaryHex = THEME_SECONDARY_HEX[state.themePreset];
  root.style.setProperty('--primary-color', primaryHex);
  root.style.setProperty('--jsjb-accent', primaryHex);
  root.style.setProperty('--theme-secondary-hex', secondaryHex);
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  setExtendedSurfaceTokens(root, dark);

  return { dark, primaryHex };
}

type PreferencesState = {
  themeMode: ThemeMode;
  themePreset: ThemePreset;
  layoutDensity: LayoutDensity;
  pageTransition: PageTransition;
  metadataDisplayLocale: MetadataDisplayLocale;
  preferencesOpen: boolean;
  setThemeMode: (v: ThemeMode) => void;
  setThemePreset: (v: ThemePreset) => void;
  setLayoutDensity: (v: LayoutDensity) => void;
  setPageTransition: (v: PageTransition) => void;
  setMetadataDisplayLocale: (v: MetadataDisplayLocale) => void;
  openPreferences: () => void;
  closePreferences: () => void;
};

export type { PreferencesState };

export type PersistedPreferencesSlice = Pick<
  PreferencesState,
  'themeMode' | 'themePreset' | 'layoutDensity' | 'pageTransition' | 'metadataDisplayLocale'
>;

/** 首屏前从 localStorage 读出偏好（与 zustand persist 键一致），避免闪错主题 */
export function readPersistedPreferences(): PersistedPreferencesSlice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('jsjb_prefs_v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: Partial<PreferencesState> };
    const s = parsed.state;
    if (!s?.themeMode || !s?.themePreset || !s?.layoutDensity) return null;
    return {
      themeMode: s.themeMode,
      themePreset: s.themePreset,
      layoutDensity: s.layoutDensity,
      pageTransition: s.pageTransition ?? 'fade',
      metadataDisplayLocale: s.metadataDisplayLocale ?? 'zh',
    };
  } catch {
    return null;
  }
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      themeMode: 'light',
      themePreset: 'civic',
      layoutDensity: 'comfortable',
      pageTransition: 'fade',
      metadataDisplayLocale: 'zh',
      preferencesOpen: false,
      setThemeMode: (themeMode) =>
        set((s) => {
          applyPreferencesToDocument({
            themeMode,
            themePreset: s.themePreset,
            layoutDensity: s.layoutDensity,
          });
          return { themeMode };
        }),
      setThemePreset: (themePreset) =>
        set((s) => {
          applyPreferencesToDocument({
            themeMode: s.themeMode,
            themePreset,
            layoutDensity: s.layoutDensity,
          });
          return { themePreset };
        }),
      setLayoutDensity: (layoutDensity) =>
        set((s) => {
          applyPreferencesToDocument({
            themeMode: s.themeMode,
            themePreset: s.themePreset,
            layoutDensity,
          });
          return { layoutDensity };
        }),
      setPageTransition: (pageTransition) => set({ pageTransition }),
      setMetadataDisplayLocale: (metadataDisplayLocale) => set({ metadataDisplayLocale }),
      openPreferences: () => set({ preferencesOpen: true }),
      closePreferences: () => set({ preferencesOpen: false }),
    }),
    {
      name: 'jsjb_prefs_v1',
      partialize: (s) => ({
        themeMode: s.themeMode,
        themePreset: s.themePreset,
        layoutDensity: s.layoutDensity,
        pageTransition: s.pageTransition,
        metadataDisplayLocale: s.metadataDisplayLocale,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<PersistedPreferencesSlice> | undefined;
        return {
          ...current,
          ...(p ?? {}),
          metadataDisplayLocale: p?.metadataDisplayLocale ?? 'zh',
          pageTransition: p?.pageTransition ?? current.pageTransition,
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;
        applyPreferencesToDocument({
          themeMode: state.themeMode,
          themePreset: state.themePreset,
          layoutDensity: state.layoutDensity,
        });
      },
    },
  ),
);
