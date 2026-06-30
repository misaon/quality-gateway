import { loadConfig } from 'c12'

import { DEFAULT_LEVEL, type QualityGatewayConfig } from './config.js'

const PANEL_NAME = 'quality-gateway'

export type ResolvedPanel = Required<QualityGatewayConfig>

const PANEL_DEFAULTS: ResolvedPanel = {
  framework: 'none',
  ignores: [],
  level: DEFAULT_LEVEL,
}

export function resolvePanel(options: QualityGatewayConfig): ResolvedPanel {
  return { ...PANEL_DEFAULTS, ...options }
}

export async function loadPanel(): Promise<ResolvedPanel> {
  const { config } = await loadConfig<QualityGatewayConfig>({
    globalRc: false,
    name: PANEL_NAME,
    rcFile: false,
  })

  return resolvePanel(config)
}
