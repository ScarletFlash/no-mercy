import { dirname, join, resolve } from 'path';
import {
  AST_NODE_TYPES,
  ESLintUtils,
  type JSONSchema,
  type ParserServicesWithTypeInformation,
  type TSESLint,
  type TSESTree
} from '@typescript-eslint/utils';
import { split } from 'change-case';
import TS_API from 'typescript';
import { DECLARATION_TYPE } from '../../constants/declaration-type.constant';
import { PART_OF_SPEECH } from '../../constants/part-of-speech.constant';
import { TYPE_CONDITION } from '../../constants/type-condition.constant';
import { type PartOfSpeech } from '../../declarations/part-of-speech.type';
import { PartsOfSpeechMatcher } from '../../declarations/parts-of-speech-matcher.class';
import { getRegExp } from '../../utilities/get-regexp.utility';
import { getRule } from '../../utilities/get-rule.utility';
import { getTypeInfo } from '../../utilities/get-type-info.utility';
import { isRecord } from '../../utilities/is-record.utility';
import { PARTS_OF_SPEECH_DEFAULT } from './parts-of-speech.default';
import { MessageId } from './parts-of-speech.message-id';
import { type Options } from './parts-of-speech.options';

type DeclarationPolicies = NonNullable<Options['declarationPolicies']>;
type DeclarationType = keyof DeclarationPolicies;
type PatternMap = NonNullable<DeclarationPolicies[DeclarationType]>;
type Policy = PatternMap[string];
type TypeSpecifier = NonNullable<Policy['types']>[number];
type RuleContext = Readonly<TSESLint.RuleContext<MessageId, readonly [Options]>>;

const DEFAULT_PATTERN = 'default';

const FUNCTION_WORD_READING = 'function word';

const PACKAGE_MANIFEST_NAME = 'package.json';

const TYPES_SCOPE = '@types/';

const ANY_TYPE_ARGUMENT = '*';

const packageNameByDirectory = new Map<string, string>();

type TypeInfo = ReturnType<typeof getTypeInfo>;

const TYPE_CONDITION_PREDICATES: ReadonlyMap<string, (info: TypeInfo) => boolean> = new Map([
  [TYPE_CONDITION.Boolean, (info: TypeInfo) => info.isBoolean],
  [TYPE_CONDITION.Function, (info: TypeInfo) => info.isCallable]
]);

const PART_OF_SPEECH_ARRAY_SCHEMA: JSONSchema.JSONSchema4 = {
  type: 'array',
  uniqueItems: true,
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

const DEFAULT_POLICY_PROPERTIES: Readonly<Record<string, JSONSchema.JSONSchema4>> = {
  required: PART_OF_SPEECH_ARRAY_SCHEMA,
  restricted: PART_OF_SPEECH_ARRAY_SCHEMA,
  appliesTo: { type: 'string' }
};

const TYPE_SPECIFIER_SCHEMA: JSONSchema.JSONSchema4 = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      properties: { package: { type: 'string' }, name: { type: 'string' }, typeArguments: STRING_ARRAY_SCHEMA },
      required: ['package', 'name']
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: { path: { type: 'string' }, name: { type: 'string' }, typeArguments: STRING_ARRAY_SCHEMA },
      required: ['path', 'name']
    }
  ]
};

const TYPE_SPECIFIER_ARRAY_SCHEMA: JSONSchema.JSONSchema4 = { type: 'array', items: TYPE_SPECIFIER_SCHEMA };

const DEFAULT_POLICY_SCHEMA: JSONSchema.JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: DEFAULT_POLICY_PROPERTIES
};

const POLICY_SCHEMA: JSONSchema.JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ...DEFAULT_POLICY_PROPERTIES,
    types: TYPE_SPECIFIER_ARRAY_SCHEMA,
    returnTypes: TYPE_SPECIFIER_ARRAY_SCHEMA
  }
};

