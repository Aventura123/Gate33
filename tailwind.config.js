// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}", // Adicionado para incluir o diretório app
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],  theme: {
    extend: {      colors: {
        'gate33-orange': '#F97316',
        'gate33-orange-hover': '#EA580C',
        'gate33-orange-alt': '#FB923C',
        'led-orange': '#F97316',
        'led-orange-alt': '#FB923C',
      },fontFamily: {
        'verdana': ['Verdana', 'Geneva', 'sans-serif'],
        'sans': ['Verdana', 'Geneva', 'sans-serif'], // Tornando Verdana a fonte padrão
      },
      fontSize: {
        // H1 - Títulos Principais
        'h1-mobile': ['28px', { lineHeight: '28px' }],
        'h1-desktop': ['42px', { lineHeight: '40px' }],
        
        // H2 - Subtítulos
        'h2-mobile': ['20px', { lineHeight: '24px' }],
        'h2-desktop': ['48px', { lineHeight: '52px' }],
        
        // H3 - Títulos de Seção
        'h3-mobile': ['14px', { lineHeight: '18px' }],
        'h3-desktop': ['16px', { lineHeight: '20px' }],
        
        // H4-H6 - Hierarquia menor
        'h4-mobile': ['14px', { lineHeight: '18px' }],
        'h4-desktop': ['18px', { lineHeight: '22px' }],
        
        // Body - Texto comum
        'body-sm': ['12px', { lineHeight: '16px' }], // Para cards
        'body-base': ['16px', { lineHeight: '24px' }], // Padrão
        'body-lg': ['20px', { lineHeight: '28px' }], // Medium
        'body-xl': ['24px', { lineHeight: '32px' }], // Large
        
        // Small - Texto menor
        'small-xs': ['12px', { lineHeight: '16px' }],
        'small-sm': ['14px', { lineHeight: '18px' }],
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
  ],  plugins: [
    // @tailwindcss/line-clamp is now included by default in Tailwind v3.3+
  ],
  corePlugins: {
    // Disable webkit text size adjust if not needed
    preflight: true,
  },
};