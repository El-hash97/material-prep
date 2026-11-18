/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Elevasi gelap (hue baja dingin): halaman → well → tile → raised → hover. Lihat DESIGN.md untuk rasio kontras.
        iron: {
          950: '#090B0C', // halaman
          900: '#0E1214', // sidebar, input, well
          850: '#14191C', // tile
          800: '#1B2125', // header tabel, tooltip, raised
          750: '#222A2E', // hover (jangan pakai steel-faint di atasnya)
          700: '#2C353A', // track meter, scrollbar
          600: '#3A444A', // scrollbar hover
          500: '#59636A', // border input (3:1 di well)
        },
        paper: '#ECE9E2',
        // Tier teks, semuanya ≥ 4.5:1 di tile & raised: paper 14.6 · steel 9.1 · dim 6.5 · faint 5.0
        steel: {
          DEFAULT: '#B3BBBE',
          dim: '#959EA2',
          faint: '#808A8E',
        },
        signal: '#F0A32A',
        danger: '#EB6A5F',
        success: '#4DBE8A',
        info: '#7AA8EE',
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
