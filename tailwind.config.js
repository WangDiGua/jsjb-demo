import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** 对齐 门户-pc端样式布局示例代码（新版 Civic Clarity） */
/** @type {import('tailwindcss').Config} */
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
        accent: '#FFAB00',
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
        headline: ['Public Sans', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        body: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '1rem',
        xl: '1.5rem',
        '2xl': '2rem',
        full: '9999px',
      },
    },
  },
  plugins: [forms, containerQueries],
};
