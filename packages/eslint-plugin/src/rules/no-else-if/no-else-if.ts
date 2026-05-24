import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import { getRule } from '../../utilities/get-rule.utility';
import { MessageId } from './no-else-if.message-id';

export const noElseIf = getRule({
  name: 'no-else-if',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow `else if`. Use early returns or guard clauses instead.'
    },
    schema: [],
    messages: {
      [MessageId.NoElseIf]: 'Avoid using "else if". Use early returns or guard clauses instead.'
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      IfStatement: ({ alternate }: TSESTree.IfStatement) => {
        if (alternate?.type === AST_NODE_TYPES.IfStatement) {
          context.report({ node: alternate, messageId: MessageId.NoElseIf });
        }
      }
    };
  }
});
