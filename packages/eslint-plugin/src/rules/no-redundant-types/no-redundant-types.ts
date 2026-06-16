import {
  AST_NODE_TYPES,
  ESLintUtils,
  type ParserServicesWithTypeInformation,
  type TSESLint,
  type TSESTree
} from '@typescript-eslint/utils';
import * as TS_API from 'typescript';
import { getRule } from '../../utilities/get-rule.utility';
import { NO_REDUNDANT_TYPES_DEFAULT } from './no-redundant-types.default';
import { MessageId } from './no-redundant-types.message-id';
import { type Options } from './no-redundant-types.options';

type FunctionLike = TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression;
type RuleContext = Readonly<TSESLint.RuleContext<MessageId, readonly [Options]>>;

const TYPE_FORMAT_FLAGS = TS_API.TypeFormatFlags.NoTruncation;

interface RuleScope {
  readonly context: RuleContext;
  readonly parserServices: ParserServicesWithTypeInformation;
  readonly areParametersIgnored: boolean;
  readonly isDestructuringIgnored: boolean;
}

interface ReportParams {
  readonly context: RuleContext;
  readonly typeAnnotation: TSESTree.TSTypeAnnotation;
}

interface IsRedundantTypeAnnotationParams {
  readonly annotatedNode: TSESTree.Node;
  readonly valueType: TS_API.Type;
  readonly isWideningContext: boolean;
  readonly parserServices: ParserServicesWithTypeInformation;
}

interface IsAssertionTargetParams {
  readonly declarator: TSESTree.VariableDeclarator;
  readonly context: RuleContext;
  readonly parserServices: ParserServicesWithTypeInformation;
}

interface IsAssertedReferenceParams {
  readonly reference: TSESLint.Scope.Reference;
  readonly typeChecker: TS_API.TypeChecker;
  readonly parserServices: ParserServicesWithTypeInformation;
}

interface ContextFreeInitializerParams {
  readonly node: TSESTree.Expression;
  readonly parserServices: ParserServicesWithTypeInformation;
}

interface ContextFreeCallParams {
  readonly node: TSESTree.CallExpression | TSESTree.NewExpression;
  readonly parserServices: ParserServicesWithTypeInformation;
}

interface ContextualParameterTypeParams {
  readonly functionNode: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression;
  readonly parameterIndex: number;
  readonly parserServices: ParserServicesWithTypeInformation;
}

interface CheckInferredFromValueParams {
  readonly scope: RuleScope;
  readonly annotatedNode: TSESTree.Node;
  readonly typeAnnotation: TSESTree.TSTypeAnnotation | undefined;
  readonly initializer: TSESTree.Expression | null;
  readonly isWideningContext: boolean;
  readonly declarator?: TSESTree.VariableDeclarator;
}

interface CheckParametersParams {
  readonly scope: RuleScope;
  readonly functionNode: FunctionLike;
}

const CONTEXT_FREE_NODE_TYPES: ReadonlySet<AST_NODE_TYPES> = new Set<AST_NODE_TYPES>([
  AST_NODE_TYPES.BinaryExpression,
  AST_NODE_TYPES.Identifier,
  AST_NODE_TYPES.Literal,
  AST_NODE_TYPES.MemberExpression,
  AST_NODE_TYPES.TemplateLiteral,
  AST_NODE_TYPES.TSAsExpression,
  AST_NODE_TYPES.TSNonNullExpression,
  AST_NODE_TYPES.UnaryExpression
]);

function isContextFreeCall({ node, parserServices }: ContextFreeCallParams): boolean {
  if (node.typeArguments !== undefined) {
    return true;
  }

  const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
  const declaration = parserServices.program.getTypeChecker().getResolvedSignature(tsNode)?.declaration;
  return declaration !== undefined && (declaration.typeParameters?.length ?? 0) === 0;
}

