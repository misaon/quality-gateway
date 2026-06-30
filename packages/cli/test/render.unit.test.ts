import { colors } from 'consola/utils'
import stringWidth from 'string-width'
import { describe, expect, it } from 'vitest'

import { detailRows, formatCount, formatDuration, ruleDocumentUrl, titleFor } from '../src/commands/render.js'
import { type Issue, toGateReport, type ToolReport } from '../src/commands/report.js'
import { renderDetails } from '../src/commands/runner.js'

const issue = (partial: Partial<Issue>): Issue => ({ column: 0, file: 'f', fixable: false, line: 0, message: 'm', rule: '', severity: 'error', ...partial })
const tool = (partial: Partial<ToolReport>): ToolReport => ({ command: 'c', detail: '', duration: 0, issues: [], name: 't', status: 'passed', ...partial })

/** Run `body` with `process.stdout.isTTY` forced, so OSC 8 emission is deterministic regardless of where the suite runs. */
function withTTY(isTTY: boolean, body: () => string): string {
  const wasTTY = process.stdout.isTTY

  Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: isTTY })

  try {
    return body()
  } finally {
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: wasTTY })
  }
}

describe('formatCount', () => {
  it('adds space thousands separators', () => {
    expect(formatCount(7)).toBe('7')
    expect(formatCount(115_105)).toBe('115 105')
  })
})

describe('ruleDocumentUrl', () => {
  it('maps each plugin prefix to its docs and core rules to eslint.org', () => {
    expect(ruleDocumentUrl('perfectionist/sort-interfaces')).toBe('https://perfectionist.dev/rules/sort-interfaces.html')
    expect(ruleDocumentUrl('@stylistic/semi')).toBe('https://eslint.style/rules/semi')
    expect(ruleDocumentUrl('@typescript-eslint/no-deprecated')).toBe('https://typescript-eslint.io/rules/no-deprecated')
    expect(ruleDocumentUrl('unicorn/no-null')).toBe('https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-null.md')
    expect(ruleDocumentUrl('sonarjs/no-nested-switch')).toBe('https://github.com/SonarSource/eslint-plugin-sonarjs/blob/master/docs/rules/no-nested-switch.md')
    expect(ruleDocumentUrl('regexp/no-dupe-disjunctions')).toBe('https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-dupe-disjunctions.html')
    expect(ruleDocumentUrl('n/no-sync')).toBe('https://github.com/eslint-community/eslint-plugin-n/blob/master/docs/rules/no-sync.md')
    expect(ruleDocumentUrl('eqeqeq')).toBe('https://eslint.org/docs/latest/rules/eqeqeq')
  })

  it('has no URL for synthetic, tsc, knip, or unnamed rules', () => {
    expect(ruleDocumentUrl('format')).toBeUndefined()
    expect(ruleDocumentUrl('spell')).toBeUndefined()
    expect(ruleDocumentUrl('knip/exports')).toBeUndefined()
    expect(ruleDocumentUrl('TS2322')).toBeUndefined()
    expect(ruleDocumentUrl('')).toBeUndefined()
  })

  it('only treats an exact TS-code as tsc — a rule that merely contains one is still linked', () => {
    expect(ruleDocumentUrl('TS123x')).toBe('https://eslint.org/docs/latest/rules/TS123x')
    expect(ruleDocumentUrl('xTS123')).toBe('https://eslint.org/docs/latest/rules/xTS123')
  })
})

describe('formatDuration', () => {
  it('formats sub-second, second, and minute ranges (with their boundaries)', () => {
    expect(formatDuration(999)).toBe('999ms')
    expect(formatDuration(1000)).toBe('1.0s')
    expect(formatDuration(1500)).toBe('1.5s')
    expect(formatDuration(60_000)).toBe('1m 0s')
    expect(formatDuration(119_000)).toBe('1m 59s')
  })
})

describe('titleFor', () => {
  it('is just the name when the tool passed', () => {
    expect(titleFor(tool({ name: 'eslint' }))).toBe('eslint')
  })

  it('appends a pluralized, human-readable issue count when failed', () => {
    const one = [issue({})]
    const two = [issue({}), issue({})]

    expect(titleFor(tool({ issues: one, name: 'eslint', status: 'failed' }))).toBe(`eslint — ${colors.bold('1')} issue`)
    expect(titleFor(tool({ issues: two, name: 'tsc', status: 'failed' }))).toBe(`tsc — ${colors.bold('2')} issues`)
  })

  it('says could not run when a tool errored', () => {
    expect(titleFor(tool({ name: 'tsc', status: 'errored' }))).toBe('tsc — could not run')
  })

  it('says not installed when the binary is missing', () => {
    expect(titleFor(tool({ name: 'oxfmt', status: 'not-installed' }))).toBe('oxfmt — not installed')
  })
})

