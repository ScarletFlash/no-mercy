import ESSENTIAL_CONFIG, { PACKAGE_JSON_DEFAULT_SORT_ORDER } from '@no-mercy/configs/prettier';
import { type Config } from 'prettier';

const ROOT_PACKAGE_JSON_PATCHED_SORT_ORDER = Object.fromEntries(
  Object.entries(PACKAGE_JSON_DEFAULT_SORT_ORDER).map((entry) => {
    const [key] = entry;
    return key === 'scripts' ? [key, null] : entry;
  })
);

export default {
  ...ESSENTIAL_CONFIG,
  overrides: [
    {
      files: ['./package.json'],
      options: {
        jsonSortOrder: JSON.stringify(ROOT_PACKAGE_JSON_PATCHED_SORT_ORDER)
      }
    }
  ]
} satisfies Config;
