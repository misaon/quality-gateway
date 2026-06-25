import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'
import common from '@misaon/eslint-config-common'

describe('@misaon/eslint-config-common', () => {
  it('exports a non-empty flat-config array', () => {
    expect(Array.isArray(common)).toBe(true)
    expect(common.length).toBeGreaterThan(0)
  })

  it('is accepted by ESLint as a flat config', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: common,
    })
    const results = await eslint.lintText('const x = 1\n', {
      filePath: 'example.js',
    })
    expect(results).toHaveLength(1)
  })
})
