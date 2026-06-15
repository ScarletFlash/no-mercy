import prettierConfig from '@no-mercy/configs/prettier';
import { type GenerateOptions } from 'eslint-doc-generator';
import { format } from 'prettier';

export default {
  pathRuleDoc: 'src/rules/{name}/README.md',
  pathRuleList: 'README.md',
  ruleDocSectionInclude: ['Rule details'],
  ruleDocTitleFormat: 'desc-parens-prefix-name',
  urlConfigs: 'https://github.com/ScarletFlash/no-mercy#configs',
  postprocess: (content, path) => format(content, { ...prettierConfig, filepath: path })
} satisfies GenerateOptions;
