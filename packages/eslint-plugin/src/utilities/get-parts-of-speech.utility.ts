import nlp from 'compromise';
import { LEXICON } from '../constants/lexicon.constant';
import { PART_OF_SPEECH } from '../constants/part-of-speech.constant';
import { type Dictionary } from '../declarations/dictionary.type';
import { type PartOfSpeech } from '../declarations/part-of-speech.type';

const CANON_PART_OF_SPEECH: Readonly<Record<string, PartOfSpeech>> = {
  Singular: PART_OF_SPEECH.Noun,
  Plural: PART_OF_SPEECH.Noun,
  Noun: PART_OF_SPEECH.Noun,
  Actor: PART_OF_SPEECH.Noun,
  Place: PART_OF_SPEECH.Noun,
  Uncountable: PART_OF_SPEECH.Noun,
  ProperNoun: PART_OF_SPEECH.Noun,
  FirstName: PART_OF_SPEECH.Noun,
  LastName: PART_OF_SPEECH.Noun,
  Infinitive: PART_OF_SPEECH.Verb,
  Verb: PART_OF_SPEECH.Verb,
  PresentTense: PART_OF_SPEECH.Verb,
  Gerund: PART_OF_SPEECH.Adjective,
  PastTense: PART_OF_SPEECH.Adjective,
  Adjective: PART_OF_SPEECH.Adjective,
  Participle: PART_OF_SPEECH.Adjective
};

const MODIFIER_TAGS = ['#Gerund', '#PastTense', '#Adjective'];

const FUNCTION_WORD_TAGS = ['#Preposition', '#Conjunction', '#Determiner'];

const NOUN_CONTEXT = 'the';

const dictionaryKeyByDictionary = new WeakMap<Dictionary, string>();
const partsOfSpeechByWordByDictionaryKey = new Map<string, Map<string, ReadonlySet<PartOfSpeech>>>();
const singularByWord = new Map<string, string>();

function getSingular(word: string): string {
  const nounPhrase = nlp(`${NOUN_CONTEXT} ${word}`);
  const singularText = nounPhrase.has('#Plural')
    ? nounPhrase.nouns().toSingular().text().replace(`${NOUN_CONTEXT} `, '')
    : word;
  return singularText === '' ? word : singularText;
}

function getLexiconPartsOfSpeech(word: string): ReadonlySet<PartOfSpeech> {
  const lexiconEntry = LEXICON.get(word) ?? [];
  const lexiconTags = typeof lexiconEntry === 'string' ? [lexiconEntry] : lexiconEntry;
  return new Set(
    lexiconTags.flatMap((tagName: string) => {
      const canonicalPartOfSpeech = CANON_PART_OF_SPEECH[tagName];
      return canonicalPartOfSpeech === undefined ? [] : [canonicalPartOfSpeech];
    })
  );
}

interface GetSingularPartsOfSpeechParams {
  readonly word: string;
  readonly singularWord: string;
}

function getSingularPartsOfSpeech({ word, singularWord }: GetSingularPartsOfSpeechParams): ReadonlySet<PartOfSpeech> {
  return singularWord !== word && nlp(singularWord).has('#Noun') ? new Set([PART_OF_SPEECH.Noun]) : new Set();
}

function getFallbackPartsOfSpeech(taggedWord: ReturnType<typeof nlp>): ReadonlySet<PartOfSpeech> {
  return FUNCTION_WORD_TAGS.some((tagName: string) => taggedWord.has(tagName))
    ? new Set()
    : new Set([PART_OF_SPEECH.Noun]);
}

interface GetPartsOfSpeechParams {
  readonly word: string;
  readonly dictionary: Dictionary;
}

export function getPartsOfSpeech({ word, dictionary }: GetPartsOfSpeechParams): ReadonlySet<PartOfSpeech> {
  const dictionaryKey = dictionaryKeyByDictionary.get(dictionary) ?? JSON.stringify(dictionary);
  dictionaryKeyByDictionary.set(dictionary, dictionaryKey);
  const partsOfSpeechByWord =
    partsOfSpeechByWordByDictionaryKey.get(dictionaryKey) ?? new Map<string, ReadonlySet<PartOfSpeech>>();
  partsOfSpeechByWordByDictionaryKey.set(dictionaryKey, partsOfSpeechByWord);

  const cachedPartsOfSpeech = partsOfSpeechByWord.get(word);
  if (cachedPartsOfSpeech !== undefined) {
    return cachedPartsOfSpeech;
  }

  const partsOfSpeech = new Set<PartOfSpeech>();

  const taggedWord = nlp(word);
  if (taggedWord.has('#Verb')) {
    partsOfSpeech.add(PART_OF_SPEECH.Verb);
  }
  if (taggedWord.has('#Noun')) {
    partsOfSpeech.add(PART_OF_SPEECH.Noun);
  }
  if (MODIFIER_TAGS.some((tagName: string) => taggedWord.has(tagName))) {
    partsOfSpeech.add(PART_OF_SPEECH.Adjective);
  }

  getLexiconPartsOfSpeech(word).forEach((part: PartOfSpeech) => {
    partsOfSpeech.add(part);
  });

  const singularWord = singularByWord.get(word) ?? getSingular(word);
  singularByWord.set(word, singularWord);
  getSingularPartsOfSpeech({ word, singularWord }).forEach((part: PartOfSpeech) => {
    partsOfSpeech.add(part);
  });
  Object.values(PART_OF_SPEECH).forEach((part: PartOfSpeech) => {
    (dictionary[part] ?? []).forEach((entry: string) => {
      const singularEntry = singularByWord.get(entry) ?? getSingular(entry);
      singularByWord.set(entry, singularEntry);
      if (singularEntry === singularWord) {
        partsOfSpeech.add(part);
      }
    });
  });

  const resolvedPartsOfSpeech = partsOfSpeech.size > 0 ? partsOfSpeech : getFallbackPartsOfSpeech(taggedWord);
  partsOfSpeechByWord.set(word, resolvedPartsOfSpeech);
  return resolvedPartsOfSpeech;
}
