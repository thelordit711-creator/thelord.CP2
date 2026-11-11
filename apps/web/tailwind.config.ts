import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          primary: 'var(--bg-obsidian-primary, #05080F)',
          surface: 'var(--bg-card-surface, #0A0F1A)',
          card: 'var(--bg-card-secondary, #0E1520)',
          border: 'var(--border-primary, #1E293B)'
        },
        lord: {
          gold: 'var(--lord-gold-primary, #C9A84C)',
          hover: 'var(--lord-gold-hover, #E8D5A3)',
          muted: '#997D25',
          dark: '#05080F',
          slate: '#0A0F1A',
          card: '#0E1520'
        },
        cyber: {
          blue: 'var(--cyber-blue-accent, #38BDF8)',
          dark: '#004C75'
        },
        status: {
          processing: 'var(--status-processing, #FBBF24)',
          disbursed: 'var(--status-disbursed, #34D399)',
          danger: 'var(--status-danger, #F87171)'
        }
      },
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      boxShadow: {
        'gold-glow': '0 0 22px -4px rgba(201, 168, 76, 0.32)',
        'blue-glow': '0 0 22px -4px rgba(56, 189, 248, 0.32)'
      }
    },
  },
  plugins: [],
};

export default config;

