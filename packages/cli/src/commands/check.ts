import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { defineCommand } from 'citty'

import { checkTools, detectTsMode, typecheckTools } from './gate.js'
import { resolveWorkspace } from './resolve-workspace.js'
import { runAndReport } from './runner.js'

const KNIP_CONFIGS = ['knip.json', 'knip.jsonc', '.knip.json', '.knip.jsonc', 'knip.config.js', 'knip.config.ts', 'knip.config.cjs', 'knip.config.mjs', 'knip.js', 'knip.ts']
const CSPELL_CONFIGS = ['cspell.json', 'cspell.jsonc', '.cspell.json', '.cspell.jsonc', 'cspell.config.js', 'cspell.config.cjs', 'cspell.config.mjs', 'cspell.config.json', 'cspell.config.jsonc', 'cspell.config.yaml', 'cspell.config.yml', 'cspell.yaml', 'cspell.yml']

export const check = defineCommand({
  args: {
    all: { default: false, description: 'List every issue instead of the first 100', type: 'boolean' },
    dir: { default: '.', description: 'Target project directory', type: 'string' },
    json: { default: false, description: 'Output the structured report as JSON', type: 'boolean' },
  },
  meta: {
    description: 'Run all configured quality checks in parallel',
    name: 'check',
  },
  async run({ args }) {
    const cwd = path.resolve(args.dir)
    const packages = resolveWorkspace(cwd)
    const perPackage = packages === undefined ? [] : typecheckTools(packages, 'none')
    // A monorepo whose packages have no own tsconfig (a root solution/references tsconfig) still needs typechecking — fall back to the root.
    const typecheck = perPackage.length > 0 ? perPackage : typecheckTools(undefined, detectTsMode(readTsconfig(cwd)))
    const manifest = readManifest(cwd)
    const tools = checkTools({ hasCspell: hasToolConfig(cwd, manifest, CSPELL_CONFIGS, 'cspell'), hasKnip: hasToolConfig(cwd, manifest, KNIP_CONFIGS, 'knip'), typecheck })

    await runAndReport(tools, cwd, args.json, args.all)
  },
})

function readManifest(cwd: string): object {
  const file = path.join(cwd, 'package.json')

  if (!existsSync(file)) {
    return {}
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return {}
  }

  return typeof parsed === 'object' && parsed !== null ? parsed : {}
}

/** A tool counts as configured if its config key is in package.json or any of its config files exists. */
function hasToolConfig(cwd: string, manifest: object, files: string[], packageKey: string): boolean {
  return Object.hasOwn(manifest, packageKey) || files.some(name => existsSync(path.join(cwd, name)))
}

function readTsconfig(cwd: string): string | undefined {
  const tsconfigPath = path.join(cwd, 'tsconfig.json')

  return existsSync(tsconfigPath) ? readFileSync(tsconfigPath, 'utf8') : undefined
}
