import { describe, expect, it } from '@rstest/core';
import { PART_OF_SPEECH } from '../constants/part-of-speech.constant';
import { PartsOfSpeechMatcher } from './parts-of-speech-matcher.class';

const { Noun, Verb, Adjective } = PART_OF_SPEECH;

describe('PartsOfSpeechMatcher', () => {
  it('should match when a single word satisfies the only requirement', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['payload'], required: [Noun], restricted: [] })).toStrictEqual({
      isMatching: true
    });
  });

  it('should report a missing requirement when no word can be it', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['payload'], required: [Verb], restricted: [] })).toStrictEqual({
      isMatching: false,
      forbidden: [],
      missing: [Verb]
    });
  });

  it('should satisfy two requirements with two distinct words', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['calculate', 'payload'], required: [Verb, Noun], restricted: [] })).toStrictEqual({
      isMatching: true
    });
  });

  it('should not let one word satisfy two requirements', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['calculate'], required: [Verb, Noun], restricted: [] })).toStrictEqual({
      isMatching: false,
      forbidden: [],
      missing: [Noun]
    });
  });

  it('should satisfy two requirements with the same word repeated at different indices', () => {
    const matcher = new PartsOfSpeechMatcher({ noun: ['request'] });
    expect(matcher.match({ words: ['request', 'request'], required: [Verb, Noun], restricted: [] })).toStrictEqual({
      isMatching: true
    });
  });

  it('should not cover two requirements from a single occurrence of an ambiguous word', () => {
    const matcher = new PartsOfSpeechMatcher({ noun: ['request'] });
    expect(matcher.match({ words: ['request'], required: [Verb, Noun], restricted: [] })).toStrictEqual({
      isMatching: false,
      forbidden: [],
      missing: [Noun]
    });
  });

  it('should not forbid a restricted part when a word can also be something else', () => {
    const matcher = new PartsOfSpeechMatcher({ noun: ['request'] });
    expect(matcher.match({ words: ['request'], required: [], restricted: [Verb] })).toStrictEqual({
      isMatching: true
    });
  });

  it('should forbid a restricted part when a word can only be it', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['calculate'], required: [], restricted: [Verb] })).toStrictEqual({
      isMatching: false,
      forbidden: [Verb],
      missing: []
    });
  });

  it('should forbid restricted parts when every reading of a word is restricted', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['cached'], required: [], restricted: [Verb, Adjective] })).toStrictEqual({
      isMatching: false,
      forbidden: [Verb, Adjective],
      missing: []
    });
  });

  it('should not forbid restricted parts when a word keeps a permitted reading', () => {
    const matcher = new PartsOfSpeechMatcher({ noun: ['cached'] });
    expect(matcher.match({ words: ['cached'], required: [], restricted: [Verb, Adjective] })).toStrictEqual({
      isMatching: true
    });
  });

  it('should serve different policies with the same instance', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['calculate'], required: [Verb], restricted: [] })).toStrictEqual({
      isMatching: true
    });
    expect(matcher.match({ words: ['calculate'], required: [], restricted: [Verb] })).toStrictEqual({
      isMatching: false,
      forbidden: [Verb],
      missing: []
    });
  });
});
