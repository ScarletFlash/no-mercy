# Require boolean variables and boolean-returning functions to start with a configurable prefix (`no-mercy/boolean-prefix`)

<!-- end auto-generated rule header -->

## Rule details

Type-aware. Reports a name that does not start with one of the configured prefixes when it identifies a boolean value or
a boolean-returning function, across every place such a name can appear:

- `const`/`let`/`var` declarations and `function` declarations;
- class methods, getters, fields, `accessor` and `abstract` members, and function-properties — including private ones
  (`#name` and `_name`);
- interface (and type-literal) methods and properties;
- function parameters (including default, rest, and constructor parameter properties).

Names are routed by whether they are callable: boolean-returning members/parameters use the `functions` target, plain
boolean ones use `variables`. Setters and constructors are skipped; computed and non-identifier keys are ignored.
Private names are matched on their bare identifier (the leading `#`/`_` is not part of the first word).

### Incorrect

```ts
const ready = Math.random() > 0.5;

function ready(): boolean {
  return true;
}

class Widget {
  ready = false;
  #ready(): boolean {
    return true;
  }
}

interface Widget {
  ready: boolean;
}

function render(ready: boolean): void {}
```

### Correct

```ts
const isReady = Math.random() > 0.5;

function hasItems(): boolean {
  return true;
}

class Widget {
  isReady = false;
  #isReady(): boolean {
    return true;
  }
}

interface Widget {
  isReady: boolean;
}

function render(isReady: boolean): void {}
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
