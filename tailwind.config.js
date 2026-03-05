/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: '#1e3a8a',
      },
      width: {
        'sidebar': '250px',
        'sidebar-collapsed': '72px',
      },
    },
  },
  plugins: [],
}
