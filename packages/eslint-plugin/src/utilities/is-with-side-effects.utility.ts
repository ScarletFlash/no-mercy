import {
  ASTUtils,
  AST_NODE_TYPES,
  type ParserServicesWithTypeInformation,
  type TSESLint,
  type TSESTree
} from '@typescript-eslint/utils';
import * as TS_API from 'typescript';
import { getChildren } from './get-children.utility';

type Scope = TSESLint.Scope.Scope;
type FunctionNode = TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression;
type ParserServices = ParserServicesWithTypeInformation;

interface IsWithSideEffectsParams {
  readonly block: TSESTree.BlockStatement;
  readonly sourceCode: TSESLint.SourceCode;
  readonly parserServices: ParserServices;
}

interface SideEffectCheckerParams {
  readonly sourceCode: TSESLint.SourceCode;
  readonly parserServices: ParserServices;
  readonly typeChecker: TS_API.TypeChecker;
  readonly innerScopes: ReadonlySet<Scope>;
  readonly currentlyAnalysedFunctionSymbols?: Set<TS_API.Symbol>;
  readonly isWithSideEffectsByFunctionSymbol?: Map<TS_API.Symbol | undefined, boolean>;
  readonly node: TSESTree.Node;
  readonly scope: Scope;
}

interface GetChildParams {
  readonly node: TSESTree.Node;
  readonly scope: Scope;
}

interface IsOuterTargetParams {
  readonly target: TSESTree.Node;
  readonly scope: Scope;
}

interface MutationCheckParams {
  readonly node: TSESTree.Node;
  readonly scope: Scope;
}

type MutationChecker = (params: MutationCheckParams) => boolean;

interface GetDeclarationsParams {
  readonly invokedExpression: TSESTree.Expression;
  readonly node: TSESTree.Node;
}

class SideEffectChecker {
  readonly #sourceCode: TSESLint.SourceCode;
  readonly #parserServices: ParserServices;
  readonly #typeChecker: TS_API.TypeChecker;
  readonly #innerScopes: ReadonlySet<Scope>;
  readonly #currentlyAnalysedFunctionSymbols: Set<TS_API.Symbol>;
  readonly #isWithSideEffectsByFunctionSymbol: Map<TS_API.Symbol | undefined, boolean>;
  readonly #node: TSESTree.Node;
  readonly #scope: Scope;

  readonly #directMutationCheckers: readonly MutationChecker[] = [
    ({ node, scope }: MutationCheckParams) =>
      node.type === AST_NODE_TYPES.AssignmentExpression && this.#isOuterTarget({ target: node.left, scope }),

    ({ node, scope }: MutationCheckParams) =>
      node.type === AST_NODE_TYPES.UpdateExpression && this.#isOuterTarget({ target: node.argument, scope }),

