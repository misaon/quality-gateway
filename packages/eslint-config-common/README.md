# @misaon/eslint-config-common

Shared ESLint **flat-config** base for the `@misaon` family. Every other
`@misaon/eslint-config-*` package extends this one.

```sh
pnpm add -D @misaon/eslint-config-common eslint
```

```js
// eslint.config.js
import common from '@misaon/eslint-config-common'

export default [...common]
```

## What's included

Currently this base sets **global ignores** for build artifacts — `dist`,
`coverage`, `node_modules`, caches and minified files. Lint rules are added as
the underlying tooling (typescript-eslint, plugins) is approved.
