/**
 * This is a commitlint configuration file that enforces specific
 * rules on commit messages to maintain a consistent format and
 * a cleaner git history. By extending the "@commitlint/config-conventional",
 * we start with a standard set of rules, then override or add our own.
 */
export default {
  // "extends" tells commitlint to load the recommended settings from
  // the @commitlint/config-conventional package.
  extends: ['@commitlint/config-conventional'],

  // "rules" allows us to specify or override commitlint rules.
  rules: {
    /**
     * "header-max-length" sets the maximum length of the commit header (subject line).
     * Level (1: warning, 2: error) is "2" (error), which means commitlint will fail if
     * this rule is violated.
     * "always" means it always checks.
     * The value "50" is the maximum number of characters allowed in the subject line.
     */
    'header-max-length': [2, 'always', 72],

    /**
     * "body-max-line-length" sets the maximum line length for the commit body.
     * The body is where you explain the reasoning behind the commit in detail.
     * We set this to 72 characters per line, which is a commonly accepted convention
     * for better readability in various tools.
     */
    'body-max-line-length': [2, 'always', 72],

    /**
     * "footer-max-line-length" sets the maximum line length for the commit footer.
     * The footer may include references to issues or any additional meta-information.
     * Here, we also use 72 characters for consistency with the body.
     */
    'footer-max-line-length': [2, 'always', 72],

    /**
     * "subject-case" defines the case style for the commit subject (header).
     * We use "sentence-case", meaning the first character should be uppercase,
     * and the rest should generally follow standard sentence casing
     * (e.g., "Feat: Add a new user login flow").
     */
    'subject-case': [2, 'always', 'sentence-case'],

    /**
     * "type-enum" restricts the allowed "type" in the commit subject. Each commit
     * message must start with one of the types listed here (e.g., "feat", "fix").
     * This ensures your commit history is more organized and consistent.
     *
     * Below are six generic types that cover most development needs:
     * 1. feat     - A new feature or functionality
     * 2. fix      - A bug fix or patch
     * 3. docs     - Documentation-only changes (README, inline docs, etc.)
     * 4. refactor - Code changes that neither fix a bug nor add a feature (e.g. reorganizing code)
     * 5. test     - Adding or updating tests
     * 6. chore    - Routine tasks like build processes, package updates, config changes, etc.
     */
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'refactor', 'test', 'chore']],
  },
};
