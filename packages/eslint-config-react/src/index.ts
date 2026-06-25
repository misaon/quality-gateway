import common from '@misaon/eslint-config-common'
import { defineConfig } from 'eslint/config'

export const react = defineConfig([
  {
    name: '@misaon/react',
    extends: [common],
  },
])

export default react
