/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Warna utama brand — emerald tua, kesan profesional & segar,
        // dipakai di CTA utama, header, nav aktif, dsb.
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // Aksen emas hangat — highlight harga, badge peringkat, sentuhan
        // premium supaya tidak terasa terlalu "dingin/korporat".
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        // Aksen alert/badge (jumlah antrian, dsb) — tetap oranye-merah.
        ember: {
          50: '#fef2ee',
          100: '#fde1d5',
          400: '#f0784a',
          500: '#e85d2f',
          600: '#c24a22',
          700: '#993a1b',
        },
      },
      boxShadow: {
        ticket: '0 8px 24px -8px rgba(6, 78, 59, 0.28)',
        elevated: '0 20px 50px -12px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
};
