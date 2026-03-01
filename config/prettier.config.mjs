/** @type {import("prettier").Config} */
const config = {
  // Structural formatting preferences
  semi: false,
  tabWidth: 2,
  useTabs: false,

  // String and quote style
  singleQuote: true,
  quoteProps: 'as-needed',

  // Code flow and punctuation
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'always',

  // Formatting for HTML/CSS/JS and general files
  printWidth: 90,
  endOfLine: 'lf',

  // Parser behavior: automatic for JS/TS/JSON/Markdown/HTML/CSS
  overrides: [
    {
      files: '*.md',
      options: { proseWrap: 'preserve' },
    },
  ],
}

export default config
