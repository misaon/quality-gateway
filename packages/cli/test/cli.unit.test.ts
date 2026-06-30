import { describe, expect, it } from 'vitest'

import { main } from '../src/cli.js'
import { init } from '../src/commands/init.js'

describe('main command', () => {
  it('is named quality-gateway with an init subcommand', () => {
    expect(main.meta).toMatchObject({ name: 'quality-gateway' })
    expect(main.subCommands).toHaveProperty('init')
  })
})

describe('init command', () => {
  it('declares its name and description', () => {
    expect(init.meta).toMatchObject({
      description: 'Detect your stack and wire up the matching @misaon quality configs',
      name: 'init',
    })
  })
})
