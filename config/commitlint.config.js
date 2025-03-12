export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [2, 'always', 'sentence-case'], // Enforce sentence-case in commit messages
    'type-enum': [
      2,
      'always',
      [
        'feat', // A new feature
        'fix', // A bug fix
        'docs', // Documentation changes
        'style', // Formatting changes (no logic)
        'refactor', // Code restructuring without functional changes
        'perf', // Performance improvements
        'test', // Adding or fixing tests
        'build', // Changes that affect build process
        'ci', // CI/CD-related changes
        'chore', // Routine tasks (e.g., dependency updates)
        'revert', // Reverting commits
        'ui', // UI & styling changes
        'hotfix', // Critical fix in production
        'security', // Security-related changes
        'add', // Adding dependencies
        'remove', // Removing dependencies or code
        'merge', // Merging branches
        'improve', // General improvements
        'deploy', // Deploying a project
        'pin', // Pin dependencies
      ],
    ],
  },
};
