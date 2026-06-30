import { isOneOf } from './membership.js'

import type { Framework } from './frameworks.js'

export const LEVELS = ['recommended', 'strict', 'hardcore'] as const

export type Level = (typeof LEVELS)[number]

export const DEFAULT_LEVEL: Level = 'strict'

export const isLevel = isOneOf(LEVELS)

export type QualityGatewayConfig = {
  framework?: Framework
  ignores?: string[]
  level?: Level
}

export function defineConfig(config: QualityGatewayConfig): QualityGatewayConfig {
  return config
}

export default defineConfig
