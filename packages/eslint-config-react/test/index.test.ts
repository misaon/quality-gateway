import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'
import react from '@misaon/eslint-config-react'

describe('@misaon/eslint-config-react', () => {
  it('exports a non-empty flat-config array', () => {
    expect(Array.isArray(react)).toBe(true)
    expect(react.length).toBeGreaterThan(0)
  })

  it('is accepted by ESLint as a flat config', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: react,
    })
    const results = await eslint.lintText('const x = 1\n', {
      filePath: 'example.jsx',
    })
    expect(results).toHaveLength(1)
  })
})
