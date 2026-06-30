import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { addDevDependency, detectPackageManager } from 'nypm'
import { type PackageJson, writePackageJSON } from 'pkg-types'

import { gateScripts, type ScaffoldFile } from './scaffold.js'

export type WriteResult = { path: string, status: 'skipped' | 'would-skip' | 'would-write' | 'written' }
export type ScriptsResult = { added: string[], kept: string[], status: 'previewed' | 'written' }

function isFileExistsError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST'
}

/** Write each config file, returning what happened per file. Existing files are skipped unless `force`; `dryRun` only reports the intent. */
export async function writeConfigs(cwd: string, files: ScaffoldFile[], options: { dryRun: boolean, force: boolean }): Promise<WriteResult[]> {
  const results: WriteResult[] = []

  for (const file of files) {
    const target = path.join(cwd, file.path)

    if (options.dryRun) {
      results.push({ path: file.path, status: !options.force && existsSync(target) ? 'would-skip' : 'would-write' })

      continue
    }

    // 'wx' makes "create only if absent" a single atomic step — no existsSync-then-writeFile race.
    const writeOptions = options.force ? undefined : { flag: 'wx' }

    try {
      await writeFile(target, file.content, writeOptions)
      results.push({ path: file.path, status: 'written' })
    } catch (error) {
      if (!options.force && isFileExistsError(error)) {
        results.push({ path: file.path, status: 'skipped' })

        continue
      }

      throw error
    }
  }

  return results
}

/** Add the gate's check/fix scripts to the manifest, returning which were added vs kept. Existing scripts are kept unless `force`; `dryRun` only reports the intent. */
export async function wireScripts(cwd: string, manifest: PackageJson, options: { dryRun: boolean, force: boolean }): Promise<ScriptsResult> {
  const scripts = gateScripts()
  const names = Object.keys(scripts)

  if (options.dryRun) {
    return { added: names, kept: [], status: 'previewed' }
  }

  const existing = new Set(names.filter(name => manifest.scripts?.[name] !== undefined))
  const added: string[] = []
  const kept: string[] = []

  manifest.scripts ??= {}

  for (const [name, command] of Object.entries(scripts)) {
    if (options.force || !existing.has(name)) {
      manifest.scripts[name] = command
      added.push(name)
    } else {
      kept.push(name)
    }
  }

  await writePackageJSON(path.join(cwd, 'package.json'), manifest)

  return { added, kept, status: 'written' }
}

/** Install the packages as devDependencies; for a non-npm monorepo, target the workspace root. Throws if the package manager fails. */
export async function installDependencies(cwd: string, packages: string[], options: { isMonorepo: boolean }): Promise<void> {
  const pm = await detectPackageManager(cwd)
  // npm maps `workspace: true` to --workspaces (installs into every package); only pnpm/yarn need it to target the monorepo root.
  const isWorkspaceRoot = options.isMonorepo && pm?.name !== 'npm'

  await addDevDependency(packages, { cwd, workspace: isWorkspaceRoot })
}
