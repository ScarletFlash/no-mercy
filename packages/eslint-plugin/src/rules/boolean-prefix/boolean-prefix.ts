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
type MethodNode = TSESTree.MethodDefinition | TSESTree.TSAbstractMethodDefinition;
type MemberNode =
  | MethodNode
  | TSESTree.PropertyDefinition
  | TSESTree.AccessorProperty
  | TSESTree.TSAbstractPropertyDefinition
  | TSESTree.TSAbstractAccessorProperty
  | TSESTree.TSMethodSignature
  | TSESTree.TSPropertySignature;

interface RuleScope {
  readonly context: RuleContext;
  readonly parserServices: ParserServicesWithTypeInformation;
  readonly options: Options;
  readonly globalPrefixes: readonly string[];
  readonly globalIgnore: readonly string[];
}

interface CheckParams {
  readonly scope: RuleScope;
  readonly id: TSESTree.Identifier | TSESTree.PrivateIdentifier;
}

interface CheckParametersParams {
  readonly scope: RuleScope;
  readonly parameters: readonly TSESTree.Parameter[];
}

interface CheckMemberKeyParams {
  readonly scope: RuleScope;
  readonly member: MemberNode;
}

interface CheckMethodKeyParams {
  readonly scope: RuleScope;
  readonly method: MethodNode;
}

const METHOD_KIND = {
  constructor: 'constructor',
  get: 'get',
  set: 'set',
  method: 'method'
} as const satisfies Record<string, TSESTree.MethodDefinition['kind']>;

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

function getMemberKeyIdentifier(member: MemberNode): TSESTree.Identifier | TSESTree.PrivateIdentifier | null {
  if (member.computed) {
    return null;
  }

  const { key } = member;
  if (key.type === AST_NODE_TYPES.Identifier || key.type === AST_NODE_TYPES.PrivateIdentifier) {
    return key;
  }

  return null;
}

function getParameterIdentifier(parameter: TSESTree.Parameter): TSESTree.Identifier | null {
  switch (parameter.type) {
    case AST_NODE_TYPES.Identifier:
      return parameter;
    case AST_NODE_TYPES.AssignmentPattern:
      return parameter.left.type === AST_NODE_TYPES.Identifier ? parameter.left : null;
    case AST_NODE_TYPES.RestElement:
      return parameter.argument.type === AST_NODE_TYPES.Identifier ? parameter.argument : null;
    case AST_NODE_TYPES.TSParameterProperty:
      return getParameterIdentifier(parameter.parameter);
    default:
      return null;
  }
}

function checkParameters({ scope, parameters }: CheckParametersParams): void {
  parameters.forEach((parameter: TSESTree.Parameter): void => {
    const id = getParameterIdentifier(parameter);
    if (id !== null) {
      check({ scope, id });
    }
  });
}

function checkMemberKey({ scope, member }: CheckMemberKeyParams): void {
  const id = getMemberKeyIdentifier(member);
  if (id !== null) {
    check({ scope, id });
  }
}

function checkMethodKey({ scope, method }: CheckMethodKeyParams): void {
  if (method.kind === METHOD_KIND.constructor || method.kind === METHOD_KIND.set) {
    return;
  }
  checkMemberKey({ scope, member: method });
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
  create: (context: RuleContext, [rawOptions]: readonly [Options]) => {
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
      FunctionDeclaration: (node: TSESTree.FunctionDeclaration): void => {
        if (node.id !== null) {
          check({ scope, id: node.id });
        }
        checkParameters({ scope, parameters: node.params });
      },
      FunctionExpression: (node: TSESTree.FunctionExpression): void => {
        checkParameters({ scope, parameters: node.params });
      },
      ArrowFunctionExpression: (node: TSESTree.ArrowFunctionExpression): void => {
        checkParameters({ scope, parameters: node.params });
      },
      TSDeclareFunction: (node: TSESTree.TSDeclareFunction): void => {
        checkParameters({ scope, parameters: node.params });
      },
      TSEmptyBodyFunctionExpression: (node: TSESTree.TSEmptyBodyFunctionExpression): void => {
        checkParameters({ scope, parameters: node.params });
      },
      TSFunctionType: (node: TSESTree.TSFunctionType): void => {
        checkParameters({ scope, parameters: node.params });
      },
      TSCallSignatureDeclaration: (node: TSESTree.TSCallSignatureDeclaration): void => {
        checkParameters({ scope, parameters: node.params });
      },
      TSConstructSignatureDeclaration: (node: TSESTree.TSConstructSignatureDeclaration): void => {
        checkParameters({ scope, parameters: node.params });
      },
      MethodDefinition: (node: TSESTree.MethodDefinition): void => {
        checkMethodKey({ scope, method: node });
      },
      TSAbstractMethodDefinition: (node: TSESTree.TSAbstractMethodDefinition): void => {
        checkMethodKey({ scope, method: node });
      },
      PropertyDefinition: (node: TSESTree.PropertyDefinition): void => {
        checkMemberKey({ scope, member: node });
      },
      AccessorProperty: (node: TSESTree.AccessorProperty): void => {
        checkMemberKey({ scope, member: node });
      },
      TSAbstractPropertyDefinition: (node: TSESTree.TSAbstractPropertyDefinition): void => {
        checkMemberKey({ scope, member: node });
      },
      TSAbstractAccessorProperty: (node: TSESTree.TSAbstractAccessorProperty): void => {
        checkMemberKey({ scope, member: node });
      },
      TSPropertySignature: (node: TSESTree.TSPropertySignature): void => {
        checkMemberKey({ scope, member: node });
      },
      TSMethodSignature: (node: TSESTree.TSMethodSignature): void => {
        if (node.kind === METHOD_KIND.set) {
          return;
        }
        checkMemberKey({ scope, member: node });
        checkParameters({ scope, parameters: node.params });
      }
    };
  }
});
