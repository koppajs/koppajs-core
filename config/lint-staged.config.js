export default {
  // Only code files are processed by ESLint + Prettier
  '**/*.{ts,tsx,js,cjs,mjs}': ['pnpm lint:scripts', 'prettier --write'],

  // Pure text-based formats are formatted by Prettier only
  '**/*.{json,md,yaml}': ['prettier --write'],
}
