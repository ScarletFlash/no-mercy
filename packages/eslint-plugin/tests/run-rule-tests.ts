import type { Dirent } from 'fs';
import { readdir } from 'fs/promises';
import { join, resolve } from 'path';
import { CONFIG } from '@no-mercy/configs/prettier';
import { describe, expect, it } from '@rstest/core';
import { default as parser } from '@typescript-eslint/parser';
import { RuleTester, type TestCaseError, type ValidTestCase } from '@typescript-eslint/rule-tester';
import { TSESLint } from '@typescript-eslint/utils';
import { regex } from 'arkregex';
import { sentenceCase } from 'change-case';
import { format, type Options as FormatterOptions } from 'prettier';

const TS_CONFIG_PATTERN = regex('^tsconfig\\.(?<scope>\\w*)\\.json$');

const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures');
const FIXTURE_FILE = join(FIXTURES_DIR, 'file.ts');

const FORMATTER_OPTIONS: FormatterOptions = { ...CONFIG, parser: 'typescript' };

const LINTER = new TSESLint.Linter({ configType: 'flat' });

interface TsConfig {
  readonly path: string;
  readonly scope: string;
}

type ExpectedError<MessageIds extends string> = Pick<TestCaseError<MessageIds>, 'messageId'>;

interface ReportingCase<MessageIds extends string, Options extends readonly unknown[]> extends ValidTestCase<Options> {
  readonly errors: readonly ExpectedError<MessageIds>[];
  readonly output?: string | null;
}

interface FixableCase<MessageIds extends string, Options extends readonly unknown[]> extends ReportingCase<
  MessageIds,
  Options
> {
  readonly output: string;
}

interface RuleTests<MessageIds extends string, Options extends readonly unknown[]> {
  readonly valid: readonly ValidTestCase<Options>[];
  readonly invalid: readonly ReportingCase<MessageIds, Options>[];
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

interface RunRuleTestsParams<MessageIds extends string, Options extends readonly unknown[]> {
  readonly ruleName: string;
  readonly rule: TSESLint.RuleModule<MessageIds, Options>;
  readonly cases: RuleTests<MessageIds, Options>;
}

export function runRuleTests<MessageIds extends string, Options extends readonly unknown[]>({
  ruleName,
  rule,
  cases
}: RunRuleTestsParams<MessageIds, Options>): void {
  tsConfigs.forEach(({ path, scope }: TsConfig) => {
    const prefix = `${sentenceCase(scope)} ▷ ${ruleName}`;

    const reportingCases = cases.invalid.filter(
      ({ output }: ReportingCase<MessageIds, Options>) => typeof output !== 'string'
    );
    const fixableCases = cases.invalid.filter(
      (invalidCase: ReportingCase<MessageIds, Options>): invalidCase is FixableCase<MessageIds, Options> =>
        typeof invalidCase.output === 'string'
    );

    new RuleTester({
      languageOptions: {
        parserOptions: {
          projectService: { allowDefaultProject: ['*.ts'], defaultProject: path },
          tsconfigRootDir: FIXTURES_DIR
        }
      }
    }).run(prefix, rule, { valid: cases.valid, invalid: reportingCases });

    if (fixableCases.length === 0) {
      return;
    }

    describe(`${prefix} ▷ fix`, () => {
      fixableCases.forEach(({ name, code, options, errors, output }: FixableCase<MessageIds, Options>) => {
        it(name ?? code, async () => {
          const config: TSESLint.FlatConfig.Config = {
            files: ['**/*.ts'],
            plugins: { local: { rules: { [ruleName]: rule } } },
            rules: {
              [`local/${ruleName}`]: [
                'error',
                ...(options === undefined ? [] : [...options])
              ] satisfies TSESLint.FlatConfig.RuleLevelAndOptions
            },
            languageOptions: {
              parser,
              parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                projectService: { allowDefaultProject: ['*.ts'], defaultProject: path },
                tsconfigRootDir: FIXTURES_DIR
              }
            }
          };

          const reportedMessageIds = LINTER.verify(code, config, { filename: FIXTURE_FILE }).map(
            ({ messageId }: TSESLint.Linter.LintMessage): string | undefined => messageId
          );
          const expectedMessageIds = errors.map(({ messageId }: ExpectedError<MessageIds>): MessageIds => messageId);
          expect(reportedMessageIds).toStrictEqual(expectedMessageIds);

          const { output: actualOutput } = LINTER.verifyAndFix(code, config, {
            filename: FIXTURE_FILE
          });
          expect(await format(actualOutput, FORMATTER_OPTIONS)).toBe(await format(output, FORMATTER_OPTIONS));
        });
      });
    });
  });
}
