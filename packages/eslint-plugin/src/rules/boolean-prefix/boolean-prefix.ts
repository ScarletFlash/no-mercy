import {
  AST_NODE_TYPES,
  ESLintUtils,
  type JSONSchema,
  type ParserServicesWithTypeInformation,
  type TSESLint,
  type TSESTree
} from '@typescript-eslint/utils';
import { noCase } from 'change-case';
import { getDeclarationTypeInfo } from '../../utilities/get-declaration-type-info.utility';
import { getRegExp } from '../../utilities/get-regexp.utility';
import { getRule } from '../../utilities/get-rule.utility';
import { BOOLEAN_PREFIX_DEFAULT } from './boolean-prefix.default';
import { MessageId } from './boolean-prefix.message-id';
import { type Options } from './boolean-prefix.options';

type Target = NonNullable<Options['variables']>;
type RuleContext = Readonly<TSESLint.RuleContext<MessageId, readonly [Options]>>;

interface RuleScope {
  readonly context: RuleContext;
  readonly parserServices: ParserServicesWithTypeInformation;
  readonly options: Options;
  readonly globalPrefixes: readonly string[];
  readonly globalIgnore: readonly string[];
}

interface CheckParams {
  readonly scope: RuleScope;
  readonly id: TSESTree.Identifier;
}

const STRING_ARRAY_SCHEMA: JSONSchema.JSONSchema4 = { type: 'array', items: { type: 'string' } };
const TARGET_SCHEMA: JSONSchema.JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: { prefixes: STRING_ARRAY_SCHEMA, ignore: STRING_ARRAY_SCHEMA }
};

function check({ scope, id }: CheckParams): void {
  const { context, parserServices, options, globalPrefixes, globalIgnore } = scope;
  const { isBoolean, isCallable } = getDeclarationTypeInfo({ node: id, parserServices });
  if (!isBoolean) {
    return;
  }

  const target: Target = (isCallable ? options.functions : options.variables) ?? {};
  const prefixes = target.prefixes ?? globalPrefixes;
  const ignoredPatterns = [...globalIgnore, ...(target.ignore ?? [])];
  const { name } = id;

  if (ignoredPatterns.some((source: string) => getRegExp(source).test(name))) {
    return;
  }

  const [firstWord] = noCase(name).split(' ');
  if (firstWord !== undefined && prefixes.some((prefix: string) => prefix.toLowerCase() === firstWord)) {
    return;
  }

  context.report({
    node: id,
    messageId: MessageId.MissingBooleanPrefix,
    data: { name, prefixes: prefixes.join(', ') }
  });
}

export const booleanPrefix = getRule<readonly [Options], MessageId>({
  name: 'boolean-prefix',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require boolean variables and boolean-returning functions to start with a configurable prefix.'
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          default: TARGET_SCHEMA,
          variables: TARGET_SCHEMA,
          functions: TARGET_SCHEMA
        }
      }
    ],
    messages: {
      [MessageId.MissingBooleanPrefix]: 'Boolean "{{name}}" must start with one of these prefixes: {{prefixes}}.'
    }
  },
  defaultOptions: [BOOLEAN_PREFIX_DEFAULT],
  create: (context, [rawOptions]) => {
    const options = rawOptions ?? {};
    const scope: RuleScope = {
      context,
      parserServices: ESLintUtils.getParserServices(context),
      options,
      globalPrefixes: options.default?.prefixes ?? [],
      globalIgnore: options.default?.ignore ?? []
    };

    return {
      VariableDeclarator: ({ id }: TSESTree.VariableDeclarator): void => {
        if (id.type === AST_NODE_TYPES.Identifier) {
          check({ scope, id });
        }
      },
      FunctionDeclaration: ({ id }: TSESTree.FunctionDeclaration): void => {
        if (id !== null) {
          check({ scope, id });
        }
      }
    };
  }
});
