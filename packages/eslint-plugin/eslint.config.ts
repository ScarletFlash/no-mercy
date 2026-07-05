import { ESSENTIAL_CONFIG } from '@no-mercy/configs/eslint';
import { type ConfigArray } from 'typescript-eslint';
import { PARTS_OF_SPEECH_DEFAULT, getMergedOptions } from './dist/index.js';

const CONFIG: ConfigArray = [
  ...ESSENTIAL_CONFIG,
  {
    files: ['**/*.ts'],
    rules: {
      'no-mercy/parts-of-speech': [
        'error',
        getMergedOptions({
          base: PARTS_OF_SPEECH_DEFAULT,
          override: {
            declarationPolicies: {
              variable: {
                '^(preferParameterObject|PREFER_PARAMETER_OBJECT_DEFAULT)$': {
                  required: ['noun'],
                  appliesTo: 'no-mercy/prefer-parameter-object -related exports'
                },
                '^ts$': { required: [], appliesTo: 'Template tag for TypeScript syntax highlighting' }
              }
            }
          }
        })
      ]
    }
  }
];

export default CONFIG;
