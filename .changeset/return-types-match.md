---
'eslint-plugin-no-mercy': patch
---

feat: parts-of-speech policies take `returnTypes`, so a pattern can require a callable whose every call signature returns one of the listed types — an `async` callable through a `Promise` whose type argument is a type specifier — and a type condition matches a union alias such as `ReactNode` by its own name before splitting it
