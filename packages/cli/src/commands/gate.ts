import { parseJSONC } from 'confbox'

import { ALL_EXTENSIONS } from '../globs.js'
import { noIssues, parseCspell, parseEslint, parseKnip, parseOxfmt, parseTsc } from './adapters.js'

import type { Adapter } from './report.js'

export type Tool = {
  args: string[]
  command: string
  name: string
  parse: Adapter
}

// One entry per gate binary: the npm package that provides it and what it checks. Single source for the
// "not installed" install hint (report) and the devDependencies `init` installs (scaffold) — keep both derived from here.
export const GATE_TOOLS = {
  cspell: { package: 'cspell', purpose: 'spell-checking' },
  eslint: { package: 'eslint', purpose: 'linting' },
  knip: { package: 'knip', purpose: 'dead-code detection' },
  oxfmt: { package: 'oxfmt', purpose: 'formatting' },
  tsc: { package: 'typescript', purpose: 'type-checking' },
} as const satisfies Record<string, { package: string, purpose: string }>

/** The npm package + human purpose behind a tool's binary, falling back to the command itself for anything outside the registry. */
export function gateToolInfo(command: string): { package: string, purpose: string } {
  for (const [binary, info] of Object.entries(GATE_TOOLS)) {
    if (binary === command) {
      return info
    }
  }

  return { package: command, purpose: 'this check' }
}

// cspell checks the code extensions the linters share, plus these data/doc formats.
const SPELL_GLOB = `**/*.{${[...ALL_EXTENSIONS, 'json', 'jsonc', 'md', 'mdx', 'yml', 'yaml'].join(',')}}`
// One shared cache root so CI can persist every tool's cache by caching a single directory; each tool gets its own subdir/file.
const CACHE_DIR = 'node_modules/.cache'

export type TsMode = 'none' | 'references' | 'single'

/** Classify a single project's tsconfig: 'references' (solution-style → `tsc -b`), 'single' (`tsc --noEmit`), or 'none'. */
export function detectTsMode(tsconfig: string | undefined): TsMode {
  if (tsconfig === undefined) {
    return 'none'
  }

  // confbox's parseJSONC is lenient (never throws) and returns undefined for unparseable content.
  const config = parseJSONC<undefined | { references?: unknown[] }>(tsconfig) ?? {}
  const hasReferences = Array.isArray(config.references) && config.references.length > 0

  return hasReferences ? 'references' : 'single'
}

/** Redirect tsc's incremental build-info into the shared cache dir — one file per target so monorepo packages don't clobber each other. */
function tsBuildInfoArguments(key: string): string[] {
  return ['--incremental', '--tsBuildInfoFile', `${CACHE_DIR}/tsc/${key.replaceAll(/[^0-9a-z]+/giv, '-')}.tsbuildinfo`]
}

/** Typecheck tools: one `tsc -p <pkg> --noEmit` per package in a monorepo (reference-independent), else a single tsc by mode. */
export function typecheckTools(packages: { directory: string, tsconfig: string | undefined }[] | undefined, tsMode: TsMode): Tool[] {
  if (packages !== undefined) {
    return packages.flatMap(({ directory, tsconfig }) => tsconfig === undefined
      ? []
      : [{ args: ['-p', tsconfig, '--noEmit', '--pretty', 'false', ...tsBuildInfoArguments(directory)], command: 'tsc', name: `typecheck (${directory})`, parse: parseTsc }])
  }

  if (tsMode === 'none') {
    return []
  }

  const args = tsMode === 'references'
    ? ['-b', '--pretty', 'false']
    : ['--noEmit', '--pretty', 'false', ...tsBuildInfoArguments('root')]

  return [{ args, command: 'tsc', name: 'typecheck', parse: parseTsc }]
}

/** Tools `qg check` runs in parallel: the single-line checks (lint, format, spell, knip) first, then the per-package typecheck tools — so the (usually numerous) typecheck rows don't split the others apart in the live list. */
export function checkTools({ hasCspell, hasKnip, typecheck }: { hasCspell: boolean, hasKnip: boolean, typecheck: Tool[] }): Tool[] {
  const tools: Tool[] = [
    { args: ['.', '--format', 'json', '--max-warnings', '0', '--cache', '--cache-location', `${CACHE_DIR}/eslint/`, '--cache-strategy', 'content'], command: 'eslint', name: 'eslint', parse: parseEslint },
    { args: ['--check', '.'], command: 'oxfmt', name: 'format', parse: parseOxfmt },
  ]

  if (hasCspell) {
    tools.push({ args: ['--no-progress', '--cache', '--cache-location', `${CACHE_DIR}/cspell`, '--cache-strategy', 'content', SPELL_GLOB], command: 'cspell', name: 'spell', parse: parseCspell })
  }

  if (hasKnip) {
    // No --cache for knip: its metadata cache over-reports unused code on reuse in monorepos (measured 22 → 286), and knip is already fast.
    tools.push({ args: ['--reporter', 'json'], command: 'knip', name: 'knip', parse: parseKnip })
  }

  tools.push(...typecheck)

  return tools
}

/** Tools `qg fix` runs in parallel — only the ones that can rewrite files (pass/fail by exit code). */
export function fixTools(): Tool[] {
  return [
    { args: ['.', '--fix'], command: 'eslint', name: 'eslint', parse: noIssues },
    { args: ['.'], command: 'oxfmt', name: 'format', parse: noIssues },
  ]
}
