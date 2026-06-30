import path from 'node:path'

import { defineCommand } from 'citty'

import { fixTools } from './gate.js'
import { runAndReport } from './runner.js'

export const fix = defineCommand({
  args: {
    dir: { default: '.', description: 'Target project directory', type: 'string' },
  },
  meta: {
    description: 'Auto-fix with eslint --fix and the formatter, in parallel',
    name: 'fix',
  },
  async run({ args }) {
    await runAndReport(fixTools(), path.resolve(args.dir), false)
  },
})
