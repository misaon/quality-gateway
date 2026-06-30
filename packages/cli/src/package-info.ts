import { readFileSync } from 'node:fs'

// The CLI's own package.json, read at runtime — it sits outside tsc's src rootDir so a static JSON import is out; the assertion narrows JSON.parse's `any` to the fields we read.
export const { description, version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { description: string, version: string }
