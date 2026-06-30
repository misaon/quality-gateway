import { eslint } from '@misaon/quality-gateway/eslint'

export default [
  ...await eslint(),
  {
    // The CLI bin's source carries the hashbang (tsc preserves it into dist/index.js, the published bin).
    files: ['packages/cli/src/index.ts'],
    name: 'repo/cli-bin-hashbang',
    rules: { 'n/hashbang': ['error', { additionalExecutables: ['**/index.ts'] }] },
  },
]
