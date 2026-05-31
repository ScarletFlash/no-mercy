import { type TSESTree } from '@typescript-eslint/utils';

const TYPE_KEY = 'type' satisfies keyof TSESTree.Node;

export function isNode(value: unknown): value is TSESTree.Node {
  return typeof value === 'object' && value !== null && TYPE_KEY in value && typeof value[TYPE_KEY] === 'string';
}
