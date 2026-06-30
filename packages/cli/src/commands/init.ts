import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { cancel, confirm, intro, isCancel, log, outro, select, spinner } from '@clack/prompts'
import { defineCommand } from 'citty'
import { addDevDependency, detectPackageManager } from 'nypm'
import { readPackageJSON, writePackageJSON } from 'pkg-types'

import { DEFAULT_LEVEL, isLevel, type Level, LEVELS } from '../config.js'
import { detectFramework, type EslintLayer, type Framework, FRAMEWORK_CHOICES, isFramework, layerFor } from '../frameworks.js'
import { resolveWorkspace, type WorkspacePackage } from './resolve-workspace.js'
import { configFiles, devDependencies, gateScripts } from './scaffold.js'

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

    intro('quality-gateway')

    const validation = validateInputs(args.framework, args.level, cwd)

    if ('error' in validation) {
      cancel(validation.error)
      process.exitCode = 1

      return
    }

    const { framework: frameworkFlag, level: levelFlag } = validation
    const manifest = await readPackageJSON(cwd)
    const packages = resolveWorkspace(cwd)

    let framework: Framework | undefined

    if (packages === undefined) {
      framework = await resolveFramework(frameworkFlag, detectFramework(manifest), args.yes)

      if (framework === undefined) {
        return
      }
    } else {
      log.info(`Monorepo detected — ${String(packages.length)} packages. ESLint auto-detects each package's framework, so there is nothing to pick.`)
    }

    const level = await resolveLevel(levelFlag, args.yes)

    if (level === undefined) {
      return
    }

    log.info(`Wiring into ${cwd} — ${describeScope(packages, framework)}, level: ${level}`)

    const usedLayers = packages === undefined ? [layerFor(framework ?? 'none')] : [...new Set<EslintLayer>([...packages.map(workspacePackage => workspacePackage.layer), 'node'])]

    try {
      await writeConfigFiles(cwd, configFiles(framework, level), args.force, args.dryRun)
      await addScripts(cwd, manifest, args.dryRun, args.force)
      await installPackages({ cwd, dependencies: devDependencies(level, usedLayers), isDryRun: args.dryRun, isMonorepo: packages !== undefined, manifest, shouldInstall: args.install, shouldSkipPrompts: args.yes })

      outro('Ready — run your `check` script to try it.')
    } catch (error) {
      log.error(String(error))
      process.exitCode = 1
    }
  },
})

function validateInputs(frameworkFlag: string | undefined, levelFlag: string | undefined, cwd: string): { error: string } | { framework: Framework | undefined, level: Level | undefined } {
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

function describeScope(packages: undefined | WorkspacePackage[], framework: Framework | undefined): string {
  return packages === undefined ? `framework: ${framework ?? 'none'}` : `monorepo: ${String(packages.length)} packages`
}

function isFileExistsError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST'
}

async function writeConfigFiles(cwd: string, files: ReturnType<typeof configFiles>, shouldOverwrite: boolean, isDryRun: boolean) {
  for (const file of files) {
    const target = path.join(cwd, file.path)

    if (isDryRun) {
      // A dry run only previews; this existsSync never precedes a write, so there is no race.
      log.info(!shouldOverwrite && existsSync(target) ? `${file.path} exists — would skip (use --force to overwrite)` : `would write ${file.path}`)

      continue
    }

    // 'wx' makes "create only if absent" a single atomic step — no existsSync-then-writeFile race (js/file-system-race).
    const writeOptions = shouldOverwrite ? undefined : { flag: 'wx' }

    try {
      await writeFile(target, file.content, writeOptions)
    } catch (error) {
      if (!shouldOverwrite && isFileExistsError(error)) {
        log.warn(`${file.path} exists — skipping (use --force to overwrite)`)

        continue
      }

      throw error
    }

    log.success(`wrote ${file.path}`)
  }
}

async function addScripts(cwd: string, manifest: Awaited<ReturnType<typeof readPackageJSON>>, isDryRun: boolean, shouldOverwrite: boolean) {
  const scripts = gateScripts()
  const existing = Object.keys(scripts).filter(name => manifest.scripts?.[name] !== undefined)

  if (isDryRun) {
    log.info(`would add scripts: ${Object.keys(scripts).join(', ')}`)

    return
  }

  if (existing.length > 0 && !shouldOverwrite) {
    log.warn(`kept your existing ${existing.join(', ')} script(s) — pass --force to replace`)
  }

  manifest.scripts ??= {}

  for (const [name, command] of Object.entries(scripts)) {
    if (shouldOverwrite || !existing.includes(name)) {
      manifest.scripts[name] = command
    }
  }

  await writePackageJSON(path.join(cwd, 'package.json'), manifest)
  log.success('wired check/fix scripts')
}

async function installPackages({ cwd, dependencies, isDryRun, isMonorepo, manifest, shouldInstall, shouldSkipPrompts }: { cwd: string, dependencies: string[], isDryRun: boolean, isMonorepo: boolean, manifest: Awaited<ReturnType<typeof readPackageJSON>>, shouldInstall: boolean, shouldSkipPrompts: boolean }): Promise<void> {
  const present = new Set(Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }))
  const missing = dependencies.filter(dependency => !present.has(dependency))

  if (missing.length === 0) {
    log.info('All devDependencies already present — nothing to install.')

    return
  }

  if (!shouldInstall) {
    log.info(`install these devDependencies: ${missing.join(' ')}`)

    return
  }

  if (isDryRun) {
    log.info(`would install: ${missing.join(' ')}`)

    return
  }

  if (!shouldSkipPrompts) {
    const confirmed = await confirm({ message: `Install devDependencies: ${missing.join(', ')}?` })

    if (isCancel(confirmed) || !confirmed) {
      return
    }
  }

  // npm maps `workspace: true` to --workspaces (installs into every package); only pnpm/yarn need it to target the monorepo root.
  const pm = await detectPackageManager(cwd)
  const isWorkspaceRoot = isMonorepo && pm?.name !== 'npm'
  const progress = spinner()

  progress.start('Installing devDependencies')

  try {
    await addDevDependency(missing, { cwd, workspace: isWorkspaceRoot })
    progress.stop('Installed devDependencies')
  } catch (error) {
    progress.stop('Could not install devDependencies')

    throw error
  }
}

async function resolveFramework(flag: Framework | undefined, detected: Framework, shouldSkipPrompts: boolean): Promise<Framework | undefined> {
  if (flag !== undefined) {
    return flag
  }

  if (shouldSkipPrompts) {
    return detected
  }

  const choice = await select({
    initialValue: detected,
    message: 'Framework?',
    options: FRAMEWORK_CHOICES.map(name => ({ label: name, value: name })),
  })

  if (isCancel(choice)) {
    cancel('Cancelled.')

    return undefined
  }

  return choice
}

async function resolveLevel(flag: Level | undefined, shouldSkipPrompts: boolean): Promise<Level | undefined> {
  if (flag !== undefined) {
    return flag
  }

  if (shouldSkipPrompts) {
    return DEFAULT_LEVEL
  }

  const choice = await select<Level>({
    initialValue: DEFAULT_LEVEL,
    message: 'Rule level?',
    options: LEVELS.map(name => name === 'hardcore'
      ? { hint: 'strict + spell-check (cspell)', label: name, value: name }
      : { label: name, value: name }),
  })

  if (isCancel(choice)) {
    cancel('Cancelled.')

    return undefined
  }

  return choice
}
