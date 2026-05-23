import { afterAll, describe, it } from '@rstest/core';
import { RuleTester } from '@typescript-eslint/rule-tester';

RuleTester.afterAll = (callback): void => {
  Promise.resolve(afterAll(callback)).catch((): void => undefined);
};
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;
