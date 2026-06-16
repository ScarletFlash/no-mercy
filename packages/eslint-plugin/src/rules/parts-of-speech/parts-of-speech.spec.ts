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
        code: ts`const userProfile = { id: 1 };`
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
        name: 'Word pinned by a verb allowlist should be allowed by a verb requirement',
        options: [
          { declarationPolicies: { enum: { default: { required: ['verb'], patterns: { verbs: ['^status$'] } } } } }
        ],
        code: ts`enum Status {}`
      }
    ],
    invalid: [
      {
        name: 'Variable holding only a verb should be reported by the default policy',
        code: ts`const calculate = 1;`,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
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
        name: 'Variable containing a verb should be reported by the default restricted policy',
        code: ts`const calculateTotal = 1;`,
        errors: [{ messageId: MessageId.RestrictedPartOfSpeech }]
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
      }
    ]
  }
});
