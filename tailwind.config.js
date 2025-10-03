module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        neural: {
          primary: '#2D3BE3',
          secondary: '#10B981',
          accent: '#8B5CF6',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          border: 'rgba(255, 255, 255, 0.2)',
        },
      },
    },
  },
  plugins: [],
};
