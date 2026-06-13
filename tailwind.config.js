/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        warehouse: {
          navy: '#1E3A5F',
          navyDark: '#152A45',
          navyLight: '#2A4F7A',
          orange: '#FF6B35',
          orangeDark: '#E55A2B',
          orangeLight: '#FF8C5E',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          floor: '#374151',
          floorLight: '#4B5563',
          shelf: '#1F2937',
          shelfLight: '#374151',
          aisle: '#6B7280',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['"Noto Sans SC"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
        'shake': 'shake 0.4s cubic-bezier(.36,.07,.19,.97) both',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
        'ripple': 'ripple 0.8s ease-out',
        'glow': 'glow 1.5s ease-in-out infinite alternate',
        'scan-line': 'scanLine 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
        scanLine: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'warehouse': '0 10px 40px -10px rgba(30, 58, 95, 0.5)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'glow-orange': '0 0 20px rgba(255, 107, 53, 0.5)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.5)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.5)',
      },
    },
  },
  plugins: [],
}
