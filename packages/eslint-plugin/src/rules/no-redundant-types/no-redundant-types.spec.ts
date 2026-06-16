import { runRuleTests } from '../../../tests/run-rule-tests';
import { ts } from '../../../tests/ts.template-tag';
import { noRedundantTypes } from './no-redundant-types';
import { MessageId } from './no-redundant-types.message-id';

runRuleTests({
  ruleName: 'no-redundant-types',
  rule: noRedundantTypes,
  cases: {
    valid: [
      {
        name: 'Annotation that the value type cannot reproduce should be allowed',
        code: ts`let value: number | null = null;`
      },
      {
        name: 'Annotation widening the inferred value type should be allowed',
        code: ts`
          declare const value: number;
          const reference: number | string = value;
        `
      },
      {
        name: 'Annotation widening a literal union to its base should be allowed',
        code: ts`
          declare const value: 0 | 1;
          const widened: number = value;
        `
      },
      {
        name: 'Generic constructor without type arguments should be allowed',
        code: ts`const counts: Map<number, string> = new Map();`
      },
      {
        name: 'Empty array literal annotation should be allowed',
        code: ts`const items: number[] = [];`
      },
      {
        name: 'Arrow initializer annotation should be allowed',
        code: ts`const onClick: () => void = () => {};`
      },
      {
        name: 'Redundant parameter annotation should be allowed by default',
        code: ts`[1, 2, 3].map((item: number) => {});`
      },
      {
        name: 'Redundant destructuring annotation should be allowed by default',
        code: ts`
          interface KeyValue {
            key: string;
          }
          declare const input: KeyValue;
          const { key }: KeyValue = input;
        `
      },
      {
        name: 'Nullish fallback to an empty array should be allowed',
        code: ts`
          declare const fallback: number[] | undefined;
          const items: number[] = fallback ?? [];
        `
      },
      {
        name: 'Generic call inferring its type from the annotation should be allowed',
        code: ts`
          declare function make<Value>(): Value;
          const made: string = make();
        `
      }
    ],
    invalid: [
      {
        name: 'Type duplicating the constructor generic should be reported and removed',
        code: ts`const letterByIndex: Map<number, string> = new Map<number, string>();`,
        errors: [{ messageId: MessageId.RedundantType }],
        output: ts`const letterByIndex = new Map<number, string>();`
      },
      {
        name: 'Type inferable from a numeric literal should be reported and removed',
        code: ts`const aIndex: number = 0;`,
        errors: [{ messageId: MessageId.RedundantType }],
        output: ts`const aIndex = 0;`
      },
      {
        name: 'Type matching a referenced value should be reported and removed',
        code: ts`
          declare const source: number[];
          const copy: number[] = source;
        `,
        errors: [{ messageId: MessageId.RedundantType }],
        output: ts`
          declare const source: number[];
          const copy = source;
        `
      },
      {
        name: 'Redundant class field annotation should be reported and removed',
        code: ts`
          class Counter {
            private count: number = 0;
          }
        `,
        errors: [{ messageId: MessageId.RedundantType }],
        output: ts`
          class Counter {
            private count = 0;
          }
        `
      },
      {
        name: 'Contextually inferable parameter should be reported and removed with checked parameters',
        options: [{ ignoreParameters: false }],
        code: ts`[1, 2, 3].map((item: number) => {});`,
        errors: [{ messageId: MessageId.RedundantType }],
        output: ts`[1, 2, 3].map((item) => {});`
      },
      {
        name: 'Parameter default duplicating its type should be reported and removed with checked parameters',
        options: [{ ignoreParameters: false }],
        code: ts`
          function increment(step: number = 1): number {
            return step;
          }
        `,
        errors: [{ messageId: MessageId.RedundantType }],
        output: ts`
          function increment(step = 1): number {
            return step;
          }
        `
      },
      {
        name: 'Redundant destructuring annotation should be reported and removed with checked destructuring',
        options: [{ ignoreDestructuring: false }],
        code: ts`
          interface KeyValue {
            key: string;
          }
          declare const input: KeyValue;
          const { key }: KeyValue = input;
        `,
        errors: [{ messageId: MessageId.RedundantType }],
        output: ts`
          interface KeyValue {
            key: string;
          }
          declare const input: KeyValue;
          const { key } = input;
        `
      },
      {
        name: 'Nullish fallback between two references should be reported and removed',
        code: ts`
          declare const primary: readonly string[] | undefined;
          declare const secondary: readonly string[];
          const prefixes: readonly string[] = primary ?? secondary;
        `,
        errors: [{ messageId: MessageId.RedundantType }],
        output: ts`
          declare const primary: readonly string[] | undefined;
          declare const secondary: readonly string[];
          const prefixes = primary ?? secondary;
        `
      },
      {
        name: 'Conditional between two references should be reported and removed',
        code: ts`
          declare const condition: boolean;
          declare const left: string;
          declare const right: string;
          const chosen: string = condition ? left : right;
        `,
        errors: [{ messageId: MessageId.RedundantType }],
        output: ts`
          declare const condition: boolean;
          declare const left: string;
          declare const right: string;
          const chosen = condition ? left : right;
        `
      },
      {
        name: 'Annotation matching a literal type exactly should be reported and removed',
        code: ts`const answer: 42 = 42;`,
        errors: [{ messageId: MessageId.RedundantType }],
        output: ts`const answer = 42;`
      },
      {
        name: 'Type of an arithmetic expression should be reported and removed',
        code: ts`
          declare const base: number;
          const total: number = base + 1;
        `,
        errors: [{ messageId: MessageId.RedundantType }],
        output: ts`
          declare const base: number;
          const total = base + 1;
        `
      },
      {
        name: 'Type of a negation should be reported and removed',
        code: ts`
          declare const ready: boolean;
          const blocked: boolean = !ready;
        `,
        errors: [{ messageId: MessageId.RedundantType }],
        output: ts`
          declare const ready: boolean;
          const blocked = !ready;
        `
      },
      {
        name: 'Type of a non-generic call should be reported and removed',
        code: ts`
          declare function getName(): string;
          const name: string = getName();
        `,
        errors: [{ messageId: MessageId.RedundantType }],
        output: ts`
          declare function getName(): string;
          const name = getName();
        `
      },
      {
        name: 'Awaited type of a context-free value should be reported and removed',
        code: ts`
          declare const numberPromise: Promise<number>;
          async function read(): Promise<void> {
            const value: number = await numberPromise;
          }
        `,
        errors: [{ messageId: MessageId.RedundantType }],
        output: ts`
          declare const numberPromise: Promise<number>;
          async function read(): Promise<void> {
            const value = await numberPromise;
          }
        `
      }
    ]
  }
});
