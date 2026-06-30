import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      include: [
        'packages/cli/src/cli.ts',
        'packages/cli/src/frameworks.ts',
        'packages/cli/src/membership.ts',
        'packages/cli/src/commands/adapters.ts',
        'packages/cli/src/commands/gate.ts',
        'packages/cli/src/commands/render.ts',
        'packages/cli/src/commands/report.ts',
        'packages/cli/src/commands/scaffold.ts',
        'packages/cli/src/commands/workspace.ts',
      ],
      provider: 'v8',
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    projects: ['packages/*'],
  },
})