const PATTERN_MAP_SCHEMA: JSONSchema.JSONSchema4 = {
  type: 'object',
  additionalProperties: POLICY_SCHEMA,
  properties: { [DEFAULT_PATTERN]: DEFAULT_POLICY_SCHEMA },
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

function isTypeReference(type: TS_API.Type): type is TS_API.TypeReference {
  return 'target' in type && typeof type.target === 'object' && type.target !== null;
}

function isAmbientModuleDeclaration(node: TS_API.Node): node is TS_API.ModuleDeclaration {
  return TS_API.isModuleDeclaration(node) && TS_API.isStringLiteral(node.name);
}

function getManifestPackageName(directory: string): string | undefined {
  const manifestText = TS_API.sys.readFile(join(directory, PACKAGE_MANIFEST_NAME));
  const manifest: unknown = manifestText === undefined ? undefined : JSON.parse(manifestText);
  return isRecord(manifest) && typeof manifest.name === 'string' ? manifest.name : undefined;
}

function getPackageName(fileName: string): string | undefined {
  const fileDirectory = dirname(fileName);
  const cachedPackageName = packageNameByDirectory.get(fileDirectory);
  if (cachedPackageName !== undefined) {
    return cachedPackageName;
  }
  const directories = [fileDirectory];
  while (directories.length > 0) {
    const directory = directories.pop();
    if (directory === undefined) {
      break;
    }
    const packageName = getManifestPackageName(directory);
    if (packageName !== undefined) {
      packageNameByDirectory.set(fileDirectory, packageName);
      return packageName;
    }
    const parentDirectory = dirname(directory);
    if (parentDirectory !== directory) {
      directories.push(parentDirectory);
    }
  }
  return undefined;
}

interface IsDeclaredInPackageParams {
  readonly declaration: TS_API.Declaration;
  readonly packageName: string;
}

function isDeclaredInPackage({ declaration, packageName }: IsDeclaredInPackageParams): boolean {
  const ambientModule = TS_API.findAncestor(declaration, isAmbientModuleDeclaration);
  if (ambientModule !== undefined) {
    return ambientModule.name.text === packageName;
  }
  const declaringPackageName = getPackageName(declaration.getSourceFile().fileName);
  const typesPackageName = `${TYPES_SCOPE}${packageName.startsWith('@') ? packageName.slice(1).replace('/', '__') : packageName}`;
  return declaringPackageName === packageName || declaringPackageName === typesPackageName;
}

interface IsDeclarationMatchingParams {
  readonly declaration: TS_API.Declaration;
  readonly specifier: TypeSpecifier;
  readonly cwd: string;
}

function isDeclarationMatching({ declaration, specifier, cwd }: IsDeclarationMatchingParams): boolean {
  if (specifier.path !== undefined) {
    return resolve(declaration.getSourceFile().fileName) === resolve(cwd, specifier.path);
  }
  return isDeclaredInPackage({ declaration, packageName: specifier.package });
}

interface IsSymbolMatchingParams {
  readonly symbol: TS_API.Symbol | undefined;
  readonly specifier: TypeSpecifier;
  readonly cwd: string;
}

function isSymbolMatching({ symbol, specifier, cwd }: IsSymbolMatchingParams): boolean {
  return (
    symbol?.getName() === specifier.name &&
    (symbol.getDeclarations() ?? []).some((declaration: TS_API.Declaration) =>
      isDeclarationMatching({ declaration, specifier, cwd })
    )
  );
}

interface AreTypeArgumentsMatchingParams {
  readonly typeArguments: readonly TS_API.Type[];
  readonly specifier: TypeSpecifier;
  readonly checker: TS_API.TypeChecker;
}

function areTypeArgumentsMatching({ typeArguments, specifier, checker }: AreTypeArgumentsMatchingParams): boolean {
  return (specifier.typeArguments ?? []).every((typeArgumentText: string, index: number) => {
    const typeArgument = typeArguments[index];
    if (typeArgument === undefined) {
      return false;
    }
    if (typeArgumentText === ANY_TYPE_ARGUMENT) {
      return true;
    }
    const isTypeConditionMatching = TYPE_CONDITION_PREDICATES.get(typeArgumentText);
    return isTypeConditionMatching === undefined
      ? checker.typeToString(typeArgument) === typeArgumentText
      : isTypeConditionMatching(getTypeInfo({ type: typeArgument, checker }));
  });
}

interface IsTypeMatchingParams {
  readonly type: TS_API.Type;
  readonly specifier: TypeSpecifier;
  readonly checker: TS_API.TypeChecker;
  readonly cwd: string;
}

function isNamedTypeMatching({ type, specifier, checker, cwd }: IsTypeMatchingParams): boolean {
  if (
    isSymbolMatching({ symbol: type.aliasSymbol, specifier, cwd }) &&
    areTypeArgumentsMatching({ typeArguments: type.aliasTypeArguments ?? [], specifier, checker })
  ) {
    return true;
  }
  return (
    isSymbolMatching({ symbol: type.getSymbol(), specifier, cwd }) &&
    areTypeArgumentsMatching({
      typeArguments: isTypeReference(type) ? checker.getTypeArguments(type) : [],
      specifier,
      checker
    })
  );
}

function isTypeMatching({ type, specifier, checker, cwd }: IsTypeMatchingParams): boolean {
  if (isNamedTypeMatching({ type, specifier, checker, cwd })) {
    return true;
  }
  const nonNullableType = checker.getNonNullableType(type);
  const unionMembers = nonNullableType.isUnion() ? nonNullableType.types : [nonNullableType];
  return unionMembers.every((unionMember: TS_API.Type) =>
    (unionMember.isIntersection() ? unionMember.types : [unionMember]).some((intersectionMember: TS_API.Type) =>
      isNamedTypeMatching({ type: intersectionMember, specifier, checker, cwd })
    )
  );
}

interface IsTypeMatchingSpecifiersParams {
  readonly type: TS_API.Type;
  readonly specifiers: readonly TypeSpecifier[];
  readonly checker: TS_API.TypeChecker;
  readonly cwd: string;
}

function isTypeMatchingSpecifiers({ type, specifiers, checker, cwd }: IsTypeMatchingSpecifiersParams): boolean {
  return specifiers.some((specifier: TypeSpecifier) => isTypeMatching({ type, specifier, checker, cwd }));
}

interface IsPolicyApplicableParams {
  readonly policy: Policy;
  readonly type: TS_API.Type;
  readonly checker: TS_API.TypeChecker;
  readonly cwd: string;
}

function isPolicyApplicable({ policy, type, checker, cwd }: IsPolicyApplicableParams): boolean {
  const { types, returnTypes } = policy;
  const signatures = checker.getNonNullableType(type).getCallSignatures();
  return (
    (types === undefined || isTypeMatchingSpecifiers({ type, specifiers: types, checker, cwd })) &&
    (returnTypes === undefined ||
      (signatures.length > 0 &&
        signatures.every((signature: TS_API.Signature) =>
          isTypeMatchingSpecifiers({
            type: checker.getReturnTypeOfSignature(signature),
            specifiers: returnTypes,
            checker,
            cwd
          })
        )))
  );
}

interface GetMatchingPolicyParams {
  readonly patternMap: PatternMap;
  readonly name: string;
  readonly typeInfo: TypeInfo;
  readonly type: TS_API.Type;
  readonly checker: TS_API.TypeChecker;
  readonly cwd: string;
}

function getMatchingPolicy({ patternMap, name, typeInfo, type, checker, cwd }: GetMatchingPolicyParams): Policy {
  const candidates = Object.entries(patternMap).filter(([key]: [string, Policy]) => key !== DEFAULT_PATTERN);
  const namePatternCandidate = candidates.find(
    ([key, policy]: [string, Policy]) =>
      !TYPE_CONDITION_PREDICATES.has(key) &&
      getRegExp(key).test(name) &&
      isPolicyApplicable({ policy, type, checker, cwd })
  );
  const typeConditionCandidate = candidates.find(
    ([key, policy]: [string, Policy]) =>
      TYPE_CONDITION_PREDICATES.get(key)?.(typeInfo) === true && isPolicyApplicable({ policy, type, checker, cwd })
  );
  const [, matchedPolicy] = namePatternCandidate ?? typeConditionCandidate ?? [DEFAULT_PATTERN, patternMap.default];
  return matchedPolicy;
}

interface GetReadingsParams {
  readonly words: readonly string[];
  readonly partsOfSpeechByWordIndex: ReadonlyMap<number, ReadonlySet<PartOfSpeech>>;
  readonly wordIndexes: ReadonlySet<number>;
}

function getReadings({ words, partsOfSpeechByWordIndex, wordIndexes }: GetReadingsParams): string {
  return words
    .entries()
    .flatMap(([index, word]: [number, string]): readonly string[] => {
      const partsOfSpeech = partsOfSpeechByWordIndex.get(index);
      if (partsOfSpeech === undefined || !wordIndexes.has(index)) {
        return [];
      }
      const wordReading = partsOfSpeech.size === 0 ? FUNCTION_WORD_READING : Array.from(partsOfSpeech).join('/');
      return [`${word} → ${wordReading}`];
    })
    .toArray()
    .join(', ');
}

interface ReportViolationParams {
  readonly context: RuleContext;
  readonly id: TSESTree.Identifier;
  readonly application: string | undefined;
  readonly name: string;
  readonly partsOfSpeech: readonly PartOfSpeech[];
  readonly readings: string;
  readonly defaultMessageId: MessageId;
  readonly applicationMessageId: MessageId;
}

function reportViolation({
  context,
  id,
  application,
  name,
  partsOfSpeech,
  readings,
  defaultMessageId,
  applicationMessageId
}: ReportViolationParams): void {
  context.report({
    node: id,
    messageId: application === undefined ? defaultMessageId : applicationMessageId,
    data: { application, name, partsOfSpeech: partsOfSpeech.join(', '), readings }
  });
}

const wordsByName = new Map<string, readonly string[]>();

function check({ scope, id, declarationType }: CheckParams): void {
  const { context, parserServices, options, matcher } = scope;
  const patternMap = options.declarationPolicies?.[declarationType];
  if (patternMap === undefined) {
    return;
  }

  const { name }: TSESTree.Identifier = id;
  const type = parserServices.getTypeAtLocation(id);
  const checker = parserServices.program.getTypeChecker();
  const policy = getMatchingPolicy({
    patternMap,
    name,
    typeInfo: getTypeInfo({ type, checker }),
    type,
    checker,
    cwd: context.cwd
  });

  const { appliesTo: application, required, restricted } = policy;
  const words = wordsByName.get(name) ?? split(name).map((word: string) => word.toLowerCase());
  wordsByName.set(name, words);
  const result = matcher.match({ words, required: required ?? [], restricted: restricted ?? [] });
  if (result.isMatching) {
    return;
  }

  const { partsOfSpeechByWordIndex } = result;
  if (result.missing.length > 0) {
    reportViolation({
      context,
      id,
      application,
      name,
      partsOfSpeech: result.missing,
      readings: getReadings({ words, partsOfSpeechByWordIndex, wordIndexes: new Set(words.keys()) }),
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
    readings: getReadings({ words, partsOfSpeechByWordIndex, wordIndexes: new Set(result.forbiddenWordIndexes) }),
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
      [MessageId.MissingRequiredPartOfSpeech]:
        'Name "{{name}}" must contain: {{partsOfSpeech}} (read as: {{readings}}).',
      [MessageId.MissingRequiredPartOfSpeechForApplication]:
        '{{application}} name "{{name}}" must contain: {{partsOfSpeech}} (read as: {{readings}}).',
      [MessageId.RestrictedPartOfSpeech]:
        'Name "{{name}}" must not contain: {{partsOfSpeech}} (read as: {{readings}}).',
      [MessageId.RestrictedPartOfSpeechForApplication]:
        '{{application}} name "{{name}}" must not contain: {{partsOfSpeech}} (read as: {{readings}}).'
    },
    defaultOptions: [PARTS_OF_SPEECH_DEFAULT]
  },
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
