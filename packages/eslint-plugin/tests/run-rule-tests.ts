import type { Dirent } from 'fs';
import { readdir } from 'fs/promises';
import { join, resolve } from 'path';
import { RuleTester, type RunTests } from '@typescript-eslint/rule-tester';
import { type TSESLint } from '@typescript-eslint/utils';
import { regex } from 'arkregex';
import { sentenceCase } from 'change-case';

const TS_CONFIG_PATTERN = regex('^tsconfig\\.(?<scope>\\w*)\\.json$');

const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures');

interface TsConfig {
  readonly path: string;
  readonly scope: string;
}

const tsConfigs = (
  await readdir(FIXTURES_DIR, {
    withFileTypes: true
  })
)
  .filter(
    (entry: Dirent): entry is Dirent<`tsconfig.${string}.json`> => entry.isFile() && TS_CONFIG_PATTERN.test(entry.name)
  )
  .map(({ name }: Dirent): TsConfig => {
    const match = TS_CONFIG_PATTERN.exec(name);
    if (match === null) {
      throw new Error(`Failed to parse tsconfig file name: ${name}`);
    }
    return { path: join(FIXTURES_DIR, name), scope: match.groups.scope };
  });

export function runRuleTests<MessageIds extends string, Options extends readonly unknown[]>(
  testName: string,
  rule: TSESLint.RuleModule<MessageIds, Options>,
  cases: RunTests<MessageIds, Options>
): void {
  tsConfigs.forEach(({ path, scope }: TsConfig) => {
    const tester = new RuleTester({
      languageOptions: {
        parserOptions: {
          projectService: { allowDefaultProject: ['*.ts'], defaultProject: path },
          tsconfigRootDir: FIXTURES_DIR
        }
      }
    });

    tester.run(`${sentenceCase(scope)} ▷ ${testName}`, rule, cases);
  });
}
