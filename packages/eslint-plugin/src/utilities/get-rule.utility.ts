import { ESLintUtils } from '@typescript-eslint/utils';

export const getRule = ESLintUtils.RuleCreator(
  (name: string) =>
    `https://github.com/ScarletFlash/no-mercy/blob/main/packages/eslint-plugin-no-mercy/src/rules/${name}/README.md`
);
