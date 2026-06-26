# @misaon/quality-gateway

The Quality Gateway CLI. Detects your stack and wires the matching `@misaon`
quality configs (ESLint & more) into your project.

```sh
# one-off, no install
npx @misaon/quality-gateway init

# or install as a dev dependency
pnpm add -D @misaon/quality-gateway
```

```
quality-gateway <command>

Commands:
  init    Detect your stack and set up the matching @misaon ESLint config
```

> **Status:** scaffold. `init` currently prints its planned behavior — the
> detection/install/write steps are the next milestone.
