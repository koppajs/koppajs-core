export default {
  '**/*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '**/*.{scss,css}': ['stylelint --fix'],
  '**/*.{json,md,yaml}': ['prettier --write'],
};
