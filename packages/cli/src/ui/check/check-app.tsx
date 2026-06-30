import { Spinner } from '@inkjs/ui'
import { Box, Text, useApp } from 'ink'
import { useEffect, useState } from 'react'

import { formatCount, formatDuration } from '../../commands/format.js'
import { runChecks } from '../../commands/run-checks.js'
import { Banner } from '../banner.js'
import { statusColor, statusIcon } from '../theme.js'
import { CheckReport } from './report.js'

import type { Tool } from '../../commands/gate.js'
import type { GateReport, ToolReport } from '../../commands/report.js'

// A tool is queued, in flight, or finished (its full report).
type ToolView = 'pending' | 'running' | ToolReport

/** The trailing summary for a finished tool: empty when it passed, else the issue count or why it didn't run. */
function summaryText(report: ToolReport): string {
  if (report.status === 'passed') {
    return ''
  }

  if (report.status === 'not-installed') {
    return 'not installed'
  }

  if (report.status === 'errored') {
    return 'could not run'
  }

  const count = report.issues.length

  return `${formatCount(count)} ${count === 1 ? 'issue' : 'issues'}`
}

function ToolRow({ name, view }: { name: string, view: ToolView }) {
  if (view === 'pending') {
    return <Text dimColor>○ {name}</Text>
  }

  if (view === 'running') {
    return <Spinner label={name} />
  }

  const summary = summaryText(view)

  return (
    <Box gap={1}>
      <Text color={statusColor(view.status)}>{statusIcon(view.status)}</Text>
      <Text>{name}</Text>
      {summary !== '' && <Text color={statusColor(view.status)}>{summary}</Text>}
      {view.status !== 'not-installed' && <Text dimColor>{formatDuration(view.duration)}</Text>}
    </Box>
  )
}

/** The live checklist while tools run — each row a dim dot, a spinner, or its finished result. */
function ToolList({ tools, views }: { tools: Tool[], views: Map<string, ToolView> }) {
  return (
    <Box flexDirection="column">
      {tools.map(tool => <ToolRow key={tool.name} name={tool.name} view={views.get(tool.name) ?? 'pending'} />)}
    </Box>
  )
}

/** Drives a `qg check`/`fix` run: streams live per-tool progress, then swaps in the full report and exits. */
export function CheckApp({ cwd, installPrefix, limit, onDone, tools, version }: { cwd: string, installPrefix: string, limit: number, onDone: (report: GateReport) => void, tools: Tool[], version: string }) {
  const { exit } = useApp()
  const [views, setViews] = useState<Map<string, ToolView>>(() => new Map(tools.map(tool => [tool.name, 'pending'])))
  const [report, setReport] = useState<GateReport>()

  useEffect(() => {
    const update = (name: string, view: ToolView) => {
      setViews((previous) => {
        const next = new Map(previous)
        next.set(name, view)

        return next
      })
    }

    const run = async () => {
      try {
        const result = await runChecks(tools, cwd, {
          onToolDone: (toolReport) => { update(toolReport.name, toolReport) },
          onToolStart: (tool) => { update(tool.name, 'running') },
        })

        setReport(result)
      } catch {
        // runChecks settles every tool internally, so this only trips on an unexpected fault — fail loudly rather than hang.
        exit(new Error('quality-gateway failed while running the checks'))
      }
    }

    void run()
  }, [cwd, exit, tools])

  useEffect(() => {
    if (report === undefined) {
      return
    }

    onDone(report)
    exit()
  }, [exit, onDone, report])

  return (
    <Box flexDirection="column">
      <Banner version={version} />
      {report === undefined
        ? <ToolList tools={tools} views={views} />
        : <CheckReport cwd={cwd} installPrefix={installPrefix} limit={limit} report={report} />}
    </Box>
  )
}
