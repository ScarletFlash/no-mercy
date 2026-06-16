import { runRuleTests } from '../../../tests/run-rule-tests';
import { ts } from '../../../tests/ts.template-tag';
import { booleanPrefix } from './boolean-prefix';
import { MessageId } from './boolean-prefix.message-id';

runRuleTests({
  ruleName: 'boolean-prefix',
  rule: booleanPrefix,
  cases: {
    valid: [
      {
        name: 'Boolean variable with a default prefix should be allowed',
        code: ts`const isReady = Math.random() > 0.5;`
      },
      {
        name: 'Boolean-returning function with a default prefix should be allowed',
        code: ts`
          function hasItems(): boolean {
            return Math.random() > 0.5;
          }
        `
      },
      {
        name: 'Boolean-returning arrow assigned to a variable should be allowed',
        code: ts`const isReady = (): boolean => Math.random() > 0.5;`
      },
      {
        name: 'Non-boolean variable should be ignored',
        code: ts`const user = { name: 'a' };`
      },
      {
        name: 'Non-boolean function should be ignored',
        code: ts`
          function getUser(): string {
            return 'a';
          }
        `
      },
      {
        name: 'Boolean variable matching ignore should be allowed with ignore',
        options: [{ default: { ignore: ['^ready$'] } }],
        code: ts`const ready = Math.random() > 0.5;`
      },
      {
        name: 'Boolean variable with a custom prefix should be allowed with variables prefixes',
        options: [{ variables: { prefixes: ['should'] } }],
        code: ts`const shouldRetry = Math.random() > 0.5;`
      },
      {
        name: 'Boolean variable with a default prefix should be allowed with only default ignore configured',
        options: [{ default: { ignore: ['^foo$'] } }],
        code: ts`const isReady = Math.random() > 0.5;`
      }
    ],
    invalid: [
      {
        name: 'Boolean variable without a prefix should be reported',
        code: ts`const ready = Math.random() > 0.5;`,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean-returning function without a prefix should be reported',
        code: ts`
          function ready(): boolean {
            return Math.random() > 0.5;
          }
        `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean variable with a non-default prefix should be reported with default prefixes',
        code: ts`const shouldRetry = Math.random() > 0.5;`,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean variable with a default prefix should be reported with default prefixes disabled',
        options: [{ default: { prefixes: [] } }],
        code: ts`const isReady = Math.random() > 0.5;`,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      }
    ]
  }
});