function isContextFreeInitializer({ node, parserServices }: ContextFreeInitializerParams): boolean {
  if (CONTEXT_FREE_NODE_TYPES.has(node.type)) {
    return true;
  }

  if (node.type === AST_NODE_TYPES.CallExpression || node.type === AST_NODE_TYPES.NewExpression) {
    return isContextFreeCall({ node, parserServices });
  }

  if (node.type === AST_NODE_TYPES.LogicalExpression) {
    return (
      isContextFreeInitializer({ node: node.left, parserServices }) &&
      isContextFreeInitializer({ node: node.right, parserServices })
    );
  }

  if (node.type === AST_NODE_TYPES.ConditionalExpression) {
    return (
      isContextFreeInitializer({ node: node.consequent, parserServices }) &&
      isContextFreeInitializer({ node: node.alternate, parserServices })
    );
  }

  if (node.type === AST_NODE_TYPES.AwaitExpression) {
    return isContextFreeInitializer({ node: node.argument, parserServices });
  }

  return false;
}

function isWideningKind(kind: TSESTree.VariableDeclaration['kind']): boolean {
  return kind === 'let' || kind === 'var';
}

function isRedundantTypeAnnotation({
  annotatedNode,
  valueType,
  isWideningContext,
  parserServices
}: IsRedundantTypeAnnotationParams): boolean {
  const typeChecker = parserServices.program.getTypeChecker();
  const declaredType = typeChecker.typeToString(
    typeChecker.getTypeAtLocation(parserServices.esTreeNodeToTSNodeMap.get(annotatedNode)),
    undefined,
    TYPE_FORMAT_FLAGS
  );
  const rawType = typeChecker.typeToString(valueType, undefined, TYPE_FORMAT_FLAGS);
  if (!isWideningContext) {
    return declaredType === rawType;
  }

  const widenedType = valueType.isUnion()
    ? rawType
    : typeChecker.typeToString(typeChecker.getBaseTypeOfLiteralType(valueType), undefined, TYPE_FORMAT_FLAGS);

  return declaredType === rawType || declaredType === widenedType;
}

function isAssertedReference({ reference, typeChecker, parserServices }: IsAssertedReferenceParams): boolean {
  const { identifier } = reference;
  if (identifier.type !== AST_NODE_TYPES.Identifier) {
    return false;
  }

  const call = identifier.parent;
  if (call.type !== AST_NODE_TYPES.CallExpression) {
    return false;
  }

  const argumentIndex = call.arguments.indexOf(identifier);
  if (argumentIndex === -1) {
    return false;
  }

  const signature = typeChecker.getResolvedSignature(parserServices.esTreeNodeToTSNodeMap.get(call));
  if (signature === undefined) {
    return false;
  }

  const typePredicate = typeChecker.getTypePredicateOfSignature(signature);
  return (
    typePredicate?.kind === TS_API.TypePredicateKind.AssertsIdentifier && typePredicate.parameterIndex === argumentIndex
  );
}

function isAssertionTarget({ declarator, context, parserServices }: IsAssertionTargetParams): boolean {
  const [variable] = context.sourceCode.getDeclaredVariables(declarator);
  if (variable === undefined) {
    return false;
  }

  const typeChecker = parserServices.program.getTypeChecker();
  return variable.references.some((reference: TSESLint.Scope.Reference): boolean =>
    isAssertedReference({ reference, typeChecker, parserServices })
  );
}

function getContextualParameterType({
  functionNode,
  parameterIndex,
  parserServices
}: ContextualParameterTypeParams): TS_API.Type | undefined {
  const typeChecker = parserServices.program.getTypeChecker();
  const tsFunction = parserServices.esTreeNodeToTSNodeMap.get(functionNode);
  if (!TS_API.isArrowFunction(tsFunction) && !TS_API.isFunctionExpression(tsFunction)) {
    return undefined;
  }

  const [signature] = typeChecker.getContextualType(tsFunction)?.getCallSignatures() ?? [];
  const parameterSymbol = signature?.getParameters().at(parameterIndex);
  if (parameterSymbol === undefined) {
    return undefined;
  }

  return typeChecker.getTypeOfSymbolAtLocation(parameterSymbol, tsFunction);
}

function report({ context, typeAnnotation }: ReportParams): void {
  context.report({
    node: typeAnnotation,
    messageId: MessageId.RedundantType,
    fix: (fixer: TSESLint.RuleFixer): TSESLint.RuleFix => fixer.remove(typeAnnotation)
  });
}

