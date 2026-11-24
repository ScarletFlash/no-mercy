---
'eslint-plugin-no-mercy': patch
---

feat: parts-of-speech policies take `types`, so a pattern can also require the declaration type — `{ package, name }` located by the nearest `package.json` or `{ path, name }` by file, with optional `typeArguments` that accept exact text, the `boolean` and `function` tokens or `*` — and containers such as atoms, refs or callable schemas get the policy their meaning needs
