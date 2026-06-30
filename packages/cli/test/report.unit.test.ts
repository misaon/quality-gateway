import { describe, expect, it } from 'vitest'

import { CONTRACT_VERSION, type Issue, type RawResult, statusRank, toGateReport, type ToolReport, topRules, toToolReport } from '../src/commands/report.js'

const raw = (partial: Partial<RawResult>): RawResult => ({ exitCode: 0, missing: false, output: '', stdout: '', ...partial })
const issue = (partial: Partial<Issue>): Issue => ({ column: 1, file: 'a.ts', fixable: false, line: 2, message: 'm', rule: 'r', severity: 'error', ...partial })
const tool = (partial: Partial<ToolReport>): ToolReport => ({ command: 'c', detail: '', duration: 0, issues: [], name: 't', status: 'passed', ...partial })

describe('toToolReport', () => {
  it('carries the parsed issues and is failed when the tool exits non-zero with them', () => {
    const found = issue({})

    expect(toToolReport({ command: 'eslint', name: 'eslint', parse: () => [found] }, raw({ exitCode: 1 }), '/repo')).toEqual({ command: 'eslint', detail: '', issues: [found], name: 'eslint', status: 'failed' })
  })

  it('passes when the tool exits 0', () => {
    expect(toToolReport({ command: 'oxfmt', name: 'oxfmt', parse: () => [] }, raw({}), '/repo').status).toBe('passed')
  })

  it('is errored when it exits non-zero with no issues, capturing the first output line as detail', () => {
    const report = toToolReport({ command: 'tsc', name: 'tsc', parse: () => [] }, raw({ exitCode: 2, output: 'boom: it broke\nstack line' }), '/repo')

    expect(report).toMatchObject({ detail: 'boom: it broke', status: 'errored' })
  })

  it('is not-installed when the binary is missing, with no detail', () => {
    const report = toToolReport({ command: 'oxfmt', name: 'format', parse: () => [] }, raw({ exitCode: 1, missing: true, output: 'spawn oxfmt ENOENT' }), '/repo')

    expect(report).toMatchObject({ command: 'oxfmt', detail: '', status: 'not-installed' })
  })

  it('makes absolute issue paths relative to cwd, leaving relative paths intact', () => {
    const report = toToolReport({ command: 'eslint', name: 'eslint', parse: () => [issue({ file: '/repo/src/a.ts' }), issue({ file: 'src/b.ts' })] }, raw({ exitCode: 1 }), '/repo')

    expect(report.issues.map(found => found.file)).toEqual(['src/a.ts', 'src/b.ts'])
  })
})

describe('statusRank', () => {
  it('orders failed → errored → passed → not-installed', () => {
    const ranks = (['failed', 'errored', 'passed', 'not-installed'] as const).map(status => statusRank(status))
    const distinctRanks = new Set(ranks)

    expect(ranks).toEqual([...ranks].toSorted((left, right) => left - right))
    expect(distinctRanks.size).toBe(4)
  })
})

describe('toGateReport', () => {
  it('is ok only when every tool passed', () => {
    const pass = tool({ name: 'a' })
    const fail = tool({ name: 'b', status: 'failed' })

    expect(toGateReport([pass, pass], 0).ok).toBe(true)
    expect(toGateReport([pass, fail], 0).ok).toBe(false)
    expect(toGateReport([], 0).ok).toBe(true)
  })

  it('stamps the contract version and the elapsed duration', () => {
    const report = toGateReport([], 1500)

    expect(report.version).toBe(CONTRACT_VERSION)
    expect(report.duration).toBe(1500)
  })

  it('summarizes issue counts across tools by severity and how many are fixable', () => {
    const report = toGateReport([
      tool({ issues: [issue({ fixable: true, severity: 'error' }), issue({ severity: 'warning' })], name: 'eslint', status: 'failed' }),
      tool({ issues: [issue({ fixable: true, severity: 'error' })], name: 'tsc', status: 'failed' }),
    ], 0)

    expect(report.summary).toEqual({ errors: 2, fixable: 2, issues: 3, warnings: 1 })
  })
})

describe('topRules', () => {
  it('sorts most-frequent first and limits (the sort must reorder vs insertion order)', () => {
    const report = toGateReport([
      tool({ issues: [issue({ rule: 'b' }), issue({ rule: 'a' }), issue({ rule: 'a' })], name: 'eslint', status: 'failed' }),
      tool({ issues: [issue({ rule: 'a' }), issue({ rule: 'c' })], name: 'tsc', status: 'failed' }),
    ], 0)

    expect(topRules(report, 2)).toEqual([{ count: 3, rule: 'a' }, { count: 1, rule: 'b' }])
  })

  it('ignores empty rules', () => {
    const report = toGateReport([tool({ issues: [issue({ rule: '' }), issue({ rule: '' })], name: 'eslint', status: 'failed' })], 0)

    expect(topRules(report, 5)).toEqual([])
  })
})
