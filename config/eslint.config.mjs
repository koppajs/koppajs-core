import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettierPlugin from 'eslint-plugin-prettier'

/** Globale Ignore-Liste (ersetzt .eslintignore) */
const ignores = [
  '.git',
  '.history/**',
  '.vscode/**',
  '.idea/**',
  'node_modules/**',
  'dist/**',
  'coverage/**',
  'pnpm-lock.yaml',
  'package-lock.json',
  'vitest.config.*',
  'vite.config.*',
  '**/*_del',
  '---*',
  'config/tsconfig*.json',
]

/** Gemeinsame Language-Options für TS/JS */
const languageOptions = {
  parser: tsParser,
  ecmaVersion: 'latest',
  sourceType: 'module',
}

export default [
  // 1) Ignore-Konfiguration
  {
    ignores,
  },

  // 2) TS/JS-Regeln
  {
    files: ['**/*.{ts,tsx,js,cjs,mjs}'],
    languageOptions,
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // Basis: ESLint-Empfehlungen
      ...js.configs.recommended.rules,

      // TypeScript-Empfehlungen (ohne zu harte/noisy Regeln)
      ...tsPlugin.configs.recommended.rules,

      // TypeScript-spezifische Anpassungen/Overrides
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // optional: etwas weniger streng, wenn du viel refaktorierst
      '@typescript-eslint/no-explicit-any': 'off',

      // Prettier als Format-Richter
      'prettier/prettier': 'error',
    },
  },
]
