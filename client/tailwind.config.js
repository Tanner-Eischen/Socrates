/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0F14',
        surface: '#11151B',
        primary: '#6EE7F5',
      }
    }
  },
  plugins: [],
}

