import { eslint } from '@misaon/quality-gateway/eslint'
import n from 'eslint-plugin-n'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  ...await eslint(),
  {
    // The CLI bin's source carries the hashbang (tsc preserves it into dist/index.js, the published bin).
    // `n` is defined here so the rule resolves regardless of the package's detected layer (it's on the react layer now that it depends on React for Ink).
    files: ['packages/cli/src/index.ts'],
    name: 'repo/cli-bin-hashbang',
    plugins: { n },
    rules: { 'n/hashbang': ['error', { additionalExecutables: ['**/index.ts'] }] },
  },
  {
    // The CLI's own Ink (React) views — lint hooks here without pulling web-React rules that don't fit a terminal renderer.
    files: ['packages/cli/src/ui/**/*.tsx'],
    name: 'repo/cli-ink-tsx',
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Fights natural inline JSX text such as `· v{version}`.
      '@stylistic/jsx-one-expression-per-line': 'off',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      // Components conditionally render nothing (a bare `return`) alongside returning JSX — expected in React, not an inconsistency.
      'sonarjs/no-inconsistent-returns': 'off',
      // React props are never mutated, so the readonly-props rule is just noise on components.
      'sonarjs/prefer-read-only-props': 'off',
    },
  },
]
