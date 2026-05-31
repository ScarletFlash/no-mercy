import { type TSESTree } from '@typescript-eslint/utils';
import { isNode } from './is-node.utility';

const PARENT_KEY = 'parent' satisfies keyof TSESTree.Node;

export function getChildren(node: TSESTree.Node): readonly TSESTree.Node[] {
  return Object.entries(node)
    .filter(([key]: [string, unknown]) => key !== PARENT_KEY)
    .flatMap(([, value]: [string, unknown]) => value)
    .filter(isNode);
}
