import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fare Tessile brand palette
        brand: {
          gold:       '#38BDF8',
          navy:       '#071428',
          gray:       '#D8DEE9',
          green:      '#22C55E',
          rose:       '#FB7185',
          brick:      '#334155',
          berry:      '#020617',
          denim:      '#0B1F3A',
          cornflower: '#60A5FA',
        },
        // Semantic tokens
        canvas:  '#F3F6FB',
        panel:   '#ffffff',
        surface: '#E8EEF7',
        accent:  '#071428',
        muted:   '#64748b',
      },
      boxShadow: {
        premium: '0 12px 30px rgba(2, 6, 23, 0.10)',
      },
    },
  },
  plugins: [],
} satisfies Config;
