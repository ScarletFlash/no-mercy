import { type Config } from 'prettier';

type JsonSortOrder = Record<string, 'lexical' | null>;

const PACKAGE_JSON_DEFAULT_SORT_ORDER: JsonSortOrder = {
  name: null,
  description: null,
  version: null,
  private: null,
  repository: 'lexical',
  bin: null,
  main: null,
  types: null,
  files: 'lexical',
  scripts: 'lexical',
  peerDependencies: 'lexical',
  dependencies: 'lexical',
  devDependencies: 'lexical',
  engines: 'lexical',
  packageManager: null,
  '*': 'lexical'
};

const ESSENTIAL_CONFIG: Config = {
  arrowParens: 'always',
  bracketSameLine: false,
  bracketSpacing: true,
  embeddedLanguageFormatting: 'auto',
  endOfLine: 'lf',
  htmlWhitespaceSensitivity: 'css',
  insertPragma: false,
  printWidth: 120,
  proseWrap: 'always',
  quoteProps: 'as-needed',
  requirePragma: false,
  semi: true,
  singleAttributePerLine: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'none',
  useTabs: false,
  vueIndentScriptAndStyle: false,
  plugins: ['prettier-plugin-embed', 'prettier-plugin-sort-json'],
  embeddedTsTags: ['ts'],
  embeddedTsParser: 'typescript',
  jsonRecursiveSort: true,
  jsonSortOrder: JSON.stringify({ '*': 'lexical' }),
  overrides: [
    {
      files: '*.json',
      options: {
        parser: 'json'
      }
    },
    {
      files: ['package.json'],
      options: {
        jsonSortOrder: JSON.stringify(PACKAGE_JSON_DEFAULT_SORT_ORDER)
      }
    }
  ]
};

export { PACKAGE_JSON_DEFAULT_SORT_ORDER };
export default ESSENTIAL_CONFIG;
