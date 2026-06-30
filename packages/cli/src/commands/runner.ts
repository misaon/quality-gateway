import { existsSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import Table from 'cli-table3'
import cliTruncate from 'cli-truncate'
import { colors } from 'consola/utils'
import { Listr, ListrDefaultRendererLogLevels, type ListrTask } from 'listr2'
import spawn from 'nano-spawn'
import { detectPackageManager } from 'nypm'
import stringWidth from 'string-width'

import { version } from '../package-info.js'
import { gateToolInfo, type Tool } from './gate.js'
import { type DetailRow, detailRows, formatCount, formatDuration, ruleDocumentUrl, titleFor } from './render.js'
import { type GateReport, type RawResult, statusRank, toGateReport, type ToolReport, topRules, toToolReport } from './report.js'

const BORDERLESS_CHARS = { 'left-mid': '', 'mid': '', 'mid-mid': '', 'right-mid': '' }
const DETAIL_LIMIT = 100
// Glyph for a tool whose binary is absent — a neutral "unavailable", distinct from the red ✖ of a real failure.
const NOT_INSTALLED_ICON = '⊘'
// `pm name → add-as-dev command`, for the actionable "not installed" hint; npm is the safe default.
const INSTALL_PREFIX: Record<string, string> = { bun: 'bun add -d', deno: 'deno add -D', npm: 'npm install -D', pnpm: 'pnpm add -D', yarn: 'yarn add -D' }
// Raise Node's heap so type-aware lint on large monorepos doesn't run out of memory; the user's NODE_OPTIONS still wins.
const TOOL_ENV = { ...process.env, NODE_OPTIONS: `--max-old-space-size=8192 ${process.env['NODE_OPTIONS'] ?? ''}`.trim() }
// Bound a hung tool so the gate can't block forever; 5 min is generous enough not to kill a legit run on a huge repo.
const TOOL_TIMEOUT_MS = 300_000
// OSC 8 hyperlink delimiters: ESC ] 8 ; ; <url> BEL <text> ESC ] 8 ; ; BEL.
const HYPERLINK_INTRO = `${String.fromCodePoint(27)}]8;;`
const HYPERLINK_END = String.fromCodePoint(7)

/** Run the tools (live task list, or silent when collecting for JSON), print the details, set the exit code. */
export async function runAndReport(tools: Tool[], cwd: string, isJson: boolean, shouldListAll = false): Promise<void> {
  if (!isJson) {
    const versionTag = colors.dim(`v${version}`)
    const banner = `${colors.bold(colors.cyan('quality-gateway'))} ${versionTag}`

    process.stdout.write(`${banner}\n\n`)
  }

  const report = await runGate(tools, cwd, isJson)

  if (isJson) {
    process.stdout.write(`${JSON.stringify(report, undefined, 2)}\n`)
  } else {
    // The report is already styled and column-aligned, so write it verbatim — consola.log would reflow markdown (e.g. strip `code` backticks) and break the alignment.
    const details = renderDetails(report, process.stdout.columns || 120, cwd, shouldListAll ? Infinity : DETAIL_LIMIT)

    if (details !== '') {
      process.stdout.write(`\n${details}\n`)
    }

    const unran = await renderUnran(report, cwd)

    if (unran !== '') {
      process.stdout.write(`\n${unran}\n`)
    }

    const top = renderTopRules(report)

    if (top !== '') {
      process.stdout.write(`\n${top}\n`)
    }

    process.stdout.write(`\n${renderSummary(report)}\n`)

    const done = colors.dim(`\nDone in ${formatDuration(report.duration)}`)

    process.stdout.write(`${done}\n`)
  }

  if (!report.ok) {
    process.exitCode = 1
  }
}

/** Run every tool in parallel as a live listr2 task list (silent collects results without rendering). */
export async function runGate(tools: Tool[], cwd: string, isSilent = false): Promise<GateReport> {
  const ordered = orderForDisplay(tools, cwd)
  const reports: ToolReport[] = []
  const start = Date.now()

  const tasks = new Listr(
    ordered.map((tool, index): ListrTask => ({
      task: async (_, task) => {
        const report = await runTool(tool, cwd)
        reports[index] = report
        // Append the elapsed time ourselves: listr2's timer renders only for tasks that succeed, so a failing eslint/knip would otherwise show none.
        task.title = report.status === 'not-installed' ? titleFor(report) : `${titleFor(report)}  ${colors.dim(formatDuration(report.duration))}`

        if (report.status === 'not-installed') {
          task.skip(task.title)

          return
        }

        if (report.status !== 'passed') {
          throw new Error(task.title)
        }
      },
      title: tool.name,
    })),
    {
      // Cap parallelism to the cores (minus one); `true` is Infinity, which on a big monorepo spawns one heap-bumped tsc per package at once → OOM.
      concurrent: Math.max(1, availableParallelism() - 1),
      exitOnError: false,
      fallbackRenderer: isSilent ? 'silent' : 'simple',
      renderer: isSilent ? 'silent' : 'default',
      // Replace listr2's "skipped" glyph (↓) with our not-installed icon so the live list and the report agree.
      rendererOptions: { icon: { [ListrDefaultRendererLogLevels.SKIPPED_WITH_COLLAPSE]: colors.dim(NOT_INSTALLED_ICON), [ListrDefaultRendererLogLevels.SKIPPED_WITHOUT_COLLAPSE]: colors.dim(NOT_INSTALLED_ICON) }, showErrorMessage: false },
    },
  )

  await tasks.run()

  return toGateReport(reports, Date.now() - start)
}

/** Float tools whose local binary is absent to the end, so the live list reads problems → passes → not-installed. The spawn's ENOENT result remains the source of truth for status; this only affects display order. */
function orderForDisplay(tools: Tool[], cwd: string): Tool[] {
  return tools.toSorted((left, right) => Number(!hasLocalBinary(left.command, cwd)) - Number(!hasLocalBinary(right.command, cwd)))
}

function hasLocalBinary(command: string, cwd: string): boolean {
  return existsSync(path.join(cwd, 'node_modules', '.bin', command))
}

function pad(text: string, width: number): string {
  return text + ' '.repeat(Math.max(0, width - stringWidth(text)))
}

/** Wrap text in an OSC 8 terminal hyperlink — only on a TTY (the escape sequences would corrupt piped or redirected output). */
function link(text: string, url: string): string {
  return process.stdout.isTTY ? `${HYPERLINK_INTRO}${url}${HYPERLINK_END}${text}${HYPERLINK_INTRO}${HYPERLINK_END}` : text
}

/** Summary glyph per status — distinct from the failure ✖ so a missing tool reads as "unavailable", not "broken". */
function statusIcon(tool: ToolReport): string {
  if (tool.status === 'passed') {
    return colors.green('✔')
  }

  if (tool.status === 'not-installed') {
    return colors.dim(NOT_INSTALLED_ICON)
  }

  return colors.red('✖')
}

type ColumnWidths = { message: number, position: number, tool: number }

/** `line:col` for an issue (empty when it has no line — e.g. a whole-file format/spell finding). */
function positionText(row: DetailRow): string {
  return row.line > 0 ? `${String(row.line)}:${String(row.column)}` : ''
}

/** One issue row under its file header: the position (OSC 8-linked to the exact line), the message, the tool that flagged it, and the rule (linked to its docs). */
function renderRow(row: DetailRow, fileUrl: string, widths: ColumnWidths): string {
  // Pad before linking so the OSC 8 escapes never throw off the column width.
  const paddedPosition = pad(positionText(row), widths.position)
  const position = row.line > 0 ? link(paddedPosition, `${fileUrl}#${String(row.line)}`) : paddedPosition
  // ESLint wraps identifiers in markdown backticks; strip them so the text reads cleanly and its rendered width matches the padding.
  const message = pad(cliTruncate(row.message.replaceAll(/\s+/gv, ' ').replaceAll('`', '').trim(), widths.message), widths.message)
  const documentUrl = ruleDocumentUrl(row.rule)
  const linkedRule = documentUrl === undefined ? row.rule : link(row.rule, documentUrl)
  const rule = row.rule === '' ? colors.dim('—') : colors.yellow(linkedRule)

  return `  ${colors.dim(position)}  ${message}  ${colors.dim(pad(row.tool, widths.tool))}  ${rule}`
}

/** Widest rendered width of `measure(row)` across the rows — a loop, not Math.max(...spread), so the tens of thousands of rows `--all` can pass never overflow the argument list. */
function widestColumn(rows: DetailRow[], measure: (row: DetailRow) => string): number {
  let widest = 0

  for (const row of rows) {
    widest = Math.max(widest, stringWidth(measure(row)))
  }

  return widest
}

/** The issues (capped at `limit`) grouped under each file (blank-line separated): a clickable path header, then rows aligned as position · message · tool · rule. */
export function renderDetails(report: GateReport, columns: number, cwd: string, limit: number = DETAIL_LIMIT): string {
  const rows = detailRows(report)

  if (rows.length === 0) {
    return ''
  }

  const shown = rows.slice(0, limit)
  const positionWidth = widestColumn(shown, positionText)
  const toolWidth = widestColumn(shown, row => row.tool)
  const ruleWidth = widestColumn(shown, row => row.rule)
  // The path is its own header line, so the indented columns share the terminal only with each other — no long path to overflow and wrap the row.
  const messageWidth = Math.max(30, columns - positionWidth - toolWidth - ruleWidth - 8)
  const widths = { message: messageWidth, position: positionWidth, tool: toolWidth }

  const lines: string[] = []
  let lastFile = ''

  for (const row of shown) {
    const fileUrl = pathToFileURL(path.resolve(cwd, row.file)).href

    if (row.file !== lastFile) {
      // Blank line between file groups so each file's issues read as a distinct section.
      if (lastFile !== '') {
        lines.push('')
      }

      lastFile = row.file
      lines.push(colors.cyan(link(row.file, fileUrl)))
    }

    lines.push(renderRow(row, fileUrl, widths))
  }

  const body = lines.join('\n')

  if (rows.length <= limit) {
    return body
  }

  const more = colors.dim(`… and ${formatCount(rows.length - limit)} more — re-run with --all to list them all, or --json for machine output`)

  return `${body}\n${more}`
}

/** Tools that produced no issue detail (crashed, or binary missing): errored first, then the missing ones with an actionable install command. */
async function renderUnran(report: GateReport, cwd: string): Promise<string> {
  const unran = report.tools
    .filter(tool => tool.status === 'not-installed' || tool.status === 'errored')
    .toSorted((left, right) => statusRank(left.status) - statusRank(right.status))

  if (unran.length === 0) {
    return ''
  }

  // Detect the package manager once, and only when something is actually missing.
  const installPrefix = unran.some(tool => tool.status === 'not-installed') ? await resolveInstallPrefix(cwd) : ''

  return unran.map(tool => unranLine(tool, installPrefix)).join('\n')
}

function unranLine(tool: ToolReport, installPrefix: string): string {
  if (tool.status !== 'not-installed') {
    return `${statusIcon(tool)} ${tool.name} — ${colors.dim(tool.detail === '' ? 'could not run' : tool.detail)}`
  }

  const { package: packageName, purpose } = gateToolInfo(tool.command)
  const install = colors.cyan(`${installPrefix} ${packageName}`)

  return `${statusIcon(tool)} ${tool.name} — not installed, so ${purpose} was skipped. Install it: ${install}`
}

/** The "add as a dev dependency" command for the project's package manager (npm by default). */
async function resolveInstallPrefix(cwd: string): Promise<string> {
  const pm = await detectPackageManager(cwd)

  return INSTALL_PREFIX[pm?.name ?? ''] ?? 'npm install -D'
}

/** A cli-table3 breakdown of every tool (missing ones last): result, issue count, how many are auto-fixable, and time. */
function renderSummary(report: GateReport): string {
  const table = new Table({
    chars: BORDERLESS_CHARS,
    head: [colors.dim('check'), colors.dim('result'), colors.dim('issues'), colors.dim('auto-fix'), colors.dim('time')],
    style: { border: ['dim'], head: [] },
  })

  // Same grouping as the live list: problems first, then passes, then not-installed.
  const tools = report.tools.toSorted((left, right) => statusRank(left.status) - statusRank(right.status))

  for (const tool of tools) {
    const count = tool.issues.length
    const fixable = tool.issues.filter(issue => issue.fixable).length

    table.push([
      tool.name,
      statusIcon(tool),
      count > 0 ? formatCount(count) : '—',
      fixable > 0 ? colors.green(formatCount(fixable)) : '—',
      tool.status === 'not-installed' ? colors.dim('—') : colors.dim(formatDuration(tool.duration)),
    ])
  }

  return table.toString()
}

/** A small table of the most-violated rules, to help target config tweaks; each rule links to its documentation. */
function renderTopRules(report: GateReport): string {
  const top = topRules(report, 5)

  if (top.length === 0) {
    return ''
  }

  const table = new Table({ chars: BORDERLESS_CHARS, head: [colors.dim('count'), colors.dim('rule')], style: { border: ['dim'], head: [] } })

  for (const { count, rule } of top) {
    const documentUrl = ruleDocumentUrl(rule)

    table.push([colors.yellow(formatCount(count)), colors.dim(documentUrl === undefined ? rule : link(rule, documentUrl))])
  }

  return `${colors.bold('Top rules')}\n${table.toString()}`
}

async function runTool(tool: Tool, cwd: string): Promise<ToolReport> {
  const start = Date.now()
  const raw = await spawnTool(tool, cwd)

  return { ...toToolReport(tool, raw, cwd), duration: Date.now() - start }
}

async function spawnTool(tool: Tool, cwd: string): Promise<RawResult> {
  try {
    // AbortSignal.timeout's timer is unref'd; nano-spawn's `timeout` option leaves a dangling 5-min timer on a failed (e.g. not-installed/ENOENT) spawn that blocks the whole process from exiting.
    const { output, stdout } = await spawn(tool.command, tool.args, { cwd, env: TOOL_ENV, preferLocal: true, signal: AbortSignal.timeout(TOOL_TIMEOUT_MS) })

    return { exitCode: 0, missing: false, output, stdout }
  } catch (error) {
    const failure = error as { cause?: { code?: string }, exitCode?: number, message: string, output?: string, stdout?: string }
    const output = failure.output ?? ''

    return {
      // A missing binary throws with an ENOENT cause → status 'not-installed'; everything else is a real run/failure.
      exitCode: failure.exitCode ?? 1,
      missing: failure.cause?.code === 'ENOENT',
      output: output === '' ? failure.message : output,
      stdout: failure.stdout ?? '',
    }
  }
}
