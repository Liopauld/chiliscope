/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f97316',
        secondary: '#1e293b',
        chili: {
          mild: '#4ade80',
          medium: '#facc15',
          hot: '#f97316',
          'extra-hot': '#ef4444',
        },
      },
    },
  },
  plugins: [],
}
