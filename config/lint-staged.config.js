export default {
  // Only staged code files are processed by ESLint + Prettier
  // Use filenames argument so ESLint only lints staged files, not the whole project
  '**/*.{ts,tsx,js,cjs,mjs}': (filenames) => [
    `pnpm eslint --config config/eslint.config.mjs --fix ${filenames.join(' ')}`,
    `prettier --write ${filenames.join(' ')}`,
  ],

  // Pure text-based formats are formatted by Prettier only
  '**/*.{json,md,yaml}': ['prettier --write'],
}
