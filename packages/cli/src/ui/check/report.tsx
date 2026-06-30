import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { Badge } from '@inkjs/ui'
import { Box, Text, useStdout } from 'ink'
import Link from 'ink-link'

import { detailRows, formatCount, formatDuration, ruleDocumentUrl } from '../../commands/format.js'
import { gateToolInfo } from '../../commands/gate.js'
import { type GateReport, statusRank, type ToolReport, topRules } from '../../commands/report.js'
import { statusColor, statusIcon } from '../theme.js'

import type { ReactNode } from 'react'

// Summary column widths (the check name column is sized to its content).
const RESULT_W = 8
const ISSUES_W = 8
const FIXABLE_W = 9
const TIME_W = 8

function positionText(line: number, column: number): string {
  return line > 0 ? `${String(line)}:${String(column)}` : ''
}

// ESLint wraps identifiers in markdown backticks and may carry newlines; flatten so the row reads cleanly and aligns.
function cleanMessage(message: string): string {
  return message.replaceAll(/\s+/gv, ' ').replaceAll('`', '').trim()
}

/** A rule name linked to its docs (yellow), or a dim em-dash when the finding has no rule (e.g. a format/spell hit). */
function RuleCell({ rule }: { rule: string }) {
  if (rule === '') {
    return <Text dimColor>—</Text>
  }

  const url = ruleDocumentUrl(rule)

  if (url === undefined) {
    return <Text color="yellow">{rule}</Text>
  }

  // OSC-8 hyperlink: in a supporting terminal the rule name is clickable and opens its docs; `fallback={false}` keeps piped output clean (just the name, no URL).
  return <Link fallback={false} url={url}><Text color="yellow">{rule}</Text></Link>
}

/** One issue row under its file header: position (linked to the exact line), message, the tool that flagged it, and the rule. Every column is a fixed width (message truncates) so the grid never reflows. */
function DetailRow({ column, line, message, messageWidth, posWidth, rule, ruleWidth, tool, toolWidth, url }: { column: number, line: number, message: string, messageWidth: number, posWidth: number, rule: string, ruleWidth: number, tool: string, toolWidth: number, url: string }) {
  const position = positionText(line, column)

  return (
    <Box marginLeft={2}>
      <Box marginRight={1} width={posWidth}>
        {line > 0
          ? <Link fallback={false} url={`${url}#${String(line)}`}><Text dimColor>{position}</Text></Link>
          : <Text dimColor>{position}</Text>}
      </Box>
      <Box marginRight={1} width={messageWidth}><Text wrap="truncate">{cleanMessage(message)}</Text></Box>
      <Box marginRight={1} width={toolWidth}><Text dimColor>{tool}</Text></Box>
      <Box width={ruleWidth}><RuleCell rule={rule} /></Box>
    </Box>
  )
}

/** Issues (capped at `limit`) grouped under each file: a clickable path header, then aligned rows. */
function Details({ cwd, limit, report }: { cwd: string, limit: number, report: GateReport }) {
  const { stdout } = useStdout()
  const rows = detailRows(report)

  if (rows.length === 0) {
    return
  }

  const shown = rows.slice(0, limit)
  let posWidth = 0
  let toolWidth = 0
  let ruleWidth = 0

  for (const row of shown) {
    posWidth = Math.max(posWidth, positionText(row.line, row.column).length)
    toolWidth = Math.max(toolWidth, row.tool.length)
    ruleWidth = Math.max(ruleWidth, row.rule === '' ? 1 : row.rule.length)
  }

  // The message takes the leftover width and truncates; a fixed width on every column keeps the grid from reflowing (the 6 covers the indent and inter-column gaps).
  const messageWidth = Math.max(20, (stdout.columns || 80) - posWidth - toolWidth - ruleWidth - 6)

  const lines: ReactNode[] = []
  let lastFile = ''

  for (const [index, row] of shown.entries()) {
    const url = pathToFileURL(path.resolve(cwd, row.file)).href

    if (row.file !== lastFile) {
      lastFile = row.file
      lines.push(
        <Box key={`file-${String(index)}`} marginTop={index === 0 ? 0 : 1}>
          <Link fallback={false} url={url}><Text color="cyan">{row.file}</Text></Link>
        </Box>,
      )
    }

    lines.push(<DetailRow column={row.column} key={index} line={row.line} message={row.message} messageWidth={messageWidth} posWidth={posWidth} rule={row.rule} ruleWidth={ruleWidth} tool={row.tool} toolWidth={toolWidth} url={url} />)
  }

  return (
    <Box flexDirection="column">
      {lines}
      {rows.length > limit && <Text dimColor>… and {formatCount(rows.length - limit)} more — re-run with --all to list them all, or --json for machine output</Text>}
    </Box>
  )
}