    ({ node, scope }: MutationCheckParams) =>
      node.type === AST_NODE_TYPES.UnaryExpression &&
      node.operator === ('delete' satisfies TSESTree.UnaryExpressionDelete['operator']) &&
      this.#isOuterTarget({ target: node.argument, scope })
  ];

  static readonly #scopeBoundaryNodeTypes: ReadonlySet<AST_NODE_TYPES> = new Set<AST_NODE_TYPES>([
    AST_NODE_TYPES.BlockStatement,
    AST_NODE_TYPES.ForStatement,
    AST_NODE_TYPES.ForInStatement,
    AST_NODE_TYPES.ForOfStatement,
    AST_NODE_TYPES.SwitchStatement,
    AST_NODE_TYPES.CatchClause
  ]);

  static readonly #ignoredSubtreeNodeTypes: ReadonlySet<AST_NODE_TYPES> = new Set<AST_NODE_TYPES>([
    AST_NODE_TYPES.FunctionDeclaration,
    AST_NODE_TYPES.FunctionExpression,
    AST_NODE_TYPES.ArrowFunctionExpression,
    AST_NODE_TYPES.ClassDeclaration,
    AST_NODE_TYPES.ClassExpression
  ]);

  public get isWithSideEffects(): boolean {
    const node = this.#node;

    if (SideEffectChecker.#ignoredSubtreeNodeTypes.has(node.type)) {
      return false;
    }

    const effectiveScope = SideEffectChecker.#scopeBoundaryNodeTypes.has(node.type)
      ? this.#sourceCode.getScope(node)
      : this.#scope;

    const checkParams: MutationCheckParams = {
      node,
      scope: effectiveScope
    };
    const isWithDirectMutations = this.#directMutationCheckers.some((isDirectMutation: MutationChecker) =>
      isDirectMutation(checkParams)
    );
    if (isWithDirectMutations || this.#isCallWithSideEffects(checkParams)) {
      return true;
    }

    return getChildren(node).some(
      (childNode: TSESTree.Node) => this.#getChild({ node: childNode, scope: effectiveScope }).isWithSideEffects
    );
  }

  public constructor({
    sourceCode,
    parserServices,
    typeChecker,
    innerScopes,
    currentlyAnalysedFunctionSymbols = new Set<TS_API.Symbol>(),
    isWithSideEffectsByFunctionSymbol = new Map<TS_API.Symbol | undefined, boolean>(),
    node,
    scope
  }: SideEffectCheckerParams) {
    this.#sourceCode = sourceCode;
    this.#parserServices = parserServices;
    this.#typeChecker = typeChecker;
    this.#innerScopes = innerScopes;
    this.#currentlyAnalysedFunctionSymbols = currentlyAnalysedFunctionSymbols;
    this.#isWithSideEffectsByFunctionSymbol = isWithSideEffectsByFunctionSymbol;
    this.#node = node;
    this.#scope = scope;
  }

  readonly #isCallWithSideEffects: MutationChecker = ({ node }: MutationCheckParams) => {
    const templateTag = node.type === AST_NODE_TYPES.TaggedTemplateExpression ? node.tag : null;
    const callee =
      node.type === AST_NODE_TYPES.CallExpression || node.type === AST_NODE_TYPES.NewExpression ? node.callee : null;
    const invokedExpression = templateTag ?? callee;
    if (invokedExpression === null) {
      return false;
    }

    const declarations = this.#getDeclarations({ invokedExpression, node });
    if (declarations.length === 0) {
      return true;
    }

    const isWithAmbientDeclaration = declarations.some(
      (declaration: TS_API.Declaration) => declaration.getSourceFile().isDeclarationFile
    );
    if (isWithAmbientDeclaration) {
      return true;
    }

    return declarations.some((declaration: TS_API.Declaration) => this.#isCallWithMutation(declaration));
  };

  #getDeclarations({ invokedExpression, node }: GetDeclarationsParams): readonly TS_API.Declaration[] {
    const unwrappedInvokedExpression = SideEffectChecker.#getUnwrappedInvokedExpression(invokedExpression);

    const tsCallLikeExpression = this.#parserServices.esTreeNodeToTSNodeMap.get(node);
    const isTsCallLike =
      TS_API.isCallExpression(tsCallLikeExpression) ||
      TS_API.isNewExpression(tsCallLikeExpression) ||
      TS_API.isTaggedTemplateExpression(tsCallLikeExpression);

    const invokedExpressionSymbol = this.#typeChecker.getSymbolAtLocation(
      this.#parserServices.esTreeNodeToTSNodeMap.get(unwrappedInvokedExpression)
    );

    const directDeclarations: readonly TS_API.Declaration[] = invokedExpressionSymbol?.declarations ?? [];

    const signature =
      directDeclarations.length === 0 && isTsCallLike
        ? this.#typeChecker.getResolvedSignature(tsCallLikeExpression)
        : undefined;

    const fallbackDeclarations: readonly TS_API.Declaration[] =
      signature?.declaration === undefined ? [] : [signature.declaration];

    return directDeclarations.length > 0 ? directDeclarations : fallbackDeclarations;
  }

  #isOuterTarget({ target, scope }: IsOuterTargetParams): boolean {
    // eslint-disable-next-line functional/no-let
    let mutationRoot = SideEffectChecker.#getUnwrappedInvokedExpression(target);
    while (mutationRoot.type === AST_NODE_TYPES.MemberExpression) {
      mutationRoot = SideEffectChecker.#getUnwrappedInvokedExpression(mutationRoot.object);
    }

    if (mutationRoot.type !== AST_NODE_TYPES.Identifier) {
      return mutationRoot.type === AST_NODE_TYPES.ThisExpression || mutationRoot.type === AST_NODE_TYPES.Super;
    }
    const variable = ASTUtils.findVariable(scope, mutationRoot.name);
    return variable === null || !this.#innerScopes.has(variable.scope);
  }

  #getChild({ node, scope }: GetChildParams): SideEffectChecker {
    return new SideEffectChecker({
      sourceCode: this.#sourceCode,
      parserServices: this.#parserServices,
      typeChecker: this.#typeChecker,
      innerScopes: this.#innerScopes,
      currentlyAnalysedFunctionSymbols: this.#currentlyAnalysedFunctionSymbols,
      isWithSideEffectsByFunctionSymbol: this.#isWithSideEffectsByFunctionSymbol,
      node,
      scope
    });
  }

  #isCallWithMutation(declaration: TS_API.Declaration): boolean {
    const esDeclaration = this.#parserServices.tsNodeToESTreeNodeMap.get(declaration);

    const functionNode = esDeclaration === undefined ? null : SideEffectChecker.#getFunctionNode(esDeclaration);
    if (functionNode === null) {
      return true;
    }

    const functionSymbol = this.#typeChecker.getSymbolAtLocation(
      this.#parserServices.esTreeNodeToTSNodeMap.get(functionNode)
    );

    const isFunctionWithSideEffects = this.#isWithSideEffectsByFunctionSymbol.get(functionSymbol);
    if (isFunctionWithSideEffects !== undefined) {
      return isFunctionWithSideEffects;
    }

    if (functionSymbol !== undefined && this.#currentlyAnalysedFunctionSymbols.has(functionSymbol)) {
      return false;
    }

    if (functionSymbol !== undefined) {
      this.#currentlyAnalysedFunctionSymbols.add(functionSymbol);
    }

    const isBodyWithSideEffects = this.#getChild({
      node: functionNode.body,
      scope: this.#sourceCode.getScope(functionNode)
    }).isWithSideEffects;
    if (functionSymbol !== undefined) {
      this.#currentlyAnalysedFunctionSymbols.delete(functionSymbol);
      this.#isWithSideEffectsByFunctionSymbol.set(functionSymbol, isBodyWithSideEffects);
    }

    return isBodyWithSideEffects;
  }

  static #getUnwrappedInvokedExpression(expression: TSESTree.Node): TSESTree.Node {
    // eslint-disable-next-line functional/no-let
    let unwrappedExpression = expression;
    while (
      unwrappedExpression.type === AST_NODE_TYPES.ChainExpression ||
      unwrappedExpression.type === AST_NODE_TYPES.TSNonNullExpression ||
      unwrappedExpression.type === AST_NODE_TYPES.TSAsExpression ||
      unwrappedExpression.type === AST_NODE_TYPES.TSSatisfiesExpression ||
      unwrappedExpression.type === AST_NODE_TYPES.TSTypeAssertion
    ) {
      unwrappedExpression = unwrappedExpression.expression;
    }
    return unwrappedExpression;
  }

  static #getFunctionNode(node: TSESTree.Node): FunctionNode | null {
    switch (node.type) {
      case AST_NODE_TYPES.FunctionDeclaration:
      case AST_NODE_TYPES.FunctionExpression:
      case AST_NODE_TYPES.ArrowFunctionExpression:
        return node;
      case AST_NODE_TYPES.VariableDeclarator:
        return node.init === null ? null : SideEffectChecker.#getFunctionNode(node.init);
      case AST_NODE_TYPES.MethodDefinition:
      case AST_NODE_TYPES.Property:
        return SideEffectChecker.#getFunctionNode(node.value);
      case AST_NODE_TYPES.PropertyDefinition:
        return node.value === null ? null : SideEffectChecker.#getFunctionNode(node.value);
      default:
        return null;
    }
  }
}

export function isWithSideEffects({ block, sourceCode, parserServices }: IsWithSideEffectsParams): boolean {
  const blockScope = sourceCode.getScope(block);

  const innerScopes = new Set<Scope>();

  const scopeStack = [blockScope];

  while (scopeStack.length > 0) {
    const currentScope = scopeStack.pop();
    if (currentScope === undefined) {
      throw new Error('Unexpected undefined scope in the stack');
    }

    if (innerScopes.has(currentScope)) {
      continue;
    }

    innerScopes.add(currentScope);
    scopeStack.push(...currentScope.childScopes);
  }

  return new SideEffectChecker({
    sourceCode,
    parserServices,
    typeChecker: parserServices.program.getTypeChecker(),
    innerScopes,
    node: block,
    scope: blockScope
  }).isWithSideEffects;
}
