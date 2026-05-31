import { describe, expect, it } from '@rstest/core';
import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import { ts } from '../../tests/ts.template-tag';
import { getChildren } from './get-children.utility';
import { getFunctionBlock } from './get-function-block.utility';
import { getParsedCode } from './get-parsed-code.utility';
import { isNode } from './is-node.utility';

const FUNCTION_NAME = 'run' as const;

function getOnlyDeclarator(block: TSESTree.BlockStatement): TSESTree.VariableDeclarator {
  const [declaration] = block.body;
  if (declaration?.type !== AST_NODE_TYPES.VariableDeclaration) {
    throw new Error('Expected the block to start with a variable declaration.');
  }

  const [declarator] = declaration.declarations;
  if (declarator === undefined) {
    throw new Error('Expected the declaration to contain a declarator.');
  }
  return declarator;
}

describe('getChildren', () => {
  it('should return elements of an array-valued property', () => {
    const block = getFunctionBlock({
      ast: getParsedCode(ts`
        function ${FUNCTION_NAME}(): void {
          const first = 1;
          second();
          return;
        }
      `).ast,
      functionName: FUNCTION_NAME
    });

    expect(getChildren(block)).toStrictEqual(block.body);
    expect(getChildren(block).map((child: TSESTree.Node) => child.type)).toStrictEqual([
      AST_NODE_TYPES.VariableDeclaration,
      AST_NODE_TYPES.ExpressionStatement,
      AST_NODE_TYPES.ReturnStatement
    ]);
  });

  it('should return values of node-valued properties', () => {
    const declarator = getOnlyDeclarator(
      getFunctionBlock({
        ast: getParsedCode(ts`
          function ${FUNCTION_NAME}(): void {
            const value = 1;
          }
        `).ast,
        functionName: FUNCTION_NAME
      })
    );

    expect(getChildren(declarator)).toStrictEqual([declarator.id, declarator.init]);
  });

  it('should return only AST nodes', () => {
    expect(
      getChildren(
        getFunctionBlock({
          ast: getParsedCode(ts`
            function ${FUNCTION_NAME}(): void {
              const value = 1;
            }
          `).ast,
          functionName: FUNCTION_NAME
        })
      ).every(isNode)
    ).toBe(true);
  });

  it('should exclude the parent back-reference', () => {
    const declarator = getOnlyDeclarator(
      getFunctionBlock({
        ast: getParsedCode(ts`
          function ${FUNCTION_NAME}(): void {
            const value = 1;
          }
        `).ast,
        functionName: FUNCTION_NAME
      })
    );

    expect(isNode(declarator.parent)).toBe(true);
    expect(getChildren(declarator)).not.toContain(declarator.parent);
  });

  it('should return an empty array for a leaf node', () => {
    const { init } = getOnlyDeclarator(
      getFunctionBlock({
        ast: getParsedCode(ts`
          function ${FUNCTION_NAME}(): void {
            const value = 1;
          }
        `).ast,
        functionName: FUNCTION_NAME
      })
    );
    if (init?.type !== AST_NODE_TYPES.Literal) {
      throw new Error('Expected the declarator to be initialised with a literal.');
    }

    expect(getChildren(init)).toStrictEqual([]);
  });
});
