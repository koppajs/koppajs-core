import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import eslintConfigPrettier from 'eslint-config-prettier'

/** Global ignore list (replaces .eslintignore) */
const ignores = [
  '.git',
  '.history/**',
  '.ai/**',
  '.local/**',
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

/** Shared language options for TS/JS files */
const languageOptions = {
  parser: tsParser,
  ecmaVersion: 'latest',
  sourceType: 'module',
}

export default [
  // 1) Ignore configuration
  {
    ignores,
  },

  // 2) Core TS/JS rules for the project
  {
    files: ['**/*.{ts,tsx,js,cjs,mjs}'],
    languageOptions,
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Base ESLint recommended rules
      ...js.configs.recommended.rules,

      // TypeScript recommended rules (kept reasonably strict, but not noisy)
      ...tsPlugin.configs.recommended.rules,

      // TypeScript-specific overrides
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Optional: disable if you refactor frequently
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  eslintConfigPrettier,
]
