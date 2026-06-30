import { existsSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import path from 'node:path'

import spawn from 'nano-spawn'
import { detectPackageManager } from 'nypm'

import { type GateReport, type RawResult, toGateReport, type ToolReport, toToolReport } from './report.js'

import type { Tool } from './gate.js'

// `pm name → add-as-dev command`, for the actionable "not installed" hint; npm is the safe default.
const INSTALL_PREFIX: Record<string, string> = { bun: 'bun add -d', deno: 'deno add -D', npm: 'npm install -D', pnpm: 'pnpm add -D', yarn: 'yarn add -D' }
// Raise Node's heap so type-aware lint on large monorepos doesn't run out of memory; the user's NODE_OPTIONS still wins.
const TOOL_ENV = { ...process.env, NODE_OPTIONS: `--max-old-space-size=8192 ${process.env['NODE_OPTIONS'] ?? ''}`.trim() }
// Bound a hung tool so the gate can't block forever; 5 min is generous enough not to kill a legit run on a huge repo.
const TOOL_TIMEOUT_MS = 300_000

/** Lifecycle callbacks so a UI can render live progress without the runner knowing how anything is displayed. */
export type RunHooks = {
  onToolDone?: (report: ToolReport) => void
  onToolStart?: (tool: Tool) => void
}

/**
Run every tool concurrently (capped at the cores minus one) and collect a {@link GateReport}.
A shared iterator feeds N workers, so this is a simple bounded pool with no display coupling — the
optional hooks are the only window a renderer gets onto progress.
*/
export async function runChecks(tools: Tool[], cwd: string, hooks: RunHooks = {}): Promise<GateReport> {
  const ordered = orderForDisplay(tools, cwd)
  const reports: ToolReport[] = []
  const start = Date.now()
  // `true`/Infinity would spawn one heap-bumped tsc per package at once on a big monorepo → OOM; cap at the cores minus one.
  const concurrency = Math.max(1, Math.min(ordered.length, availableParallelism() - 1))
  // One iterator shared across the workers: on the single JS thread each `.next()` hands out a distinct item, so no task runs twice.
  const queue = ordered.entries()

  async function worker(): Promise<void> {
    for (const [index, tool] of queue) {
      hooks.onToolStart?.(tool)

      const report = await runTool(tool, cwd)

      reports[index] = report
      hooks.onToolDone?.(report)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  return toGateReport(reports, Date.now() - start)
}

/** Float tools whose local binary is absent to the end, so the report reads problems → passes → not-installed. The spawn's ENOENT result stays the source of truth for status; this only affects order. */
function orderForDisplay(tools: Tool[], cwd: string): Tool[] {
  return tools.toSorted((left, right) => Number(!hasLocalBinary(left.command, cwd)) - Number(!hasLocalBinary(right.command, cwd)))
}

function hasLocalBinary(command: string, cwd: string): boolean {
  return existsSync(path.join(cwd, 'node_modules', '.bin', command))
}

/** The "add as a dev dependency" command for the project's package manager (npm by default). */
export async function resolveInstallPrefix(cwd: string): Promise<string> {
  const pm = await detectPackageManager(cwd)

  return INSTALL_PREFIX[pm?.name ?? ''] ?? 'npm install -D'
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
