import react from '@misaon/eslint-config-react'
import nextPlugin from '@next/eslint-plugin-next'
import { defineConfig } from 'eslint/config'

export const next = defineConfig([
  {
    extends: [react],
    name: '@misaon/next',
  },
  nextPlugin.configs['core-web-vitals'],
  {
    name: '@misaon/next/rules',
    rules: {
      // Pages-Router rule that throws fatally when there is no `pages/` dir — incompatible with the App Router (the modern default).
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
])

export default next
