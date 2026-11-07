/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Preferred Palette (Minimal, Premium, Technical)
        canvas: { DEFAULT: '#f7f8f3', surface: '#ffffff', elevated: '#eef2ea' },       // Primary background
        surface: {
          DEFAULT: '#ffffff',    // Secondary background
          elevated: '#eef2ea',   // Elevated surface
          card: '#fdfdf9',       // Structured containers
          hover: '#e7eee5',      // Interactive state
          border: '#d5dfd4',     // Default border
          'border-subtle': 'rgba(32, 53, 47, 0.12)',
          'border-accent': 'rgba(59, 130, 246, 0.3)',
        },
        border: { subtle: '#d5dfd4', muted: '#a3b2a5', active: '#397b67' },
        text: {
          primary: '#20352f',    // Primary text
          secondary: '#53665b',  // Secondary text
          muted: '#637369',      // Tertiary / muted text
        },
        // Accents
        accent: {
          blue: '#3B82F6',       // Soft electric blue
          'blue-light': '#60A5FA',
          'blue-subtle': 'rgba(59, 130, 246, 0.1)',
          silver: '#CBD5E1',     // Cool silver
          teal: '#397b67',     // Quiet teal
          'teal-subtle': 'rgba(57, 123, 103, 0.1)',
          amber: '#F59E0B',      // Controlled warm highlights
          'amber-subtle': 'rgba(245, 158, 11, 0.1)',
          emerald: '#10B981',    // Verified fixes & passed tests
          'emerald-subtle': 'rgba(16, 185, 129, 0.1)',
          rose: '#EF4444',       // Critical defects & regressions
          'rose-subtle': 'rgba(239, 68, 68, 0.1)',
        },
        // Backwards compatibility mappings for smooth migration
        graphite: {
          950: '#f7f8f3',
          900: '#ffffff',
          850: '#fdfdf9',
          800: '#eef2ea',
          750: '#e7eee5',
          700: '#d5dfd4',
          600: '#a3b2a5',
          500: '#637369',
        },
        navy: {
          950: '#f7f8f3',
          900: '#ffffff',
          850: '#fdfdf9',
          800: '#eef2ea',
          700: '#d5dfd4',
          600: '#a3b2a5',
        },
        brand: {
          cyan: '#3B82F6',
          green: '#10B981',
          red: '#EF4444',
          amber: '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(32, 53, 47, 0.06)',
        'elevated': '0 8px 30px -4px rgba(32, 53, 47, 0.1), 0 0 1px 1px rgba(255, 255, 255, 0.06)',
        'card': '0 4px 20px -2px rgba(32, 53, 47, 0.06)',
      }
    },
  },
  plugins: [],
};
