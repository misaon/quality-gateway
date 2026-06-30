import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import casePolice from 'eslint-plugin-case-police'
import perfectionist from 'eslint-plugin-perfectionist'
import * as regexp from 'eslint-plugin-regexp'
import sonarjs from 'eslint-plugin-sonarjs'
import unicorn from 'eslint-plugin-unicorn'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

import type { ESLint, Linter } from 'eslint'

const CASE_POLICE_FILES = ['**/*.?([cm])[jt]s?(x)']
export const TS_EXTENSIONS = ['ts', 'tsx', 'mts', 'cts'] as const
const TS_GLOB = `**/*.{${TS_EXTENSIONS.join(',')}}`

export const defaultIgnores = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/coverage/**',
  '**/coverage-reports/**',
  '**/.cache/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.svelte-kit/**',
  '**/.astro/**',
  '**/.output/**',
  '**/.vercel/**',
  '**/.turbo/**',
  '**/.features-gen/**',
  '**/*.min.js',
]

// Expensive, low-value-by-default rules gated to the `hardcore` level — the CLI adds these only when level=hardcore.
export const hardcoreRules = { 'sonarjs/no-commented-code': 'error' } satisfies Linter.RulesRecord

export const strict = defineConfig([
  globalIgnores(defaultIgnores),
  js.configs.recommended,
  unicorn.configs.all,
  sonarjs.configs.recommended,
  regexp.configs['flat/all'],
  stylistic.configs.customize({ braceStyle: '1tbs', indent: 2, quotes: 'single', semi: false }),
  {
    files: CASE_POLICE_FILES,
    name: '@misaon/case-police',
    // cast: case-police's exported config trips exactOptionalPropertyTypes
    plugins: { 'case-police': casePolice as ESLint.Plugin },
    rules: { 'case-police/string-check': 'error' },
  },
  {
    name: '@misaon/sonarjs',
    rules: {
      'sonarjs/arguments-usage': 'error',
      'sonarjs/array-constructor': 'error',
      // redundant with the faster @typescript-eslint/no-deprecated (already on via strictTypeChecked) — both query the same TS diagnostics
      'sonarjs/deprecation': 'off',
      'sonarjs/for-in': 'error',
      'sonarjs/no-built-in-override': 'error',
      'sonarjs/no-collapsible-if': 'error',
      'sonarjs/no-function-declaration-in-block': 'error',
      'sonarjs/no-nested-incdec': 'error',
      'sonarjs/no-nested-switch': 'error',
      'sonarjs/prefer-object-literal': 'error',
    },
  },
  {
    name: '@misaon/base',
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', next: 'return', prev: '*' },
        { blankLine: 'always', next: 'break', prev: '*' },
        { blankLine: 'always', next: 'continue', prev: '*' },
      ],
      'complexity': ['error', 10],
      'curly': ['error', 'all'],
      'eqeqeq': ['error', 'always'],
      'max-depth': ['error', 3],
      'max-nested-callbacks': ['error', 3],
      'max-params': ['error', 4],
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      'no-duplicate-imports': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-nested-ternary': 'error',
      'prefer-template': 'error',
      'unicorn/name-replacements': ['error', { allowList: { args: true } }],
    },
  },
  {
    name: '@misaon/perfectionist',
    plugins: { perfectionist },
    rules: {
      'perfectionist/sort-array-includes': 'error',
      'perfectionist/sort-enums': 'error',
      'perfectionist/sort-export-attributes': 'error',
      'perfectionist/sort-exports': 'error',
      'perfectionist/sort-heritage-clauses': 'error',
      'perfectionist/sort-import-attributes': 'error',
      'perfectionist/sort-imports': ['error', {
        groups: [
          'value-builtin',
          'value-external',
          ['value-internal', 'value-parent', 'value-sibling', 'value-index'],
          'type',
        ],
        newlinesBetween: 1,
        order: 'asc',
        type: 'alphabetical',
      }],
      'perfectionist/sort-interfaces': 'error',
      'perfectionist/sort-intersection-types': 'error',
      'perfectionist/sort-jsx-props': 'error',
      'perfectionist/sort-named-exports': 'error',
      'perfectionist/sort-named-imports': 'error',
      'perfectionist/sort-object-types': 'error',
      'perfectionist/sort-objects': 'error',
      'perfectionist/sort-sets': 'error',
      // object types last, to agree with unicorn/prefer-type-literal-last (otherwise the two autofixes oscillate)
      'perfectionist/sort-union-types': ['error', { groups: ['unknown', 'object'] }],
    },
  },
  {
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    files: [TS_GLOB],
    languageOptions: { parserOptions: { projectService: true } },
    name: '@misaon/typescript',
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['error', {
        arrayLiteralTypeAssertions: 'never',
        assertionStyle: 'as',
        objectLiteralTypeAssertions: 'never',
      }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'sonarjs/class-prototype': 'error',
      'sonarjs/no-inconsistent-returns': 'error',
      'sonarjs/no-incorrect-string-concat': 'error',
      'sonarjs/non-number-in-arithmetic-expression': 'error',
      'sonarjs/operation-returning-nan': 'error',
      'sonarjs/prefer-immediate-return': 'error',
      'sonarjs/useless-string-operation': 'error',
      'sonarjs/values-not-convertible-to-numbers': 'error',
    },
  },
])

export const recommended = strict

export default recommended
