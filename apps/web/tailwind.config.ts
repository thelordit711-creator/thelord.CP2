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
          primary: 'var(--bg-obsidian-primary, #07090E)',
          surface: 'var(--bg-card-surface, #0F141C)',
          card: '#141B26',
          border: '#1F2937'
        },
        lord: {
          gold: 'var(--lord-gold-primary, #D4AF37)',
          hover: 'var(--lord-gold-hover, #F3E5AB)',
          muted: '#997D25',
          dark: '#07090E',
          slate: '#0F141C',
          card: '#131A24'
        },
        cyber: {
          blue: 'var(--cyber-blue-accent, #00A8FF)',
          dark: '#004C75'
        },
        status: {
          processing: 'var(--status-processing, #F59E0B)',
          disbursed: 'var(--status-disbursed, #10B981)',
          danger: 'var(--status-danger, #EF4444)'
        }
      },
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'Inter', 'sans-serif']
      },
      boxShadow: {
        'gold-glow': '0 0 20px -3px rgba(212, 175, 55, 0.35)',
        'blue-glow': '0 0 20px -3px rgba(0, 168, 255, 0.35)'
      }
    },
  },
  plugins: [],
};

export default config;

