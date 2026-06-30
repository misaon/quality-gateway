import { Box, Text, useStdout } from 'ink'
import BigText from 'ink-big-text'
import Gradient from 'ink-gradient'

import { BRAND_GRADIENT } from './theme.js'

// The figlet wordmark is ~75 cols wide in the `tiny` font; below this we fall back to a plain gradient wordmark.
const WIDE_ENOUGH = 78

/** The gradient figlet wordmark + tagline that opens every run — the CLI's visual signature. */
export function Banner({ version }: { version: string }) {
  const { stdout } = useStdout()
  const columns = stdout.columns || 80

  return (
    <Box flexDirection="column" marginBottom={1}>
      {columns >= WIDE_ENOUGH
        ? (
            <Gradient colors={BRAND_GRADIENT}>
              <BigText font="tiny" text="quality-gateway" />
            </Gradient>
          )
        : (
            <Text bold>
              <Gradient colors={BRAND_GRADIENT}>quality-gateway</Gradient>
            </Text>
          )}
      <Text dimColor>the quality gateway · v{version}</Text>
    </Box>
  )
}
