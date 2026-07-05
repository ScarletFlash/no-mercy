import { describe, expect, it } from '@rstest/core';
import { PART_OF_SPEECH } from '../constants/part-of-speech.constant';
import { getPartsOfSpeech } from './get-parts-of-speech.utility';

const { Noun, Verb, Adjective } = PART_OF_SPEECH;

describe('getPartsOfSpeech', () => {
  it('should classify a known noun as a noun', () => {
    expect(getPartsOfSpeech({ word: 'controller', dictionary: {} })).toStrictEqual(new Set([Noun]));
  });

  it('should classify a verb as a verb', () => {
    expect(getPartsOfSpeech({ word: 'calculate', dictionary: {} })).toStrictEqual(new Set([Verb]));
  });

  it('should default an unknown word to a noun', () => {
    expect(getPartsOfSpeech({ word: 'payload', dictionary: {} })).toStrictEqual(new Set([Noun]));
  });

  it('should classify an adjective as an adjective', () => {
    expect(getPartsOfSpeech({ word: 'ready', dictionary: {} })).toStrictEqual(new Set([Adjective]));
  });

  it('should add a part of speech from the dictionary without dropping the base', () => {
    expect(getPartsOfSpeech({ word: 'request', dictionary: { noun: ['request'] } })).toStrictEqual(
      new Set([Verb, Noun])
    );
  });

  it('should match a plural word against a singular dictionary entry', () => {
    expect(getPartsOfSpeech({ word: 'requests', dictionary: { noun: ['request'] } })).toStrictEqual(
      new Set([Verb, Noun])
    );
  });

  it('should match a singular word against a plural dictionary entry', () => {
    expect(getPartsOfSpeech({ word: 'request', dictionary: { noun: ['requests'] } })).toStrictEqual(
      new Set([Verb, Noun])
    );
  });

  it('should match an irregular plural word against a singular dictionary entry', () => {
    expect(getPartsOfSpeech({ word: 'copies', dictionary: { noun: ['copy'] } })).toStrictEqual(new Set([Verb, Noun]));
  });
});
