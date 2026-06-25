import { defineConfig, globalIgnores } from 'eslint/config'

export const common = defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/.cache/**',
    '**/*.min.js',
  ]),
])

export default common
