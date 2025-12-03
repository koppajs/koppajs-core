export default {
  extends: ['@commitlint/config-conventional'],
  // Optional: eigene Regeln, z.B. Header-Länge:
  rules: {
    'header-max-length': [2, 'always', 72],
    // eigene Typen, falls du z.B. "plugin" usw. erlauben willst:
    // 'type-enum': [2, 'always', [
    //   'build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test'
    // ]]
  },
}
