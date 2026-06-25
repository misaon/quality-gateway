<!--
  ⚠️ This repo REBASE-MERGES PRs: every commit lands on `main` as-is and feeds
  the changelog. So EACH COMMIT (not the PR title) must be a valid Conventional
  Commit. Tidy your branch into atomic commits (e.g. `git rebase -i`) first:

      feat(react): add jsx-a11y rule set
      fix(cli): resolve config path on Windows
      docs: clarify pnpm setup

  Types:  feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
  Scopes: common, react, cli  (or omit for repo-wide changes)
  Breaking change: add '!'  e.g.  feat(common)!: drop ESLint 9 support
-->

## Description

<!-- What does this PR do and why? -->

Closes #

## Checklist

- [ ] **Every commit** is a valid [Conventional Commit](https://www.conventionalcommits.org/) (commits land on `main` via rebase and drive the changelog).
- [ ] My branch is tidied into atomic commits (no "wip" / "fix typo" noise).
- [ ] `pnpm build`, `pnpm typecheck`, and `pnpm lint` pass.
- [ ] I updated docs where relevant.
- [ ] I read the [contributing guidelines](../blob/main/CONTRIBUTING.md).
