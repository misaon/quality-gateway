import type { KnipConfig } from 'knip'

export default {
  rules: { duplicates: 'off' },
  workspaces: {
    '.': { entry: ['quality-gateway.config.ts'] },
    'packages/cli': {
      entry: ['src/index.ts', 'src/config.ts', 'src/eslint.ts', 'src/oxfmt.ts', 'test/**/*.test.ts'],
    },
  },
} satisfies KnipConfig
