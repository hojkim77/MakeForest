import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './shared/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Material Design 3 color tokens
      colors: {
        primary: '#226143',
        'on-primary': '#ffffff',
        'primary-container': '#3d7a5a',
        'on-primary-container': '#c7ffdc',
        'primary-fixed': '#b0f1ca',
        'primary-fixed-dim': '#95d4af',
        'on-primary-fixed': '#002112',
        'on-primary-fixed-variant': '#0e5134',
        'inverse-primary': '#95d4af',
        secondary: '#3e674d',
        'on-secondary': '#ffffff',
        'secondary-container': '#bdebca',
        'on-secondary-container': '#426b51',
        'secondary-fixed': '#c0edcc',
        'secondary-fixed-dim': '#a4d1b1',
        'on-secondary-fixed': '#002110',
        'on-secondary-fixed-variant': '#264f37',
        tertiary: '#13623e',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#327b55',
        'on-tertiary-container': '#c5ffd9',
        'tertiary-fixed': '#a8f3c4',
        'tertiary-fixed-dim': '#8cd6aa',
        'on-tertiary-fixed': '#002111',
        'on-tertiary-fixed-variant': '#005231',
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        background: '#fdf9f1',
        'on-background': '#1c1c17',
        surface: '#fdf9f1',
        'on-surface': '#1c1c17',
        'surface-variant': '#e6e2da',
        'on-surface-variant': '#404942',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f7f3eb',
        'surface-container': '#f2ede5',
        'surface-container-high': '#ece8e0',
        'surface-container-highest': '#e6e2da',
        'surface-dim': '#dddad2',
        'surface-bright': '#fdf9f1',
        'surface-tint': '#2c6a4b',
        'inverse-surface': '#31302b',
        'inverse-on-surface': '#f4f0e8',
        outline: '#707972',
        'outline-variant': '#c0c9c0',
        // Pixel map density colors
        forest: {
          barren: '#9ca3af',
          sprout: '#bbf7d0',
          meadow: '#4ade80',
          deep: '#16a34a',
          dense: '#14532d',
        },
      },

      // Typography scale
      fontFamily: {
        mono: ['var(--font-mono)', 'monospace'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['24px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        headline: ['18px', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        'body-lg': ['16px', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        label: ['12px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '500' }],
        'pixel-stat': ['14px', { lineHeight: '1', letterSpacing: '0', fontWeight: '700' }],
      },

      // Spacing tokens
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '48px',
      },

      // Sharp pixel-art radius scale
      borderRadius: {
        DEFAULT: '0.125rem',  // 2px
        lg: '0.25rem',        // 4px
        xl: '0.5rem',         // 8px
        full: '0.75rem',      // 12px
      },
    },
  },
  plugins: [],
};

export default config;
