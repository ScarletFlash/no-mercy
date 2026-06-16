import { runRuleTests } from '../../../tests/run-rule-tests';
import { ts } from '../../../tests/ts.template-tag';
import { noElse } from './no-else';
import { MessageId } from './no-else.message-id';

runRuleTests({
  ruleName: 'no-else',
  rule: noElse,
  cases: {
    valid: [
      {
        name: 'Two separate IFs should be allowed',
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
        name: 'IF with ELSE IF should be allowed',
        code: ts`
          const randomValue = Math.random();
          if (randomValue < 0.5) {
            return;
          } else if (randomValue >= 0.5) {
            return;
          }
        `
      },
      {
        name: 'ELSE assigning an outer variable should be allowed with allowSideEffects',
        options: [{ allowSideEffects: true }],
        code: ts`
          let outerVar = 0;
          if (Math.random() < 0.5) {
            return;
          } else {
            outerVar = 1;
          }
        `
      },
      {
        name: 'ELSE assigning an outer member should be allowed with allowSideEffects',
        options: [{ allowSideEffects: true }],
        code: ts`
          const outerObj = { prop: 0 };
          if (Math.random() < 0.5) {
            return;
          } else {
            outerObj.prop = 1;
          }
        `
      },
      {
        name: 'ELSE updating an outer counter should be allowed with allowSideEffects',
        options: [{ allowSideEffects: true }],
        code: ts`
          let outerCounter = 0;
          if (Math.random() < 0.5) {
            return;
          } else {
            ++outerCounter;
          }
        `
      },
      {
        name: 'ELSE deleting an outer member should be allowed with allowSideEffects',
        options: [{ allowSideEffects: true }],
        code: ts`
          const outerObj: Record<string, number> = {};
          if (Math.random() < 0.5) {
            return;
          } else {
            delete outerObj.prop;
          }
        `
      },
      {
        name: 'ELSE mutating an outer array should be allowed with allowSideEffects',
        options: [{ allowSideEffects: true }],
        code: ts`
          const outerArr: number[] = [];
          if (Math.random() < 0.5) {
            return;
          } else {
            outerArr.push(1);
          }
        `
      },
      {
        name: 'ELSE mutating an outer set should be allowed with allowSideEffects',
        options: [{ allowSideEffects: true }],
        code: ts`
          const outerSet = new Set<number>();
          if (Math.random() < 0.5) {
            return;
          } else {
            outerSet.add(1);
          }
        `
      },
      {
        name: 'ELSE calling console.log should be allowed with allowSideEffects',
        options: [{ allowSideEffects: true }],
        code: ts`
          if (Math.random() < 0.5) {
            return;
          } else {
            console.log(1);
          }
        `
      },
      {
        name: 'ELSE calling a function that mutates an outer arg should be allowed with allowSideEffects',
        options: [{ allowSideEffects: true }],
        code: ts`
          function mutate(arr: number[]): void {
            arr.push(1);
          }
          const outerArr: number[] = [];
          if (Math.random() < 0.5) {
            return;
          } else {
            mutate(outerArr);
          }
        `
      },
      {
        name: 'ELSE calling mutually recursive side-effecting functions should be allowed with allowSideEffects',
        options: [{ allowSideEffects: true }],
        code: ts`
          const outerCounter: { value: number } = { value: 0 };
          function a(): void {
            outerCounter.value = outerCounter.value + 1;
            b();
          }
          function b(): void {
            a();
          }
          if (Math.random() < 0.5) {
            return;
          } else {
            a();
          }
        `
      }
    ],
    invalid: [
      {
        name: 'ELSE should be reported and removed',
        code: ts`
          const randomValue = Math.random();
          if (randomValue < 0.5) {
            return;
          } else {
            return;
          }
        `,
        errors: [{ messageId: MessageId.NoElse }],
        output: ts`
          const randomValue = Math.random();
          if (randomValue < 0.5) {
            return;
          }
          return;
        `
      },
      {
        name: 'Outer side effect should be reported by default',
        code: ts`
          const outerArr: number[] = [];
          if (Math.random() < 0.5) {
            return;
          } else {
            outerArr.push(1);
          }
        `,
        errors: [{ messageId: MessageId.NoElse }],
        output: ts`
          const outerArr: number[] = [];
          if (Math.random() < 0.5) {
            return;
          }
          outerArr.push(1);
        `
      },
      {
        name: 'ELSE with only local mutation should be reported with allowSideEffects',
        options: [{ allowSideEffects: true }],
        code: ts`
          if (Math.random() < 0.5) {
            return;
          } else {
            let local = 1;
            local = 2;
          }
        `,
        errors: [{ messageId: MessageId.NoElse }],
        output: null
      },
      {
        name: 'ELSE calling a pure function should be reported with allowSideEffects',
        options: [{ allowSideEffects: true }],
        code: ts`
          function pure(x: number): number {
            return x + 1;
          }
          if (Math.random() < 0.5) {
            return;
          } else {
            pure(1);
          }
        `,
        errors: [{ messageId: MessageId.NoElse }],
        output: ts`
          function pure(x: number): number {
            return x + 1;
          }
          if (Math.random() < 0.5) {
            return;
          }
          pure(1);
        `
      },
      {
        name: 'Non-terminating consequent should be reported without fixing',
        code: ts`
          let x = 0;
          if (Math.random() < 0.5) {
            x = 1;
          } else {
            x = 2;
          }
        `,
        errors: [{ messageId: MessageId.NoElse }],
        output: null
      },
      {
        name: 'Lexical declaration in ELSE should be reported without fixing',
        code: ts`
          if (Math.random() < 0.5) {
            return;
          } else {
            let z = 1;
            return;
          }
        `,
        errors: [{ messageId: MessageId.NoElse }],
        output: null
      }
    ]
  }
});
