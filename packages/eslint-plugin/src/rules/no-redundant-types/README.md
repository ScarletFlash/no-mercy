# Disallow explicit type annotations that TypeScript can infer from the assigned value (`no-mercy/no-redundant-types`)

📝 Disallow explicit type annotations that TypeScript can infer from the assigned value.

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/ScarletFlash/no-mercy#configs).

🔧 This rule is automatically fixable by the
[`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule details

Type-aware. Reports a type annotation only when it is **identical** to the type TypeScript would infer from the value
once the annotation is removed, so the annotation only adds noise.

Identity is what matters, not similarity. Removing an annotation can change the type through **widening**, and widening
only happens in a **mutable** binding — `let`/`var`, a non-`readonly` class field, or a parameter default. There a
literal widens to its primitive (`let a = 0` is `number`), so `let a: number = 0` is reported. An **immutable** binding
— a `const` variable or a `readonly` field — keeps the literal (`const a = 0` is `0`, not `number`), so
`const a: number = 0` **widens** `0` to `number` and is left alone. Likewise `let value: number | null = null` is kept,
because `null` alone never infers `number | null`.

### Incorrect

```ts
const letterByIndex: Map<number, string> = new Map<number, string>();
let aIndex: number = 0;

class Counter {
  private count: number = 0;
}
```

### Correct

```ts
const letterByIndex = new Map<number, string>();

// `const a = 0` infers `0`; the annotation widens it to `number` — keep it.
const aIndex: number = 0;

// A `readonly` field keeps the literal; `: string` widens it — keep it.
class Marker {
  readonly name: string = 'Marker';
}

// The annotation is wider than the value type — keep it.
let value: number | null = null;

// The constructor has no type arguments — the annotation is the only source of the generics.
const counts: Map<number, string> = new Map();
```

## Options

```ts
type Options = {
  areParametersIgnored?: boolean; // default: true
  isDestructuringIgnored?: boolean; // default: true
};
```

### `areParametersIgnored`

Default: `true`. When `false`, function-parameter annotations are reported when redundant — either a parameter whose
type repeats its default value, or a parameter whose type is already provided by the surrounding call's contextual
signature.

```ts
// areParametersIgnored: false — reported, the contextual signature of `map` already types `item` as `number`
[1, 2, 3].map((item: number) => {});
```

### `isDestructuringIgnored`

Default: `true`. When `false`, annotations on destructuring patterns are reported when they merely restate the type of
the destructured value.

```ts
// isDestructuringIgnored: false — reported, `input` is already `KeyValue`
const { key }: KeyValue = input;
```

## Autofix

The fix removes the redundant annotation, leaving the value untouched:

```ts
// Before
const letterByIndex: Map<number, string> = new Map<number, string>();

// After
const letterByIndex = new Map<number, string>();
```

To stay sound, the rule only inspects values whose type does not depend on the annotation itself: literals, references,
property accesses, type assertions, arithmetic/logical/comparison results (`a + b`, `!ready`), `await` of such a value,
and `new`/call expressions that either carry explicit type arguments or resolve to a non-generic signature. Logical
(`??`, `||`, `&&`) and conditional (`?:`) expressions are inspected only when every value-producing operand is itself
context-free, so `a ?? b` between two references is reported while `a ?? []` is left alone. In a mutable binding the
annotation is reported when it equals either the value's type or its widened base; in an immutable binding (`const`,
`readonly`) the literal is kept, so the annotation must equal the value's type exactly — `const a: 0 = 0` is flagged
while `const a: number = 0` is not.

Values whose type is shaped by their context — array and object literals, arrow and function expressions, and generic
calls without type arguments (where the type may be inferred from the annotation, e.g. `const x: string = make()` for
`make<T>(): T`) — are skipped, because removing the annotation there could change the inferred type. A variable that is
later passed to an assertion function (`asserts value is T`) is also left alone: TypeScript requires such a target to
carry an explicit annotation, so removing it would not compile.

## Requirements

The rule performs type-aware analysis via TypeScript's checker and therefore requires the parser to be configured with
type information — `parserOptions.projectService` or `parserOptions.project`.
