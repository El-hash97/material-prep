/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        iron: {
          950: '#090B0C',
          900: '#0D1012',
          850: '#111518',
          800: '#161B1E',
          750: '#1B2125',
          700: '#22292D',
          600: '#2B3439',
        },
        paper: '#ECE9E2',
        steel: {
          DEFAULT: '#A7B0B3',
          dim: '#7C8588',
          faint: '#5A6366',
        },
        signal: '#F0A32A',
        danger: '#E2574C',
        success: '#4DBE8A',
        info: '#6E9FE8',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'sans-serif'],
      },
      keyframes: {
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        sweep: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
      },
      animation: {
        fadeInScale: 'fadeInScale 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        slideInLeft: 'slideInLeft 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        sweep: 'sweep 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
}
