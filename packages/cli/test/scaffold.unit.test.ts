import { describe, expect, it } from 'vitest'

import { configFiles, devDependencies, gateScripts } from '../src/commands/scaffold.js'

describe('configFiles', () => {
  it('returns the panel, the adapters and the knip config at strict — no cspell', () => {
    expect(configFiles('nest', 'strict').map(file => file.path)).toEqual([
      'quality-gateway.config.ts',
      'eslint.config.mjs',
      'oxfmt.config.ts',
      'knip.config.ts',
    ])
  })

  it('adds the cspell config only at the hardcore level', () => {
    expect(configFiles('nest', 'hardcore').map(file => file.path)).toContain('cspell.json')
    expect(configFiles('nest', 'strict').map(file => file.path)).not.toContain('cspell.json')
  })

  it('generates the exact panel with the chosen framework and level', () => {
    const [panel] = configFiles('react', 'recommended')

    expect(panel?.content).toBe(
      `import { defineConfig } from '@misaon/quality-gateway/config'\n\nexport default defineConfig({\n  framework: 'react',\n  level: 'recommended',\n})\n`,
    )
  })

  it('omits the framework line in the panel for a monorepo (framework undefined)', () => {
    const [panel] = configFiles(undefined, 'strict')

    expect(panel?.content).toBe(
      `import { defineConfig } from '@misaon/quality-gateway/config'\n\nexport default defineConfig({\n  level: 'strict',\n})\n`,
    )
  })

  it('generates the exact adapter and starter config contents', () => {
    const files = configFiles('none', 'hardcore')

    expect(files[1]?.content).toBe(`import { eslint } from '@misaon/quality-gateway/eslint'\n\nexport default eslint()\n`)
    expect(files[2]?.content).toBe(`import { oxfmt } from '@misaon/quality-gateway/oxfmt'\n\nexport default await oxfmt()\n`)
    expect(files[3]?.content).toBe(`import type { KnipConfig } from 'knip'\n\nexport default {} satisfies KnipConfig\n`)
    expect(files.at(-1)?.content).toBe(`{\n  "$schema": "https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json",\n  "version": "0.2",\n  "useGitignore": true,\n  "words": []\n}\n`)
  })
})

describe('gateScripts', () => {
  it('wires the aggregate check and fix commands', () => {
    expect(gateScripts()).toEqual({ check: 'qg check', fix: 'qg fix' })
  })
})

describe('devDependencies', () => {
  it('installs the CLI, tools and the used layer packages — no cspell by default', () => {
    expect(devDependencies('strict', ['node'])).toEqual(['@misaon/quality-gateway', 'eslint', 'knip', 'oxfmt', 'typescript', '@misaon/eslint-config-node'])
  })

  it('adds a layer package per used layer, plus cspell at hardcore', () => {
    expect(devDependencies('hardcore', ['next', 'react'])).toEqual(['@misaon/quality-gateway', 'eslint', 'knip', 'oxfmt', 'typescript', '@misaon/eslint-config-next', '@misaon/eslint-config-react', 'cspell'])
  })
})
