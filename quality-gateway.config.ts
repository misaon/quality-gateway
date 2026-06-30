import { defineConfig } from '@misaon/quality-gateway/config'

export default defineConfig({
  framework: 'none',
  ignores: ['**/.stryker-tmp/**'],
})
