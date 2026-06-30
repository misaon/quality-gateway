import common from '@misaon/eslint-config-common'
import nodePlugin from 'eslint-plugin-n'
import { defineConfig } from 'eslint/config'

export const node = defineConfig([
  {
    extends: [common],
    name: '@misaon/node',
  },
  nodePlugin.configs['flat/recommended'],
  {
    name: '@misaon/node/rules',
    rules: {
      'n/callback-return': 'error',
      'n/file-extension-in-import': ['error', 'always'],
      'n/handle-callback-err': 'error',
      'n/no-callback-literal': 'error',
      'n/no-new-require': 'error',
      'n/no-path-concat': 'error',
      'n/no-unpublished-bin': 'error',
      'n/prefer-global/buffer': 'error',
      'n/prefer-global/console': 'error',
      'n/prefer-global/crypto': 'error',
      'n/prefer-global/process': 'error',
      'n/prefer-global/text-decoder': 'error',
      'n/prefer-global/text-encoder': 'error',
      'n/prefer-global/timers': 'error',
      'n/prefer-global/url': 'error',
      'n/prefer-global/url-search-params': 'error',
      'n/prefer-promises/dns': 'error',
      'n/prefer-promises/fs': 'error',
    },
  },
])

export default node
