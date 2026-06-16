# Disallow explicit type annotations that TypeScript can infer from the assigned value (`no-mercy/no-redundant-types`)

📝 Disallow explicit type annotations that TypeScript can infer from the assigned value.

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/ScarletFlash/no-mercy#configs).

🔧 This rule is automatically fixable by the
[`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule details

Type-aware. Reports a type annotation when it is identical to the type TypeScript would infer from the value on its own,
so the annotation only adds noise.

The check compares the written type against the **widened** type of the value. Widening is what turns the literal `0`
into `number`, so `const a: number = 0` is reported while `let value: number | null = null` is not — `null` alone never
infers `number | null`, so that annotation carries information.

### Incorrect

```ts
const letterByIndex: Map<number, string> = new Map<number, string>();
const aIndex: number = 0;

class Counter {
  private count: number = 0;
}
```

### Correct

```ts
const letterByIndex = new Map<number, string>();
const aIndex = 0;

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
context-free, so `a ?? b` between two references is reported while `a ?? []` is left alone. The annotation is reported
when it equals either the value's type or its widened base, so both `const a: number = 0` and `const a: 0 = 0` are
flagged.

Values whose type is shaped by their context — array and object literals, arrow and function expressions, and generic
calls without type arguments (where the type may be inferred from the annotation, e.g. `const x: string = make()` for
`make<T>(): T`) — are skipped, because removing the annotation there could change the inferred type.

## Requirements

The rule performs type-aware analysis via TypeScript's checker and therefore requires the parser to be configured with
type information — `parserOptions.projectService` or `parserOptions.project`.
