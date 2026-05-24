import { runRuleTests } from '../../../tests/run-rule-tests';
import { noElse } from './no-else';
import { MessageId } from './no-else.message-id';

runRuleTests('no-else', noElse, {
  valid: [
    {
      name: 'Two separate Ifs',
      code: `
const randomValue = Math.random();
if (randomValue < 0.5) {
  return;
}

if (randomValue >= 0.5) {
  return;
}`
    },
    {
      name: 'If with Else If',
      code: `
const randomValue = Math.random();
if (randomValue < 0.5) {
  return;
} else if (randomValue >= 0.5) {
  return;
}`
    }
  ],
  invalid: [
    {
      name: 'If with Else',
      code: `
const randomValue = Math.random();
if (randomValue < 0.5) {
  return;
} else {
  return;
}`,
      errors: [{ messageId: MessageId.NoElse }]
    }
  ]
});
