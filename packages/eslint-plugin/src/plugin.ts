import type { TSESLint } from '@typescript-eslint/utils';
import packageJson from '../package.json' with { type: 'json' };
import { booleanPrefix } from './rules/boolean-prefix/boolean-prefix';
import { noElse } from './rules/no-else/no-else';
import { noElseIf } from './rules/no-else-if/no-else-if';
import { partsOfSpeech } from './rules/parts-of-speech/parts-of-speech';

const meta = { name: packageJson.name, version: packageJson.version };

const rules = {
  'boolean-prefix': booleanPrefix,
  'no-else': noElse,
  'no-else-if': noElseIf,
  'parts-of-speech': partsOfSpeech
};

export const plugin: TSESLint.FlatConfig.Plugin = {
  meta,
  rules,
  configs: {
    recommended: [
      {
        plugins: { 'no-mercy': { meta, rules } },
        rules: {
          'no-mercy/boolean-prefix': 'error',
          'no-mercy/no-else': 'error',
          'no-mercy/no-else-if': 'error',
          'no-mercy/parts-of-speech': 'error'
        }
      }
    ]
  }
};
