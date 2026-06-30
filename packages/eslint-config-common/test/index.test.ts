import recommended, { strict } from '@misaon/eslint-config-common'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const levels = [
  ['recommended', recommended],
  ['strict', strict],
] as const

describe('@misaon/eslint-config-common', () => {
  it.each(levels)('%s is a non-empty flat-config array', (_name, config) => {
    expect(Array.isArray(config)).toBe(true)
    expect(config.length).toBeGreaterThan(0)
  })

  it.each(levels)('%s is accepted by ESLint as a flat config', async (_name, config) => {
    const eslint = new ESLint({ overrideConfig: config, overrideConfigFile: true })
    const results = await eslint.lintText('const x = 1\n', { filePath: 'example.js' })
    expect(results).toHaveLength(1)
  })

  it('recommended currently inherits strict unchanged', () => {
    expect(recommended).toBe(strict)
  })
})
