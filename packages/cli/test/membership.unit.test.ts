import { describe, expect, it } from 'vitest'

import { isOneOf } from '../src/membership.js'

describe('isOneOf', () => {
  it('accepts members of the set and rejects everything else', () => {
    const isPrimary = isOneOf(['red', 'green', 'blue'] as const)

    expect(isPrimary('red')).toBe(true)
    expect(isPrimary('blue')).toBe(true)
    expect(isPrimary('teal')).toBe(false)
  })
})
