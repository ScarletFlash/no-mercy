import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

const TERMINATABLE_STATEMENT_TYPES = new Set<AST_NODE_TYPES>([
  AST_NODE_TYPES.ReturnStatement,
  AST_NODE_TYPES.ThrowStatement,
  AST_NODE_TYPES.BreakStatement,
  AST_NODE_TYPES.ContinueStatement
]);

export function isTerminatable(block: TSESTree.BlockStatement): boolean {
  const lastStatement = block.body.at(-1);
  return lastStatement !== undefined && TERMINATABLE_STATEMENT_TYPES.has(lastStatement.type);
}
