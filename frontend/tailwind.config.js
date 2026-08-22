/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nyaya: {
          navy: '#0B192C',
          deep: '#1E3E62',
          gold: '#D97706',
          amber: '#F59E0B',
          saffron: '#FF6500',
          emerald: '#059669',
          crimson: '#DC2626',
          slate: '#334155',
          parchment: '#F8FAFC',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

