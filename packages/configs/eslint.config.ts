import { type ConfigArray } from 'typescript-eslint';
import { ESSENTIAL_CONFIG } from '@no-mercy/configs/eslint';

export default [...ESSENTIAL_CONFIG, { rules: { 'no-restricted-syntax': 'off' } }] satisfies ConfigArray;
