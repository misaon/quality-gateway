import common from '@misaon/eslint-config-common'
import { defineConfig } from 'eslint/config'

/** React config. Base for `@misaon/eslint-config-next`, which extends it. */
export const react = defineConfig([
  {
    name: '@misaon/react',
    extends: [common],
    // TODO: React-specific plugins & rules
  },
])

export default react
