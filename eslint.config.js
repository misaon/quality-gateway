// The monorepo lints itself with its own config ("dogfooding").
// Run `pnpm build` first — this imports the compiled `dist/` of the workspace
// package below. Prettier runs as an ESLint rule, so formatting problems are
// underlined in the editor and fixable (Alt+Enter / fix-on-save).
import common from '@misaon/eslint-config-common'
import tsParser from '@typescript-eslint/parser'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettierRecommended from 'eslint-plugin-prettier/recommended'

export default defineConfig([
  globalIgnores(['**/dist/**', '**/node_modules/**', '**/coverage/**']),
  common,
  // Parse TypeScript so ESLint (and the Prettier rule) can read our .ts sources.
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: { parser: tsParser },
  },
  // Prettier as an ESLint rule (+ disables conflicting rules). MUST be last.
  prettierRecommended,
])
