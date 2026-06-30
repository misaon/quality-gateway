import { describe, expect, it } from 'vitest'

import { runChecks } from '../src/commands/run-checks.js'

import type { Tool } from '../src/commands/gate.js'

describe('runChecks', () => {
  it('reports ok when every tool exits 0', async () => {
    const report = await runChecks([{ args: ['-e', ''], command: 'node', name: 'noop', parse: () => [] }], process.cwd())

    expect(report.ok).toBe(true)
    expect(report.tools).toHaveLength(1)
  })

  it('reports not ok when any tool exits non-zero', async () => {
    const report = await runChecks(
      [
        { args: ['-e', ''], command: 'node', name: 'ok', parse: () => [] },
        { args: ['-e', 'process.exit(1)'], command: 'node', name: 'boom', parse: () => [] },
      ],
      process.cwd(),
    )

    expect(report.ok).toBe(false)
    expect(report.tools.find(tool => tool.name === 'boom')?.status).toBe('errored')
  })

  it('feeds each tool the captured output via its adapter', async () => {
    let captured = ''
    const report = await runChecks(
      [{
        args: ['-e', 'console.log("hit")'],
        command: 'node',
        name: 'probe',
        parse: (result) => {
          captured = result.stdout

          return []
        },
      }],
      process.cwd(),
    )

    expect(captured.trim()).toBe('hit')
    expect(report.tools).toHaveLength(1)
  })

  it('flags a missing binary as not-installed (ENOENT cause), not a generic failure', async () => {
    const report = await runChecks([{ args: [], command: 'qg-nonexistent-binary', name: 'missing', parse: () => [] }], process.cwd())

    expect(report.ok).toBe(false)
    expect(report.tools[0]?.status).toBe('not-installed')
  })

  it('emits onToolStart and onToolDone for every tool', async () => {
    const started: string[] = []
    const done: string[] = []

    await runChecks(
      [{ args: ['-e', ''], command: 'node', name: 'probe', parse: () => [] }] satisfies Tool[],
      process.cwd(),
      {
        onToolDone: (report) => { done.push(report.name) },
        onToolStart: (tool) => { started.push(tool.name) },
      },
    )

    expect(started).toEqual(['probe'])
    expect(done).toEqual(['probe'])
  })
})
