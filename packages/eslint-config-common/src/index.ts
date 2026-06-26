import { defineConfig, globalIgnores } from 'eslint/config'
import unicorn from 'eslint-plugin-unicorn'

export const common = defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/.cache/**',
    '**/*.min.js',
  ]),
  unicorn.configs.recommended,
  {
    name: '@misaon/common',
    rules: {
      'unicorn/name-replacements': 'off',
    },
  },
])

export default common
