import { hardcoreRules } from '@misaon/eslint-config-common'
import { defineConfig as composeEslint, globalIgnores } from 'eslint/config'

import { resolveWorkspace } from './commands/resolve-workspace.js'
import { type EslintLayer, layerFor } from './frameworks.js'
import { JS_TS_GLOB } from './globs.js'
import { loadPanel, type ResolvedPanel, resolvePanel } from './panel.js'

import type { QualityGatewayConfig } from './config.js'

// Lazy + optional: a project loads (and installs) only the framework layers it actually uses — a Node app never pulls Next's plugin.
const LAYER_LOADERS = {
  next: () => import('@misaon/eslint-config-next'),
  node: () => import('@misaon/eslint-config-node'),
  react: () => import('@misaon/eslint-config-react'),
} satisfies Record<EslintLayer, () => Promise<unknown>>

async function loadLayer(name: EslintLayer) {
  try {
    const imported = await LAYER_LOADERS[name]()

    return imported.default
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(`Missing ESLint layer "@misaon/eslint-config-${name}" — add it as a devDependency.`, { cause: error })
    }

    throw error
  }
}

/** Build the ESLint config: scope each package to its framework layer (monorepo), or pick one layer (single package). */
async function compose({ framework, ignores, level }: ResolvedPanel, cwd: string) {
  const ignoreLayer = ignores.length > 0 ? globalIgnores(ignores) : []
  const hardcoreLayer = level === 'hardcore' ? { name: '@misaon/hardcore', rules: hardcoreRules } : []
  const packages = resolveWorkspace(cwd)

  if (packages) {
    const scoped = await Promise.all(packages.map(async ({ directory, layer }) => ({
      extends: [await loadLayer(layer)],
      files: [`${directory}/**`],
      name: `@misaon/workspace/${directory}`,
    })))

    // The root layer lints files outside the workspace packages (root configs, tooling, docs) without re-linting package files.
    const root = { extends: [await loadLayer('node')], files: [JS_TS_GLOB], ignores: packages.map(({ directory }) => `${directory}/**`), name: '@misaon/workspace/root' }

    return composeEslint([ignoreLayer, root, ...scoped, hardcoreLayer])
  }

  return composeEslint([ignoreLayer, await loadLayer(layerFor(framework)), hardcoreLayer])
}

export async function eslint(options?: QualityGatewayConfig) {
  const panel = options ? resolvePanel(options) : await loadPanel()

  return compose(panel, process.cwd())
}

export default eslint
