import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#0F766E',
          light: '#14B8A6',
        },
        state: {
          safe: '#10B981',
          grace: '#F59E0B',
          warning: '#F97316',
          alert: '#DC2626',
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-scale': 'fadeInScale 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-left': 'slideInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        shimmer: 'shimmer 3s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
        'gradient-shift': 'gradientShift 6s ease infinite',
        'dot-pulse': 'dotPulse 2s ease-in-out infinite',
        'ring-pulse': 'ringPulse 2s ease infinite',
        'grid-move': 'gridMove 4s linear infinite',
        'spin-slow': 'spinSlow 20s linear infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-teal': 'linear-gradient(135deg, #0F766E 0%, #14B8A6 50%, #06B6D4 100%)',
        'gradient-surface': 'linear-gradient(180deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0.8) 100%)',
      },
      boxShadow: {
        'glow-teal': '0 0 20px rgba(20, 184, 166, 0.3), 0 0 40px rgba(20, 184, 166, 0.1)',
        'glow-teal-lg': '0 0 30px rgba(20, 184, 166, 0.4), 0 0 60px rgba(20, 184, 166, 0.15)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.3)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.3)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.3)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
