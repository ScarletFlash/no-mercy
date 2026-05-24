import { runRuleTests } from '../../../tests/run-rule-tests';
import { noElseIf } from './no-else-if';
import { MessageId } from './no-else-if.message-id';

runRuleTests('no-else-if', noElseIf, {
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
      name: 'If with Else',
      code: `
const randomValue = Math.random();
if (randomValue < 0.5) {
  return;
} else {
  return;
}`
    }
  ],
  invalid: [
    {
      name: 'If with Else If',
      code: `
const randomValue = Math.random();
if (randomValue < 0.5) {
  return;
} else if (randomValue >= 0.5) {
  return;
}`,
      errors: [{ messageId: MessageId.NoElseIf }]
    }
  ]
});
