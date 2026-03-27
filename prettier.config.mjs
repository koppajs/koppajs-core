/** @type {import("prettier").Config} */
const config = {
  semi: false,
  tabWidth: 2,
  useTabs: false,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'always',
  printWidth: 90,
  endOfLine: 'lf',
  overrides: [
    {
      files: '*.md',
      options: { proseWrap: 'preserve' },
    },
  ],
}

export default config
