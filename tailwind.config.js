// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}", // Adicionado para incluir o diretório app
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],  theme: {
    extend: {
      fontFamily: {
        'verdana': ['Verdana', 'Geneva', 'sans-serif'],
      },
    },
  },
  safelist: [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-yellow-400',
    'bg-orange-500',
    'bg-orange-400',
    'bg-red-500',
    'bg-pink-500',
    'bg-gray-500',
    'bg-gray-400',
    // Add any other color classes you use for network dots here
  ],
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
};