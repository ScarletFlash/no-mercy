import { ESSENTIAL_CONFIG } from '@no-mercy/configs/eslint';
import { type ConfigArray } from 'typescript-eslint';
import { PARTS_OF_SPEECH_DEFAULT, getMergedOptions } from './dist/index.js';

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
            globalPatterns: { nouns: ['^variable$', '^(prefer|require)$'] },
            declarationPolicies: {
              variable: {
                function: { patterns: { verbs: ['^ts$'] } }
              }
            }
          }
        })
      ]
    }
  }
] satisfies ConfigArray;
