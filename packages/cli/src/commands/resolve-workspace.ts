import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { parseJSONC, parseYAML } from 'confbox'
import { globSync } from 'tinyglobby'

import { detectFramework, type EslintLayer, layerFor } from '../frameworks.js'
import { type PackageManifest, type PnpmWorkspace, workspaceGlobs } from './workspace.js'

export type WorkspacePackage = { directory: string, layer: EslintLayer, tsconfig: string | undefined }

function read(file: string): string | undefined {
  return existsSync(file) ? readFileSync(file, 'utf8') : undefined
}

function readManifest(file: string): PackageManifest | undefined {
  const raw = read(file)

  return raw === undefined ? undefined : parseJSONC<PackageManifest | undefined>(raw)
}

/** Discover monorepo packages with their ESLint layer + tsconfig path; undefined when this is a single-package project. */
export function resolveWorkspace(cwd: string): undefined | WorkspacePackage[] {
  const yaml = read(path.join(cwd, 'pnpm-workspace.yaml'))
  const lerna = read(path.join(cwd, 'lerna.json'))
  const globs = workspaceGlobs(
    yaml === undefined ? undefined : parseYAML<PnpmWorkspace | undefined>(yaml),
    readManifest(path.join(cwd, 'package.json')),
    lerna === undefined ? undefined : parseJSONC<PnpmWorkspace | undefined>(lerna),
  )

  if (globs.length === 0) {
    return undefined
  }

  const manifests = globSync(globs.map(glob => `${glob}/package.json`), { cwd, ignore: ['**/node_modules/**'] })

  return manifests.map((manifestPath) => {
    const directory = path.dirname(manifestPath)
    const tsconfig = path.join(directory, 'tsconfig.json')
    const manifest = readManifest(path.join(cwd, manifestPath))

    return {
      directory,
      layer: layerFor(detectFramework(manifest)),
      tsconfig: existsSync(path.join(cwd, tsconfig)) ? tsconfig : undefined,
    }
  })
}
