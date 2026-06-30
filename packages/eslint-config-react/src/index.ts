import common from '@misaon/eslint-config-common'
import { defineConfig } from 'eslint/config'

export const react = defineConfig([
  {
    extends: [common],
    name: '@misaon/react',
  },
])

export default react
