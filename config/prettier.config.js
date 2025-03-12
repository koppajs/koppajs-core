export default {
  semi: true, // Use semicolons at the end of statements
  singleQuote: true, // Prefer single quotes over double quotes
  printWidth: 100, // Set maximum line width to 100 characters
  trailingComma: 'all', // Add trailing commas everywhere (better for diffs)
  bracketSpacing: true, // Add spaces inside object brackets
  arrowParens: 'always', // Always use parentheses around arrow function parameters
  tabWidth: 2, // Use 2 spaces per indentation level
  useTabs: false, // Use spaces instead of tabs
  proseWrap: 'preserve', // Respect default wrapping behavior
  endOfLine: 'lf', // Use LF instead of CRLF (for better cross-platform support)
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80, // More compact formatting for JSON files
      },
    },
  ],
};
