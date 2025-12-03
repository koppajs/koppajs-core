export default {
  // Nur Code-Dateien gehen durch ESLint + Prettier
  '**/*.{ts,tsx,js,cjs,mjs}': ['pnpm lint:scripts', 'prettier --write'],

  // Alle „reinen Textformate“ nur durch Prettier
  '**/*.{json,md,yaml}': ['prettier --write'],
}
