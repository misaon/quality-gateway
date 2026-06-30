import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { runCommand } from 'citty'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { main } from '../src/cli.js'

/** The package.json the init command wrote, typed for the script fields the assertions read. */
async function readManifest(directory: string): Promise<{ scripts: Record<string, string> }> {
  return JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
}

describe('init command (integration)', () => {
  let directory = ''

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'qg-init-'))
    await writeFile(path.join(directory, 'package.json'), `${JSON.stringify({ dependencies: { react: '^19' }, name: 'demo' })}\n`)
  })

  afterEach(async () => {
    process.exitCode = 0
    await rm(directory, { force: true, recursive: true })
  })

  it('scaffolds the panel and adapters from the detected stack and adds scripts', async () => {
    await runCommand(main, { rawArgs: ['init', '--dir', directory, '--yes', '--no-install'] })

    const panel = await readFile(path.join(directory, 'quality-gateway.config.ts'), 'utf8')

    expect(panel).toContain(`framework: 'react'`)

    const manifest = await readManifest(directory)

    expect(manifest.scripts['check']).toBe('qg check')
  })

  it('skips existing config files unless --force', async () => {
    await writeFile(path.join(directory, 'eslint.config.mjs'), '// keep me\n')
    await runCommand(main, { rawArgs: ['init', '--dir', directory, '--yes', '--no-install'] })

    expect(await readFile(path.join(directory, 'eslint.config.mjs'), 'utf8')).toBe('// keep me\n')

    await runCommand(main, { rawArgs: ['init', '--dir', directory, '--yes', '--no-install', '--force'] })

    expect(await readFile(path.join(directory, 'eslint.config.mjs'), 'utf8')).toContain('@misaon/quality-gateway/eslint')
  })

  it('keeps an existing check script unless --force', async () => {
    await writeFile(path.join(directory, 'package.json'), `${JSON.stringify({ dependencies: { react: '^19' }, name: 'demo', scripts: { check: 'vitest run' } })}\n`)

    await runCommand(main, { rawArgs: ['init', '--dir', directory, '--yes', '--no-install'] })
    const kept = await readManifest(directory)

    expect(kept.scripts['check']).toBe('vitest run')

    await runCommand(main, { rawArgs: ['init', '--dir', directory, '--yes', '--no-install', '--force'] })
    const replaced = await readManifest(directory)

    expect(replaced.scripts['check']).toBe('qg check')
  })

  it('writes nothing on a dry run', async () => {
    await runCommand(main, { rawArgs: ['init', '--dir', directory, '--yes', '--dry-run'] })

    expect(existsSync(path.join(directory, 'quality-gateway.config.ts'))).toBe(false)
  })

  it('rejects an invalid --framework without writing anything', async () => {
    await runCommand(main, { rawArgs: ['init', '--dir', directory, '--yes', '--no-install', '--framework', 'bogus'] })

    expect(process.exitCode).toBe(1)
    expect(existsSync(path.join(directory, 'quality-gateway.config.ts'))).toBe(false)
  })

  it('rejects an invalid --level without writing anything', async () => {
    await runCommand(main, { rawArgs: ['init', '--dir', directory, '--yes', '--no-install', '--level', 'bogus'] })

    expect(process.exitCode).toBe(1)
    expect(existsSync(path.join(directory, 'quality-gateway.config.ts'))).toBe(false)
  })

  it('errors cleanly when the target directory has no package.json', async () => {
    const empty = await mkdtemp(path.join(tmpdir(), 'qg-empty-'))

    await runCommand(main, { rawArgs: ['init', '--dir', empty, '--yes', '--no-install'] })

    expect(process.exitCode).toBe(1)
    expect(existsSync(path.join(empty, 'quality-gateway.config.ts'))).toBe(false)

    await rm(empty, { force: true, recursive: true })
  })

  it('scaffolds a framework-agnostic panel for a monorepo', async () => {
    await writeFile(path.join(directory, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n')
    await mkdir(path.join(directory, 'packages', 'a'), { recursive: true })
    await writeFile(path.join(directory, 'packages', 'a', 'package.json'), `${JSON.stringify({ dependencies: { next: '^15' }, name: 'a' })}\n`)

    await runCommand(main, { rawArgs: ['init', '--dir', directory, '--yes', '--no-install'] })

    const panel = await readFile(path.join(directory, 'quality-gateway.config.ts'), 'utf8')

    expect(panel).not.toContain('framework:')
    expect(panel).toContain(`level: 'strict'`)
  })
})
