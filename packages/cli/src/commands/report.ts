import path from 'node:path'

type Severity = 'error' | 'warning'

export type Issue = {
  column: number
  file: string
  fixable: boolean
  line: number
  message: string
  rule: string
  severity: Severity
}

/** Rule labels we synthesize for the non-ESLint tools (oxfmt → format, cspell → spell); they have no rule-doc page. */
export const SYNTHETIC_RULE = { format: 'format', spell: 'spell' } as const

export type RawResult = {
  exitCode: number
  missing: boolean
  output: string
  stdout: string
}

export type Adapter = (raw: RawResult) => Issue[]

type ToolStatus = 'errored' | 'failed' | 'not-installed' | 'passed'

// Display order shared by the live task list and the summary: problems first, then passes, then the absent tools.
const STATUS_ORDER: Record<ToolStatus, number> = { 'errored': 1, 'failed': 0, 'not-installed': 3, 'passed': 2 }

/** Sort key that groups tools as failed → errored → passed → not-installed (lower sorts first). */
export function statusRank(status: ToolStatus): number {
  return STATUS_ORDER[status]
}

export type ToolReport = {
  command: string
  detail: string
  duration: number
  issues: Issue[]
  name: string
  status: ToolStatus
}

type GateSummary = {
  errors: number
  fixable: number
  issues: number
  warnings: number
}

export type GateReport = {
  duration: number
  ok: boolean
  summary: GateSummary
  tools: ToolReport[]
  version: number
}

/** Bump when the `--json` shape changes incompatibly so agent/CI consumers can pin on `version`. */
export const CONTRACT_VERSION = 1

/** A tool passed when it exited 0; issues are the displayable detail with paths made relative to cwd. */
export function toToolReport(tool: { command: string, name: string, parse: Adapter }, raw: RawResult, cwd: string): Omit<ToolReport, 'duration'> {
  const issues = tool.parse(raw).map(issue => ({ ...issue, file: toRelative(issue.file, cwd) }))
  const status = statusFor(raw, issues.length)

  return { command: tool.command, detail: status === 'errored' ? firstLine(raw.output) : '', issues, name: tool.name, status }
}

/** passed = exit 0; not-installed = binary missing; failed = exited non-zero with issues; errored = exited non-zero with none (crash). */
function statusFor(raw: RawResult, issueCount: number): ToolStatus {
  if (raw.exitCode === 0) {
    return 'passed'
  }

  if (raw.missing) {
    return 'not-installed'
  }

  return issueCount > 0 ? 'failed' : 'errored'
}

function firstLine(output: string): string {
  return output.trim().split('\n', 1).join('')
}

function toRelative(file: string, cwd: string): string {
  return path.isAbsolute(file) ? path.relative(cwd, file) : file
}

export function toGateReport(tools: ToolReport[], duration: number): GateReport {
  return { duration, ok: tools.every(tool => tool.status === 'passed'), summary: summarize(tools), tools, version: CONTRACT_VERSION }
}

function summarize(tools: ToolReport[]): GateSummary {
  const issues = tools.flatMap(tool => tool.issues)

  return {
    errors: issues.filter(issue => issue.severity === 'error').length,
    fixable: issues.filter(issue => issue.fixable).length,
    issues: issues.length,
    warnings: issues.filter(issue => issue.severity === 'warning').length,
  }
}

/** The `limit` most-frequently-violated rules across all tools, most first. */
export function topRules(report: GateReport, limit: number): { count: number, rule: string }[] {
  const counts = new Map<string, number>()
  const issues = report.tools.flatMap(tool => tool.issues)

  for (const issue of issues) {
    if (issue.rule !== '') {
      counts.set(issue.rule, (counts.get(issue.rule) ?? 0) + 1)
    }
  }

  return [...counts]
    .map(([rule, count]) => ({ count, rule }))
    .toSorted((left, right) => right.count - left.count)
    .slice(0, limit)
}
