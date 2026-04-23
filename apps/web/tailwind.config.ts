import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          barren: '#9ca3af',
          sprout: '#bbf7d0',
          meadow: '#4ade80',
          deep: '#16a34a',
          dense: '#14532d',
        },
      },
    },
  },
  plugins: [],
};

export default config;
