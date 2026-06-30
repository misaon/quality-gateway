import { describe, expect, it } from 'vitest'

import { detectFramework, FRAMEWORK_CHOICES, layerFor } from '../src/frameworks.js'

describe('detectFramework', () => {
  it('detects next when next is present, even alongside react', () => {
    expect(detectFramework({ dependencies: { next: '16', react: '19' } })).toBe('next')
  })

  it('detects nest from @nestjs/core', () => {
    expect(detectFramework({ dependencies: { '@nestjs/core': '11' } })).toBe('nest')
  })

  it('detects react when present without next', () => {
    expect(detectFramework({ dependencies: { react: '19' } })).toBe('react')
  })

  it('looks in devDependencies too', () => {
    expect(detectFramework({ devDependencies: { next: '16' } })).toBe('next')
  })

  it('falls back to none for an unknown stack or a missing manifest', () => {
    expect(detectFramework({ dependencies: { fastify: '5' } })).toBe('none')
    expect(detectFramework(undefined)).toBe('none')
  })
})

describe('layerFor', () => {
  it('maps each framework to its ESLint layer', () => {
    expect(layerFor('next')).toBe('next')
    expect(layerFor('nest')).toBe('node')
    expect(layerFor('react')).toBe('react')
  })

  it('falls back to the node layer for none', () => {
    expect(layerFor('none')).toBe('node')
  })
})

describe('FRAMEWORK_CHOICES', () => {
  it('is every registered framework plus the none opt-out, in detection order', () => {
    expect(FRAMEWORK_CHOICES).toEqual(['next', 'nest', 'react', 'none'])
  })
})
