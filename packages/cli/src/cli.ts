import { defineCommand } from 'citty'

import { check } from './commands/check.js'
import { fix } from './commands/fix.js'
import { init } from './commands/init.js'
import { description, version } from './package-info.js'

export const main = defineCommand({
  meta: {
    description,
    name: 'quality-gateway',
    version,
  },
  subCommands: { check, fix, init },
})
