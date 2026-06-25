// Conventional Commits enforcement — https://commitlint.js.org
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Restrict scopes to our packages + cross-cutting areas.
    // An empty scope is still allowed (repo-wide changes).
    'scope-enum': [2, 'always', ['common', 'react', 'cli', 'repo', 'deps', 'release']],
  },
}
