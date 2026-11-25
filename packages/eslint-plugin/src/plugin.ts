import type { TSESLint } from '@typescript-eslint/utils';
import packageJson from '../package.json' with { type: 'json' };
import { booleanPrefix } from './rules/boolean-prefix/boolean-prefix';
import { noElse } from './rules/no-else/no-else';
import { noElseIf } from './rules/no-else-if/no-else-if';
import { noRedundantTypes } from './rules/no-redundant-types/no-redundant-types';
import { partsOfSpeech } from './rules/parts-of-speech/parts-of-speech';
import { preferParameterObject } from './rules/prefer-parameter-object/prefer-parameter-object';

const meta = { name: packageJson.name, version: packageJson.version };

const rules = {
  'boolean-prefix': booleanPrefix,
  'no-else': noElse,
  'no-else-if': noElseIf,
  'no-redundant-types': noRedundantTypes,
  'parts-of-speech': partsOfSpeech,
  'prefer-parameter-object': preferParameterObject
};

const configs: TSESLint.FlatConfig.SharedConfigs = {};

const plugin: TSESLint.FlatConfig.Plugin = { meta, rules, configs };

const recommendedConfig: TSESLint.FlatConfig.ConfigArray = [
  {
    plugins: { 'no-mercy': plugin },
    rules: {
      'no-mercy/boolean-prefix': 'error',
      'no-mercy/no-else': 'error',
      'no-mercy/no-else-if': 'error',
      'no-mercy/no-redundant-types': 'error',
      'no-mercy/parts-of-speech': 'error',
      'no-mercy/prefer-parameter-object': 'error'
    }
  }
];

Object.assign(configs, { recommended: recommendedConfig });

export { plugin };
