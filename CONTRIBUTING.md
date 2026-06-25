# Contributing to Quality Gateway

Thanks for your interest in contributing! By participating you agree to abide by
our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Project layout

This is a [pnpm](https://pnpm.io/) workspace monorepo. Each publishable package
maps to a commit **scope**:

| Package                         | npm name                       | Scope    |
| ------------------------------- | ------------------------------ | -------- |
| `packages/eslint-config-common` | `@misaon/eslint-config-common` | `common` |
| `packages/eslint-config-react`  | `@misaon/eslint-config-react`  | `react`  |
| `packages/cli`                  | `@misaon/quality-gateway`      | `cli`    |

## Development setup

Requires **Node.js ≥ 22**. The repo pins its package manager via the
`packageManager` field, so any recent **pnpm** will automatically use the pinned
version (`pnpm install -g pnpm` if you don't have it).

```sh
git clone https://github.com/misaon/quality-gateway.git
cd quality-gateway
pnpm install      # installs deps + git hooks (via the prepare script)

pnpm build        # build all packages (run before lint — the repo lints itself)
pnpm lint         # eslint .
pnpm typecheck    # tsc --noEmit across packages
```

Target a single package with a filter, e.g. `pnpm --filter @misaon/eslint-config-react build`.

## Commit messages — Conventional Commits (enforced)

This project **enforces [Conventional Commits](https://www.conventionalcommits.org/)**
via commitlint (a local `commit-msg` hook) and CI.

> [!IMPORTANT]
> PRs are **rebase-merged** — every commit lands on `main` as-is and feeds the
> changelog. So **each commit** must be a valid Conventional Commit. Tidy your
> branch into atomic, well-described commits (e.g. `git rebase -i`) before
> requesting review — no `wip` / `fix typo` noise.

**Format:** `<type>(<scope>): <description>`

- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- **Scopes:** `common`, `react`, `cli` (omit for repo-wide changes)
- **Breaking change:** add `!` — e.g. `feat(react)!: drop ESLint 9 support`

```
feat(react): add jsx-a11y recommended rules
fix(cli): resolve config path on Windows
chore(repo): bump dev dependencies
```

## Pull request workflow

1. Fork and branch off `main`.
2. Make your change as one or more **atomic** commits, keeping each commit's
   file changes within the package it affects (release tooling routes changes to
   a package by the files it touches).
3. Ensure `pnpm build`, `pnpm typecheck`, and `pnpm lint` pass.
4. Open a PR and fill in the template.
5. After review, a maintainer **rebase-merges** it, so your commits land linearly
   on `main` exactly as written.

## Releases

Releases are automated with [release-please](https://github.com/googleapis/release-please):

- On every merge to `main`, release-please reads the Conventional Commits and
  maintains a **release PR** that bumps versions and updates each package's
  `CHANGELOG.md`.
- `fix:` → patch, `feat:` → minor, breaking (`!`) → major (while pre-1.0,
  breaking changes bump the minor).
- When a maintainer merges the release PR, the affected packages are tagged,
  a **GitHub Release** is published, and the packages are published to npm.

Because we rebase-merge, **each** commit becomes its own changelog entry — so
clear, atomic commit messages directly shape the changelog.
