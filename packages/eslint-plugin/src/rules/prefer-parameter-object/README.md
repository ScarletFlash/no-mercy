# Require functions with more than one parameter to accept a single object parameter (`no-mercy/prefer-parameter-object`)

📝 Require functions with more than one parameter to accept a single object parameter.

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/ScarletFlash/no-mercy#configs).

🔧 This rule is automatically fixable by the
[`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule details

Positional parameter lists are hard to read at the call site and break silently when two parameters of the same type are
swapped. This rule reports any self-written signature that declares more than one parameter and asks for a single
destructured object parameter instead.

The check applies to every form that declares parameters: function declarations, function expressions, arrows, class
methods and constructors, object methods, and the signatures inside `interface` and `type` declarations. A leading
`this` parameter is never counted.

### Incorrect

```ts
function createUser(id: string, name: string): void {}

const sum = (first: number, second: number): number => first + second;

interface UserRepository {
  save(id: string, value: number): void;
}
```

### Correct

```ts
interface CreateUserParams {
  id: string;
  name: string;
}
function createUser({ id, name }: CreateUserParams): void {}

interface SumParams {
  first: number;
  second: number;
}
const sum = ({ first, second }: SumParams): number => first + second;
```

## Ownership

The rule reports a signature only where it is **owned**. A method whose signature is dictated by a contract — an
`implements` clause, a base class, a contextual type, or the type of a callback slot — is left alone:

- When the contract lives in your own code, the violation surfaces on the `interface`/`type` declaration itself, which
  the rule lints directly, so fixing it there fixes every implementation.
- When the contract comes from a third party (a `node_modules` declaration), neither the contract nor the implementation
  is touched, so external types keep working.

```ts
// Allowed — the callback signature is fixed by `Array.prototype.map`.
[1, 2, 3].map((value, index) => value + index);

// Allowed — `set` is dictated by the third-party `Map` contract.
class Store extends Map<string, number> {
  public set(key: string, value: number): this {
    return super.set(key, value);
  }
}
```

## Options

```ts
type Options = {
  ignoreTypeGuards?: boolean; // default: true
  typeSuffix?: Record<string, string>; // default: { "^[A-Z]": "Props", "default": "Params" }
};
```

### `ignoreTypeGuards`

Default: `true`. Type-guard functions (those returning `value is T`) keep their parameters positional, because the
predicate references a parameter by name and could not survive the wrapping. When set to `false`, they are reported, but
no autofix is offered.

### `typeSuffix`

A map from a regular-expression source to the suffix used for the generated interface name. The patterns are tested
against the function name **in declaration order**, and the first match wins; the `default` key is the fallback. The
default routes every name to `Params`:

```jsonc
{
  "default": "Params" // createUser -> CreateUserParams
}
```

To route PascalCase names (React components) to `Props` and everything else to `Params`, add a pattern before the
fallback:

```jsonc
{
  "^[A-Z]": "Props", // Button -> ButtonProps
  "default": "Params" // createUser -> CreateUserParams
}
```

## Autofix

The fix reuses TypeScript's own refactorings — `Convert parameters to destructured object` (which also rewrites every
call site in the file) followed by `Extract to interface` (which preserves generic type parameters). The generated
interface is named `${PascalCase(functionName)}${suffix}`; if that name already exists at module level it gains an `_1`,
`_2`, … increment. The interface is placed at module level, immediately after the imports.

```ts
// Before
import { join } from 'node:path';
function createUser(id: string, name: string): string {
  return join(id, name);
}

// After
import { join } from 'node:path';

interface CreateUserParams {
  id: string;
  name: string;
}
function createUser({ id, name }: CreateUserParams): string {
  return join(id, name);
}
```

The fix is offered only when it can be produced safely from a single file: signatures inside `interface`/`type`
declarations, functions whose call sites live in other files, and type guards are reported without a fix.

## Requirements

The rule performs type-aware analysis via TypeScript's checker and therefore requires the parser to be configured with
type information — `parserOptions.projectService` or `parserOptions.project`.
