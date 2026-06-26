import { afterEach, describe, expect, it, vi } from 'vitest'
import { run } from '../src/cli.js'

describe('run', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prints the version and returns 0', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const code = await run(['--version'])
    expect(code).toBe(0)
    expect(log).toHaveBeenCalledWith('0.1.0')
  })

  it('prints help and returns 0 when no command is given', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const code = await run([])
    expect(code).toBe(0)
    expect(log.mock.calls[0]?.[0]).toContain('Usage')
  })

  it('prints help and returns 0 with --help', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const code = await run(['--help'])
    expect(code).toBe(0)
    expect(log.mock.calls[0]?.[0]).toContain('Usage')
  })

  it('runs the init command and returns 0', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const code = await run(['init'])
    expect(code).toBe(0)
    expect(log).toHaveBeenCalledWith('quality-gateway init — not implemented yet.')
  })

  it('reports an unknown command and returns 1', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const code = await run(['bogus-command'])
    expect(code).toBe(1)
    expect(error).toHaveBeenCalledWith('Unknown command: bogus-command\n')
    expect(log).toHaveBeenCalled()
  })

  it('prefers --help over a given command', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const code = await run(['init', '--help'])
    expect(code).toBe(0)
    expect(log.mock.calls[0]?.[0]).toContain('Usage')
    expect(log).not.toHaveBeenCalledWith('quality-gateway init — not implemented yet.')
  })
})
