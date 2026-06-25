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

> **Status:** scaffold — the config is currently empty. Rules are added once the
> underlying tooling is approved and installed.
