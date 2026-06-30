import next from '@misaon/eslint-config-next'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

describe('@misaon/eslint-config-next', () => {
  it('exports a non-empty flat-config array', () => {
    expect(Array.isArray(next)).toBe(true)
    expect(next.length).toBeGreaterThan(0)
  })

  it('is accepted by ESLint as a flat config', async () => {
    const eslint = new ESLint({
      overrideConfig: next,
      overrideConfigFile: true,
    })
    const results = await eslint.lintText('const x = 1\n', {
      filePath: 'example.jsx',
    })

    expect(results).toHaveLength(1)
  })
})
