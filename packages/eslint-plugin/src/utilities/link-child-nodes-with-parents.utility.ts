import { simpleTraverse } from '@typescript-eslint/typescript-estree';
import { type TSESTree } from '@typescript-eslint/utils';

const NOOP = (): void => void 0;

export function linkChildNodesWithParents(node: TSESTree.Node): void {
  simpleTraverse(node, { enter: NOOP }, true);
}
