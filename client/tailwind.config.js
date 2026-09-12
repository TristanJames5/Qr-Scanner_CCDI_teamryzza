/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ccdi: {
          blue: '#0F2C59',
          navy: '#0b1f3f',
          red: '#850000',
          maroon: '#680000',
          gold: '#DC5F00',
          sand: '#F8F0E5',
          cream: '#FAF6F0',
          accent: '#2563eb'
        }
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 30s linear infinite',
      }
    },
  },
  plugins: [],
}
