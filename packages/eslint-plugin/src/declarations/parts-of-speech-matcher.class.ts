import nlp from 'compromise';
import { PART_OF_SPEECH } from '../constants/part-of-speech.constant';
import { getPartsOfSpeech } from '../utilities/get-parts-of-speech.utility';
import { type Dictionary } from './dictionary.type';
import { type PartOfSpeech } from './part-of-speech.type';

type PartsOfSpeechByWordIndex = ReadonlyMap<number, ReadonlySet<PartOfSpeech>>;

type MatchResult =
  | { readonly isMatching: true }
  | {
      readonly isMatching: false;
      readonly forbidden: readonly PartOfSpeech[];
      readonly missing: readonly PartOfSpeech[];
      readonly forbiddenWordIndexes: readonly number[];
      readonly partsOfSpeechByWordIndex: PartsOfSpeechByWordIndex;
    };

interface MatchParams {
  readonly words: readonly string[];
  readonly required: readonly PartOfSpeech[];
  readonly restricted: readonly PartOfSpeech[];
}

const INFINITIVE_MARKER = 'to';

const TEMPORAL_PREPOSITIONS: ReadonlySet<string> = new Set(['at', 'in', 'on', 'until', 'since', 'after', 'before']);

const PARTICLES: ReadonlySet<string> = new Set(['up', 'down', 'in', 'out', 'off', 'on', 'over']);

const PRESENT_TENSE_TAG = '#PresentTense';

const INFINITIVE_TAG = '#Infinitive';

interface WordContextParams {
  readonly words: readonly string[];
  readonly taggedPartsOfSpeech: readonly ReadonlySet<PartOfSpeech>[];
  readonly index: number;
}

interface GetMissingParams {
  readonly required: readonly PartOfSpeech[];
  readonly partsOfSpeechByWordIndex: PartsOfSpeechByWordIndex;
}

interface GetForbiddenWordIndexesParams {
  readonly restricted: readonly PartOfSpeech[];
  readonly partsOfSpeechByWordIndex: PartsOfSpeechByWordIndex;
}

interface CanAssignParams {
  readonly part: PartOfSpeech;
  readonly requirementIndex: number;
  readonly required: readonly PartOfSpeech[];
  readonly partsOfSpeechByWordIndex: PartsOfSpeechByWordIndex;
  readonly requirementByWord: Map<number, number>;
}

interface AssignmentStep {
  readonly part: PartOfSpeech;
  readonly requirementIndex: number;
  readonly words: MapIterator<[number, ReadonlySet<PartOfSpeech>]>;
  wordIndex: number | undefined;
}

export class PartsOfSpeechMatcher {
  readonly #dictionary: Dictionary;

  constructor(dictionary: Dictionary) {
    this.#dictionary = dictionary;
  }

  public match({ words, required, restricted }: MatchParams): MatchResult {
    if (required.length === 0 && restricted.length === 0) {
      return { isMatching: true };
    }

    const taggedPartsOfSpeech = words.map((word: string) => getPartsOfSpeech({ word, dictionary: this.#dictionary }));
    const partsOfSpeechByWordIndex: PartsOfSpeechByWordIndex = new Map(
      taggedPartsOfSpeech.map(
        (partsOfSpeech: ReadonlySet<PartOfSpeech>, index: number): [number, ReadonlySet<PartOfSpeech>] => [
          index,
          partsOfSpeech.union(this.#getContextualPartsOfSpeech({ words, taggedPartsOfSpeech, index }))
        ]
      )
    );

    const missingPartsOfSpeech = this.#getMissing({ required, partsOfSpeechByWordIndex });
    const forbiddenWordIndexes = this.#getForbiddenWordIndexes({ restricted, partsOfSpeechByWordIndex });
    if (missingPartsOfSpeech.length === 0 && forbiddenWordIndexes.length === 0) {
      return { isMatching: true };
    }
    return {
      isMatching: false,
      forbidden: restricted.filter((part: PartOfSpeech) =>
        forbiddenWordIndexes.some((index: number) => partsOfSpeechByWordIndex.get(index)?.has(part) === true)
      ),
      missing: missingPartsOfSpeech,
      forbiddenWordIndexes,
      partsOfSpeechByWordIndex
    };
  }

  #getContextualPartsOfSpeech(params: WordContextParams): ReadonlySet<PartOfSpeech> {
    const infinitivePartsOfSpeech: readonly PartOfSpeech[] = this.#isInfinitiveModifier(params)
      ? [PART_OF_SPEECH.Adjective]
      : [];
    const compoundPartsOfSpeech: readonly PartOfSpeech[] =
      this.#isTemporalHead(params) || this.#isPhrasalHead(params) ? [PART_OF_SPEECH.Noun] : [];
    return new Set(infinitivePartsOfSpeech.concat(compoundPartsOfSpeech));
  }

  #isInfinitiveModifier({ words, taggedPartsOfSpeech, index }: WordContextParams): boolean {
    return (
      words[index - 1] === INFINITIVE_MARKER &&
      taggedPartsOfSpeech[index - 2]?.has(PART_OF_SPEECH.Noun) === true &&
      taggedPartsOfSpeech[index]?.has(PART_OF_SPEECH.Verb) === true
    );
  }

  #isTemporalHead({ words, taggedPartsOfSpeech, index }: WordContextParams): boolean {
    const word = words[index];
    const trailingWord = this.#getTrailingWord({ words, taggedPartsOfSpeech, index });
    if (word === undefined || trailingWord === undefined || !TEMPORAL_PREPOSITIONS.has(trailingWord)) {
      return false;
    }
    const taggedWord = nlp(word);
    return (
      taggedPartsOfSpeech[index]?.has(PART_OF_SPEECH.Adjective) === true ||
      (taggedWord.has(PRESENT_TENSE_TAG) && !taggedWord.has(INFINITIVE_TAG))
    );
  }

  #isPhrasalHead({ words, taggedPartsOfSpeech, index }: WordContextParams): boolean {
    const trailingWord = this.#getTrailingWord({ words, taggedPartsOfSpeech, index });
    return (
      trailingWord !== undefined &&
      PARTICLES.has(trailingWord) &&
      taggedPartsOfSpeech[index]?.has(PART_OF_SPEECH.Verb) === true
    );
  }

