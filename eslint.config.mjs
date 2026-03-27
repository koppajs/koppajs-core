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
  'tsconfig*.json',
  '**/*_del',
  '---*',
]

/** Shared language options for TS/JS files */
const languageOptions = {
  parser: tsParser,
  ecmaVersion: 'latest',
  sourceType: 'module',
}

export default [
  {
    ignores,
  },
  {
    files: ['**/*.{ts,tsx,js,cjs,mjs}'],
    languageOptions,
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  eslintConfigPrettier,
]
