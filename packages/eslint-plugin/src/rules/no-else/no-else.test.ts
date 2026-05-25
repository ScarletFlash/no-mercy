import { runRuleTests } from '../../../tests/run-rule-tests';
import { ts } from '../../../tests/ts.template-tag';
import { noElse } from './no-else';
import { MessageId } from './no-else.message-id';

runRuleTests('no-else', noElse, {
  valid: [
    {
      name: 'Two separate Ifs',
      code: ts`
        const randomValue = Math.random();
        if (randomValue < 0.5) {
          return;
        }

        if (randomValue >= 0.5) {
          return;
        }
      `
    },
    {
      name: 'If with Else If',
      code: ts`
        const randomValue = Math.random();
        if (randomValue < 0.5) {
          return;
        } else if (randomValue >= 0.5) {
          return;
        }
      `
    }
  ],
  invalid: [
    {
      name: 'If with Else',
      code: ts`
        const randomValue = Math.random();
        if (randomValue < 0.5) {
          return;
        } else {
          return;
        }
      `,
      errors: [{ messageId: MessageId.NoElse }]
    }
  ]
});
