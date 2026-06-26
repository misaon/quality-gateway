#!/usr/bin/env node
import process from 'node:process'
import { run } from './cli.js'

try {
  process.exitCode = await run(process.argv.slice(2))
} catch (error: unknown) {
  console.error(error)
  process.exitCode = 1
}
