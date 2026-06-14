import { ESSENTIAL_CONFIG } from '@no-mercy/configs/eslint';
import { getMergedOptions, PARTS_OF_SPEECH_DEFAULT } from './dist/index.mjs';

export default [
  ...ESSENTIAL_CONFIG,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-mercy/parts-of-speech': [
        'error',
        getMergedOptions({
          base: PARTS_OF_SPEECH_DEFAULT,
          override: {
            globalPatterns: { nouns: ['^variable$'] },
            declarationPolicies: { variable: { function: { patterns: { verbs: ['^ts$'] } } } }
          }
        })
      ]
    }
  }
];
