import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './shared/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Material Design 3 color tokens (island pixel-art palette)
      colors: {
        primary: '#226143',
        'on-primary': '#ffffff',
        'primary-container': '#3d7a5a',
        'on-primary-container': '#ffffff',
        'primary-fixed': '#b0f1ca',
        'primary-fixed-dim': '#95d4af',
        'on-primary-fixed': '#002112',
        'on-primary-fixed-variant': '#0e5134',
        'inverse-primary': '#95d4af',
        secondary: '#3e674d',
        'on-secondary': '#ffffff',
        'secondary-container': '#bdebca',
        'on-secondary-container': '#264f37',
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
        background: '#FBF7EC',
        'on-background': '#2A2D26',
        surface: '#FBF7EC',
        'on-surface': '#2A2D26',
        'surface-variant': '#D8D2C6',
        'on-surface-variant': '#6E7268',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#F2EDE4',
        'surface-container': '#EDE8DC',
        'surface-container-high': '#E3DDD1',
        'surface-container-highest': '#D8D2C6',
        'surface-dim': '#C8C2B6',
        'surface-bright': '#FBF7EC',
        'surface-tint': '#2c6a4b',
        'inverse-surface': '#1B3A26',
        'inverse-on-surface': '#F2EDE4',
        outline: '#1B3A26',
        'outline-variant': '#B6AE99',
        'border-subtle': 'var(--color-border-subtle)',
        'kakao-bg': 'var(--color-kakao-bg)',
        'kakao-fg': 'var(--color-kakao-fg)',
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
        display: ['24px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '800' }],
        headline: ['18px', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '800' }],
        'body-md': ['14px', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        'body-lg': ['16px', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        label: ['12px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '600' }],
        'pixel-stat': ['14px', { lineHeight: '1', letterSpacing: '0', fontWeight: '700' }],
      },

      // Spacing tokens
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '48px',
        topbar: 'var(--topbar-h)',
        tabbar: 'var(--tabbar-h)',
      },

      // Layout width tokens
      width: {
        panel: 'var(--panel-w)',
      },

      // Panel tab popup max-height tokens
      maxHeight: {
        'panel-tab': 'var(--panel-tab-max-h)',
        'panel-tab-md': 'var(--panel-tab-max-h-md)',
      },

      // Z-index semantic scale
      zIndex: {
        'map-content': '10',
        'map-ui': '20',
        'side-tabs': '30',
        'tab-bar': '40',
        header: '50',
        toast: '70',
        'guide-passive': '150',
        spotlight: '190',
        'guide-active': '200',
        tooltip: '9999',
      },

      // Pixel-art box shadows
      boxShadow: {
        island: '3px 3px 0 rgba(27, 58, 38, 0.28)',
        'island-lg': '4px 4px 0 rgba(27, 58, 38, 0.22)',
      },

      // Sharp pixel-art radius scale
      borderRadius: {
        DEFAULT: '0',
        lg: '0',
        xl: '0',
        full: '9999px',
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant('panel-view', '[data-view="panel"] &');
      addVariant('map-view', '[data-view="map"] &');
    }),
  ],
};

export default config;
