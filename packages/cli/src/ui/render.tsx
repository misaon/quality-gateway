import { render } from 'ink'

import { resolveInstallPrefix, runChecks } from '../commands/run-checks.js'
import { version } from '../package-info.js'
import { CheckApp } from './check/check-app.js'

import type { Tool } from '../commands/gate.js'
import type { GateReport } from '../commands/report.js'

// Show the first 100 issues by default; `--all` lifts the cap, `--json` is the unbounded machine path.
const DETAIL_LIMIT = 100

/** Run the gate and present it: emit JSON when asked (no Ink), else render the live Ink UI. Sets the process exit code on failure. */
export async function reportChecks(tools: Tool[], cwd: string, options: { json?: boolean, listAll?: boolean } = {}): Promise<void> {
  if (options.json === true) {
    const report = await runChecks(tools, cwd)

    process.stdout.write(`${JSON.stringify(report, undefined, 2)}\n`)

    if (!report.ok) {
      process.exitCode = 1
    }

    return
  }

  // Resolve the package manager once up front so the (possible) "not installed" install hint can render synchronously.
  const installPrefix = await resolveInstallPrefix(cwd)
  const limit = options.listAll === true ? Infinity : DETAIL_LIMIT
  let report: GateReport | undefined

  const app = render(
    <CheckApp
      cwd={cwd}
      installPrefix={installPrefix}
      limit={limit}
      onDone={(result) => { report = result }}
      tools={tools}
      version={version}
    />,
  )

  try {
    await app.waitUntilExit()
  } catch {
    process.exitCode = 1

    return
  }

  if (report !== undefined && !report.ok) {
    process.exitCode = 1
  }
}
