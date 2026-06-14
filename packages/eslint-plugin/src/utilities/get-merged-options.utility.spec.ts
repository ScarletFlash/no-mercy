import { describe, expect, it } from '@rstest/core';
import { getMergedOptions } from './get-merged-options.utility';

describe('getMergedOptions', () => {
  it('should recursively merge nested objects', () => {
    expect(
      getMergedOptions({ base: { outer: { kept: 1, replaced: 1 } }, override: { outer: { replaced: 2 } } })
    ).toStrictEqual({
      outer: { kept: 1, replaced: 2 }
    });
  });

  it('should concatenate array values instead of replacing them', () => {
    expect(getMergedOptions({ base: { items: ['first'] }, override: { items: ['second'] } })).toStrictEqual({
      items: ['first', 'second']
    });
  });

  it('should let scalar overrides win', () => {
    expect(getMergedOptions({ base: { level: 'error', flag: true }, override: { level: 'warn' } })).toStrictEqual({
      level: 'warn',
      flag: true
    });
  });

  it('should preserve base-only keys when the override omits them', () => {
    expect(getMergedOptions({ base: { kept: { value: 1 }, other: 2 }, override: { other: 3 } })).toStrictEqual({
      kept: { value: 1 },
      other: 3
    });
  });
});
