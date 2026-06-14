# Require or restrict parts of speech in declaration names, configured per declaration type and name pattern (`no-mercy/parts-of-speech`)

<!-- end auto-generated rule header -->

## Rule details

For each declaration type (variable, function, class, interface, type alias, enum) you map patterns to policies under
`declarationPolicies`. A pattern is one of:

- a **reserved type token** — `boolean` (the declaration's type is boolean) or `function` (the declaration is callable),
  resolved from real type information, not the name;
- a **name regex** — any other key, treated as a regular expression tested against the name;
- the reserved **`default`** key — the mandatory fallback.

Patterns are tried in declaration order and the first match wins; if none match, `default` applies. The chosen policy
enforces which parts of speech the name must contain (`required`) and must not contain (`restricted`).

A name is split into words (`getUserProfile` → `get`, `user`, `profile`) and each word is resolved to a single part of
speech with an ordered, early-exit pipeline:

1. **Allowlist** — a word matched by a part-of-speech allowlist (`verbs: ["^run$"]`) in the policy's `patterns`, or in
   the top-level `globalPatterns` it extends, takes that part of speech.
2. **Inflection** — a word read in context as a participle/modifier (`applied`, `applying`) resolves to `adjective`.
3. **Verb** — a word is read as a verb when its curated tag is a verb, or when the declaration is **callable** and the
   word can be a verb. It resolves to `verb` only in the leading position, otherwise to `noun` (so `getUser` and the
   callable `runMigration` lead with a verb, while a trailing `user` stays a noun). Tying the "can be a verb" reading to
   whether the declaration is callable is deliberate: `check`/`run` as functions are actions, but `check`/`run` as plain
   values are nouns, and the word alone is indistinguishable — only the declaration's type tells them apart.
4. **Canon** — otherwise the curated tag decides (`profile` → `noun`).
5. **Noun** — the unmarked default, which is where dual-use words fall when nothing above claims them.

Some words the tagger gets flatly wrong and no rule can recover (it reports `manifest`/`message`/`target`/`model`/
`package` as verb-only, `kind` as an adjective, `noop` as a non-verb) — those are corrected explicitly through the
allowlists. The rule ships these universal corrections in its default `globalPatterns`; project-specific corrections are
layered on top (see below).

### Incorrect

```ts
// with { "declarationPolicies": { "variable": { "default": { "required": ["noun"] } } } }
const calculate = 1; // contains no noun

// with { "declarationPolicies": { "function": { "default": { "required": ["verb"] } } } }
function user(): object {
  return {};
} // contains no verb

// with { "declarationPolicies": { "variable": { "default": { "restricted": ["verb"] } } } }
const calculateTotal = 1; // leads with a verb

// with { "declarationPolicies": { "function": { "^[A-Z]": { "required": ["noun"] }, "default": { "required": ["verb"] } } } }
function Active(): null {
  return null;
} // a PascalCase name (matched first) must contain a noun
```

### Correct

```ts
const userProfile = { id: 1 };

function getUser(): object {
  return {};
}

// a callable variable matches the "function" type token, leads with a verb
const buildReport = (): null => null;

// a boolean-typed variable matches the "boolean" type token, whose verb requirement is met by the "is" prefix
const isReady: boolean = Math.random() > 0.5;

function UserCard(): null {
  return null;
}
```

## Options

```ts
type PartOfSpeech = 'noun' | 'verb' | 'adjective';

// pluralised part of speech -> word patterns (regular expressions) forced to that part of speech
type WordPatterns = Partial<Record<`${PartOfSpeech}s`, string[]>>; // { nouns, verbs, adjectives }

type Policy = {
  required?: PartOfSpeech[];
  restricted?: PartOfSpeech[];
  patterns?: WordPatterns;
};

type DeclarationType = 'variable' | 'function' | 'class' | 'interface' | 'type' | 'enum';

// a key is "boolean" / "function" (reserved type tokens) or a name regex; `default` is mandatory
type PatternMap = {
  [pattern: string]: Policy;
  default: Policy;
};

type Options = {
  globalPatterns?: WordPatterns; // applied to every declaration
  declarationPolicies?: Partial<Record<DeclarationType, PatternMap>>;
};
```

Every routing decision is configuration: patterns are tried in order and the first match wins, with the reserved
`default` key as the mandatory fallback — a configured declaration type must declare it, so every declaration gets a
policy. The reserved `boolean` and `function` tokens match on real type information (boolean-typed / callable); every
other key is a name regex (`"^[A-Z]"` for components). Nothing else is hardcoded — a declaration is skipped by mapping
its pattern to an empty policy (`{}`).

The part-of-speech allowlists are the escape hatch for words the tagger reads wrong: `globalPatterns` (`nouns` / `verbs`
/ `adjectives` lists of word patterns) applies everywhere, and each policy may declare its own `patterns` that extend
`globalPatterns` for the names it governs.

The fully-resolved default configuration is exported as `PARTS_OF_SPEECH_DEFAULT`. To layer your own corrections on top
without restating the defaults, deep-merge them with the exported `getMergedOptions` helper (object keys merge
recursively, array patterns concatenate):

```ts
import { getMergedOptions, PARTS_OF_SPEECH_DEFAULT } from 'eslint-plugin-no-mercy';

const options = getMergedOptions({
  base: PARTS_OF_SPEECH_DEFAULT,
  override: {
    globalPatterns: { nouns: ['^variable$'] },
    declarationPolicies: { variable: { function: { patterns: { verbs: ['^ts$'] } } } }
  }
});
```

## Requirements

The rule resolves the `boolean` and `function` type tokens from TypeScript's checker and therefore requires the parser
to be configured with type information — `parserOptions.projectService` or `parserOptions.project`.
