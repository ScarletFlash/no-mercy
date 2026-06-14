import { describe, expect, it } from '@rstest/core';
import { LEXICON } from './lexicon.constant';

describe('compromise lexicon shape', () => {
  it('should expose a non-empty word-to-tag map', () => {
    const tags = Object.values(LEXICON);
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.some((tag: unknown) => typeof tag === 'string')).toBe(true);
  });
});
