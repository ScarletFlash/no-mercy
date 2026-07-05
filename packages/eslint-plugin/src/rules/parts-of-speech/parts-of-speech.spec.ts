import { runRuleTests } from '../../../tests/run-rule-tests';
import { ts } from '../../../tests/ts.template-tag';
import { partsOfSpeech } from './parts-of-speech';
import { MessageId } from './parts-of-speech.message-id';

runRuleTests({
  ruleName: 'parts-of-speech',
  rule: partsOfSpeech,
  cases: {
    valid: [
      {
        name: 'Variable containing a noun should be allowed by the default policy',
        code: ts`const userPayload = { id: 1 };`
      },
      {
        name: 'Variable leading with a verb-homonym should be allowed because the homonym can also be a noun',
        code: ts`const requestPayload = { id: 1 };`
      },
      {
        name: 'Function leading with a verb should be allowed by the default policy',
        code: ts`
          function getUser(): object {
            return {};
          }
        `
      },
      {
        name: 'Class containing a noun should be allowed by the default policy',
        code: ts`class UserCard {}`
      },
      {
        name: 'Interface containing a noun should be allowed by the default policy',
        code: ts`interface UserProfile {}`
      },
      {
        name: 'Boolean-prefixed variable should be allowed because its prefix is a verb',
        code: ts`const isReady = Math.random() > 0.5;`
      },
      {
        name: 'Boolean-prefixed function should be allowed because its prefix is a verb',
        code: ts`
          function hasItems(): boolean {
            return Math.random() > 0.5;
          }
        `
      },
      {
        name: 'Callable variable leading with a verb should be allowed by the function type policy',
        code: ts`const buildReport = (): null => null;`
      },
      {
        name: 'PascalCase component should be allowed by its name pattern with a noun requirement',
        options: [
          { declarationPolicies: { function: { '^[A-Z]': { required: ['noun'] }, default: { required: ['verb'] } } } }
        ],
        code: ts`
          function UserCard(): null {
            return null;
          }
        `
      },
      {
        name: 'Word pinned by a verb dictionary should be allowed by a verb requirement',
        options: [
          { dictionary: { verb: ['status'] }, declarationPolicies: { enum: { default: { required: ['verb'] } } } }
        ],
        code: ts`enum Status {}`
      },
      {
        name: 'Callable PascalCase variable should be allowed by its name pattern over the callable type policy',
        options: [
          {
            declarationPolicies: {
              variable: { '^[A-Z]': { required: ['noun'] }, default: { required: ['noun'], restricted: ['verb'] } }
            }
          }
        ],
        code: ts`const UserCard = (): null => null;`
      }
    ],
    invalid: [
      {
        name: 'Variable holding only a verb should be reported by the default policy',
        code: ts`const calculate = 1;`,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'Variable leading with a verb-only word should be reported by the default restricted policy',
        code: ts`const calculatePayload = 1;`,
        errors: [{ messageId: MessageId.RestrictedPartOfSpeech }]
      },
      {
        name: 'Function holding only a noun should be reported by the default policy',
        code: ts`
          function user(): object {
            return {};
          }
        `,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'Class holding only an adjective should be reported by the default policy',
        code: ts`class Active {}`,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'Predicate-named non-boolean variable should be reported by the default policy',
        code: ts`const isReady = { value: true };`,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'PascalCase component without a noun should be reported by its name pattern',
        options: [
          { declarationPolicies: { function: { '^[A-Z]': { required: ['noun'] }, default: { required: ['verb'] } } } }
        ],
        code: ts`
          function Active(): null {
            return null;
          }
        `,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'Labelled policy should report with its application name in the message',
        options: [
          {
            declarationPolicies: {
              variable: {
                '^[A-Z]': { required: ['noun'], appliesTo: 'React Component' },
                default: { required: ['noun'], restricted: ['verb'] }
              }
            }
          }
        ],
        code: ts`const Active = (): null => null;`,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeechForApplication }]
      }
    ]
  }
});
