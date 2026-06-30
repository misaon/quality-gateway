import node from '@misaon/eslint-config-node'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

describe('@misaon/eslint-config-node', () => {
  it('exports a non-empty flat-config array', () => {
    expect(Array.isArray(node)).toBe(true)
    expect(node.length).toBeGreaterThan(0)
  })

  it('is accepted by ESLint as a flat config', async () => {
    const eslint = new ESLint({
      overrideConfig: node,
      overrideConfigFile: true,
    })
    const results = await eslint.lintText('const x = 1\n', {
      filePath: 'example.js',
    })

    expect(results).toHaveLength(1)
  })
})
