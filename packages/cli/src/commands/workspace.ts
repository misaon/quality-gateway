export type PnpmWorkspace = { packages?: string[] }

export type PackageManifest = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  workspaces?: PnpmWorkspace | string[]
}

/** Declared workspace package globs: pnpm-workspace.yaml, else package.json `workspaces` (array or `{ packages }` object form), else lerna.json. */
export function workspaceGlobs(pnpm: PnpmWorkspace | undefined, manifest: PackageManifest | undefined, lerna: PnpmWorkspace | undefined): string[] {
  const workspaces = manifest?.workspaces
  const fromManifest = Array.isArray(workspaces) ? workspaces : workspaces?.packages

  return pnpm?.packages ?? fromManifest ?? lerna?.packages ?? []
}
