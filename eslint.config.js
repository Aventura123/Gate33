const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [  {    ignores: [
      'functions/lib/**',
      '**/lib/**',
      '**/gate33 newage/**',
      'functions/run-sync-learn2earn.js'
    ],
    files: ['functions/**/*.ts', 'functions/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        project: ['./functions/tsconfig.json'],
        tsconfigRootDir: __dirname,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },    rules: {
      'linebreak-style': 'off', // Desativado para permitir tanto CRLF (Windows) quanto LF (Unix)
      'max-len': ['error', { code: 120 }],
    },
  },
];
