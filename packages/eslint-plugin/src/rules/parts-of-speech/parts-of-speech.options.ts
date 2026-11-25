import { type DECLARATION_TYPE } from '../../constants/declaration-type.constant';
import { type Dictionary } from '../../declarations/dictionary.type';
import { type PartOfSpeech } from '../../declarations/part-of-speech.type';

type DeclarationType = (typeof DECLARATION_TYPE)[keyof typeof DECLARATION_TYPE];

interface PackageTypeSpecifier {
  readonly package: string;
  readonly path?: never;
  readonly name: string;
  readonly typeArguments?: readonly TypeArgumentSpecifier[];
}

interface FileTypeSpecifier {
  readonly path: string;
  readonly package?: never;
  readonly name: string;
  readonly typeArguments?: readonly TypeArgumentSpecifier[];
}

type TypeSpecifier = PackageTypeSpecifier | FileTypeSpecifier;

type TypeArgumentSpecifier = string | TypeSpecifier;

interface DefaultPolicy {
  readonly required?: readonly PartOfSpeech[];
  readonly restricted?: readonly PartOfSpeech[];
  readonly appliesTo?: string;
}

interface Policy extends DefaultPolicy {
  readonly types?: readonly TypeSpecifier[];
  readonly returnTypes?: readonly TypeSpecifier[];
}

interface PatternMap {
  readonly [pattern: string]: Policy | readonly Policy[];
  readonly default: DefaultPolicy;
}

export interface Options {
  readonly dictionary?: Dictionary;
  readonly declarationPolicies?: Partial<Readonly<Record<DeclarationType, PatternMap>>>;
}
