import { existsSync } from 'node:fs'
import path from 'node:path'

import { defineCommand } from 'citty'
import { type PackageJson, readPackageJSON } from 'pkg-types'

import { DEFAULT_LEVEL, isLevel, type Level, LEVELS } from '../config.js'
import { detectFramework, type EslintLayer, type Framework, FRAMEWORK_CHOICES, isFramework, layerFor } from '../frameworks.js'
import { promptConfirm, promptSelect } from '../ui/prompt.js'
import { installDependencies, type ScriptsResult, wireScripts, writeConfigs, type WriteResult } from './apply.js'
import { resolveWorkspace, type WorkspacePackage } from './resolve-workspace.js'
import { configFiles, devDependencies, pendingDependencies } from './scaffold.js'

// Sentinel distinct from `undefined` (which is a valid "framework: none") so a user cancel can short-circuit the run.
const CANCELLED = Symbol('cancelled')

const WRITE_LABEL: Record<WriteResult['status'], string> = {
  'skipped': '• kept existing',
  'would-skip': '• would keep existing',
  'would-write': '• would write',
  'written': '✔ wrote',
}

type Choices = { framework: Framework | undefined, level: Level }
type ApplyOptions = { cwd: string, force: boolean, isDryRun: boolean, isInteractive: boolean, manifest: PackageJson, packages: undefined | WorkspacePackage[], shouldInstall: boolean } & Choices
type Validation = { error: string } | { framework: Framework | undefined, level: Level | undefined }

function line(message: string): void {
  process.stdout.write(`${message}\n`)
}

export const init = defineCommand({
  args: {
    dir: { default: '.', description: 'Target project directory', type: 'string' },
    dryRun: { default: false, description: 'Preview changes without writing', type: 'boolean' },
    force: { default: false, description: 'Overwrite existing config files', type: 'boolean' },
    framework: { description: `Override detection (${FRAMEWORK_CHOICES.join(' | ')})`, type: 'string' },
    install: { default: true, description: 'Install devDependencies', type: 'boolean' },
    level: { description: `Rule level (${LEVELS.join(' | ')})`, type: 'string' },
    yes: { default: false, description: 'Accept defaults, skip prompts', type: 'boolean' },
  },
  meta: {
    description: 'Detect your stack and wire up the matching @misaon quality configs',
    name: 'init',
  },
  async run({ args }) {
    const cwd = path.resolve(args.dir)
    const validation = validateInputs(args.framework, args.level, cwd)

    if ('error' in validation) {
      process.stderr.write(`${validation.error}\n`)
      process.exitCode = 1

      return
    }

    const manifest = await readPackageJSON(cwd)
    const packages = resolveWorkspace(cwd)
    // Prompt only on a real TTY; --yes (or a piped run) takes the detected/default answers.
    const isInteractive = !args.yes && process.stdout.isTTY

    line(`quality-gateway · wiring ${cwd}`)

    const choices = await resolveChoices(validation, manifest, packages, isInteractive)

    if (choices === CANCELLED) {
      line('Cancelled.')

      return
    }

    line(`Wiring — ${describeScope(packages, choices.framework)}, level: ${choices.level}`)

    try {
      await applyConfig({ cwd, force: args.force, isDryRun: args.dryRun, isInteractive, manifest, packages, shouldInstall: args.install, ...choices })
      line('✔ Ready — run your `check` script to try it.')
    } catch (error) {
      process.stderr.write(`✖ ${String(error)}\n`)
      process.exitCode = 1
    }
  },
})

function validateInputs(frameworkFlag: string | undefined, levelFlag: string | undefined, cwd: string): Validation {
  if (frameworkFlag !== undefined && !isFramework(frameworkFlag)) {
    return { error: `Invalid --framework "${frameworkFlag}". Choose one of: ${FRAMEWORK_CHOICES.join(', ')}.` }
  }

  if (levelFlag !== undefined && !isLevel(levelFlag)) {
    return { error: `Invalid --level "${levelFlag}". Choose one of: ${LEVELS.join(', ')}.` }
  }

  // cwd must have its own package.json; readPackageJSON would otherwise walk up and wire configs against a parent project's manifest.
  if (!existsSync(path.join(cwd, 'package.json'))) {
    return { error: `No package.json in ${cwd} — run your package manager's init there first, or point --dir at your project.` }
  }

  return { framework: frameworkFlag, level: levelFlag }
}

