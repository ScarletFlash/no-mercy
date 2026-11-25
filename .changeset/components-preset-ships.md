---
'eslint-plugin-no-mercy': patch
---

feat: export `PARTS_OF_SPEECH_REACT_COMPONENTS`, a parts-of-speech preset that requires a noun instead of a verb in the names of PascalCase functions and callable variables returning a React node (`ReactNode`, `ReactElement`, `JSX.Element`) or, as `async` components, a `Promise` of one, and of PascalCase variables typed as `FunctionComponent` or `ComponentType`; the preset adds `arkregex` to the runtime dependencies of the plugin
