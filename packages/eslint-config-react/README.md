# @misaon/eslint-config-react

ESLint flat config for **React**. Extends `@misaon/eslint-config-common`.

```sh
pnpm add -D @misaon/eslint-config-react eslint
```

```js
// eslint.config.js
import react from '@misaon/eslint-config-react'

export default [...react]
```

> This package is also the **base for `@misaon/eslint-config-next`** — Next.js is
> React plus a thin plugin layer, so the future `next` config simply
> `extends: [react]`. Plain React projects never pull in the Next plugin.

> **Status:** scaffold — empty beyond inheriting `common`. React plugins/rules
> are added once approved.
