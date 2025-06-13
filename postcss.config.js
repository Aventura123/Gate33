module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      overrideBrowserslist: [
        'last 2 versions',
        '> 1%',
        'not dead',
        'not ie 11'
      ]
    },
  },
};