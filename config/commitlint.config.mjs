export default {
  extends: ['@commitlint/config-conventional'],

  // Optional: custom rules (e.g. header length)
  rules: {
    'header-max-length': [2, 'always', 72],

    // Optional: extend allowed commit types
    // 'type-enum': [2, 'always', [
    //   'build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf',
    //   'refactor', 'revert', 'style', 'test'
    // ]]
  },
}
