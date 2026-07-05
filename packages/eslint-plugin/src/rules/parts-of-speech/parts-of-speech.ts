import {
  AST_NODE_TYPES,
  ESLintUtils,
  type JSONSchema,
  type ParserServicesWithTypeInformation,
  type TSESLint,
  type TSESTree
} from '@typescript-eslint/utils';
import { noCase } from 'change-case';
import { DECLARATION_TYPE } from '../../constants/declaration-type.constant';
import { PART_OF_SPEECH } from '../../constants/part-of-speech.constant';
import { TYPE_CONDITION } from '../../constants/type-condition.constant';
import { type PartOfSpeech } from '../../declarations/part-of-speech.type';
import { PartsOfSpeechMatcher } from '../../declarations/parts-of-speech-matcher.class';
import { getDeclarationTypeInfo } from '../../utilities/get-declaration-type-info.utility';
import { getRegExp } from '../../utilities/get-regexp.utility';
import { getRule } from '../../utilities/get-rule.utility';
import { PARTS_OF_SPEECH_DEFAULT } from './parts-of-speech.default';
import { MessageId } from './parts-of-speech.message-id';
import { type Options } from './parts-of-speech.options';

type DeclarationPolicies = NonNullable<Options['declarationPolicies']>;
type DeclarationType = keyof DeclarationPolicies;
type PatternMap = NonNullable<DeclarationPolicies[DeclarationType]>;
type Policy = PatternMap[string];
type RuleContext = Readonly<TSESLint.RuleContext<MessageId, readonly [Options]>>;

const DEFAULT_PATTERN = 'default';

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

const DICTIONARY_SCHEMA: JSONSchema.JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(
    Object.values(PART_OF_SPEECH).map((partOfSpeech: PartOfSpeech): [PartOfSpeech, typeof STRING_ARRAY_SCHEMA] => [
      partOfSpeech,
      STRING_ARRAY_SCHEMA
    ])
  )
};

const POLICY_SCHEMA: JSONSchema.JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    required: PART_OF_SPEECH_ARRAY_SCHEMA,
    restricted: PART_OF_SPEECH_ARRAY_SCHEMA,
    appliesTo: { type: 'string' }
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
  readonly matcher: PartsOfSpeechMatcher;
}

interface CheckParams {
  readonly scope: RuleScope;
  readonly id: TSESTree.Identifier;
  readonly declarationType: DeclarationType;
}

interface GetMatchingPolicyParams {
  readonly patternMap: PatternMap;
  readonly name: string;
  readonly typeInfo: DeclarationTypeInfo;
}

function getMatchingPolicy({ patternMap, name, typeInfo }: GetMatchingPolicyParams): Policy | undefined {
  const candidateKeys = Object.keys(patternMap).filter((key: string) => key !== DEFAULT_PATTERN);
  const namePatternKey = candidateKeys.find(
    (key: string) => !TYPE_CONDITION_PREDICATES.has(key) && getRegExp(key).test(name)
  );
  const typeConditionKey = candidateKeys.find((key: string) => TYPE_CONDITION_PREDICATES.get(key)?.(typeInfo) === true);
  const matchedKey = namePatternKey ?? typeConditionKey;
  return matchedKey === undefined ? patternMap[DEFAULT_PATTERN] : patternMap[matchedKey];
}

interface ReportViolationParams {
  readonly context: RuleContext;
  readonly id: TSESTree.Identifier;
  readonly application: string | undefined;
  readonly name: string;
  readonly partsOfSpeech: readonly PartOfSpeech[];
  readonly defaultMessageId: MessageId;
  readonly applicationMessageId: MessageId;
}

function reportViolation({
  context,
  id,
  application,
  name,
  partsOfSpeech,
  defaultMessageId,
  applicationMessageId
}: ReportViolationParams): void {
  context.report({
    node: id,
    messageId: application === undefined ? defaultMessageId : applicationMessageId,
    data: { application, name, partsOfSpeech: partsOfSpeech.join(', ') }
  });
}

function check({ scope, id, declarationType }: CheckParams): void {
  const { context, parserServices, options, matcher } = scope;
  const patternMap = options.declarationPolicies?.[declarationType];
  if (patternMap === undefined) {
    return;
  }

  const { name } = id;
  const typeInfo = getDeclarationTypeInfo({ node: id, parserServices });
  const policy = getMatchingPolicy({ patternMap, name, typeInfo });
  if (policy === undefined) {
    return;
  }

  const { appliesTo: application, required, restricted } = policy;
  const words = noCase(name)
    .split(' ')
    .filter((word: string) => word.length > 0);
  const result = matcher.match({ words, required: required ?? [], restricted: restricted ?? [] });
  if (result.isMatching) {
    return;
  }

  if (result.missing.length > 0) {
    reportViolation({
      context,
      id,
      application,
      name,
      partsOfSpeech: result.missing,
      defaultMessageId: MessageId.MissingRequiredPartOfSpeech,
      applicationMessageId: MessageId.MissingRequiredPartOfSpeechForApplication
    });
    return;
  }

  reportViolation({
    context,
    id,
    application,
    name,
    partsOfSpeech: result.forbidden,
    defaultMessageId: MessageId.RestrictedPartOfSpeech,
    applicationMessageId: MessageId.RestrictedPartOfSpeechForApplication
  });
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
          dictionary: DICTIONARY_SCHEMA,
          declarationPolicies: DECLARATION_POLICIES_SCHEMA
        }
      }
    ],
    messages: {
      [MessageId.MissingRequiredPartOfSpeech]: 'Name "{{name}}" must contain: {{partsOfSpeech}}.',
      [MessageId.MissingRequiredPartOfSpeechForApplication]:
        '{{application}} name "{{name}}" must contain: {{partsOfSpeech}}.',
      [MessageId.RestrictedPartOfSpeech]: 'Name "{{name}}" must not contain: {{partsOfSpeech}}.',
      [MessageId.RestrictedPartOfSpeechForApplication]:
        '{{application}} name "{{name}}" must not contain: {{partsOfSpeech}}.'
    }
  },
  defaultOptions: [PARTS_OF_SPEECH_DEFAULT],
  create: (context: RuleContext, [rawOptions]: readonly [Options]) => {
    const options = rawOptions ?? {};
    const scope: RuleScope = {
      context,
      parserServices: ESLintUtils.getParserServices(context),
      options,
      matcher: new PartsOfSpeechMatcher(options.dictionary ?? {})
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
