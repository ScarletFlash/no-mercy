import nlp from 'compromise';
import { LEXICON } from '../constants/lexicon.constant';
import { PART_OF_SPEECH } from '../constants/part-of-speech.constant';
import { type PartOfSpeech } from '../declarations/part-of-speech.type';

type Dictionary = Partial<Readonly<Record<PartOfSpeech, readonly string[]>>>;

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

const NOUN_CONTEXT = 'the';

const dictionaryKeyByDictionary = new WeakMap<Dictionary, string>();
const partsOfSpeechByWordByDictionaryKey = new Map<string, Map<string, ReadonlySet<PartOfSpeech>>>();
const singularByWord = new Map<string, string>();

function getSingular(word: string): string {
  const cachedSingularWord = singularByWord.get(word);
  if (cachedSingularWord !== undefined) {
    return cachedSingularWord;
  }

  const nounPhrase = nlp(`${NOUN_CONTEXT} ${word}`);
  const singularText = nounPhrase.has('#Plural')
    ? nounPhrase.nouns().toSingular().text().replace(`${NOUN_CONTEXT} `, '')
    : word;
  const singularWord = singularText === '' ? word : singularText;
  singularByWord.set(word, singularWord);
  return singularWord;
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

  const lexiconEntry = LEXICON[word] ?? [];
  const lexiconTags = typeof lexiconEntry === 'string' ? [lexiconEntry] : lexiconEntry;
  lexiconTags.forEach((tagName: string) => {
    const canonicalPartOfSpeech = CANON_PART_OF_SPEECH[tagName];
    if (canonicalPartOfSpeech !== undefined) {
      partsOfSpeech.add(canonicalPartOfSpeech);
    }
  });

  const singularWord = getSingular(word);
  Object.values(PART_OF_SPEECH).forEach((part: PartOfSpeech) => {
    if ((dictionary[part] ?? []).some((entry: string) => getSingular(entry) === singularWord)) {
      partsOfSpeech.add(part);
    }
  });

  if (partsOfSpeech.size === 0) {
    partsOfSpeech.add(PART_OF_SPEECH.Noun);
  }

  partsOfSpeechByWord.set(word, partsOfSpeech);
  return partsOfSpeech;
}
