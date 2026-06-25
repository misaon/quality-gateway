import { defineConfig, globalIgnores } from 'eslint/config'

/** Shared base config extended by every `@misaon/eslint-config-*` package. */
export const common = defineConfig([
  globalIgnores(['**/dist/**', '**/coverage/**', '**/node_modules/**', '**/.cache/**', '**/*.min.js']),
  // TODO: shared base rules
])

export default common
