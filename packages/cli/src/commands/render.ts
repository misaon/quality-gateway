import { colors } from 'consola/utils'

import { type GateReport, SYNTHETIC_RULE, type ToolReport } from './report.js'

export type DetailRow = { column: number, file: string, line: number, message: string, rule: string, tool: string }

/** Format a count with space thousands separators (115105 → "115 105"). */
export function formatCount(value: number): string {
  return value.toLocaleString('en-US').replaceAll(',', ' ')
}

/** Human-readable elapsed time (350 → "350ms", 1500 → "1.5s", 65000 → "1m 5s"). */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${String(ms)}ms`
  }

  const seconds = ms / 1000

  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }

  return `${String(Math.floor(seconds / 60))}m ${String(Math.round(seconds % 60))}s`
}

/** The live listr2 task title — leads with the tool name (bold issue count); distinguishes a missing binary from a crash. */
export function titleFor(tool: ToolReport): string {
  if (tool.status === 'passed') {
    return tool.name
  }

  if (tool.status === 'not-installed') {
    return `${tool.name} — not installed`
  }

  if (tool.status === 'errored') {
    return `${tool.name} — could not run`
  }

  const count = tool.issues.length

  return `${tool.name} — ${colors.bold(formatCount(count))} ${count === 1 ? 'issue' : 'issues'}`
}

/** Every issue across all tools, sorted by file → line → column (then tool, then rule for stable ties); grouped by file at render time, each row showing the position, message, tool, and rule. */
export function detailRows(report: GateReport): DetailRow[] {
  return report.tools
    .flatMap(tool => tool.issues.map(issue => ({ issue, tool: tool.name })))
    .toSorted((left, right) => left.issue.file.localeCompare(right.issue.file) || left.issue.line - right.issue.line || left.issue.column - right.issue.column || left.tool.localeCompare(right.tool) || left.issue.rule.localeCompare(right.issue.rule))
    .map(({ issue, tool }) => ({
      column: issue.column,
      file: issue.file,
      line: issue.line,
      message: issue.message,
      rule: issue.rule,
      tool,
    }))
}

const SYNTHETIC_RULE_NAMES: ReadonlySet<string> = new Set(Object.values(SYNTHETIC_RULE))

// One rule-doc URL builder per plugin prefix — add a plugin here, not in scattered conditionals.
const RULE_DOC_URLS: { prefix: string, url: (rule: string) => string }[] = [
  { prefix: '@stylistic/', url: rule => `https://eslint.style/rules/${rule}` },
  { prefix: '@typescript-eslint/', url: rule => `https://typescript-eslint.io/rules/${rule}` },
  { prefix: 'n/', url: rule => `https://github.com/eslint-community/eslint-plugin-n/blob/master/docs/rules/${rule}.md` },
  { prefix: 'perfectionist/', url: rule => `https://perfectionist.dev/rules/${rule}.html` },
  { prefix: 'regexp/', url: rule => `https://ota-meshi.github.io/eslint-plugin-regexp/rules/${rule}.html` },
  { prefix: 'sonarjs/', url: rule => `https://github.com/SonarSource/eslint-plugin-sonarjs/blob/master/docs/rules/${rule}.md` },
  { prefix: 'unicorn/', url: rule => `https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/${rule}.md` },
]

/** A rule's documentation URL — a plugin's site by prefix, else eslint.org for core rules; undefined for synthetic (oxfmt/cspell/knip) and tsc rules that have no page. */
export function ruleDocumentUrl(rule: string): string | undefined {
  const plugin = RULE_DOC_URLS.find(({ prefix }) => rule.startsWith(prefix))

  if (plugin !== undefined) {
    return plugin.url(rule.slice(plugin.prefix.length))
  }

  if (rule === '' || rule.includes('/') || SYNTHETIC_RULE_NAMES.has(rule) || /^TS\d+$/v.test(rule)) {
    return undefined
  }

  return `https://eslint.org/docs/latest/rules/${rule}`
}
