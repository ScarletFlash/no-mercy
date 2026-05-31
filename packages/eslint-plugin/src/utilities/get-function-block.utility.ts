import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import { getChildren } from './get-children.utility';

interface GetFunctionBlockParams {
  readonly ast: TSESTree.Program;
  readonly functionName: string;
}

export function getFunctionBlock({ ast, functionName }: GetFunctionBlockParams): TSESTree.BlockStatement {
  const queue: TSESTree.Node[] = [ast];

  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined) {
      throw new Error('Unexpected undefined node in the queue');
    }

    if (node.type === AST_NODE_TYPES.FunctionDeclaration && node.id?.name === functionName) {
      return node.body;
    }
    queue.push(...getChildren(node));
  }

  throw new Error(`Function "${functionName}" was not found in the provided code.`);
}