/** Collect the framework + level, prompting only where a TTY and no flag already settled it. */
async function resolveChoices(validation: { framework: Framework | undefined, level: Level | undefined }, manifest: PackageJson, packages: undefined | WorkspacePackage[], isInteractive: boolean): Promise<Choices | typeof CANCELLED> {
  let framework: Framework | undefined

  if (packages === undefined) {
    const picked = await resolveFramework(validation.framework, manifest, isInteractive)

    if (picked === CANCELLED) {
      return CANCELLED
    }

    framework = picked
  } else {
    line(`Monorepo detected (${String(packages.length)} packages) — ESLint auto-detects each package's framework.`)
  }

  const level = await resolveLevel(validation.level, isInteractive)

  return level === CANCELLED ? CANCELLED : { framework, level }
}

async function resolveFramework(flag: Framework | undefined, manifest: PackageJson, isInteractive: boolean): Promise<Framework | typeof CANCELLED | undefined> {
  if (flag !== undefined) {
    return flag
  }

  if (!isInteractive) {
    return detectFramework(manifest)
  }

  return await promptSelect<Framework>('Framework?', FRAMEWORK_CHOICES.map(name => ({ label: name, value: name })), detectFramework(manifest)) ?? CANCELLED
}

async function resolveLevel(flag: Level | undefined, isInteractive: boolean): Promise<Level | typeof CANCELLED> {
  if (flag !== undefined) {
    return flag
  }

  if (!isInteractive) {
    return DEFAULT_LEVEL
  }

  return await promptSelect<Level>('Rule level?', LEVELS.map(name => ({ label: name === 'hardcore' ? `${name} — adds spell-check (cspell)` : name, value: name })), DEFAULT_LEVEL) ?? CANCELLED
}

function describeScope(packages: undefined | WorkspacePackage[], framework: Framework | undefined): string {
  return packages === undefined ? `framework: ${framework ?? 'none'}` : 'monorepo'
}

/** Write the configs, wire the scripts, and install the missing devDependencies — reporting each step. */
async function applyConfig({ cwd, force, framework, isDryRun, isInteractive, level, manifest, packages, shouldInstall }: ApplyOptions): Promise<void> {
  const usedLayers = packages === undefined
    ? [layerFor(framework ?? 'none')]
    : [...new Set<EslintLayer>([...packages.map(workspacePackage => workspacePackage.layer), 'node'])]

  const writes = await writeConfigs(cwd, configFiles(framework, level), { dryRun: isDryRun, force })

  for (const result of writes) {
    line(`${WRITE_LABEL[result.status]} ${result.path}`)
  }

  reportScripts(await wireScripts(cwd, manifest, { dryRun: isDryRun, force }))

  await handleInstall({ cwd, dependencies: devDependencies(level, usedLayers), isDryRun, isInteractive, isMonorepo: packages !== undefined, manifest, shouldInstall })
}

function reportScripts(result: ScriptsResult): void {
  if (result.status === 'previewed') {
    line(`• would add scripts: ${result.added.join(', ')}`)

    return
  }

  if (result.added.length > 0) {
    line(`✔ wired ${result.added.join(', ')} script(s)`)
  }

  if (result.kept.length > 0) {
    line(`• kept your ${result.kept.join(', ')} script(s) — pass --force to replace`)
  }
}

async function handleInstall({ cwd, dependencies, isDryRun, isInteractive, isMonorepo, manifest, shouldInstall }: { cwd: string, dependencies: string[], isDryRun: boolean, isInteractive: boolean, isMonorepo: boolean, manifest: PackageJson, shouldInstall: boolean }): Promise<void> {
  const missing = pendingDependencies(dependencies, manifest)

  if (missing.length === 0) {
    line('• all devDependencies already present')

    return
  }

  if (!shouldInstall) {
    line(`• install these devDependencies: ${missing.join(' ')}`)

    return
  }

  if (isDryRun) {
    line(`• would install: ${missing.join(' ')}`)

    return
  }

  if (isInteractive && !(await promptConfirm(`Install ${String(missing.length)} devDependencies now?`))) {
    line(`• skipped — install later: ${missing.join(' ')}`)

    return
  }

  line('Installing devDependencies…')
  await installDependencies(cwd, missing, { isMonorepo })
  line(`✔ installed ${String(missing.length)} devDependencies`)
}
