import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import { getRule } from '../../utilities/get-rule.utility';
import { MessageId } from './no-else.message-id';

export const noElse = getRule({
  name: 'no-else',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow `else` clauses. Use early returns or guard clauses instead.'
    },
    schema: [],
    messages: {
      [MessageId.NoElse]: 'Avoid using "else". Use early returns or guard clauses instead.'
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      IfStatement: ({ alternate }: TSESTree.IfStatement) => {
        if (alternate?.type === AST_NODE_TYPES.BlockStatement) {
          context.report({ node: alternate, messageId: MessageId.NoElse });
        }
      }
    };
  }
});
