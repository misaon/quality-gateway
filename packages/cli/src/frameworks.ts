import { isOneOf } from './membership.js'

type DependencyManifest = { dependencies?: Record<string, string>, devDependencies?: Record<string, string> }

// Single registry of supported stacks — detection, ESLint layer, init choices and the Framework/EslintLayer types all derive from it (add a stack here, not in scattered checks).
// Order is detection precedence: Next ships React, so it precedes plain React.
const FRAMEWORKS = [
  { layer: 'next', marker: 'next', name: 'next' },
  { layer: 'node', marker: '@nestjs/core', name: 'nest' },
  { layer: 'react', marker: 'react', name: 'react' },
] as const

export type EslintLayer = (typeof FRAMEWORKS)[number]['layer']
export type Framework = 'none' | (typeof FRAMEWORKS)[number]['name']

export const FRAMEWORK_CHOICES: Framework[] = [...FRAMEWORKS.map(entry => entry.name), 'none']

export const isFramework = isOneOf(FRAMEWORK_CHOICES)

/** The framework a project targets, by its first matching marker dependency; 'none' when none match. */
export function detectFramework(manifest: DependencyManifest | undefined): Framework {
  const dependencies = { ...manifest?.dependencies, ...manifest?.devDependencies }

  return FRAMEWORKS.find(entry => Object.hasOwn(dependencies, entry.marker))?.name ?? 'none'
}

/** The ESLint layer a framework maps to; 'none' falls back to the node layer. */
export function layerFor(framework: Framework): EslintLayer {
  return FRAMEWORKS.find(entry => entry.name === framework)?.layer ?? 'node'
}
