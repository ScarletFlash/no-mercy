import { AST_NODE_TYPES, ESLintUtils, type JSONSchema, type TSESTree } from '@typescript-eslint/utils';
import { noCase } from 'change-case';
import { getDeclarationTypeInfo } from '../../utilities/get-declaration-type-info.utility';
import { getRegExp } from '../../utilities/get-regexp.utility';
import { getRule } from '../../utilities/get-rule.utility';
import { BOOLEAN_PREFIX_DEFAULT } from './boolean-prefix.default';
import { MessageId } from './boolean-prefix.message-id';
import { type Options } from './boolean-prefix.options';

type Target = NonNullable<Options['variables']>;

const STRING_ARRAY_SCHEMA: JSONSchema.JSONSchema4 = { type: 'array', items: { type: 'string' } };
const TARGET_SCHEMA: JSONSchema.JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: { prefixes: STRING_ARRAY_SCHEMA, ignore: STRING_ARRAY_SCHEMA }
};

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
  create(context, [rawOptions]) {
    const options = rawOptions ?? {};
    const parserServices = ESLintUtils.getParserServices(context);
    const globalPrefixes: readonly string[] = options.default?.prefixes ?? [];
    const globalIgnore: readonly string[] = options.default?.ignore ?? [];

    const check = (id: TSESTree.Identifier): void => {
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
    };

    return {
      VariableDeclarator: ({ id }: TSESTree.VariableDeclarator): void => {
        if (id.type === AST_NODE_TYPES.Identifier) {
          check(id);
        }
      },
      FunctionDeclaration: ({ id }: TSESTree.FunctionDeclaration): void => {
        if (id !== null) {
          check(id);
        }
      }
    };
  }
});
