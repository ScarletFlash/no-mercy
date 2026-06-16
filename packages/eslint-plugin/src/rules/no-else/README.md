# Disallow `else` clauses. Use early returns or guard clauses instead (`no-mercy/no-else`)

📝 Disallow `else` clauses. Use early returns or guard clauses instead.

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/ScarletFlash/no-mercy#configs).

<!-- end auto-generated rule header -->

## Rule details

Reports any `if` whose `alternate` is a `BlockStatement` (i.e., a literal `else { ... }`).

### Incorrect

```ts
if (a) {
  doX();
} else {
  doY();
}
```

### Correct

```ts
if (a) {
  doX();
  return;
}
doY();
```

## Options

```ts
type Options = {
  areSideEffectsAllowed?: boolean;
};
```

### `areSideEffectsAllowed`

Default: `false`.

When `true`, the rule does not report an `else` block if its body has a side-effect that escapes the `else`'s own scope
— a mutation of data declared outside the `else`, including method calls on outer objects.

```ts
// areSideEffectsAllowed: true — not reported
const outerArr: number[] = [];
if (cond) {
  return;
} else {
  outerArr.push(1);
}
```

```ts
// areSideEffectsAllowed: true — still reported (only local mutations)
if (cond) {
  return;
} else {
  let local = 1;
  local = 2;
}
```

## Autofix

The rule unwraps the `else` block:

```ts
// Before
if (cond) {
  return 1;
} else {
  return -1;
}

// After
if (cond) {
  return 1;
}

return -1;
```

The fix is applied only when both of the following hold:

- The `if` branch ends with `return`, `throw`, `break`, or `continue` — guaranteeing the `else` body would not run if
  the branch took the `if` path.
- The `else` body does not introduce top-level declarations (`let`, `const`, `var`, `function`, `class`) — otherwise
  unwrapping would leak those names into the surrounding scope.

Indentation of the unwrapped statements is intentionally not adjusted by the fixer; rely on your formatter (Prettier or
similar) to reflow.

## Requirements

`areSideEffectsAllowed: true` performs type-aware analysis via TypeScript's checker and therefore requires the parser to
be configured with type information — `parserOptions.projectService` or `parserOptions.project`. Without it, the rule
throws a clear ESLint error pointing to the missing setup.
