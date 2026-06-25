// Lints the monorepo with its own config — run `pnpm build` first.
import common from '@misaon/eslint-config-common'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['**/dist/**', '**/node_modules/**', '**/coverage/**']),
  common,
])
