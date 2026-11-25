# eslint-plugin-no-mercy

## 0.0.10

### Patch Changes

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - feat: boolean-prefix accepts every auxiliary and modal verb by
  default — `was`, `were`, `had`, `does`, `did`, `could`, `should`, `would`, `will`, `must`, `may` and `might` join
  `is`, `are`, `has`, `have` and `can`

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - feat: export `PARTS_OF_SPEECH_REACT_COMPONENTS`, a parts-of-speech
  preset that requires a noun instead of a verb in the names of PascalCase functions and callable variables returning a
  React node (`ReactNode`, `ReactElement`, `JSX.Element`) or, as `async` components, a `Promise` of one, and of
  PascalCase variables typed as `FunctionComponent` or `ComponentType`; the preset adds `arkregex` to the runtime
  dependencies of the plugin

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: boolean-prefix matches a multi-word prefix such as `useIs`
  word by word, so `useIsMobile` satisfies it

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: parts-of-speech gives prepositions, conjunctions and
  determiners no part of speech, so `at`, `to` or `the` no longer count as a noun

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: `getMergedOptions` unites arrays without repeating values, so
  overriding a policy no longer duplicates its `required` parts of speech; parts-of-speech rejects repeated parts of
  speech in a policy

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - feat: parts-of-speech reads a participle or a third-person verb
  before a trailing temporal preposition as a noun, so `createdAt`, `updatedAt` and `expiresIn` name a moment

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - feat: parts-of-speech reads a verb before a trailing particle as a
  noun too, so phrasal nouns such as `addIn`, `popUp` and `checkOut` name a thing while `signUp()` stays an action

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: parts-of-speech reads a plural as a noun when its singular is
  one, so `batches` is no longer only a verb

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - feat: parts-of-speech policies take `types`, so a pattern can also
  require the declaration type — `{ package, name }` located by the nearest `package.json` or `{ path, name }` by file,
  with optional `typeArguments` that accept exact text, the `boolean` and `function` tokens, `*` or a type specifier of
  their own — and a pattern can hold a list of policies, of which the first whose type conditions hold applies, so
  containers such as atoms, refs or callable schemas get the policy their meaning needs

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: parts-of-speech no longer crashes on names containing
  `constructor` or another `Object.prototype` member name

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - feat: parts-of-speech messages show how each judged word was read,
  e.g. `(read as: calculate → verb)`

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: the `recommended` config registers the plugin object itself,
  so it can be combined with an explicit `plugins: { "no-mercy": plugin }` registration

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - feat: parts-of-speech policies take `returnTypes`, so a pattern
  can require a callable whose every call signature returns one of the listed types — an `async` callable through a
  `Promise` whose type argument is a type specifier — and a type condition matches a union alias such as `ReactNode` by
  its own name before splitting it

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: rule documentation links point at `packages/eslint-plugin`
  instead of a missing directory

