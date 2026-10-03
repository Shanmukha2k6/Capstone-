/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gpt: {
          bg: '#0e101a',
          surface: '#191c2a',
          surfaceHover: '#25283c',
          sidebar: '#141722',
          sidebarHover: '#25283c',
          border: '#303449',
          borderSubtle: '#262a3c',
          text: '#edeefa',
          subtext: '#b7b8cf',
          muted: '#9599b4',
          accent: '#ad8bff',
          accentHover: '#c4abff',
        },
        brand: {
          500: '#10b981',
          600: '#059669'
        }
      }
    },
  },
  plugins: [],
}
