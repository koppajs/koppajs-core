/** @type {import("prettier").Config} */
const config = {
  // Struktur
  semi: false,
  tabWidth: 2,
  useTabs: false,

  // Strings & Zitatstil
  singleQuote: true,
  quoteProps: 'as-needed',

  // Codefluss
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'always',

  // Formatierung von HTML/CSS/JS
  printWidth: 90,
  endOfLine: 'lf',

  // Parser-Wahl: vollautomatisch (JS/TS/JSON/Markdown/HTML/CSS)
  overrides: [
    {
      files: '*.md',
      options: { proseWrap: 'preserve' },
    },
  ],
}

export default config
