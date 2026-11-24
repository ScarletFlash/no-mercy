import { describe, expect, it } from '@rstest/core';
import { LEXICON } from './lexicon.constant';

describe('compromise lexicon shape', () => {
  it('should expose a non-empty word-to-tag map', () => {
    expect(LEXICON.size).toBeGreaterThan(0);
    expect(LEXICON.values().some((tag: unknown) => typeof tag === 'string')).toBe(true);
  });

  it('should not resolve Object.prototype members as lexicon entries', () => {
    expect(LEXICON.get('constructor')).toBeUndefined();
  });
});
