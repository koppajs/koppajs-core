const quoteFiles = (filenames) =>
  filenames.map((filename) => JSON.stringify(filename)).join(' ')

export default {
  '**/*.{ts,tsx,js,cjs,mjs}': (filenames) => [
    `pnpm exec eslint --fix ${quoteFiles(filenames)}`,
    `pnpm exec prettier --write ${quoteFiles(filenames)}`,
  ],
  '**/*.{json,md,yaml,yml}': (filenames) => [
    `pnpm exec prettier --write ${quoteFiles(filenames)}`,
  ],
}
