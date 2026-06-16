import {
  AST_NODE_TYPES,
  ESLintUtils,
  type JSONSchema,
  type ParserServicesWithTypeInformation,
  type TSESLint,
  type TSESTree
} from '@typescript-eslint/utils';
import { noCase } from 'change-case';
import nlp from 'compromise';
import { DECLARATION_TYPE } from '../../constants/declaration-type.constant';
import { LEXICON } from '../../constants/lexicon.constant';
import { PART_OF_SPEECH } from '../../constants/part-of-speech.constant';
import { TYPE_CONDITION } from '../../constants/type-condition.constant';
import { getDeclarationTypeInfo } from '../../utilities/get-declaration-type-info.utility';
import { getRegExp } from '../../utilities/get-regexp.utility';
import { getRule } from '../../utilities/get-rule.utility';
import { PARTS_OF_SPEECH_DEFAULT } from './parts-of-speech.default';
import { MessageId } from './parts-of-speech.message-id';
import { type Options } from './parts-of-speech.options';

type WordPatterns = NonNullable<Options['globalPatterns']>;
type DeclarationPolicies = NonNullable<Options['declarationPolicies']>;
type DeclarationType = keyof DeclarationPolicies;
type PatternMap = NonNullable<DeclarationPolicies[DeclarationType]>;
type Policy = PatternMap[string];
type PartOfSpeech = NonNullable<Policy['required']>[number];
type RuleContext = Readonly<TSESLint.RuleContext<MessageId, readonly [Options]>>;

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
  PresentTense: PART_OF_SPEECH.Noun,
  Gerund: PART_OF_SPEECH.Adjective,
  PastTense: PART_OF_SPEECH.Adjective,
  Adjective: PART_OF_SPEECH.Adjective,
  Participle: PART_OF_SPEECH.Adjective
};

const MODIFIER_CONTEXT_TAGS = ['#PastTense', '#Gerund', '#Adjective'];

const DEFAULT_PATTERN = 'default';

const partsOfSpeechByKey = new Map<string, readonly PartOfSpeech[]>();

interface GetPartsOfSpeechParams {
  readonly name: string;
  readonly isCallable: boolean;
  readonly wordPatterns: WordPatterns;
}

function getPartsOfSpeech({ name, isCallable, wordPatterns }: GetPartsOfSpeechParams): readonly PartOfSpeech[] {
  const phrase = noCase(name);
  const document = nlp(phrase);
  const words = phrase.split(' ').filter((word: string) => word.length > 0);
  return words.map((word: string, index: number): PartOfSpeech => {
    const pinnedPartOfSpeech = Object.values(PART_OF_SPEECH).find((partOfSpeech: PartOfSpeech) =>
      (wordPatterns[`${partOfSpeech}s`] ?? []).some((pattern: string) => getRegExp(pattern).test(word))
    );
    if (pinnedPartOfSpeech !== undefined) {
      return pinnedPartOfSpeech;
    }

    const term = document.match(word);
    if (MODIFIER_CONTEXT_TAGS.some((tag: string) => term.has(tag))) {
      return PART_OF_SPEECH.Adjective;
    }

    const tag = LEXICON[word];
    const canon = typeof tag === 'string' ? CANON_PART_OF_SPEECH[tag] : undefined;
    const isVerb = [
      canon === PART_OF_SPEECH.Verb,
      canon === undefined && term.has('#Verb'),
      isCallable && nlp(word).canBe('#Verb').found
    ].some(Boolean);
    if (isVerb) {
      return index === 0 ? PART_OF_SPEECH.Verb : PART_OF_SPEECH.Noun;
    }
    return canon ?? PART_OF_SPEECH.Noun;
  });
}

type DeclarationTypeInfo = ReturnType<typeof getDeclarationTypeInfo>;

const TYPE_CONDITION_PREDICATES: ReadonlyMap<string, (info: DeclarationTypeInfo) => boolean> = new Map([
  [TYPE_CONDITION.Boolean, (info: DeclarationTypeInfo) => info.isBoolean],
  [TYPE_CONDITION.Function, (info: DeclarationTypeInfo) => info.isCallable]
]);

const PART_OF_SPEECH_ARRAY_SCHEMA: JSONSchema.JSONSchema4 = {
  type: 'array',
  items: { type: 'string', enum: Object.values(PART_OF_SPEECH) }
};

const STRING_ARRAY_SCHEMA: JSONSchema.JSONSchema4 = { type: 'array', items: { type: 'string' } };

const WORD_PATTERNS_SCHEMA: JSONSchema.JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(
    Object.values(PART_OF_SPEECH).map(
      (partOfSpeech: PartOfSpeech): [`${PartOfSpeech}s`, typeof STRING_ARRAY_SCHEMA] => [
        `${partOfSpeech}s`,
        STRING_ARRAY_SCHEMA
      ]
    )
  )
};

const POLICY_SCHEMA: JSONSchema.JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    required: PART_OF_SPEECH_ARRAY_SCHEMA,
    restricted: PART_OF_SPEECH_ARRAY_SCHEMA,
    patterns: WORD_PATTERNS_SCHEMA
  }
};

const PATTERN_MAP_SCHEMA: JSONSchema.JSONSchema4 = {
  type: 'object',
  additionalProperties: POLICY_SCHEMA,
  properties: { [DEFAULT_PATTERN]: POLICY_SCHEMA },
  required: [DEFAULT_PATTERN]
};

