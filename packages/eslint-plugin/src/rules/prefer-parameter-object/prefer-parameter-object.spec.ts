import { runRuleTests } from '../../../tests/run-rule-tests';
import { ts } from '../../../tests/ts.template-tag';
import { preferParameterObject } from './prefer-parameter-object';
import { MessageId } from './prefer-parameter-object.message-id';

runRuleTests({
  ruleName: 'prefer-parameter-object',
  rule: preferParameterObject,
  cases: {
    valid: [
      {
        name: 'A single parameter should be allowed',
        code: ts`
          function identity(value: string): string {
            return value;
          }
        `
      },
      {
        name: 'A single object parameter should be allowed',
        code: ts`
          function run(params: { first: number; second: number }): void {
            params.first + params.second;
          }
        `
      },
      {
        name: 'A callback in a contextually typed slot should be allowed',
        code: ts`[1, 2, 3].map((value, index) => value + index);`
      },
      {
        name: 'A method implementing a third-party contract should be allowed',
        code: ts`
          class Store extends Map<string, number> {
            public set(key: string, value: number): this {
              return super.set(key, value);
            }
          }
        `
      },
      {
        name: 'A type guard should be allowed by default',
        code: ts`
          function isPair(value: unknown, other: unknown): value is [unknown, unknown] {
            return Array.isArray(value) && other !== undefined;
          }
        `
      }
    ],
    invalid: [
      {
        name: 'A function declaration with two parameters should be reported and wrapped',
        code: ts`function createUser(id: string, name: string): void {}`,
        errors: [{ messageId: MessageId.PreferParameterObject }],
        output: ts`
          interface CreateUserParams {
            id: string;
            name: string;
          }
          function createUser({ id, name }: CreateUserParams): void {}
        `
      },
      {
        name: 'A PascalCase function should use the Props suffix',
        options: [{ typeSuffix: { '^[A-Z]': 'Props', default: 'Params' } }],
        code: ts`function Button(label: string, onClick: () => void): void {}`,
        errors: [{ messageId: MessageId.PreferParameterObject }],
        output: ts`
          interface ButtonProps {
            label: string;
            onClick: () => void;
          }
          function Button({ label, onClick }: ButtonProps): void {}
        `
      },
      {
        name: 'A generic function should keep its type parameters on the interface',
        code: ts`
          function merge<Value>(first: Value, second: Value): Value {
            return first;
          }
        `,
        errors: [{ messageId: MessageId.PreferParameterObject }],
        output: ts`
          interface MergeParams<Value> {
            first: Value;
            second: Value;
          }

          function merge<Value>({ first, second }: MergeParams<Value>): Value {
            return first;
          }
        `
      },
      {
        name: 'A colliding interface name should be incremented',
        code: ts`
          interface CreateUserParams {
            existing: boolean;
          }
          function createUser(id: string, name: string): void {}
        `,
        errors: [{ messageId: MessageId.PreferParameterObject }],
        output: ts`
          interface CreateUserParams_1 {
            id: string;
            name: string;
          }

          interface CreateUserParams {
            existing: boolean;
          }
          function createUser({ id, name }: CreateUserParams_1): void {}
        `
      },
      {
        name: 'An arrow assigned to a constant should be reported and wrapped',
        code: ts`const sum = (first: number, second: number): number => first + second;`,
        errors: [{ messageId: MessageId.PreferParameterObject }],
        output: ts`
          interface SumParams {
            first: number;
            second: number;
          }
          const sum = ({ first, second }: SumParams): number => first + second;
        `
      },
      {
        name: 'The interface should be placed right after the imports',
        code: ts`
          import { join } from 'node:path';
          function createUser(id: string, name: string): string {
            return join(id, name);
          }
        `,
        errors: [{ messageId: MessageId.PreferParameterObject }],
        output: ts`
          import { join } from 'node:path';

          interface CreateUserParams {
            id: string;
            name: string;
          }

          function createUser({ id, name }: CreateUserParams): string {
            return join(id, name);
          }
        `
      },
      {
        name: 'A method signature in an interface should be reported without a fix',
        code: ts`
          interface UserRepository {
            save(id: string, value: number): void;
          }
        `,
        errors: [{ messageId: MessageId.PreferParameterObject }]
      },
      {
        name: 'A type guard should be reported without a fix when type guards are not ignored',
        options: [{ areTypeGuardsIgnored: false }],
        code: ts`
          function isPair(value: unknown, other: unknown): value is [unknown, unknown] {
            return Array.isArray(value) && other !== undefined;
          }
        `,
        errors: [{ messageId: MessageId.PreferParameterObject }]
      }
    ]
  }
});
