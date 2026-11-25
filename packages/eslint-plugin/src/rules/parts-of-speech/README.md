# Require or restrict parts of speech in declaration names, configured per declaration type and name pattern (`no-mercy/parts-of-speech`)

<!-- end auto-generated rule header -->

## Rule details

For each declaration type (variable, function, class, interface, type alias, enum) you map patterns to policies under
`declarationPolicies`. A declaration type that is not configured is not checked. A pattern is one of:

- a **name regex** — any key other than the reserved ones, tested against the name;
- a **reserved type token** — `boolean` (the declaration's type is boolean, or it is callable and returns boolean) or
  `function` (the declaration is callable), resolved from real type information, not the name;
- the reserved **`default`** key — the mandatory fallback.

Name regexes take precedence over type tokens: the first matching name regex wins, otherwise the first matching type
token, otherwise `default`. A PascalCase arrow component therefore follows `"^[A-Z]"`, not `function`.

The chosen policy says which parts of speech the name must contain (`required`) and must not contain (`restricted`):

- every `required` part must be read from a **distinct** word, so one word cannot satisfy two requirements;
- a word violates `restricted` only when **every** reading of it is restricted, so a word that can also be something
  else is allowed.

A policy without `required` and `restricted` (`{}`, or only `appliesTo`) is the way to exempt the names it matches.

### Type conditions

A name regex or a type token can also require the declaration's type: its policy lists `types`, and the pattern matches
only when the name matches **and** the type is one of them. A pattern can hold a list of policies instead of one: the
first policy whose type conditions hold applies, and the pattern matches only when one of them does. This is how a
container whose TypeScript type hides the meaning of the name gets the right policy — a jotai atom holding a boolean
named as a statement, a write-only atom named as an action, a callable schema named as a value:

```ts
{
  variable: {
    '^is[A-Z]': {
      types: [
        { package: 'jotai', name: 'PrimitiveAtom' },
        { package: 'react', name: 'RefObject' },
        { path: 'src/flags.ts', name: 'FeatureFlag' }
      ],
      required: ['verb'],
      appliesTo: 'Boolean container'
    },
    '.': [
      {
        types: [{ package: 'jotai', name: 'WritableAtom', typeArguments: ['null'] }],
        required: ['verb'],
        appliesTo: 'Action atom'
      },
      {
        types: [{ package: 'arktype', name: 'Type' }],
        required: ['noun'],
        restricted: ['verb'],
        appliesTo: 'Schema'
      }
    ],
    default: { required: ['noun'], restricted: ['verb'] }
  }
}
```

A type is named by `name` — the name of the type or of its alias — and located by exactly one of:

- `package` — the `name` of the nearest `package.json` above the file that declares the type, so it covers a dependency
  (`jotai`), a workspace package of a monorepo and the linted package itself; a type from `@types/react` matches
  `react`, and a type declared in `declare module 'x'` matches `x`;
- `path` — the file that declares the type, relative to the working directory of ESLint.

`typeArguments` optionally requires the type arguments, in order: each one is the text TypeScript prints for it
(`'null'`, `'string[]'`), a reserved type token (`boolean` or `function`, resolved from real type information like the
pattern keys), `*` for any argument (`Map` of booleans: `['*', 'boolean']`) or a type specifier, matched like an entry
of `types` (`Map` of jotai atoms: `['*', { package: 'jotai', name: 'PrimitiveAtom' }]`). A type from the standard
library is located by `package: 'typescript'`. An optional type (`Atom<boolean> | undefined`) is matched without `null`
and `undefined`; a union alias (`ReactNode`) is matched by its own name first.

`returnTypes` takes the same specifiers and requires a callable value: the pattern matches only when every call
signature returns one of them. This is how a function is told apart by what it produces — a React component returns a
React node, an `async` one a `Promise` of it:

```ts
{
  function: {
    '^[A-Z]': {
      returnTypes: [
        { package: 'react', name: 'ReactNode' },
        { package: 'typescript', name: 'Promise', typeArguments: [{ package: 'react', name: 'ReactNode' }] }
      ],
      required: ['noun'],
      appliesTo: 'Component'
    },
    default: { required: ['verb'] }
  }
}
```

A policy that lists both `types` and `returnTypes` requires both.

### Readings

A name is split into words (`getUserProfile` → `get`, `user`, `profile`), and each word is resolved to the **set** of
parts of speech it can be read as, not to a single one:

1. the [compromise](https://github.com/spencermountain/compromise) tagger and its lexicon contribute every tag they know
   for the word — a verb reading, a noun reading, and an adjective reading for participles and adjectives;
2. a plural also reads as a noun when its singular does (`batches` → `batch`), even if the tagger reads the plural
   itself only as a verb;
3. the `dictionary` adds readings the tagger misses, matching singular and plural forms alike;
4. a function word — a preposition, a conjunction or a determiner (`at`, `to`, `and`, `the`) — has no reading, so it
   satisfies no requirement and violates no restriction;
5. any other word nobody recognises reads as a noun.

Three constructions add a reading from the surrounding words:

- a verb that follows `to` after a noun (`fieldsToKeep`) also reads as an adjective, because it describes that noun;
- a participle or a third-person verb right before a trailing temporal preposition — `at`, `in`, `on`, `until`, `since`,
  `after`, `before` — also reads as a noun, because together they name a moment (`createdAt`, `updatedAt`, `expiresIn`).
  A base form does not (`cancelAt` stays an action).
- a verb right before a trailing particle — `up`, `down`, `in`, `out`, `off`, `on`, `over` — also reads as a noun,
  because together they form a phrasal noun (`addIn`, `popUp`, `checkOut`); it keeps its verb reading, so `signUp()` is
  still an action.

Some words the tagger gets flatly wrong — it reads `message`, `target`, `package` or `modal` with no noun reading at
all. The rule ships these universal corrections in its default `dictionary`; project-specific words are layered on top
(see [Options](#options)).

### Messages

Every report shows how the rule read the words it judged, so a tagger mistake is visible at once:

```text
Name "Active" must contain: noun (read as: active → adjective).
Name "calculatePayload" must not contain: verb (read as: calculate → verb).
```

A missing part lists the reading of every word, a function word showing as `function word`; a restricted part lists only
the words that violate it. When a policy declares `appliesTo`, the message names it:
`Component name "Active" must contain: noun (…)`.

### Incorrect

```ts
// with { "declarationPolicies": { "variable": { "default": { "required": ["noun"] } } } }
const calculate = 1; // contains no noun

// with { "declarationPolicies": { "function": { "default": { "required": ["verb"] } } } }
function user(): object {
  return {};
} // contains no verb

// with { "declarationPolicies": { "variable": { "default": { "restricted": ["verb"] } } } }
const calculateTotal = 1; // "calculate" can only be read as a verb

// with { "declarationPolicies": { "function": { "^[A-Z]": { "required": ["noun"] }, "default": { "required": ["verb"] } } } }
function Active(): null {
  return null;
} // a PascalCase name (matched first) must contain a noun
```

### Correct

```ts
const userProfile = { id: 1 };

const requestPayload = { id: 1 }; // "request" can also be read as a noun

const fieldsToKeep = ['main']; // "keep" describes "fields"

function getUser(): object {
  return {};
}

// a callable variable matches the "function" type token, leads with a verb
const buildReport = (): null => null;

// a boolean-typed variable matches the "boolean" type token, whose verb requirement is met by "is"
const isReady: boolean = Math.random() > 0.5;

function UserCard(): null {
  return null;
}
```

## Options

```ts
type PartOfSpeech = 'noun' | 'verb' | 'adjective';

type TypeSpecifier =
  | { package: string; name: string; typeArguments?: TypeArgumentSpecifier[] }
  | { path: string; name: string; typeArguments?: TypeArgumentSpecifier[] };

// the printed text, "boolean" / "function" (reserved type tokens), "*" (any type) or a type specifier
type TypeArgumentSpecifier = string | TypeSpecifier;

type Policy = {
  required?: PartOfSpeech[];
  restricted?: PartOfSpeech[];
  appliesTo?: string; // a label for the names this policy governs, shown in the message
  types?: TypeSpecifier[]; // the policy applies only to declarations of these types; not allowed on `default`
  returnTypes?: TypeSpecifier[]; // the policy applies only to callables returning these types; not allowed on `default`
};

type DeclarationType = 'variable' | 'function' | 'class' | 'interface' | 'type' | 'enum';

// a key is "boolean" / "function" (reserved type tokens) or a name regex; `default` is mandatory
// a list applies its first policy whose type conditions hold
type PatternMap = {
  [pattern: string]: Policy | Policy[];
  default: Policy;
};

type Options = {
  // extra readings for words, applied everywhere
  dictionary?: Partial<Record<PartOfSpeech, string[]>>;
  declarationPolicies?: Partial<Record<DeclarationType, PatternMap>>;
};
```

The default configuration is exported as `PARTS_OF_SPEECH_DEFAULT`:

- variables: a `boolean` or `function` value must contain a verb; any other value must contain a noun and no word that
  can only be read as a verb;
- functions must contain a verb;
- classes, interfaces, type aliases and enums must contain a noun.

To layer your own words and conventions on top without restating the defaults, deep-merge them with the exported
`getMergedOptions` helper (object keys merge recursively, arrays unite without repeating values):

```ts
import { getMergedOptions, PARTS_OF_SPEECH_DEFAULT } from 'eslint-plugin-no-mercy';

const options = getMergedOptions({
  base: PARTS_OF_SPEECH_DEFAULT,
  override: { dictionary: { noun: ['tenant'] } }
});
```

### Conventions

Naming conventions belong to the project, so the defaults ship none. The plugin exports one ready-made convention,
`PARTS_OF_SPEECH_REACT_COMPONENTS`: a function or a callable variable is a React component when its name is PascalCase
with a lowercase letter (`UserCard`, `HTMLPreview`, but not `MAX_RETRIES`) **and** it returns a React node —
`ReactNode`, `ReactElement` or `JSX.Element` — or, as an `async` component, a `Promise` of one; a variable also counts
when it is typed as a `FunctionComponent` (`FC`) or a `ComponentType`. A component must contain a noun instead of a
verb; any other PascalCase name keeps the default policy. Merge it in explicitly:

```ts
import { getMergedOptions, PARTS_OF_SPEECH_DEFAULT, PARTS_OF_SPEECH_REACT_COMPONENTS } from 'eslint-plugin-no-mercy';

const options = getMergedOptions({ base: PARTS_OF_SPEECH_DEFAULT, override: PARTS_OF_SPEECH_REACT_COMPONENTS });
```

Any other convention is a name regex of your own. For example, function values named after what they are rather than
what they do:

```jsonc
{
  "variable": {
    "(Validator|Handler|Listener|Reducer|Comparator)$": { "required": ["noun"], "appliesTo": "Callback" }
  }
}
```

## Requirements

The rule resolves the `boolean` and `function` type tokens from TypeScript's checker and therefore requires the parser
to be configured with type information — `parserOptions.projectService` or `parserOptions.project`.
