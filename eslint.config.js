const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [  // Next.js app configuration
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: [
      '.next/**',
      'out/**', 
      'public/**',
      'node_modules/**',
      'functions/lib/**',
      '**/lib/**',
      '**/gate33/**',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },    rules: {
      'linebreak-style': 'off',
      'max-len': ['error', { code: 400, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
      'react-hooks/exhaustive-deps': 'off',
    },
  },  // Functions specific configuration
  {
    files: ['functions/**/*.ts', 'functions/**/*.js'],
    ignores: [
      'functions/lib/**',
      'functions/run-sync-learn2earn.js'
    ],
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
      'linebreak-style': 'off',
      'max-len': ['error', { code: 400, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
      'react-hooks/exhaustive-deps': 'off',
    },
  },
];
