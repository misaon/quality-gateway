export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['common', 'react', 'cli', 'repo', 'deps', 'release'],
    ],
  },
}
