---
'eslint-plugin-no-mercy': patch
---

feat: parts-of-speech policies take `types`, so a pattern can also require the declaration type — `{ package, name }` located by the nearest `package.json` or `{ path, name }` by file, with optional `typeArguments` that accept exact text, the `boolean` and `function` tokens, `*` or a type specifier of their own — and a pattern can hold a list of policies, of which the first whose type conditions hold applies, so containers such as atoms, refs or callable schemas get the policy their meaning needs
