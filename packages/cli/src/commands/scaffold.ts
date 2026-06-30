import { GATE_TOOLS } from './gate.js'

import type { Level } from '../config.js'
import type { EslintLayer, Framework } from '../frameworks.js'

type ScaffoldFile = {
  content: string
  path: string
}

const ESLINT_CONFIG = `import { eslint } from '@misaon/quality-gateway/eslint'\n\nexport default eslint()\n`
const OXFMT_CONFIG = `import { oxfmt } from '@misaon/quality-gateway/oxfmt'\n\nexport default await oxfmt()\n`
const CSPELL_CONFIG = `{\n  "$schema": "https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json",\n  "version": "0.2",\n  "useGitignore": true,\n  "words": []\n}\n`
const KNIP_CONFIG = `import type { KnipConfig } from 'knip'\n\nexport default {} satisfies KnipConfig\n`

/** The config files `init` writes: the control panel, the eslint/oxfmt adapters, a starter knip config, and (hardcore only) cspell. */
export function configFiles(framework: Framework | undefined, level: Level): ScaffoldFile[] {
  const frameworkLine = framework === undefined ? '' : `  framework: '${framework}',\n`
  const panel = `import { defineConfig } from '@misaon/quality-gateway/config'\n\nexport default defineConfig({\n${frameworkLine}  level: '${level}',\n})\n`

  const files: ScaffoldFile[] = [
    { content: panel, path: 'quality-gateway.config.ts' },
    { content: ESLINT_CONFIG, path: 'eslint.config.mjs' },
    { content: OXFMT_CONFIG, path: 'oxfmt.config.ts' },
    { content: KNIP_CONFIG, path: 'knip.config.ts' },
  ]

  if (level === 'hardcore') {
    files.push({ content: CSPELL_CONFIG, path: 'cspell.json' })
  }

  return files
}

/** Scripts `init` adds to the target package.json — the aggregate gate commands. */
export function gateScripts(): Record<string, string> {
  return {
    check: 'qg check',
    fix: 'qg fix',
  }
}

/** devDependencies `init` installs: the CLI, the runner's tools, the used framework layer(s), and (hardcore only) cspell. */
export function devDependencies(level: Level, layers: EslintLayer[]): string[] {
  const runnerPackages = [GATE_TOOLS.eslint.package, GATE_TOOLS.knip.package, GATE_TOOLS.oxfmt.package, GATE_TOOLS.tsc.package]
  const dependencies = ['@misaon/quality-gateway', ...runnerPackages, ...layers.map(layer => `@misaon/eslint-config-${layer}`)]

  return level === 'hardcore' ? [...dependencies, GATE_TOOLS.cspell.package] : dependencies
}