function checkInferredFromValue({
  scope,
  annotatedNode,
  typeAnnotation,
  initializer,
  isWideningContext,
  declarator
}: CheckInferredFromValueParams): void {
  const { context, parserServices } = scope;
  if (
    typeAnnotation === undefined ||
    initializer === null ||
    !isContextFreeInitializer({ node: initializer, parserServices })
  ) {
    return;
  }

  const valueType = parserServices.program
    .getTypeChecker()
    .getTypeAtLocation(parserServices.esTreeNodeToTSNodeMap.get(initializer));
  if (!isRedundantTypeAnnotation({ annotatedNode, valueType, isWideningContext, parserServices })) {
    return;
  }

  if (declarator !== undefined && isAssertionTarget({ declarator, context, parserServices })) {
    return;
  }

  report({ context, typeAnnotation });
}

function checkParameters({ scope, functionNode }: CheckParametersParams): void {
  if (scope.areParametersIgnored) {
    return;
  }

  const { context, parserServices } = scope;
  functionNode.params.forEach((parameter: TSESTree.Parameter, parameterIndex: number): void => {
    if (parameter.type === AST_NODE_TYPES.AssignmentPattern && parameter.left.type === AST_NODE_TYPES.Identifier) {
      checkInferredFromValue({
        scope,
        annotatedNode: parameter.left,
        typeAnnotation: parameter.left.typeAnnotation,
        initializer: parameter.right,
        isWideningContext: true
      });
      return;
    }

    if (
      functionNode.type === AST_NODE_TYPES.FunctionDeclaration ||
      parameter.type !== AST_NODE_TYPES.Identifier ||
      parameter.typeAnnotation === undefined
    ) {
      return;
    }

    const { typeAnnotation } = parameter;
    const valueType = getContextualParameterType({ functionNode, parameterIndex, parserServices });
    if (
      valueType !== undefined &&
      isRedundantTypeAnnotation({ annotatedNode: parameter, valueType, isWideningContext: false, parserServices })
    ) {
      report({ context, typeAnnotation });
    }
  });
}

export const noRedundantTypes = getRule<readonly [Options], MessageId>({
  name: 'no-redundant-types',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'Disallow explicit type annotations that TypeScript can infer from the assigned value.'
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          areParametersIgnored: { type: 'boolean', default: true },
          isDestructuringIgnored: { type: 'boolean', default: true }
        }
      }
    ],
    messages: {
      [MessageId.RedundantType]: 'This type annotation is redundant. TypeScript infers the same type from the value.'
    }
  },
  defaultOptions: [NO_REDUNDANT_TYPES_DEFAULT],
  create: (context, [rawOptions]) => {
    const { areParametersIgnored = true, isDestructuringIgnored = true } = rawOptions ?? {};
    const scope: RuleScope = {
      context,
      parserServices: ESLintUtils.getParserServices(context),
      areParametersIgnored,
      isDestructuringIgnored
    };

    return {
      VariableDeclarator: (node: TSESTree.VariableDeclarator): void => {
        const { id, init, parent } = node;
        const isWideningContext = isWideningKind(parent.kind);
        if (id.type === AST_NODE_TYPES.Identifier) {
          checkInferredFromValue({
            scope,
            annotatedNode: id,
            typeAnnotation: id.typeAnnotation,
            initializer: init,
            isWideningContext,
            declarator: node
          });
          return;
        }

        if (
          !isDestructuringIgnored &&
          (id.type === AST_NODE_TYPES.ObjectPattern || id.type === AST_NODE_TYPES.ArrayPattern)
        ) {
          checkInferredFromValue({
            scope,
            annotatedNode: id,
            typeAnnotation: id.typeAnnotation,
            initializer: init,
            isWideningContext
          });
        }
      },
      PropertyDefinition: ({ key, typeAnnotation, value, readonly }: TSESTree.PropertyDefinition): void => {
        checkInferredFromValue({
          scope,
          annotatedNode: key,
          typeAnnotation,
          initializer: value,
          isWideningContext: !readonly
        });
      },
      ArrowFunctionExpression: (functionNode: TSESTree.ArrowFunctionExpression): void => {
        checkParameters({ scope, functionNode });
      },
      FunctionDeclaration: (functionNode: TSESTree.FunctionDeclaration): void => {
        checkParameters({ scope, functionNode });
      },
      FunctionExpression: (functionNode: TSESTree.FunctionExpression): void => {
        checkParameters({ scope, functionNode });
      }
    };
  }
});
