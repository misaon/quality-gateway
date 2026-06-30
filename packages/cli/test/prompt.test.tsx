import { setTimeout } from 'node:timers/promises'

import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmPrompt, SelectPrompt } from '../src/ui/prompt.js'

describe('SelectPrompt', () => {
  it('shows the question and resolves the highlighted option on Enter', async () => {
    const onResolve = vi.fn()
    const { lastFrame, stdin } = render(
      <SelectPrompt
        defaultValue="strict"
        message="Rule level?"
        onResolve={onResolve}
        options={[{ label: 'recommended', value: 'recommended' }, { label: 'strict', value: 'strict' }]}
      />,
    )

    expect(lastFrame()).toContain('Rule level?')
    stdin.write('\r')
    await setTimeout(50)

    expect(onResolve).toHaveBeenCalledWith('strict')
  })
})

describe('ConfirmPrompt', () => {
  it('resolves true when the user confirms', async () => {
    const onResolve = vi.fn()
    const { stdin } = render(<ConfirmPrompt message="Install devDependencies?" onResolve={onResolve} />)

    stdin.write('y')
    await setTimeout(50)

    expect(onResolve).toHaveBeenCalledWith(true)
  })
})
