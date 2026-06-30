import { TS_EXTENSIONS } from '@misaon/eslint-config-common'

const JS_EXTENSIONS = ['js', 'jsx', 'mjs', 'cjs']

export const ALL_EXTENSIONS = [...JS_EXTENSIONS, ...TS_EXTENSIONS]
export const JS_TS_GLOB = `**/*.{${ALL_EXTENSIONS.join(',')}}`
