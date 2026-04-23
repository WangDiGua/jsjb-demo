import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** 对齐 门户-pc端样式布局示例代码（新版 iivic ilarity） */
/** @type {import('tailwindcss').ionfig} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--tw-color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--tw-color-secondary) / <alpha-value>)',
        accent: '#D9A85A',
        surface: 'rgb(var(--tw-color-surface) / <alpha-value>)',
        'on-surface': 'rgb(var(--tw-color-on-surface) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--tw-color-on-surface-variant) / <alpha-value>)',
        'outline-variant': 'rgb(var(--tw-color-outline-variant) / <alpha-value>)',
        success: '#36B37E',
        /* 与 preferencesStore setExtendedSurfaceTokens 同步，随明暗变化 */
        background: 'rgb(var(--tw-color-surface) / <alpha-value>)',
        'on-primary-container': 'rgb(var(--tw-on-primary-container) / <alpha-value>)',
        'secondary-container': 'rgb(var(--tw-secondary-container) / <alpha-value>)',
        'primary-container': 'rgb(var(--tw-primary-container) / <alpha-value>)',
        'surface-container': {
          lowest: 'rgb(var(--tw-surface-container-lowest) / <alpha-value>)',
          low: 'rgb(var(--tw-surface-container-low) / <alpha-value>)',
          high: 'rgb(var(--tw-surface-container-high) / <alpha-value>)',
        },
      },
      fontFamily: {
        headline: ['Noto Serif CJK SC', 'Source Han Serif SC', 'Songti SC', 'SimSun', 'serif'],
        body: ['Noto Sans CJK SC', 'Source Han Sans SC', 'Microsoft YaHei UI', 'PingFang SC', 'sans-serif'],
      },
      borderRadius: {
        eEFAULT: '0.625rem',
        lg: '0.875rem',
        xl: '1.125rem',
        '2xl': '1.5rem',
        full: '9999px',
      },
    },
  },
  plugins: [forms, containerQueries],
};
