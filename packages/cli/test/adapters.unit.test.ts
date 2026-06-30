import { describe, expect, it } from 'vitest'

import { noIssues, parseCspell, parseEslint, parseKnip, parseOxfmt, parseTsc } from '../src/commands/adapters.js'

import type { RawResult } from '../src/commands/report.js'

const raw = (partial: Partial<RawResult>): RawResult => ({ exitCode: 0, missing: false, output: '', stdout: '', ...partial })

describe('parseEslint', () => {
  it('maps eslint json messages to issues and marks fixable ones', () => {
    const stdout = JSON.stringify([
      { filePath: '/p/a.ts', messages: [{ column: 5, fix: { text: ';' }, line: 3, message: 'no x', ruleId: 'no-x', severity: 2 }] },
    ])

    expect(parseEslint(raw({ stdout }))).toEqual([
      { column: 5, file: '/p/a.ts', fixable: true, line: 3, message: 'no x', rule: 'no-x', severity: 'error' },
    ])
  })

  it('maps severity 1 to warning, null ruleId to empty rule, and no fix to not fixable', () => {
    const stdout = '[{"filePath":"a.ts","messages":[{"column":1,"line":1,"message":"w","ruleId":null,"severity":1}]}]'

    expect(parseEslint(raw({ stdout }))[0]).toMatchObject({ fixable: false, rule: '', severity: 'warning' })
  })

  it('treats blank output as no issues', () => {
    expect(parseEslint(raw({ stdout: '\n' }))).toEqual([])
  })

  it('treats malformed JSON as no issues (never throws)', () => {
    expect(parseEslint(raw({ stdout: '{not json' }))).toEqual([])
  })

  it('defaults a missing line/column to 0', () => {
    const stdout = '[{"filePath":"a.ts","messages":[{"message":"File ignored","ruleId":null,"severity":1}]}]'

    expect(parseEslint(raw({ stdout }))[0]).toMatchObject({ column: 0, line: 0 })
  })
})

describe('parseTsc', () => {
  it('parses pretty-false diagnostics', () => {
    const output = 'src/a.ts(12,53): error TS2322: Type mismatch.\nunrelated line'

    expect(parseTsc(raw({ output }))).toEqual([
      { column: 53, file: 'src/a.ts', fixable: false, line: 12, message: 'Type mismatch.', rule: 'TS2322', severity: 'error' },
    ])
  })

  it('returns [] when there are no diagnostics', () => {
    expect(parseTsc(raw({ output: 'all good' }))).toEqual([])
  })

  it('handles CRLF line endings (Windows)', () => {
    const output = 'src/a.ts(12,53): error TS2322: Type mismatch.\r\nunrelated\r\n'

    expect(parseTsc(raw({ output }))).toEqual([
      { column: 53, file: 'src/a.ts', fixable: false, line: 12, message: 'Type mismatch.', rule: 'TS2322', severity: 'error' },
    ])
  })
})

describe('parseCspell', () => {
  it('parses unknown-word lines', () => {
    const output = 'README.md:10:33 - Unknown word (typo)\nCSpell: Files checked: 1'

    expect(parseCspell(raw({ output }))).toEqual([
      { column: 33, file: 'README.md', fixable: false, line: 10, message: 'Unknown word (typo)', rule: 'spell', severity: 'error' },
    ])
  })
})

describe('parseOxfmt', () => {
  it('returns [] when oxfmt exits 0, even if the output has file lines', () => {
    expect(parseOxfmt(raw({ exitCode: 0, output: '/p/x.json (5ms)' }))).toEqual([])
  })

  it('lists unformatted files (fixable) when oxfmt exits non-zero', () => {
    const output = 'Checking formatting...\n\n/p/bad.json (47ms)\n\nFormat issues found in above 1 files.'

    expect(parseOxfmt(raw({ exitCode: 1, output }))).toEqual([
      { column: 0, file: '/p/bad.json', fixable: true, line: 0, message: 'File is not formatted', rule: 'format', severity: 'error' },
    ])
  })

  it('parses unformatted files regardless of the timing format (oxfmt version drift)', () => {
    const output = '/p/a.json (1.2s)\n/p/b.css (42)'

    expect(parseOxfmt(raw({ exitCode: 1, output }))).toEqual([
      { column: 0, file: '/p/a.json', fixable: true, line: 0, message: 'File is not formatted', rule: 'format', severity: 'error' },
      { column: 0, file: '/p/b.css', fixable: true, line: 0, message: 'File is not formatted', rule: 'format', severity: 'error' },
    ])
  })
})

describe('parseKnip', () => {
  it('flattens each file\'s issue-type arrays into issues', () => {
    const stdout = '{"issues":[{"file":"src/a.ts","exports":[{"name":"unusedFn","line":9,"col":1}],"dependencies":[{"name":"lodash"}]}]}'

    expect(parseKnip(raw({ stdout }))).toEqual([
      { column: 1, file: 'src/a.ts', fixable: false, line: 9, message: 'Unused exports: unusedFn', rule: 'knip/exports', severity: 'error' },
      { column: 0, file: 'src/a.ts', fixable: false, line: 0, message: 'Unused dependencies: lodash', rule: 'knip/dependencies', severity: 'error' },
    ])
  })

  it('treats blank output as no issues', () => {
    expect(parseKnip(raw({ stdout: '\n' }))).toEqual([])
  })

  it('treats malformed JSON and a missing issues array as no issues', () => {
    expect(parseKnip(raw({ stdout: '{oops' }))).toEqual([])
    expect(parseKnip(raw({ stdout: '{}' }))).toEqual([])
  })

  it('ignores knip metadata arrays such as owners', () => {
    const stdout = '{"issues":[{"file":"a.ts","owners":[{"name":"@team/x"}],"exports":[{"name":"foo"}]}]}'

    expect(parseKnip(raw({ stdout }))).toEqual([
      { column: 0, file: 'a.ts', fixable: false, line: 0, message: 'Unused exports: foo', rule: 'knip/exports', severity: 'error' },
    ])
  })

  it('joins a duplicate group (array items) into one issue', () => {
    const stdout = '{"issues":[{"file":"a.ts","duplicates":[[{"name":"a","line":1,"col":2},{"name":"b"}]]}]}'

    expect(parseKnip(raw({ stdout }))).toEqual([
      { column: 2, file: 'a.ts', fixable: false, line: 1, message: 'Unused duplicates: a, b', rule: 'knip/duplicates', severity: 'error' },
    ])
  })
})

describe('noIssues', () => {
  it('always returns an empty list', () => {
    expect(noIssues(raw({ exitCode: 1, output: 'whatever' }))).toEqual([])
  })
})
