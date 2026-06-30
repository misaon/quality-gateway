import { type Adapter, type Issue, SYNTHETIC_RULE } from './report.js'

type EslintMessage = {
  column?: number
  fix?: unknown
  line?: number
  message: string
  ruleId: null | string
  severity: number
}

type EslintFile = {
  filePath: string
  messages: EslintMessage[]
}

type KnipItem = {
  col?: number
  line?: number
  name: string
}

type KnipFileEntry = { [type: string]: unknown, file: string }

type KnipReport = {
  issues?: KnipFileEntry[]
}

const TSC_LINE = /^(?<file>.+?)\((?<line>\d+),(?<column>\d+)\): error (?<rule>TS\d+): (?<message>.+)$/v
const CSPELL_LINE = /^(?<file>.+?):(?<line>\d+):(?<column>\d+) - Unknown word \((?<word>.+?)\)/v
const OXFMT_FILE = /^(?<file>.+) \(.*\)$/v

/** Parse a tool's JSON stdout; undefined on empty or malformed output so a crashing tool degrades to "errored" instead of throwing and taking the whole gate down. */
function parseJson(stdout: string): unknown {
  try {
    return JSON.parse(stdout) as unknown
  } catch {
    return undefined
  }
}

/** Split tool output into lines, tolerant of Windows CRLF. */
function toLines(output: string): string[] {
  return output.split(/\r?\n/v)
}

/** ESLint `--format json` → array of files, each with messages (severity 2 = error, 1 = warning). */
export const parseEslint: Adapter = (raw) => {
  const files = parseJson(raw.stdout) as EslintFile[] | undefined

  if (!Array.isArray(files)) {
    return []
  }

  return files.flatMap(file => file.messages.map((message): Issue => ({
    column: message.column ?? 0,
    file: file.filePath,
    fixable: message.fix !== undefined,
    line: message.line ?? 0,
    message: message.message,
    rule: message.ruleId ?? '',
    severity: message.severity === 2 ? 'error' : 'warning',
  })))
}

/** tsc `--pretty false` → one diagnostic per line with file, position, error code and message. */
export const parseTsc: Adapter = (raw) => {
  const issues: Issue[] = []

  for (const line of toLines(raw.output)) {
    const groups = TSC_LINE.exec(line)?.groups as undefined | { column: string, file: string, line: string, message: string, rule: string }

    if (!groups) {
      continue
    }

    issues.push({
      column: Number(groups.column),
      file: groups.file,
      fixable: false,
      line: Number(groups.line),
      message: groups.message,
      rule: groups.rule,
      severity: 'error',
    })
  }

  return issues
}

/** cspell default output → `file:line:col - Unknown word (word)`. */
export const parseCspell: Adapter = (raw) => {
  const issues: Issue[] = []

  for (const line of toLines(raw.output)) {
    const groups = CSPELL_LINE.exec(line)?.groups as undefined | { column: string, file: string, line: string, word: string }

    if (!groups) {
      continue
    }

    issues.push({
      column: Number(groups.column),
      file: groups.file,
      fixable: false,
      line: Number(groups.line),
      message: `Unknown word (${groups.word})`,
      rule: SYNTHETIC_RULE.spell,
      severity: 'error',
    })
  }

  return issues
}

/** oxfmt `--check` → exits 0 when clean, else lists unformatted files as `path (Nms)`. */
export const parseOxfmt: Adapter = (raw) => {
  if (raw.exitCode === 0) {
    return []
  }

  const issues: Issue[] = []

  for (const line of toLines(raw.output)) {
    const groups = OXFMT_FILE.exec(line)?.groups as undefined | { file: string }

    if (!groups) {
      continue
    }

    issues.push({
      column: 0,
      file: groups.file,
      fixable: true,
      line: 0,
      message: 'File is not formatted',
      rule: SYNTHETIC_RULE.format,
      severity: 'error',
    })
  }

  return issues
}

/** knip `--reporter json` → `{ issues: [{ file, exports: [...], dependencies: [...], ... }] }`. */
export const parseKnip: Adapter = (raw) => {
  const report = parseJson(raw.stdout) as KnipReport | undefined

  if (report === undefined) {
    return []
  }

  return (report.issues ?? []).flatMap(entry => knipFileIssues(entry))
}

// knip mixes issue arrays with metadata arrays per file (e.g. CODEOWNERS `owners`); only the former are problems.
const KNIP_NON_ISSUE_KEYS = new Set(['owners'])

function knipFileIssues(entry: KnipFileEntry): Issue[] {
  return Object.entries(entry)
    .filter(([type, items]) => !KNIP_NON_ISSUE_KEYS.has(type) && Array.isArray(items))
    .flatMap(([type, items]) => (items as (KnipItem | KnipItem[])[]).map(item => knipIssue(type, entry.file, item)))
}

// `duplicates` items are an array (the group of duplicate members); every other category is a single item.
function knipIssue(type: string, file: string, item: KnipItem | KnipItem[]): Issue {
  const members = Array.isArray(item) ? item : [item]
  const [first] = members

  return {
    column: first?.col ?? 0,
    file,
    fixable: false,
    line: first?.line ?? 0,
    message: `Unused ${type}: ${members.map(member => member.name).join(', ')}`,
    rule: `knip/${type}`,
    severity: 'error',
  }
}

/** Fixers (ESLint --fix, oxfmt write) report pass/fail by exit code; no issue detail. */
export const noIssues: Adapter = () => []
