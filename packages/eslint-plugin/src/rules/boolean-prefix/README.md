# Require boolean variables and boolean-returning functions to start with a configurable prefix (`no-mercy/boolean-prefix`)

<!-- end auto-generated rule header -->

## Rule details

Type-aware. Reports any `const`/`let`/`var` whose value type is `boolean`, and any function (a `function` declaration or
a function/arrow assigned to a variable) whose return type is `boolean`, when its name does not start with one of the
configured prefixes.

### Incorrect

```ts
const ready = Math.random() > 0.5;

function ready(): boolean {
  return true;
}
```

### Correct

```ts
const isReady = Math.random() > 0.5;

function hasItems(): boolean {
  return true;
}
```

## Options

```ts
type Target = {
  prefixes?: string[];
  ignore?: string[]; // regular-expression sources
};

type Options = {
  default?: Target; // fallback prefixes/ignore; default prefixes: ["is", "are", "has", "have", "can"]
  variables?: Target; // overrides for boolean variables
  functions?: Target; // overrides for boolean-returning functions
};
```

A name is exempt when it matches any `ignore` regular expression (from `default` or the matching target). Prefix
matching is case-insensitive against the first word of the name.

## Requirements

The rule performs type-aware analysis via TypeScript's checker and therefore requires the parser to be configured with
type information — `parserOptions.projectService` or `parserOptions.project`.