const DECLARATION_POLICIES_SCHEMA: JSONSchema.JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(
    Object.values(DECLARATION_TYPE).map(
      (declarationType: DeclarationType): [DeclarationType, typeof PATTERN_MAP_SCHEMA] => [
        declarationType,
        PATTERN_MAP_SCHEMA
      ]
    )
  )
};

interface RuleScope {
  readonly context: RuleContext;
  readonly parserServices: ParserServicesWithTypeInformation;
  readonly options: Options;
}

interface CheckParams {
  readonly scope: RuleScope;
  readonly id: TSESTree.Identifier;
  readonly declarationType: DeclarationType;
}

function check({ scope, id, declarationType }: CheckParams): void {
  const { context, parserServices, options } = scope;
  const patternMap = options.declarationPolicies?.[declarationType];
  if (patternMap === undefined) {
    return;
  }

  const { name } = id;
  const typeInfo = getDeclarationTypeInfo({ node: id, parserServices });
  const matchedKey = Object.keys(patternMap).find((key: string) => {
    if (key === DEFAULT_PATTERN) {
      return false;
    }
    const isMatch = TYPE_CONDITION_PREDICATES.get(key);
    return isMatch === undefined ? getRegExp(key).test(name) : isMatch(typeInfo);
  });
  const policy = matchedKey === undefined ? patternMap[DEFAULT_PATTERN] : patternMap[matchedKey];
  if (policy === undefined) {
    return;
  }

  const wordPatterns: WordPatterns = Object.fromEntries(
    Object.values(PART_OF_SPEECH).map((partOfSpeech: PartOfSpeech): [`${PartOfSpeech}s`, readonly string[]] => [
      `${partOfSpeech}s`,
      [...(options.globalPatterns?.[`${partOfSpeech}s`] ?? []), ...(policy.patterns?.[`${partOfSpeech}s`] ?? [])]
    ])
  );
  const isCallable = typeInfo.isCallable;
  const cacheKey = `${name} ${isCallable} ${JSON.stringify(wordPatterns)}`;
  const nameParts = partsOfSpeechByKey.get(cacheKey) ?? getPartsOfSpeech({ name, isCallable, wordPatterns });
  partsOfSpeechByKey.set(cacheKey, nameParts);

  const presentParts = new Set(nameParts);
  const missingParts = (policy.required ?? []).filter((partOfSpeech: PartOfSpeech) => !presentParts.has(partOfSpeech));
  if (missingParts.length > 0) {
    context.report({
      node: id,
      messageId: MessageId.MissingRequiredPartOfSpeech,
      data: { name, partsOfSpeech: missingParts.join(', ') }
    });
    return;
  }

  const violatingParts = (policy.restricted ?? []).filter((partOfSpeech: PartOfSpeech) =>
    presentParts.has(partOfSpeech)
  );
  if (violatingParts.length > 0) {
    context.report({
      node: id,
      messageId: MessageId.RestrictedPartOfSpeech,
      data: { name, partsOfSpeech: violatingParts.join(', ') }
    });
  }
}

export const partsOfSpeech = getRule<readonly [Options], MessageId>({
  name: 'parts-of-speech',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require or restrict parts of speech in declaration names, configured per declaration type and name pattern.'
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          globalPatterns: WORD_PATTERNS_SCHEMA,
          declarationPolicies: DECLARATION_POLICIES_SCHEMA
        }
      }
    ],
    messages: {
      [MessageId.MissingRequiredPartOfSpeech]: 'Name "{{name}}" must contain: {{partsOfSpeech}}.',
      [MessageId.RestrictedPartOfSpeech]: 'Name "{{name}}" must not contain: {{partsOfSpeech}}.'
    }
  },
  defaultOptions: [PARTS_OF_SPEECH_DEFAULT],
  create: (context: RuleContext, [rawOptions]: readonly [Options]) => {
    const scope: RuleScope = {
      context,
      parserServices: ESLintUtils.getParserServices(context),
      options: rawOptions ?? {}
    };

    return {
      VariableDeclarator: ({ id }: TSESTree.VariableDeclarator): void => {
        if (id.type === AST_NODE_TYPES.Identifier) {
          check({ scope, id, declarationType: DECLARATION_TYPE.Variable });
        }
      },
      FunctionDeclaration: ({ id }: TSESTree.FunctionDeclaration): void => {
        if (id !== null) {
          check({ scope, id, declarationType: DECLARATION_TYPE.Function });
        }
      },
      ClassDeclaration: ({ id }: TSESTree.ClassDeclaration): void => {
        if (id !== null) {
          check({ scope, id, declarationType: DECLARATION_TYPE.Class });
        }
      },
      TSInterfaceDeclaration: ({ id }: TSESTree.TSInterfaceDeclaration): void => {
        check({ scope, id, declarationType: DECLARATION_TYPE.Interface });
      },
      TSTypeAliasDeclaration: ({ id }: TSESTree.TSTypeAliasDeclaration): void => {
        check({ scope, id, declarationType: DECLARATION_TYPE.Type });
      },
      TSEnumDeclaration: ({ id }: TSESTree.TSEnumDeclaration): void => {
        check({ scope, id, declarationType: DECLARATION_TYPE.Enum });
      }
    };
  }
});
