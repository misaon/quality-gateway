import { ConfirmInput, Select } from '@inkjs/ui'
import { Box, render, Text, useApp } from 'ink'

type Option<Value extends string> = { label: string, value: Value }

/** A one-shot single-select prompt: the question, then the @inkjs/ui Select; resolves the chosen value on Enter. */
export function SelectPrompt<Value extends string>({ defaultValue, message, onResolve, options }: { defaultValue: Value, message: string, onResolve: (value: Value) => void, options: Option<Value>[] }) {
  const { exit } = useApp()

  const handleChange = (value: string): void => {
    onResolve(value as Value)
    exit()
  }

  // @inkjs/ui Select highlights the first option and only fires onChange when the value *changes* — so we float the
  // default to the top (it becomes the highlighted first option) and deliberately omit `defaultValue`, so that even
  // pressing Enter straight away registers as a change and resolves. Setting defaultValue would make accepting it a no-op.
  const ordered = [...options.filter(option => option.value === defaultValue), ...options.filter(option => option.value !== defaultValue)]

  return (
    <Box flexDirection="column">
      <Text><Text color="cyan">?</Text> <Text bold>{message}</Text></Text>
      <Select onChange={handleChange} options={ordered} />
    </Box>
  )
}

/** A one-shot yes/no prompt; resolves true on confirm, false on cancel. */
export function ConfirmPrompt({ message, onResolve }: { message: string, onResolve: (isConfirmed: boolean) => void }) {
  const { exit } = useApp()

  const settle = (isConfirmed: boolean): void => {
    onResolve(isConfirmed)
    exit()
  }

  return (
    <Box gap={1}>
      <Text><Text color="cyan">?</Text> <Text bold>{message}</Text></Text>
      <ConfirmInput
        onCancel={() => { settle(false) }}
        onConfirm={() => { settle(true) }}
      />
    </Box>
  )
}

/** Render {@link SelectPrompt} as a standalone Ink app and resolve once the user picks. */
export async function promptSelect<Value extends string>(message: string, options: Option<Value>[], defaultValue: Value): Promise<undefined | Value> {
  let chosen: undefined | Value

  const keep = (value: Value): void => {
    chosen = value
  }

  const app = render(<SelectPrompt defaultValue={defaultValue} message={message} onResolve={keep} options={options} />)

  await app.waitUntilExit()

  return chosen
}

/** Render {@link ConfirmPrompt} as a standalone Ink app and resolve the yes/no answer. */
export async function promptConfirm(message: string): Promise<boolean> {
  let isConfirmed = false

  const keep = (isYes: boolean): void => {
    isConfirmed = isYes
  }

  const app = render(<ConfirmPrompt message={message} onResolve={keep} />)

  await app.waitUntilExit()

  return isConfirmed
}
