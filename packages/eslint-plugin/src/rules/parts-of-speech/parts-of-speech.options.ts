import { type DECLARATION_TYPE } from '../../constants/declaration-type.constant';
import { type PartOfSpeech } from '../../declarations/part-of-speech.type';

type DeclarationType = (typeof DECLARATION_TYPE)[keyof typeof DECLARATION_TYPE];

interface Policy {
  readonly required?: readonly PartOfSpeech[];
  readonly restricted?: readonly PartOfSpeech[];
  readonly appliesTo?: string;
}

interface PatternMap {
  readonly [pattern: string]: Policy;
  readonly default: Policy;
}

export interface Options {
  readonly dictionary?: Partial<Readonly<Record<PartOfSpeech, readonly string[]>>>;
  readonly declarationPolicies?: Partial<Readonly<Record<DeclarationType, PatternMap>>>;
}
