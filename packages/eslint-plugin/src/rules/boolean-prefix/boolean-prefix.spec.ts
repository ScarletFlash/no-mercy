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
      },
      {
        name: 'Boolean-returning class method with a default prefix should be allowed',
        code: ts`
          class Widget {
            isReady(): boolean {
              return Math.random() > 0.5;
            }
          }
        `
      },
      {
        name: 'Boolean-returning private class method with a default prefix should be allowed',
        code: ts`
          class Widget {
            #isReady(): boolean {
              return Math.random() > 0.5;
            }
          }
        `
      },
      {
        name: 'Boolean-returning underscore-prefixed class method with a default prefix should be allowed',
        code: ts`
          class Widget {
            _isReady(): boolean {
              return Math.random() > 0.5;
            }
          }
        `
      },
      {
        name: 'Boolean class field with a default prefix should be allowed',
        code: ts`
          class Widget {
            isReady = Math.random() > 0.5;
          }
        `
      },
      {
        name: 'Boolean-returning class function-property with a default prefix should be allowed',
        code: ts`
          class Widget {
            isReady = (): boolean => Math.random() > 0.5;
          }
        `
      },
      {
        name: 'Boolean class getter with a default prefix should be allowed',
        code: ts`
          class Widget {
            get isReady(): boolean {
              return Math.random() > 0.5;
            }
          }
        `
      },
      {
        name: 'Class setter without a prefix should be allowed since setters are skipped',
        code: ts`
          class Widget {
            set ready(isEnabled: boolean) {}
          }
        `
      },
      {
        name: 'Non-boolean class method should be ignored',
        code: ts`
          class Widget {
            getName(): string {
              return 'a';
            }
          }
        `
      },
      {
        name: 'Computed boolean class field should be ignored',
        code: ts`
          const key = 'ready';
          class Widget {
            [key] = Math.random() > 0.5;
          }
        `
      },
      {
        name: 'Boolean-returning abstract method with a default prefix should be allowed',
        code: ts`
          abstract class Widget {
            abstract isReady(): boolean;
          }
        `
      },
      {
        name: 'Boolean abstract property with a default prefix should be allowed',
        code: ts`
          abstract class Widget {
            abstract isReady: boolean;
          }
        `
      },
      {
        name: 'Boolean accessor property with a default prefix should be allowed',
        code: ts`
          class Widget {
            accessor isReady = Math.random() > 0.5;
          }
        `
      },
      {
        name: 'Boolean-returning interface method with a default prefix should be allowed',
        code: ts`
          interface Widget {
            isReady(): boolean;
          }
        `
      },
      {
        name: 'Boolean interface property with a default prefix should be allowed',
        code: ts`
          interface Widget {
            isReady: boolean;
          }
        `
      },
      {
        name: 'Non-boolean interface property should be ignored',
        code: ts`
          interface Widget {
            name: string;
          }
        `
      },
      {
        name: 'Boolean parameter with a default prefix should be allowed',
        code: ts` function render(isReady: boolean): void {} `
      },
      {
        name: 'Boolean parameter with a custom prefix should be allowed with variables prefixes',
        options: [{ variables: { prefixes: ['should'] } }],
        code: ts` function render(shouldRetry: boolean): void {} `
      },
      {
        name: 'Boolean constructor parameter property with a default prefix should be allowed',
        code: ts`
          class Widget {
            constructor(private isReady: boolean) {}
          }
        `
      },
      {
        name: 'Non-boolean parameter should be ignored',
        code: ts` function render(name: string): void {} `
      },
      {
        name: 'Boolean callback parameter with a default prefix should be allowed',
        code: ts` type Listener = (isEnabled: boolean) => void; `
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
      },
      {
        name: 'Boolean-returning class method without a prefix should be reported',
        code: ts`
          class Widget {
            ready(): boolean {
              return Math.random() > 0.5;
            }
          }
        `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean-returning private class method without a prefix should be reported',
        code: ts`
          class Widget {
            #ready(): boolean {
              return Math.random() > 0.5;
            }
          }
        `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean-returning underscore-prefixed class method without a prefix should be reported',
        code: ts`
          class Widget {
            _ready(): boolean {
              return Math.random() > 0.5;
            }
          }
        `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean class field without a prefix should be reported',
        code: ts`
          class Widget {
            ready = Math.random() > 0.5;
          }
        `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean class getter without a prefix should be reported',
        code: ts`
          class Widget {
            get ready(): boolean {
              return Math.random() > 0.5;
            }
          }
        `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean-returning class method with a non-functions prefix should be reported with functions prefixes',
        options: [{ functions: { prefixes: ['should'] } }],
        code: ts`
          class Widget {
            isReady(): boolean {
              return Math.random() > 0.5;
            }
          }
        `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean-returning abstract method without a prefix should be reported',
        code: ts`
          abstract class Widget {
            abstract ready(): boolean;
          }
        `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean abstract property without a prefix should be reported',
        code: ts`
          abstract class Widget {
            abstract ready: boolean;
          }
        `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean accessor property without a prefix should be reported',
        code: ts`
          class Widget {
            accessor ready = Math.random() > 0.5;
          }
        `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean-returning interface method without a prefix should be reported',
        code: ts`
          interface Widget {
            ready(): boolean;
          }
        `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean interface property without a prefix should be reported',
        code: ts`
          interface Widget {
            ready: boolean;
          }
        `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean parameter without a prefix should be reported',
        code: ts` function render(ready: boolean): void {} `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean constructor parameter property without a prefix should be reported',
        code: ts`
          class Widget {
            constructor(private ready: boolean) {}
          }
        `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      },
      {
        name: 'Boolean callback parameter without a prefix should be reported',
        code: ts` type Listener = (enabled: boolean) => void; `,
        errors: [{ messageId: MessageId.MissingBooleanPrefix }]
      }
    ]
  }
});
