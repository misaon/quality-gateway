import type { ToolReport } from '../commands/report.js'

/** Brand gradient (cyan → indigo → violet), shared by the banner and accent text. */
export const BRAND_GRADIENT = ['#22d3ee', '#818cf8', '#c084fc']

// Glyphs: a missing binary reads as a neutral "unavailable" (⊘), distinct from the red ✖ of a real failure.
const STATUS_ICON = { 'errored': '✖', 'failed': '✖', 'not-installed': '⊘', 'passed': '✔' } as const
const STATUS_COLOR = { 'errored': 'red', 'failed': 'red', 'not-installed': 'gray', 'passed': 'green' } as const

type Status = ToolReport['status']

export function statusIcon(status: Status): string {
  return STATUS_ICON[status]
}

export function statusColor(status: Status): string {
  return STATUS_COLOR[status]
}