describe('detailRows', () => {
  it('flattens all tools sorted by file, line, column, keeping the raw position parts', () => {
    const report = toGateReport([
      tool({ issues: [issue({ column: 9, file: 'b.ts', line: 1, message: 'b1', rule: 'rb' }), issue({ column: 9, file: 'a.ts', line: 2, message: 'a2', rule: 'ra2' })], name: 'eslint', status: 'failed' }),
      tool({ issues: [issue({ column: 2, file: 'a.ts', line: 5, message: 'a5b', rule: 'ra5b' }), issue({ column: 1, file: 'a.ts', line: 5, message: 'a5a', rule: 'ra5a' })], name: 'tsc', status: 'failed' }),
    ], 0)

    expect(detailRows(report)).toEqual([
      { column: 9, file: 'a.ts', line: 2, message: 'a2', rule: 'ra2', tool: 'eslint' },
      { column: 1, file: 'a.ts', line: 5, message: 'a5a', rule: 'ra5a', tool: 'tsc' },
      { column: 2, file: 'a.ts', line: 5, message: 'a5b', rule: 'ra5b', tool: 'tsc' },
      { column: 9, file: 'b.ts', line: 1, message: 'b1', rule: 'rb', tool: 'eslint' },
    ])
  })

  it('keeps an issue that has no line (rendered later as just the path)', () => {
    const report = toGateReport([tool({ issues: [issue({ file: 'x.md', line: 0, message: 'typo', rule: '' })], name: 'spell', status: 'failed' })], 0)

    expect(detailRows(report)).toEqual([{ column: 0, file: 'x.md', line: 0, message: 'typo', rule: '', tool: 'spell' }])
  })

  it('is empty when there are no issues', () => {
    const report = toGateReport([tool({ name: 'eslint' })], 0)

    expect(detailRows(report)).toEqual([])
  })

  it('orders ties at the same position by tool, not by rule', () => {
    // The rules sort opposite to the tool names, so only a tool tiebreak (not rule) can decide the order.
    const report = toGateReport([
      tool({ issues: [issue({ column: 1, file: 'a.ts', line: 1, rule: 'zzz' })], name: 'eslint', status: 'failed' }),
      tool({ issues: [issue({ column: 1, file: 'a.ts', line: 1, rule: 'aaa' })], name: 'tsc', status: 'failed' }),
    ], 0)

    expect(detailRows(report).map(row => row.tool)).toEqual(['eslint', 'tsc'])
  })

  it('orders same-tool ties at the same position by rule', () => {
    const report = toGateReport([
      tool({ issues: [issue({ column: 1, file: 'a.ts', line: 1, rule: 'rb' }), issue({ column: 1, file: 'a.ts', line: 1, rule: 'ra' })], name: 'eslint', status: 'failed' }),
    ], 0)

    expect(detailRows(report).map(row => row.rule)).toEqual(['ra', 'rb'])
  })
})

describe('renderDetails', () => {
  it('strips message backticks and keeps every row column-aligned (a markdown writer dropping backticks would shift the row left)', () => {
    const report = toGateReport([tool({
      issues: [
        issue({ column: 1, file: 'a.ts', line: 1, message: 'Short.', rule: 'r' }),
        issue({ column: 2, file: 'a.ts', line: 2, message: 'The filename `next-env.d.ts` should be named `next-environment.d.ts`.', rule: 'unicorn/name-replacements' }),
      ],
      name: 'eslint',
      status: 'failed',
    })], 0)

    const out = renderDetails(report, 80, '/repo')

    expect(out).not.toContain('`')
    // Filter by the literal 2-space indent (color-agnostic): file headers/blank lines never start with spaces, but every issue row does — a regex on the first glyph breaks once ANSI colors are on (e.g. in CI).
    const detailLines = out.split('\n').filter(line => line.startsWith('  '))
    const ruleStartColumns = detailLines.map((line) => {
      const lastColumn = line.split(/\s{2,}/v).findLast(Boolean) ?? ''

      return stringWidth(line) - stringWidth(lastColumn)
    })
    const uniqueStarts = new Set(ruleStartColumns)

    expect(uniqueStarts.size).toBe(1)
  })

  it('groups issues under each file header (blank-line separated) and keeps the tool column', () => {
    const report = toGateReport([tool({
      issues: [issue({ column: 1, file: 'a.ts', line: 1, message: 'm', rule: 'r' }), issue({ column: 1, file: 'b.ts', line: 1, message: 'm', rule: 'r' })],
      name: 'eslint',
      status: 'failed',
    })], 0)

    const lines = renderDetails(report, 80, '/repo').split('\n')

    expect(lines).toHaveLength(5)
    expect(lines[0]).toContain('a.ts')
    expect(lines[1]).toContain('eslint')
    expect(lines[2]).toBe('')
    expect(lines[3]).toContain('b.ts')
  })

  it('caps the list at the limit and points to --all / --json for the rest', () => {
    const issues = [issue({ file: 'a.ts', line: 1 }), issue({ file: 'b.ts', line: 2 }), issue({ file: 'c.ts', line: 3 })]
    const report = toGateReport([tool({ issues, name: 'eslint', status: 'failed' })], 0)

    const out = renderDetails(report, 120, '/repo', 2)

    expect(out).toContain('… and 1 more')
    expect(out).toContain('--all')
    expect(out).toContain('--json')
    expect(out).not.toContain('c.ts')
  })

  it('hyperlinks the file header and the position to the exact line, and the rule to its docs, on a TTY', () => {
    const report = toGateReport([tool({ issues: [issue({ column: 5, file: 'a.ts', line: 12, message: 'm', rule: 'perfectionist/sort-objects' })], name: 'eslint', status: 'failed' })], 0)
    const out = withTTY(true, () => renderDetails(report, 120, '/repo'))

    expect(out).toContain('https://perfectionist.dev/rules/sort-objects.html')
    expect(out).toContain('file:///repo/a.ts#12')
  })
})