  #getTrailingWord({ words, index }: WordContextParams): string | undefined {
    return index === words.length - 2 ? words[index + 1] : undefined;
  }

  #getForbiddenWordIndexes({ restricted, partsOfSpeechByWordIndex }: GetForbiddenWordIndexesParams): readonly number[] {
    const restrictedPartsOfSpeech = new Set(restricted);
    return partsOfSpeechByWordIndex
      .entries()
      .filter(
        ([, partsOfSpeech]: [number, ReadonlySet<PartOfSpeech>]) =>
          partsOfSpeech.size > 0 &&
          partsOfSpeech.values().every((wordPart: PartOfSpeech) => restrictedPartsOfSpeech.has(wordPart))
      )
      .map(([index]: [number, ReadonlySet<PartOfSpeech>]) => index)
      .toArray();
  }

  #getMissing({ required, partsOfSpeechByWordIndex }: GetMissingParams): readonly PartOfSpeech[] {
    const requirementByWord = new Map<number, number>();
    return required.filter(
      (part: PartOfSpeech, requirementIndex: number) =>
        !this.#canAssign({ part, requirementIndex, required, partsOfSpeechByWordIndex, requirementByWord })
    );
  }

  #canAssign({
    part,
    requirementIndex,
    required,
    partsOfSpeechByWordIndex,
    requirementByWord
  }: CanAssignParams): boolean {
    const visitedWords = new Set<number>();
    const steps: AssignmentStep[] = [
      { part, requirementIndex, words: partsOfSpeechByWordIndex.entries(), wordIndex: undefined }
    ];
    while (steps.length > 0) {
      const currentStep = steps.at(-1);
      if (currentStep === undefined) {
        break;
      }
      const candidate = currentStep.words.find(
        ([wordIndex, partsOfSpeech]: [number, ReadonlySet<PartOfSpeech>]) =>
          partsOfSpeech.has(currentStep.part) && !visitedWords.has(wordIndex)
      );
      if (candidate === undefined) {
        steps.pop();
        continue;
      }
      const [wordIndex] = candidate;
      visitedWords.add(wordIndex);
      currentStep.wordIndex = wordIndex;
      const occupant = requirementByWord.get(wordIndex);
      const occupantPart = occupant === undefined ? undefined : required[occupant];
      if (occupant !== undefined && occupantPart !== undefined) {
        steps.push({
          part: occupantPart,
          requirementIndex: occupant,
          words: partsOfSpeechByWordIndex.entries(),
          wordIndex: undefined
        });
        continue;
      }
      steps.forEach((assignedStep: AssignmentStep) => {
        if (assignedStep.wordIndex !== undefined) {
          requirementByWord.set(assignedStep.wordIndex, assignedStep.requirementIndex);
        }
      });
      return true;
    }
    return false;
  }
}
