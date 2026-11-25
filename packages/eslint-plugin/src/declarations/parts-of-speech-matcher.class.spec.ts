import { describe, expect, it } from '@rstest/core';
import { PART_OF_SPEECH } from '../constants/part-of-speech.constant';
import { type PartOfSpeech } from './part-of-speech.type';
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
      missing: [Verb],
      forbiddenWordIndexes: [],
      partsOfSpeechByWordIndex: new Map([[0, new Set([Noun])]])
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
      missing: [Noun],
      forbiddenWordIndexes: [],
      partsOfSpeechByWordIndex: new Map([[0, new Set([Verb])]])
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
      missing: [Noun],
      forbiddenWordIndexes: [],
      partsOfSpeechByWordIndex: new Map([[0, new Set([Verb, Noun])]])
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
      missing: [],
      forbiddenWordIndexes: [0],
      partsOfSpeechByWordIndex: new Map([[0, new Set([Verb])]])
    });
  });

  it('should forbid restricted parts when every reading of a word is restricted', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['cached'], required: [], restricted: [Verb, Adjective] })).toStrictEqual({
      isMatching: false,
      forbidden: [Verb, Adjective],
      missing: [],
      forbiddenWordIndexes: [0],
      partsOfSpeechByWordIndex: new Map([[0, new Set([Verb, Adjective])]])
    });
  });

  it('should not forbid restricted parts when a word keeps a permitted reading', () => {
    const matcher = new PartsOfSpeechMatcher({ noun: ['cached'] });
    expect(matcher.match({ words: ['cached'], required: [], restricted: [Verb, Adjective] })).toStrictEqual({
      isMatching: true
    });
  });

  it('should not forbid a verb that follows "to" after a noun', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['fields', 'to', 'keep'], required: [], restricted: [Verb] })).toStrictEqual({
      isMatching: true
    });
  });

  it('should forbid a verb that follows "to" without a noun before it', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['to', 'keep'], required: [], restricted: [Verb] })).toStrictEqual({
      isMatching: false,
      forbidden: [Verb],
      missing: [],
      forbiddenWordIndexes: [1],
      partsOfSpeechByWordIndex: new Map<number, ReadonlySet<PartOfSpeech>>([
        [0, new Set()],
        [1, new Set([Verb])]
      ])
    });
  });

  it('should forbid a verb that follows "to" after a noun when adjectives are restricted too', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(
      matcher.match({ words: ['fields', 'to', 'keep'], required: [], restricted: [Verb, Adjective] })
    ).toStrictEqual({
      isMatching: false,
      forbidden: [Verb, Adjective],
      missing: [],
      forbiddenWordIndexes: [2],
      partsOfSpeechByWordIndex: new Map<number, ReadonlySet<PartOfSpeech>>([
        [0, new Set([Noun])],
        [1, new Set()],
        [2, new Set([Verb, Adjective])]
      ])
    });
  });

  it('should not forbid a preposition that has no part of speech', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['value', 'by', 'key'], required: [], restricted: [Verb, Adjective] })).toStrictEqual(
      {
        isMatching: true
      }
    );
  });

  it('should read a participle before a trailing temporal preposition as a noun', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['created', 'at'], required: [Noun], restricted: [] })).toStrictEqual({
      isMatching: true
    });
  });

  it('should read a third-person verb before a trailing temporal preposition as a noun', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['expires', 'at'], required: [Noun], restricted: [Verb] })).toStrictEqual({
      isMatching: true
    });
  });

  it('should not read a base-form verb before a trailing temporal preposition as a noun', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['cancel', 'at'], required: [Noun], restricted: [Verb] })).toStrictEqual({
      isMatching: false,
      forbidden: [Verb],
      missing: [Noun],
      forbiddenWordIndexes: [0],
      partsOfSpeechByWordIndex: new Map<number, ReadonlySet<PartOfSpeech>>([
        [0, new Set([Verb])],
        [1, new Set()]
      ])
    });
  });

  it('should not read a word before a temporal preposition as a noun when the preposition is not last', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['expires', 'at', 'seconds'], required: [], restricted: [Verb] })).toStrictEqual({
      isMatching: false,
      forbidden: [Verb],
      missing: [],
      forbiddenWordIndexes: [0],
      partsOfSpeechByWordIndex: new Map<number, ReadonlySet<PartOfSpeech>>([
        [0, new Set([Verb])],
        [1, new Set()],
        [2, new Set([Noun])]
      ])
    });
  });

  it('should read a verb before a trailing particle as a noun', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['add', 'in'], required: [Noun], restricted: [Verb] })).toStrictEqual({
      isMatching: true
    });
  });

  it('should keep the verb reading of a verb before a trailing particle', () => {
    const matcher = new PartsOfSpeechMatcher({});
    expect(matcher.match({ words: ['sign', 'up'], required: [Verb], restricted: [] })).toStrictEqual({
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
      missing: [],
      forbiddenWordIndexes: [0],
      partsOfSpeechByWordIndex: new Map([[0, new Set([Verb])]])
    });
  });
});
