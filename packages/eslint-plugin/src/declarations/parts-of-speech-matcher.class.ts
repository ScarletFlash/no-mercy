import { getPartsOfSpeech } from '../utilities/get-parts-of-speech.utility';
import { type PartOfSpeech } from './part-of-speech.type';

type Dictionary = Partial<Readonly<Record<PartOfSpeech, readonly string[]>>>;

type MatchResult =
  | { readonly isMatching: true }
  | {
      readonly isMatching: false;
      readonly forbidden: readonly PartOfSpeech[];
      readonly missing: readonly PartOfSpeech[];
    };

interface MatchParams {
  readonly words: readonly string[];
  readonly required: readonly PartOfSpeech[];
  readonly restricted: readonly PartOfSpeech[];
}

type PartsOfSpeechByWordIndex = ReadonlyMap<number, ReadonlySet<PartOfSpeech>>;

interface GetMissingParams {
  readonly required: readonly PartOfSpeech[];
  readonly partsOfSpeechByWordIndex: PartsOfSpeechByWordIndex;
}

interface GetForbiddenParams {
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
    const partsOfSpeechByWordIndex: PartsOfSpeechByWordIndex = new Map(
      words.map((word: string, index: number): [number, ReadonlySet<PartOfSpeech>] => [
        index,
        getPartsOfSpeech({ word, dictionary: this.#dictionary })
      ])
    );

    const missingPartsOfSpeech = this.#getMissing({ required, partsOfSpeechByWordIndex });
    const forbiddenPartsOfSpeech = this.#getForbidden({ restricted, partsOfSpeechByWordIndex });
    if (missingPartsOfSpeech.length === 0 && forbiddenPartsOfSpeech.length === 0) {
      return { isMatching: true };
    }
    return { isMatching: false, forbidden: forbiddenPartsOfSpeech, missing: missingPartsOfSpeech };
  }

  #getForbidden({ restricted, partsOfSpeechByWordIndex }: GetForbiddenParams): readonly PartOfSpeech[] {
    const restrictedPartsOfSpeech = new Set(restricted);
    return restricted.filter((part: PartOfSpeech) =>
      partsOfSpeechByWordIndex
        .values()
        .some(
          (partsOfSpeech: ReadonlySet<PartOfSpeech>) =>
            partsOfSpeech.has(part) &&
            partsOfSpeech.values().every((wordPart: PartOfSpeech) => restrictedPartsOfSpeech.has(wordPart))
        )
    );
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
