import type { TSESLint } from '@typescript-eslint/utils';

export function recommendedConfigFactory(plugin: TSESLint.FlatConfig.Plugin): TSESLint.FlatConfig.ConfigArray {
  return [
    {
      plugins: { 'no-mercy': plugin },
      rules: {
        'no-mercy/no-else': 'error',
        'no-mercy/no-else-if': 'error'
      }
    }
  ];
}
