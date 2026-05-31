import { describe, expect, it } from '@rstest/core';
import { parseForESLint } from '@typescript-eslint/parser';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { ts } from '../../tests/ts.template-tag';
import { linkChildNodesWithParents } from './link-child-nodes-with-parents.utility';

describe('linkChildNodesWithParents', () => {
  it('should leave the root node without a parent', () => {
    const { ast } = parseForESLint(ts` const value = 1; `);
    expect(ast.parent).toBeUndefined();

    linkChildNodesWithParents(ast);

    expect(ast.parent).toBeUndefined();
  });

  it('should set the parent of a direct child to the root node', () => {
    const { ast } = parseForESLint(ts` const value = 1; `);
    const [variableDeclaration] = ast.body;
    expect(variableDeclaration?.parent).toBeUndefined();

    linkChildNodesWithParents(ast);

    expect(variableDeclaration?.parent).toBe(ast);
  });

  it('should link every node down to the leaves', () => {
    const { ast } = parseForESLint(ts` const value = 1; `);
    const [variableDeclaration] = ast.body;
    if (variableDeclaration?.type !== AST_NODE_TYPES.VariableDeclaration) {
      throw new Error('Expected the program to start with a variable declaration.');
    }
    const [declarator] = variableDeclaration.declarations;
    if (declarator?.init?.type !== AST_NODE_TYPES.Literal) {
      throw new Error('Expected the declarator to be initialised with a literal.');
    }
    expect(declarator.parent).toBeUndefined();
    expect(declarator.init.parent).toBeUndefined();

    linkChildNodesWithParents(ast);

    expect(declarator.parent).toBe(variableDeclaration);
    expect(declarator.init.parent).toBe(declarator);
  });

  it('should link nodes held in an array-valued property', () => {
    const { ast } = parseForESLint(ts`
      function getSum(first: number, second: number): number {
        return first + second;
      }
    `);
    const [functionDeclaration] = ast.body;
    if (functionDeclaration?.type !== AST_NODE_TYPES.FunctionDeclaration) {
      throw new Error('Expected the program to start with a function declaration.');
    }
    expect(functionDeclaration.params.length).toBe(2);
    functionDeclaration.params.forEach((param) => {
      expect(param.parent).toBeUndefined();
    });

    linkChildNodesWithParents(ast);

    functionDeclaration.params.forEach((param) => {
      expect(param.parent).toBe(functionDeclaration);
    });
  });

  it('should link operands of a nested expression', () => {
    const { ast } = parseForESLint(ts`
      function getSum(first: number, second: number): number {
        return first + second;
      }
    `);
    const [functionDeclaration] = ast.body;
    if (functionDeclaration?.type !== AST_NODE_TYPES.FunctionDeclaration) {
      throw new Error('Expected the program to start with a function declaration.');
    }
    const [statement] = functionDeclaration.body.body;
    if (
      statement?.type !== AST_NODE_TYPES.ReturnStatement ||
      statement.argument?.type !== AST_NODE_TYPES.BinaryExpression
    ) {
      throw new Error('Expected the function body to return a binary expression.');
    }
    const binary = statement.argument;
    expect(binary.parent).toBeUndefined();
    expect(binary.left.parent).toBeUndefined();
    expect(binary.right.parent).toBeUndefined();

    linkChildNodesWithParents(ast);

    expect(binary.parent).toBe(statement);
    expect(binary.left.parent).toBe(binary);
    expect(binary.right.parent).toBe(binary);
  });
});
