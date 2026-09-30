const js = require('@eslint/js');
const ts = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.d.ts',
      'esbuild.config.mjs',
      'version-bump.js',
      'src/hot-reload.js',
      'main.js',
      'eslint.config.js', // Ignore the config file itself
      'vitest.config.ts', // Not part of tsconfig.json project
    ],
  },
  {
    files: ['eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        require: 'readonly',
        module: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        console: 'readonly',
        process: 'readonly',
        window: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': ts,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-console': 'off', // ['warn', { allow: ['warn', 'error'] }],
      'no-undef': 'off', // Отключаем, так как TypeScript сам проверяет необъявленные переменные
      'no-unused-vars': 'off', // Use @typescript-eslint/no-unused-vars instead
    },
  },
];
