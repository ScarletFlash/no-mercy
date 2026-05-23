# eslint-plugin-no-mercy (TypeScript Monorepo)

This is a pnpm workspaces + Turborepo monorepo that publishes a strict ESLint plugin with TypeScript type-awareness
support. There are two packages:

- `packages/configs/` (`@no-mercy/configs`) — shared ESLint, Prettier, cspell, and TypeScript configurations consumed
  by every other package in the workspace.
- `packages/eslint-plugin-no-mercy/` — the published plugin itself.

## Package Structure Conventions

- Every package has `package.json`, `tsconfig.json`, and `eslint.config.mjs`.
- Every package implements the same set of quality scripts: `compiler__check`, `linter__check`,
  `linter__check-cycles`, `linter__fix`, `formatter__check`, `formatter__fix`, `spell-checker__check`. The list is
  enforced via `requiredScripts` in `pnpm-workspace.yaml`.
- Configs inherit from `@no-mercy/configs`:
  - ESLint: `@no-mercy/configs/eslint/essential.mjs` (or `cyclic-dependencies.mjs`, `declarations.mjs`)
  - Prettier: `@no-mercy/configs/prettier/essential.mjs`
  - TypeScript: `@no-mercy/configs/typescript/node.json` (or `base.json`)
  - cspell: `@no-mercy/configs/cspell`

## Dependency Management

- Internal packages use `workspace:*` for dependencies on other workspace packages.
- Global external dependency versions are managed through catalogs in `pnpm-workspace.yaml`:
  - `catalog:codebase` — Codebase management and organization tools (eslint, prettier, cspell, knip, plugins).
  - `catalog:stack` — Production and development stack (rslib, rstest, turbo, typescript, types).

## Where to Find Configuration

| What                                         | Where                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Node.js and pnpm versions                    | Root `package.json` (`packageManager` field)                                                   |
| Dependency catalogs and workspace definition | Root `pnpm-workspace.yaml`                                                                     |
| Turbo task pipeline and concurrency          | Root `turbo.json` (packages may override with their own `turbo.json`)                          |
| TypeScript config                            | Root `tsconfig.json` and per-package `tsconfig.json` (inherits from `@no-mercy/configs`)      |
| ESLint rules                                 | Root `eslint.config.mjs` and per-package `eslint.config.mjs` (inherits from `@no-mercy/configs`) |
| Prettier formatting rules                    | Root `.prettierrc.mjs` (no per-package overrides)                                              |
| Unused dependency detection                  | Root `knip.json`                                                                               |
| Spell-checker dictionary                     | Root `.cspell.json` (extends `@no-mercy/configs/cspell`)                                      |

## Commands

All scripts are wired through `turbo-run` in the root `package.json`:

- `pnpm check-all` — runs `compiler__check`, `linter__check`, `formatter__check`, `spell-checker__check`,
  `dependencies-checker__check`, and `test__units` across all packages.
- `pnpm fix-all` — runs `linter__fix` and `formatter__fix`.
- `pnpm build` — builds every package via Turbo (configs first, then plugin).
- Individual checks are also exposed as `pnpm compiler__check`, `pnpm linter__check`, etc.

## Anti-Patterns

- **Never run tools directly.** Do not invoke `npx`, `tsc`, `eslint`, `prettier`, `cspell`, `knip`, or any other tool
  directly. Always use `pnpm run <script>` via root `package.json` scripts. Runs are cached via Turborepo, so only
  affected files will be triggered.
- **Never manipulate Turbo caches directly.** Turbo must only be controlled through configuration. If caching does not
  work as expected, investigate and fix the Turbo configuration. Never delete, invalidate, or otherwise touch the
  caches manually.
- **Never bypass the configs package.** All shared configuration lives in `@no-mercy/configs`. Per-package
  configuration files are thin wrappers that inherit from it and only adjust paths.
