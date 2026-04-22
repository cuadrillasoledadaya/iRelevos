/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['var(--font-cinzel)', 'serif'],
        lato: ['var(--font-lato)', 'sans-serif'],
      },
      colors: {
        oro: '#c9a84c',
        'oro-c': '#e8c97a',
        'oro-o': '#8a6d2f',
        neg: '#0d0a06',
        'neg-m': '#1a1510',
        'neg-s': '#2a211a',
        cre: '#f5ead8',
        'cre-o': '#d4c4a8',
      },
    },
  },
  plugins: [],
}
