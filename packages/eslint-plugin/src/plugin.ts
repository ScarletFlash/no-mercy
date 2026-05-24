import type { TSESLint } from '@typescript-eslint/utils';
import packageJson from '../package.json' with { type: 'json' };
import { recommendedConfigFactory } from './configs/recommended.config-factory';
import { noElse } from './rules/no-else/no-else';
import { noElseIf } from './rules/no-else-if/no-else-if';

const meta = { name: packageJson.name, version: packageJson.version };

const rules = {
  'no-else': noElse,
  'no-else-if': noElseIf
};

export const plugin: TSESLint.FlatConfig.Plugin = {
  meta,
  rules,
  configs: {
    recommended: recommendedConfigFactory({ meta, rules })
  }
} satisfies TSESLint.FlatConfig.Plugin;
