const quoteFiles = (filenames) =>
  filenames.map((filename) => JSON.stringify(filename)).join(' ')

export default {
  // Only staged code files are processed by ESLint + Prettier
  // Use filenames argument so ESLint only lints staged files, not the whole project
  '**/*.{ts,tsx,js,cjs,mjs}': (filenames) => [
    `pnpm exec eslint --fix ${quoteFiles(filenames)}`,
    `pnpm exec prettier --write ${quoteFiles(filenames)}`,
  ],

  // Pure text-based formats are formatted by Prettier only
  '**/*.{json,md,yaml,yml}': (filenames) => [
    `pnpm exec prettier --write ${quoteFiles(filenames)}`,
  ],
}
