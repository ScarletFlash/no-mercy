import { join, resolve } from 'path';
import { parseForESLint, type ParserOptions, type ParserServicesWithTypeInformation } from '@typescript-eslint/parser';
import { TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { linkChildNodesWithParents } from './link-child-nodes-with-parents.utility';

const FIXTURES_DIR = resolve(import.meta.dirname, '../../tests/fixtures');

interface ParsedCode {
  readonly ast: TSESTree.Program;
  readonly sourceCode: TSESLint.SourceCode;
  readonly parserServices: ParserServicesWithTypeInformation;
}

export function getParsedCode(code: string): ParsedCode {
  const { ast, scopeManager, services } = parseForESLint(code, {
    disallowAutomaticSingleRunInference: true,
    filePath: join(FIXTURES_DIR, 'virtual-source.ts'),
    projectService: {
      allowDefaultProject: ['*.ts'],
      defaultProject: join(FIXTURES_DIR, 'tsconfig.strict.json')
    },
    tsconfigRootDir: FIXTURES_DIR
  } satisfies ParserOptions);

  if (services.program === null) {
    throw new Error('Parser services are missing type information.');
  }

  linkChildNodesWithParents(ast);

  return {
    ast,
    sourceCode: new TSESLint.SourceCode({
      ast,
      parserServices: services,
      scopeManager,
      text: code,
      visitorKeys: null
    }),
    parserServices: services
  };
}
