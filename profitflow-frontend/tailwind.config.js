export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0f4c81',
        secondary: '#1f8a6e',
      },
      boxShadow: {
        soft: '0 30px 60px rgba(15, 76, 129, 0.08)',
      },
      borderRadius: {
        '3xl': '32px',
      },
    },
  },
  plugins: [],
}
