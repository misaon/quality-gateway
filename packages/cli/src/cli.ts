import { parseArgs } from 'node:util'
import { runInit } from './commands/init.js'

const VERSION = '0.1.0'

const HELP = `quality-gateway — wire @misaon quality configs into your project

Usage:
  quality-gateway <command> [options]
  qg <command> [options]

Commands:
  init            Detect your stack and set up the matching @misaon ESLint config

Options:
  -h, --help      Show this help
  -v, --version   Show version
`

export async function run(args: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  })

  if (values.version === true) {
    console.log(VERSION)
    return 0
  }

  const command = positionals[0]

  if (command === undefined || values.help === true) {
    console.log(HELP)
    return 0
  }

  switch (command) {
    case 'init':
      await runInit()
      return 0
    default:
      console.error(`Unknown command: ${command}\n`)
      console.log(HELP)
      return 1
  }
}
