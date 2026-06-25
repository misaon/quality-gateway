# Contributing to Quality Gateway

Thanks for your interest in contributing! By participating you agree to abide by
our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Project layout

This is a [pnpm](https://pnpm.io/) workspace monorepo. Each publishable package
maps to a commit **scope**:

| Package | npm name | Scope |
| --- | --- | --- |
| `packages/eslint-config-common` | `@misaon/eslint-config-common` | `common` |
| `packages/eslint-config-react` | `@misaon/eslint-config-react` | `react` |
| `packages/cli` | `@misaon/quality-gateway` | `cli` |

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
> PRs are **squash-merged**, so the **PR title** is what lands in history and
> drives releases. Make the **PR title** a valid Conventional Commit.

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
2. Make your change; keep each commit's file changes within the package it affects
   (release tooling routes changes to a package by the files it touches).
3. Ensure `pnpm build`, `pnpm typecheck`, and `pnpm lint` pass.
4. Open a PR with a **Conventional Commit title** and fill in the template.
5. After review, a maintainer **squash-merges** it.

## Releases

Releases are automated with [release-please](https://github.com/googleapis/release-please):

- On every merge to `main`, release-please reads the Conventional Commits and
  maintains a **release PR** that bumps versions and updates each package's
  `CHANGELOG.md`.
- `fix:` → patch, `feat:` → minor, breaking (`!`) → major (while pre-1.0,
  breaking changes bump the minor).
- When a maintainer merges the release PR, the affected packages are tagged,
  a **GitHub Release** is published, and the packages are published to npm.

That's why a correct PR title matters — it directly determines the next version
and the changelog entry.
