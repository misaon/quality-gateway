import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const run = promisify(execFile)
const cli = fileURLToPath(new URL('../dist/index.js', import.meta.url))

describe('quality-gateway CLI', () => {
  it('prints the version', async () => {
    const { stdout } = await run('node', [cli, '--version'])
    expect(stdout.trim()).toBe('0.1.0')
  })

  it('prints help with no command', async () => {
    const { stdout } = await run('node', [cli, '--help'])
    expect(stdout).toContain('Usage')
  })

  it('exits non-zero on an unknown command', async () => {
    await expect(run('node', [cli, 'bogus-command'])).rejects.toMatchObject({
      code: 1,
    })
  })
})
