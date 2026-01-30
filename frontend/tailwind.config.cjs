/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg0: 'var(--bg0)',
        bg1: 'var(--bg1)',
        bg2: 'var(--bg2)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        muted2: 'var(--muted2)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        border: 'var(--border)',
      },
      spacing: {
        s1: 'var(--s-1)',
        s2: 'var(--s-2)',
        s3: 'var(--s-3)',
        s4: 'var(--s-4)',
        s5: 'var(--s-5)',
        s6: 'var(--s-6)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
      },
      boxShadow: {
        panel: 'var(--shadow)',
        panel2: 'var(--shadow2)',
      },
      fontSize: {
        fs0: 'var(--fs-0)',
        fs1: 'var(--fs-1)',
        fs2: 'var(--fs-2)',
        fs3: 'var(--fs-3)',
        fs4: 'var(--fs-4)',
      },
    },
  },
  plugins: [],
};
