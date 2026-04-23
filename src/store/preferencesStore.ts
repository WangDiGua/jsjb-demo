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
  civic: { primary: '40 109 153', secondary: '71 169 137' },
  ocean: { primary: '36 124 170', secondary: '81 164 186' },
  forest: { primary: '48 132 103', secondary: '79 175 139' },
  violet: { primary: '93 99 166', secondary: '82 176 163' },
};

export const THEME_PRESET_HEX: Record<ThemePreset, string> = {
  civic: '#286D99',
  ocean: '#247CAA',
  forest: '#308467',
  violet: '#5D63A6',
};

/** 与 THEME_PRESET_RGB 次色一致的 Hex，供 Ant Design 等非 Tailwind 场景 */
export const THEME_SECONDARY_HEX: Record<ThemePreset, string> = {
  civic: '#47A989',
  ocean: '#51A4BA',
  forest: '#4FAF8B',
  violet: '#52B0A3',
};

const LIGHT_SURF = {
  surface: '245 247 241',
  onSurface: '25 48 68',
  onSurfaceVariant: '102 115 127',
  outlineVariant: '202 216 213',
};

const DARK_SURF = {
  surface: '10 23 32',
  onSurface: '230 240 242',
  onSurfaceVariant: '160 179 184',
  outlineVariant: '58 79 86',
};

const LAYOUT = {
  compact: { max: '1200px', px: '1.25rem', pyMain: '2rem', pySection: '3rem' },
  comfortable: { max: '1600px', px: '2rem', pyMain: '2.5rem', pySection: '4rem' },
  spacious: { max: '1760px', px: '2.5rem', pyMain: '3rem', pySection: '5rem' },
} as const;

/** Material 容器阶与强调色（随明暗切换，供 Tailwind surface-container / secondary-container 等） */
function setExtendedSurfaceTokens(root: HTMLElement, dark: boolean) {
  if (dark) {
    root.style.setProperty('--tw-surface-container-lowest', '13 31 42');
    root.style.setProperty('--tw-surface-container-low', '20 41 52');
    root.style.setProperty('--tw-surface-container-high', '33 61 70');
    root.style.setProperty('--tw-secondary-container', '70 149 126');
    root.style.setProperty('--tw-primary-container', '32 86 120');
    root.style.setProperty('--tw-on-primary-container', '224 244 248');
    root.style.setProperty('--tw-page-muted', '150 169 174');
  } else {
    root.style.setProperty('--tw-surface-container-lowest', '255 255 251');
    root.style.setProperty('--tw-surface-container-low', '238 246 244');
    root.style.setProperty('--tw-surface-container-high', '221 235 232');
    root.style.setProperty('--tw-secondary-container', '207 236 226');
    root.style.setProperty('--tw-primary-container', '218 237 247');
    root.style.setProperty('--tw-on-primary-container', '23 73 101');
    root.style.setProperty('--tw-page-muted', '116 128 136');
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
