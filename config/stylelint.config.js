export default {
  extends: [
    'stylelint-config-recommended', // Base recommended rules
    'stylelint-config-sass-guidelines', // Sass-specific best practices
    'stylelint-config-prettier', // Prevent conflicts with Prettier
  ],
  plugins: [
    'stylelint-scss', // Enhanced SCSS support
    'stylelint-order', // Enforce property order
  ],
  overrides: [
    {
      files: ['**/*.scss'],
      customSyntax: 'postcss-scss', // Enable SCSS syntax parsing
    },
  ],
  rules: {
    indentation: 2, // Enforce consistent indentation
    'string-quotes': 'double', // Use double quotes for consistency
    'max-line-length': 100, // Limit line length for readability
    'color-hex-case': 'lower', // Enforce lowercase hex values
    'color-hex-length': 'short', // Prefer short hex values where possible
    'selector-max-id': 0, // Disallow ID selectors
    'selector-max-universal': 0, // Disallow universal selectors
    'selector-max-specificity': '0,3,0', // Limit selector specificity
    'selector-max-type': 2, // Limit the number of type selectors
    'block-no-empty': true, // Disallow empty rule blocks
    'no-duplicate-selectors': true, // Prevent duplicate selectors
    'no-descending-specificity': null, // Disable specificity warnings
    'order/order': ['custom-properties', 'declarations'],
    'order/properties-alphabetical-order': true, // Enforce alphabetical ordering of properties
    'declaration-no-important': true, // Disallow `!important`
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'mixin',
          'include',
        ],
      },
    ],
    'scss/at-import-no-partial-leading-underscore': true, // Prevent leading underscores in partial imports
    'scss/dollar-variable-pattern': '^[_a-z]+[a-zA-Z0-9-]*$', // Enforce a consistent naming convention for variables
    'scss/selector-no-redundant-nesting-selector': true, // Disallow redundant nesting selectors
    'max-nesting-depth': 2, // Restrict nesting depth for maintainability
  },
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/.history/**',
    '**/.vscode/**',
    '**/.idea/**',
    '**/.git/**',
    '**/*.config.ts',
    '**/jest.config.ts',
    '**/*_del',
  ],
};
