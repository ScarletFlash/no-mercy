import { describe, expect, it } from '@rstest/core';
import { ts } from '../../tests/ts.template-tag';
import { getFunctionBlock } from './get-function-block.utility';
import { getParsedCode } from './get-parsed-code.utility';
import { isWithSideEffects } from './is-with-side-effects.utility';

const FUNCTION_NAME = 'run' as const;

describe('isWithSideEffects', () => {
  it('should flag assignment to an outer variable', () => {
    const { ast, sourceCode, parserServices } = getParsedCode(ts`
      let outer = 0;
      function ${FUNCTION_NAME}(): void {
        outer = 1;
      }
    `);
    expect(
      isWithSideEffects({ block: getFunctionBlock({ ast, functionName: FUNCTION_NAME }), sourceCode, parserServices })
    ).toBe(true);
  });

  it('should flag member assignment on an outer object', () => {
    const { ast, sourceCode, parserServices } = getParsedCode(ts`
      const outer = { value: 0 };
      function ${FUNCTION_NAME}(): void {
        outer.value = 1;
      }
    `);
    expect(
      isWithSideEffects({ block: getFunctionBlock({ ast, functionName: FUNCTION_NAME }), sourceCode, parserServices })
    ).toBe(true);
  });

  it('should flag an update expression on an outer variable', () => {
    const { ast, sourceCode, parserServices } = getParsedCode(ts`
      let outer = 0;
      function ${FUNCTION_NAME}(): void {
        ++outer;
      }
    `);
    expect(
      isWithSideEffects({ block: getFunctionBlock({ ast, functionName: FUNCTION_NAME }), sourceCode, parserServices })
    ).toBe(true);
  });

  it('should flag delete on an outer member', () => {
    const { ast, sourceCode, parserServices } = getParsedCode(ts`
      const outer: Record<string, number> = {};
      function ${FUNCTION_NAME}(): void {
        delete outer.value;
      }
    `);
    expect(
      isWithSideEffects({ block: getFunctionBlock({ ast, functionName: FUNCTION_NAME }), sourceCode, parserServices })
    ).toBe(true);
  });

  it('should flag a mutating method on an outer array', () => {
    const { ast, sourceCode, parserServices } = getParsedCode(ts`
      const outer: number[] = [];
      function ${FUNCTION_NAME}(): void {
        outer.push(1);
      }
    `);
    expect(
      isWithSideEffects({ block: getFunctionBlock({ ast, functionName: FUNCTION_NAME }), sourceCode, parserServices })
    ).toBe(true);
  });

  it('should flag a mutating method on an outer class instance', () => {
    const { ast, sourceCode, parserServices } = getParsedCode(ts`
      class Counter {
        private value: number = 0;
        public increment(): void {
          this.value = this.value + 1;
        }
      }
      const counter = new Counter();
      function ${FUNCTION_NAME}(): void {
        counter.increment();
      }
    `);
    expect(
      isWithSideEffects({ block: getFunctionBlock({ ast, functionName: FUNCTION_NAME }), sourceCode, parserServices })
    ).toBe(true);
  });

  it('should flag a call to an unresolvable function', () => {
    const { ast, sourceCode, parserServices } = getParsedCode(ts`
      declare const mutate: () => void;
      function ${FUNCTION_NAME}(): void {
        mutate();
      }
    `);
    expect(
      isWithSideEffects({ block: getFunctionBlock({ ast, functionName: FUNCTION_NAME }), sourceCode, parserServices })
    ).toBe(true);
  });

  it('should ignore an empty block', () => {
    const { ast, sourceCode, parserServices } = getParsedCode(ts` function ${FUNCTION_NAME}(): void {} `);
    expect(
      isWithSideEffects({ block: getFunctionBlock({ ast, functionName: FUNCTION_NAME }), sourceCode, parserServices })
    ).toBe(false);
  });

  it('should ignore a block-local mutation', () => {
    const { ast, sourceCode, parserServices } = getParsedCode(ts`
      function ${FUNCTION_NAME}(): void {
        let local = 0;
        local = 1;
      }
    `);
    expect(
      isWithSideEffects({ block: getFunctionBlock({ ast, functionName: FUNCTION_NAME }), sourceCode, parserServices })
    ).toBe(false);
  });

  it('should ignore a pure local function call', () => {
    const { ast, sourceCode, parserServices } = getParsedCode(ts`
      function pure(value: number): number {
        return value + 1;
      }
      function ${FUNCTION_NAME}(): void {
        pure(1);
      }
    `);
    expect(
      isWithSideEffects({ block: getFunctionBlock({ ast, functionName: FUNCTION_NAME }), sourceCode, parserServices })
    ).toBe(false);
  });

  it('should ignore a pure method on an outer class instance', () => {
    const { ast, sourceCode, parserServices } = getParsedCode(ts`
      class Repository {
        private readonly value: number = 0;
        public getValue(): number {
          return this.value;
        }
      }
      const repository = new Repository();
      function ${FUNCTION_NAME}(): void {
        repository.getValue();
      }
    `);
    expect(
      isWithSideEffects({ block: getFunctionBlock({ ast, functionName: FUNCTION_NAME }), sourceCode, parserServices })
    ).toBe(false);
  });

  it('should ignore a pure method via a satisfies expression', () => {
    const { ast, sourceCode, parserServices } = getParsedCode(ts`
      class Repository {
        private readonly value: number = 0;
        public getValue(): number {
          return this.value;
        }
      }
      const repository = new Repository();
      function ${FUNCTION_NAME}(): void {
        (repository satisfies Repository).getValue();
      }
    `);
    expect(
      isWithSideEffects({ block: getFunctionBlock({ ast, functionName: FUNCTION_NAME }), sourceCode, parserServices })
    ).toBe(false);
  });

  it.fails('should ignore external mutation of block-local data', () => {
    const { ast, sourceCode, parserServices } = getParsedCode(ts`
      function mutate(target: number[]): void {
        target.push(1);
      }
      function ${FUNCTION_NAME}(): void {
        const local: number[] = [];
        mutate(local);
      }
    `);
    expect(
      isWithSideEffects({ block: getFunctionBlock({ ast, functionName: FUNCTION_NAME }), sourceCode, parserServices })
    ).toBe(false);
  });
});
