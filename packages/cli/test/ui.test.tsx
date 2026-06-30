import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'

import { type Issue, toGateReport, type ToolReport } from '../src/commands/report.js'
import { CheckReport } from '../src/ui/check/report.js'

const issue = (partial: Partial<Issue>): Issue => ({ column: 0, file: 'f', fixable: false, line: 0, message: 'm', rule: '', severity: 'error', ...partial })
const tool = (partial: Partial<ToolReport>): ToolReport => ({ command: 'c', detail: '', duration: 12, issues: [], name: 't', status: 'passed', ...partial })

describe('CheckReport', () => {
  it('renders grouped details, the most-violated rules, the summary and a FAIL badge', () => {
    const report = toGateReport([
      tool({ command: 'eslint', issues: [issue({ column: 5, file: 'a.ts', line: 3, message: 'unexpected var', rule: 'no-var' })], name: 'eslint', status: 'failed' }),
      tool({ name: 'format', status: 'passed' }),
    ], 1500)

    const { lastFrame } = render(<CheckReport cwd="/repo" installPrefix="pnpm add -D" limit={100} report={report} />)
    const frame = lastFrame() ?? ''

    expect(frame).toContain('a.ts')
    expect(frame).toContain('no-var')
    expect(frame).toContain('eslint')
    expect(frame).toContain('Top rules')
    expect(frame).toContain('FAIL')
  })

  it('renders an actionable install hint for a tool whose binary is missing', () => {
    const report = toGateReport([tool({ command: 'knip', name: 'knip', status: 'not-installed' })], 100)

    const { lastFrame } = render(<CheckReport cwd="/repo" installPrefix="pnpm add -D" limit={100} report={report} />)

    expect(lastFrame() ?? '').toContain('pnpm add -D knip')
  })
})
