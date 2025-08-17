/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcd8ff',
          300: '#90beff',
          400: '#5a9bff',
          500: '#2a74ff',
          600: '#1559e6',
          700: '#1147b4',
          800: '#103c8f',
          900: '#112f6e'
        }
      },
      boxShadow: {
        glass: '0 10px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.08)'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
}