- [#32](https://github.com/ScarletFlash/no-mercy/pull/32)
  [`80f3628`](https://github.com/ScarletFlash/no-mercy/commit/80f3628dc85bcdbee7ed660abda242ff85c9f5ea) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: parts-of-speech reads `modal`, `account`, `deploy`, `bundle`,
  `brand`, `decay`, `report`, `schedule`, `stripe`, `react`, `sentence`, `prompt`, `affix`, `autocomplete`, `budget`,
  `testimonial`, `drive`, `hook`, `tax`, `discount`, `bulk`, `guide`, `challenge`, `credential`, `observable`, `party`,
  `cycle`, `multiselect` and `walkthrough` as nouns and `upsert`, `parse`, `provision` and `group` as verbs by default

## 0.0.9

### Patch Changes

- [#30](https://github.com/ScarletFlash/no-mercy/pull/30)
  [`c271c36`](https://github.com/ScarletFlash/no-mercy/commit/c271c36452018a259c39479186174ef04590a098) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: parts-of-speech reads "process" as a noun and a verb after
  "to" describing a noun as a modifier

- [#30](https://github.com/ScarletFlash/no-mercy/pull/30)
  [`4ee2a92`](https://github.com/ScarletFlash/no-mercy/commit/4ee2a92a8c3e9df49c736324448eead5147698a7) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: the plugin loads with TypeScript 5.0–5.4, where a namespace
  import of typescript exposes no API

- [#30](https://github.com/ScarletFlash/no-mercy/pull/30)
  [`f2500c9`](https://github.com/ScarletFlash/no-mercy/commit/f2500c903d24f2f5f8f243252b00a817c293a890) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: rules declare their default options in `meta.defaultOptions`;
  the `@typescript-eslint/*` peers now require 8.56.0 or newer, the first version that supports ESLint 10

- [#30](https://github.com/ScarletFlash/no-mercy/pull/30)
  [`ba21198`](https://github.com/ScarletFlash/no-mercy/commit/ba211986320cfc980d08857696051039e7e50507) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: type declarations import relative modules with the `.js`
  extension, as `moduleResolution: node16` and `nodenext` require

## 0.0.8

### Patch Changes

- [#27](https://github.com/ScarletFlash/no-mercy/pull/27)
  [`f1e578e`](https://github.com/ScarletFlash/no-mercy/commit/f1e578ea8d11a7df98d673d76783766319a1059b) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - feat: more accurate parts of speech detection

## 0.0.7

### Patch Changes

- [#25](https://github.com/ScarletFlash/no-mercy/pull/25)
  [`cbddaa0`](https://github.com/ScarletFlash/no-mercy/commit/cbddaa0660578e3b7cf89ddb03ebd1ab8eaa73ef) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: type assertions are treated as redundant

## 0.0.6

### Patch Changes

- [#23](https://github.com/ScarletFlash/no-mercy/pull/23)
  [`45a1c60`](https://github.com/ScarletFlash/no-mercy/commit/45a1c6046822e80dd1f1e3d06bcb628e85c8e2dc) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: no-redundant-types correctness

## 0.0.5

### Patch Changes

- [#22](https://github.com/ScarletFlash/no-mercy/pull/22)
  [`7186691`](https://github.com/ScarletFlash/no-mercy/commit/71866915eb5c156d77b6cd84dd48cac4368d5738) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - feat: boolean-prefix now also checks class/interface methods and
  properties (including private `#`/`_`) and function parameters

- [#20](https://github.com/ScarletFlash/no-mercy/pull/20)
  [`f319462`](https://github.com/ScarletFlash/no-mercy/commit/f319462a3b745853ce36d2889f41a522e7757d37) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - feat: no-redundant-types

- [#20](https://github.com/ScarletFlash/no-mercy/pull/20)
  [`e6ca5a4`](https://github.com/ScarletFlash/no-mercy/commit/e6ca5a4b1319b3cd1210d2eaaf82da4dfc9d7625) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - fix: published package.json entrypoint

- [#20](https://github.com/ScarletFlash/no-mercy/pull/20)
  [`e6ca5a4`](https://github.com/ScarletFlash/no-mercy/commit/e6ca5a4b1319b3cd1210d2eaaf82da4dfc9d7625) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - feat: prefer-parameter-object

## 0.0.4

### Patch Changes

- [#16](https://github.com/ScarletFlash/no-mercy/pull/16)
  [`3984adf`](https://github.com/ScarletFlash/no-mercy/commit/3984adf7f47341a9ad0b505df9ee87c9983f0e47) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - feat: boolean-prefix & parts-of-speech rules

## 0.0.3

### Patch Changes

- [#14](https://github.com/ScarletFlash/no-mercy/pull/14)
  [`5c411e1`](https://github.com/ScarletFlash/no-mercy/commit/5c411e1061c723201317d5d3f1024573cde93b84) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - build: support TS v.5

## 0.0.2

### Patch Changes

- [#8](https://github.com/ScarletFlash/no-mercy/pull/8)
  [`734cd22`](https://github.com/ScarletFlash/no-mercy/commit/734cd2250f96ab6f8889bf82ba65110e584ddf81) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - feat: autofixable no-else rule

## 0.0.1

### Patch Changes

- [#4](https://github.com/ScarletFlash/no-mercy/pull/4)
  [`7514eba`](https://github.com/ScarletFlash/no-mercy/commit/7514eba01a4fe6e69a32b4b0e1a96f4759c53192) Thanks
  [@ScarletFlash](https://github.com/ScarletFlash)! - ci: automated deployment
