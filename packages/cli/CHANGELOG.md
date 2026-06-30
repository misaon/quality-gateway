# Changelog

## [0.2.0](https://github.com/misaon/quality-gateway/compare/quality-gateway@0.1.0...quality-gateway@0.2.0) (2026-06-30)


### ✨ Features

* **cli:** add quality-gateway CLI with init, check and fix ([356b880](https://github.com/misaon/quality-gateway/commit/356b880137861bf4d33e8aae5d0dd0f4a41c3601))


### ♻️ Refactoring

* **cli:** extract run() from the bin entry ([b903eac](https://github.com/misaon/quality-gateway/commit/b903eac028d00d53cf13c1ca0846f4c4358cc2ff))
* **cli:** use top-level await and braced switch cases ([d5be828](https://github.com/misaon/quality-gateway/commit/d5be828460ca9e88d7c61627c43a0292bdd75b31))
* **repo:** remove comments from source and config files ([3a0f624](https://github.com/misaon/quality-gateway/commit/3a0f6249dfe615bbe9396b91b9f5906ed2bfb1bb))


### 📝 Documentation

* **cli:** use en-US spelling in README ([0f9439f](https://github.com/misaon/quality-gateway/commit/0f9439fd0940f3d357ec5457a4c9b6425c6aa768))
* **repo:** fix markdownlint findings ([cf2eac8](https://github.com/misaon/quality-gateway/commit/cf2eac83801ebc78cce11e1e806e25f0486eb3b7))


### ✅ Tests

* **cli:** add in-process unit tests for run() ([e07910d](https://github.com/misaon/quality-gateway/commit/e07910d4c3f26bc9eb22bb75b9b0fd3f75c31fef))
* **repo:** add config-loading and CLI integration tests ([b57f3b7](https://github.com/misaon/quality-gateway/commit/b57f3b79e1984572bc7648b28ec4ea6388d0ba62))


### 📦 Build System

* **repo:** switch formatter from Prettier to oxfmt ([845de7a](https://github.com/misaon/quality-gateway/commit/845de7a59553ab4dd283cb6d15e44c9351ba3e01))


### 🤖 Continuous Integration

* **repo:** validate package publishability with publint and attw ([b534788](https://github.com/misaon/quality-gateway/commit/b534788352c316053c787e44fc35f8a33c05af11))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @misaon/eslint-config-common bumped to 0.4.0
  * devDependencies
    * @misaon/eslint-config-next bumped to 0.2.0
    * @misaon/eslint-config-node bumped to 0.2.0
    * @misaon/eslint-config-react bumped to 0.2.0
  * peerDependencies
    * @misaon/eslint-config-next bumped to 0.2.0
    * @misaon/eslint-config-node bumped to 0.2.0
    * @misaon/eslint-config-react bumped to 0.2.0
