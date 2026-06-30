import { defaultIgnores } from '@misaon/eslint-config-common'

import { JS_TS_GLOB } from './globs.js'
import { loadPanel } from './panel.js'

import type { Oxfmtrc } from 'oxfmt'

const RESERVED_GLOBS = ['**/CHANGELOG.md', '**/CODE_OF_CONDUCT.md']

export type OxfmtOptions = {
  ignore?: string[]
}

function compose(panelIgnores: string[], { ignore = [] }: OxfmtOptions): Oxfmtrc {
  return {
    // Ignore JS/TS (@stylistic's domain) + build output; oxfmt formats the rest.
    ignorePatterns: [JS_TS_GLOB, ...defaultIgnores, ...RESERVED_GLOBS, ...panelIgnores, ...ignore],
    printWidth: 100,
    semi: false,
    // Match @stylistic so JS in Markdown code fences keeps single quotes and no semicolons.
    singleQuote: true,
  }
}

export async function oxfmt(options: OxfmtOptions = {}): Promise<Oxfmtrc> {
  const { ignores } = await loadPanel()

  return compose(ignores, options)
}

export default oxfmt