/** Tools that produced no issue detail (crashed, or binary missing) — errored first, then the missing ones with an actionable install command. */
function Unran({ installPrefix, report }: { installPrefix: string, report: GateReport }) {
  const unran = report.tools
    .filter(tool => tool.status === 'not-installed' || tool.status === 'errored')
    .toSorted((left, right) => statusRank(left.status) - statusRank(right.status))

  if (unran.length === 0) {
    return
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      {unran.map(tool => <UnranRow installPrefix={installPrefix} key={tool.name} tool={tool} />)}
    </Box>
  )
}

function UnranRow({ installPrefix, tool }: { installPrefix: string, tool: ToolReport }) {
  const icon = <Text color={statusColor(tool.status)}>{statusIcon(tool.status)}</Text>

  if (tool.status !== 'not-installed') {
    return <Text>{icon} {tool.name} — <Text dimColor>{tool.detail === '' ? 'could not run' : tool.detail}</Text></Text>
  }

  const { package: packageName, purpose } = gateToolInfo(tool.command)

  return (
    <Text>
      {icon} {tool.name} — <Text dimColor>not installed, so {purpose} was skipped.</Text> Install it: <Text color="cyan">{installPrefix} {packageName}</Text>
    </Text>
  )
}

/** A small table of the most-violated rules, to help target config tweaks; each rule links to its docs. */
function TopRules({ report }: { report: GateReport }) {
  const top = topRules(report, 5)

  if (top.length === 0) {
    return
  }

  let countWidth = 'count'.length

  for (const { count } of top) {
    countWidth = Math.max(countWidth, formatCount(count).length)
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>Top rules</Text>
      <Box>
        <Box marginRight={2} width={countWidth}><Text dimColor>count</Text></Box>
        <Box><Text dimColor>rule</Text></Box>
      </Box>
      {top.map(({ count, rule }) => (
        <Box key={rule}>
          <Box marginRight={2} width={countWidth}><Text color="yellow">{formatCount(count)}</Text></Box>
          <Box><RuleCell rule={rule} /></Box>
        </Box>
      ))}
    </Box>
  )
}

/** A breakdown of every tool (missing ones last): result, issue count, how many are auto-fixable, and time. */
function Summary({ report }: { report: GateReport }) {
  const tools = report.tools.toSorted((left, right) => statusRank(left.status) - statusRank(right.status))
  let nameWidth = 'check'.length

  for (const tool of tools) {
    nameWidth = Math.max(nameWidth, tool.name.length)
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Box marginRight={2} width={nameWidth}><Text dimColor>check</Text></Box>
        <Box marginRight={2} width={RESULT_W}><Text dimColor>result</Text></Box>
        <Box marginRight={2} width={ISSUES_W}><Text dimColor>issues</Text></Box>
        <Box marginRight={2} width={FIXABLE_W}><Text dimColor>auto-fix</Text></Box>
        <Box width={TIME_W}><Text dimColor>time</Text></Box>
      </Box>
      {tools.map(tool => <SummaryRow key={tool.name} nameWidth={nameWidth} tool={tool} />)}
    </Box>
  )
}

function SummaryRow({ nameWidth, tool }: { nameWidth: number, tool: ToolReport }) {
  const count = tool.issues.length
  const fixable = tool.issues.filter(issue => issue.fixable).length

  return (
    <Box>
      <Box marginRight={2} width={nameWidth}><Text>{tool.name}</Text></Box>
      <Box marginRight={2} width={RESULT_W}><Text color={statusColor(tool.status)}>{statusIcon(tool.status)}</Text></Box>
      <Box marginRight={2} width={ISSUES_W}><Text>{count > 0 ? formatCount(count) : '—'}</Text></Box>
      <Box marginRight={2} width={FIXABLE_W}>{fixable > 0 ? <Text color="green">{formatCount(fixable)}</Text> : <Text dimColor>—</Text>}</Box>
      <Box width={TIME_W}><Text dimColor>{tool.status === 'not-installed' ? '—' : formatDuration(tool.duration)}</Text></Box>
    </Box>
  )
}

/** The closing line: a PASS/FAIL badge and the total wall-clock time. */
function Footer({ report }: { report: GateReport }) {
  return (
    <Box gap={1} marginTop={1}>
      <Badge color={report.ok ? 'green' : 'red'}>{report.ok ? 'PASS' : 'FAIL'}</Badge>
      <Text dimColor>Done in {formatDuration(report.duration)}</Text>
    </Box>
  )
}

/** The full post-run report: issue details, tools that couldn't run, the most-violated rules, the per-tool summary, and the footer. */
export function CheckReport({ cwd, installPrefix, limit, report }: { cwd: string, installPrefix: string, limit: number, report: GateReport }) {
  return (
    <Box flexDirection="column">
      <Details cwd={cwd} limit={limit} report={report} />
      <Unran installPrefix={installPrefix} report={report} />
      <TopRules report={report} />
      <Summary report={report} />
      <Footer report={report} />
    </Box>
  )
}
