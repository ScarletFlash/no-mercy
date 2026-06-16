import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { getRule } from '../../utilities/get-rule.utility';
import { isWithSideEffects } from '../../utilities/is-with-side-effects.utility';
import { MessageId } from './no-else.message-id';

interface Options {
  readonly areSideEffectsAllowed?: boolean;
}

const TOP_LEVEL_LEXICAL_DECLARATION_NODE_TYPES: ReadonlySet<AST_NODE_TYPES> = new Set<AST_NODE_TYPES>([
  AST_NODE_TYPES.VariableDeclaration,
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.ClassDeclaration
]);

const TERMINATABLE_STATEMENT_TYPES: ReadonlySet<AST_NODE_TYPES> = new Set<AST_NODE_TYPES>([
  AST_NODE_TYPES.ReturnStatement,
  AST_NODE_TYPES.ThrowStatement,
  AST_NODE_TYPES.BreakStatement,
  AST_NODE_TYPES.ContinueStatement
]);

function isTerminatable(block: TSESTree.BlockStatement): boolean {
  const lastStatement = block.body.at(-1);
  return lastStatement !== undefined && TERMINATABLE_STATEMENT_TYPES.has(lastStatement.type);
}

export const noElse = getRule<readonly [Options], MessageId>({
  name: 'no-else',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'Disallow `else` clauses. Use early returns or guard clauses instead.'
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          areSideEffectsAllowed: { type: 'boolean', default: false }
        }
      }
    ],
    messages: {
      [MessageId.NoElse]: 'Avoid using "else". Use early returns or guard clauses instead.'
    }
  },
  defaultOptions: [{ areSideEffectsAllowed: false }],
  create: (context, [rawOptions]) => {
    const { areSideEffectsAllowed = false } = rawOptions ?? {};

    return {
      IfStatement: (node: TSESTree.IfStatement): void => {
        const { consequent, alternate } = node;
        if (
          alternate?.type !== AST_NODE_TYPES.BlockStatement ||
          (areSideEffectsAllowed &&
            isWithSideEffects({
              block: alternate,
              sourceCode: context.sourceCode,
              parserServices: ESLintUtils.getParserServices(context)
            }))
        ) {
          return;
        }

        if (
          consequent.type !== AST_NODE_TYPES.BlockStatement ||
          !isTerminatable(consequent) ||
          alternate.body.some(({ type }: TSESTree.Statement) => TOP_LEVEL_LEXICAL_DECLARATION_NODE_TYPES.has(type))
        ) {
          context.report({ node: alternate, messageId: MessageId.NoElse });
          return;
        }

        context.report({
          node: alternate,
          messageId: MessageId.NoElse,
          fix: (fixer: TSESLint.RuleFixer): readonly TSESLint.RuleFix[] => {
            const openBraceToken = context.sourceCode.getFirstToken(alternate);
            const closeBraceToken = context.sourceCode.getLastToken(alternate);
            if (openBraceToken === null || closeBraceToken === null) {
              return [];
            }

            const [_, consequentEndPosition] = consequent.range;
            const [__, elseBraceEndPosition] = openBraceToken.range;

            return [fixer.removeRange([consequentEndPosition, elseBraceEndPosition]), fixer.remove(closeBraceToken)];
          }
        });
      }
    };
  }
});
