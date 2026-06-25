#!/usr/bin/env node
import process from 'node:process'
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

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  })

  if (values.version) {
    console.log(VERSION)
    return
  }

  const command = positionals[0]

  if (command === undefined || values.help === true) {
    console.log(HELP)
    return
  }

  switch (command) {
    case 'init':
      await runInit()
      break
    default:
      console.error(`Unknown command: ${command}\n`)
      console.log(HELP)
      process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
