import { type DECLARATION_TYPE } from '../../constants/declaration-type.constant';
import { type PART_OF_SPEECH } from '../../constants/part-of-speech.constant';

type PartOfSpeech = (typeof PART_OF_SPEECH)[keyof typeof PART_OF_SPEECH];
type DeclarationType = (typeof DECLARATION_TYPE)[keyof typeof DECLARATION_TYPE];

type WordPatterns = Partial<Readonly<Record<`${PartOfSpeech}s`, readonly string[]>>>;

interface Policy {
  readonly required?: readonly PartOfSpeech[];
  readonly restricted?: readonly PartOfSpeech[];
  readonly patterns?: WordPatterns;
}

interface PatternMap {
  readonly [pattern: string]: Policy;
  readonly default: Policy;
}

export interface Options {
  readonly globalPatterns?: WordPatterns;
  readonly declarationPolicies?: Partial<Readonly<Record<DeclarationType, PatternMap>>>;
}
