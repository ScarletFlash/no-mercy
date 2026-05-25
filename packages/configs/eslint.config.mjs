import { ESSENTIAL_CONFIG } from './eslint.mjs';

export default [...ESSENTIAL_CONFIG, { rules: { 'no-restricted-syntax': 'off' } }];
