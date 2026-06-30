import { describe, expect, it } from 'vitest'

import { workspaceGlobs } from '../src/commands/workspace.js'

describe('workspaceGlobs', () => {
  it('reads packages from a pnpm-workspace declaration', () => {
    expect(workspaceGlobs({ packages: ['packages/*', 'apps/*'] }, undefined, undefined)).toEqual(['packages/*', 'apps/*'])
  })

  it('falls back to a package.json workspaces array', () => {
    expect(workspaceGlobs(undefined, { workspaces: ['packages/*'] }, undefined)).toEqual(['packages/*'])
  })

  it('reads a package.json workspaces object form (npm / yarn-classic)', () => {
    expect(workspaceGlobs(undefined, { workspaces: { packages: ['packages/*'] } }, undefined)).toEqual(['packages/*'])
  })

  it('falls back to lerna.json packages', () => {
    expect(workspaceGlobs(undefined, undefined, { packages: ['libs/*'] })).toEqual(['libs/*'])
  })

  it('prefers pnpm-workspace over package.json over lerna.json', () => {
    expect(workspaceGlobs({ packages: ['from-pnpm/*'] }, { workspaces: ['from-manifest/*'] }, { packages: ['from-lerna/*'] })).toEqual(['from-pnpm/*'])
    expect(workspaceGlobs(undefined, { workspaces: ['from-manifest/*'] }, { packages: ['from-lerna/*'] })).toEqual(['from-manifest/*'])
  })

  it('returns negation globs verbatim (the glob engine excludes them)', () => {
    expect(workspaceGlobs({ packages: ['packages/*', '!packages/internal'] }, undefined, undefined)).toEqual(['packages/*', '!packages/internal'])
  })

  it('is empty when there is no workspace declaration', () => {
    expect(workspaceGlobs(undefined, undefined, undefined)).toEqual([])
  })
})
