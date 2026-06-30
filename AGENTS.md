# Agent instructions

Rules for AI agents working in this repo. Keep every entry terse and concrete — long instructions rot.

## Code

- Write modern, clean, readable TS/JS — current syntax and patterns, no archaic style.
- Name precisely — every function/const/argument/prop must make its intent obvious; no vague (`data`, `tmp`, `handle`) or ambiguous names. (`unicorn/name-replacements` catches abbreviations; semantic clarity isn't lintable — it's on you.)
- Check a library's current docs online before coding against it — don't guess its API; stay compatible with the versions we use.
- Keep it minimal, lean and fast — less code is less to maintain.
- **No dead code.** Every export, type field, param, and branch must be used. knip (exports/files/deps) + `no-unused-vars` (locals) catch most — but NOT a type/object field that's set-but-never-read, nor semantically-redundant code; those are on you. If a value is computed or stored and never consumed, delete it — re-scan touched files after each change.
- **Type-safe over `as`.** Prefer narrowing, type guards (`value is T`) and discriminated unions to type assertions. Reserve `as` for genuine external boundaries — narrowing `unknown`/`any` from `JSON.parse`, a regex match's `.groups`, or a third-party type gap — and give each a one-line WHY; never `as` to silence a type error you can fix by typing the code right. `as const` and `as unknown` are fine. (`@typescript-eslint/consistent-type-assertions` already blocks object/array-literal assertions; semantic soundness of every cast is on you.)
- **No duplication.** Extract shared consts/utils/types into one source both sides import — **even across packages** (`common` is the shared base the others depend on; don't copy a list into a second package to dodge the dependency). A `// keep in sync` / "must match X" comment is the smell → extract instead, never copy. Re-scan for duplication after every change, not just at the end — no lint catches cross-file duplication, so it's on you.
- **Build for growth, not on-mission.** This tool keeps gaining frameworks/plugins/rules — when support is a set that grows, drive it from ONE registry others derive from (detection, types, choices), never hardcoded `if`-chains or per-case maps scattered across files. Adding a new case must be one entry, not edits in five places. Same for any fixed value-set (levels, statuses, choices): ONE `as const` tuple, type DERIVED via `typeof TUPLE[number]` — never a literal-union type **plus** a parallel runtime array (they drift silently; that's exactly how `levels` broke).
- **Lean & fast — never ship a project code it won't use.** The tool will be large: framework-specific packages are optional peer deps loaded via lazy `import()` (a Node app must never pull React/Next plugins), shared code is importable across packages, and expensive work (type-aware lint, large configs) is scoped to the files it applies to and profiled (`TIMING=1 eslint .`) before it lands.
- Before hand-writing non-trivial logic, check online for a modern, lightweight, maintained library that already does it — prefer a vetted dependency (recent releases, active, adopted) over code we must maintain ourselves. Ask before installing.
- **Comment only the non-obvious WHY** (a gotcha, magic number, counter-intuitive choice, rule-disable reason) — one short line. Never restate what the code/names/types/JSDoc already say; if a comment just paraphrases the line below it, delete it.
- **A green gate is not "clean".** Magic literals, duplicated values, repeated string comparisons and oversized functions all sail through lint/types/tests. Treat "all checks green" as the floor, not done — before calling work finished, re-read every file you touched as a reviewer and fix structure, duplication and naming by hand.

## DX & design

- DX _is_ the product — developers judge a quality tool by how it feels, so aim for a **wow** effect, not merely functional output.
- Invest in CLI design on every surface (reports, prompts, progress, `--help`, errors): color, spacing, symbols, alignment, clarity. Make it beautiful and attractive in all directions.

## Lint rules

- Enable each plugin's **full** rule set (`configs.all`) by default, never a weak preset — unless the plugin's `all` is unsafe or documented-against, then curate the safe rules (@stylistic → `customize()`, core ESLint → `eslint.configs.recommended` as the base + hand-pick the rest, perfectionist → hand-picked). `strict` keeps everything on; `recommended` is where impractical rules get relaxed.
- Before adding or tweaking a rule, check whether a preset we already extend (`unicorn.configs.all`, `tseslint.configs.*TypeChecked`, `@stylistic.customize`) already enables it — and with which options. Don't re-declare what's already active; it only bloats the config.
- Fix the code to satisfy a rule, not disable it. Before disabling or relaxing one, check online for rule options that remove the need — and get my explicit approval. This is a quality gateway, not a pile of exceptions.
- When devising or adding a rule, verify online it reflects a modern, community-accepted pattern that makes sense — nothing archaic.
- Before writing a custom rule, check online whether a maintained plugin already provides it — reuse it, don't reinvent.
- When picking a plugin, vet its health online (recent releases, active maintenance, adoption/stars) and choose the best-maintained candidate — no abandoned, unsupported, or no-name plugins.
- Verify online that the rules/plugins we combine are compatible — no rules fighting each other, nothing used against a plugin's documented intent.
- Scope rules/plugins to the files they apply to via `files` globs — narrow scope for a perf boost where it helps, but never at the cost of analysis quality.
- After adding or changing a rule, re-measure per-rule cost with `TIMING=1 eslint .` and confirm nothing regressed — the config keeps growing, keep it fast.
- **Perf: measure, then optimize without disabling rules.** Profile (`TIMING=1`, ESLint `--stats`) for the real hot rules — type-aware per-rule numbers mislead (the first rule pays for shared type info). Levers, in order: drop **redundant** rules (keep coverage via the canonical — e.g. `sonarjs/deprecation` → `@typescript-eslint/no-deprecated`); **tier** expensive low-value rules to `hardcore` (`hardcoreRules` in common); **scope** rules to the files they apply to. Caching (`--cache --cache-strategy content`, written under `node_modules/.cache` so CI persists one dir) is the LAST layer, after the real wins — never disable a rule purely for speed, and **never trust a cache that changes results**: verify identical output with and without it (knip's metadata cache over-reported `22 → 286` on reuse in a monorepo → dropped).

## Workflow

- This repo **dogfoods its own built config** (`eslint.config.mjs` → `@misaon/quality-gateway/eslint`, loaded from `dist`). After editing any config source (`eslint-config-*/src`, `cli/src/{eslint,oxfmt}.ts`), **rebuild before linting** (`pnpm build`) — otherwise you lint/format against stale rules.
- **Dogfood parity — the repo's own config IS a scaffolded project.** Because we dogfood, the repo's root configs must use the exact filenames and file types `init` writes (`commands/scaffold.ts`): `quality-gateway.config.ts`, `eslint.config.mjs`, `oxfmt.config.ts`, `knip.config.ts`, `cspell.json`. Change the scaffold → change the repo's config to match, and vice versa — otherwise we ship a config form we never run ourselves. (Repo-specific content may differ — extra rule blocks, monorepo `workspaces` — but never the filename or type; e.g. `knip.config.ts`, never `knip.json`.)
- Don't trust the gate blindly — build tsconfigs are `src`-only, tool ignores drift, type-aware lint needs every file in a tsconfig `projectService` can find. Verify scope when it matters (`tsc -p <cfg> --listFilesOnly` vs every `.ts`; each tool sees only real source).
- After any rule/config change, run the **whole** gate (typecheck · lint · format:check · spell · lint:md · knip · test · coverage · mutation · lint:publish), not just lint — fixes cascade (autofixes, refactors, tsconfig edits trip other tools).
- **Never touch a `README.md`** unless I explicitly ask for it — their content is mine and still being tuned (they carry `TODO` markers; don't treat them as a source of truth). Routine code/config work leaves every README alone.
