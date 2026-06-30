import { describe, expect, it } from 'vitest'

import { noIssues, parseCspell, parseEslint, parseKnip, parseOxfmt, parseTsc } from '../src/commands/adapters.js'
import { checkTools, detectTsMode, fixTools, gateToolInfo, typecheckTools } from '../src/commands/gate.js'

describe('detectTsMode', () => {
  it('is none when there is no tsconfig', () => {
    expect(detectTsMode(undefined)).toBe('none')
  })

  it('is references for a solution-style tsconfig (parsing JSONC)', () => {
    expect(detectTsMode('{ "files": [], /* refs */ "references": [{ "path": "a" }], }')).toBe('references')
  })

  it('is single for a normal tsconfig', () => {
    expect(detectTsMode('{ "include": ["src"] }')).toBe('single')
  })

  it('is single for an empty references array', () => {
    expect(detectTsMode('{ "references": [] }')).toBe('single')
  })

  it('falls back to single when the tsconfig is empty or unparseable', () => {
    expect(detectTsMode('')).toBe('single')
  })
})

describe('typecheckTools', () => {
  it('is empty for a single-package project with no tsconfig', () => {
    expect(typecheckTools(undefined, 'none')).toEqual([])
  })

  it('is a single tsc --noEmit for a single tsconfig', () => {
    expect(typecheckTools(undefined, 'single')).toEqual([
      { args: ['--noEmit', '--pretty', 'false', '--incremental', '--tsBuildInfoFile', 'node_modules/.cache/tsc/root.tsbuildinfo'], command: 'tsc', name: 'typecheck', parse: parseTsc },
    ])
  })

  it('is tsc -b (build mode) for a references tsconfig', () => {
    expect(typecheckTools(undefined, 'references')).toEqual([
      { args: ['-b', '--pretty', 'false'], command: 'tsc', name: 'typecheck', parse: parseTsc },
    ])
  })

  it('is one reference-independent tsc --noEmit per package, skipping packages without a tsconfig', () => {
    const tools = typecheckTools([
      { directory: 'apps/web', tsconfig: 'apps/web/tsconfig.json' },
      { directory: 'packages/docs', tsconfig: undefined },
      { directory: 'packages/api', tsconfig: 'packages/api/tsconfig.json' },
    ], 'none')

    expect(tools).toEqual([
      { args: ['-p', 'apps/web/tsconfig.json', '--noEmit', '--pretty', 'false', '--incremental', '--tsBuildInfoFile', 'node_modules/.cache/tsc/apps-web.tsbuildinfo'], command: 'tsc', name: 'typecheck (apps/web)', parse: parseTsc },
      { args: ['-p', 'packages/api/tsconfig.json', '--noEmit', '--pretty', 'false', '--incremental', '--tsBuildInfoFile', 'node_modules/.cache/tsc/packages-api.tsbuildinfo'], command: 'tsc', name: 'typecheck (packages/api)', parse: parseTsc },
    ])
  })
})

describe('checkTools', () => {
  it('runs only eslint and format with no typecheck, spell or knip', () => {
    expect(checkTools({ hasCspell: false, hasKnip: false, typecheck: [] })).toEqual([
      { args: ['.', '--format', 'json', '--max-warnings', '0', '--cache', '--cache-location', 'node_modules/.cache/eslint/', '--cache-strategy', 'content'], command: 'eslint', name: 'eslint', parse: parseEslint },
      { args: ['--check', '.'], command: 'oxfmt', name: 'format', parse: parseOxfmt },
    ])
  })

  it('adds spell only when a cspell config is present', () => {
    expect(checkTools({ hasCspell: true, hasKnip: false, typecheck: [] }).at(-1)).toEqual(
      { args: ['--no-progress', '--cache', '--cache-location', 'node_modules/.cache/cspell', '--cache-strategy', 'content', '**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,json,jsonc,md,mdx,yml,yaml}'], command: 'cspell', name: 'spell', parse: parseCspell },
    )
  })

  it('orders the single-line checks first and the (often many) typecheck tools last', () => {
    const typecheck = [{ args: ['--noEmit', '--pretty', 'false'], command: 'tsc', name: 'typecheck', parse: parseTsc }]

    expect(checkTools({ hasCspell: true, hasKnip: true, typecheck }).map(tool => tool.name)).toEqual(['eslint', 'format', 'spell', 'knip', 'typecheck'])
  })

  it('appends knip when a knip config is present', () => {
    const tools = checkTools({ hasCspell: false, hasKnip: true, typecheck: [] })

    expect(tools.at(-1)).toEqual({ args: ['--reporter', 'json'], command: 'knip', name: 'knip', parse: parseKnip })
  })
})

describe('gateToolInfo', () => {
  it('returns the package and purpose for a known binary', () => {
    expect(gateToolInfo('oxfmt')).toEqual({ package: 'oxfmt', purpose: 'formatting' })
    expect(gateToolInfo('tsc')).toEqual({ package: 'typescript', purpose: 'type-checking' })
  })

  it('falls back to the command itself for a binary outside the registry', () => {
    expect(gateToolInfo('mystery-tool')).toEqual({ package: 'mystery-tool', purpose: 'this check' })
  })
})

describe('fixTools', () => {
  it('runs eslint --fix and the formatter with no issue parsing', () => {
    expect(fixTools()).toEqual([
      { args: ['.', '--fix'], command: 'eslint', name: 'eslint', parse: noIssues },
      { args: ['.'], command: 'oxfmt', name: 'format', parse: noIssues },
    ])
  })
})
