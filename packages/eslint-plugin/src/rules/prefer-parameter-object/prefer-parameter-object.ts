import {
  AST_NODE_TYPES,
  ESLintUtils,
  type ParserServicesWithTypeInformation,
  type TSESLint,
  type TSESTree
} from '@typescript-eslint/utils';
import { pascalCase } from 'change-case';
import * as TS_API from 'typescript';
import { getRegExp } from '../../utilities/get-regexp.utility';
import { getRule } from '../../utilities/get-rule.utility';
import { PREFER_PARAMETER_OBJECT_DEFAULT } from './prefer-parameter-object.default';
import { MessageId } from './prefer-parameter-object.message-id';
import { type Options } from './prefer-parameter-object.options';

type FunctionLikeNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression;
type SignatureNode =
  | TSESTree.TSCallSignatureDeclaration
  | TSESTree.TSConstructSignatureDeclaration
  | TSESTree.TSFunctionType
  | TSESTree.TSMethodSignature;
type ParameterizedNode = FunctionLikeNode | SignatureNode;
type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;
type ClassMemberNode = TSESTree.MethodDefinition | TSESTree.PropertyDefinition;
type RuleContext = Readonly<TSESLint.RuleContext<MessageId, readonly [Options]>>;

interface MutableFile {
  readonly version: number;
  readonly text: string;
}

interface RuleScope {
  readonly context: RuleContext;
  readonly parserServices: ParserServicesWithTypeInformation;
  readonly ignoreTypeGuards: boolean;
  readonly typeSuffix: Readonly<Record<string, string>>;
}

interface ImplementationParams {
  readonly scope: RuleScope;
  readonly node: FunctionLikeNode;
}

interface SignatureParams {
  readonly scope: RuleScope;
  readonly node: SignatureNode;
}

interface ClassMemberParams {
  readonly scope: RuleScope;
  readonly member: ClassMemberNode;
}

interface HeritageParams {
  readonly scope: RuleScope;
  readonly classNode: ClassNode;
}

interface ReportParams {
  readonly scope: RuleScope;
  readonly node: ParameterizedNode;
  readonly fixText: string | undefined;
}

interface FixParams {
  readonly scope: RuleScope;
  readonly node: FunctionLikeNode;
  readonly name: string;
}

interface InterfaceFixParams {
  readonly scope: RuleScope;
  readonly languageService: TS_API.LanguageService;
  readonly fileName: string;
  readonly editorSettings: TS_API.FormatCodeSettings;
  readonly updatedFile: TS_API.SourceFile;
  readonly typeLiteral: TS_API.TypeLiteralNode;
  readonly name: string;
}

interface HostParams {
  readonly program: TS_API.Program;
  readonly fileByName: Map<string, MutableFile>;
}

interface SnapshotParams {
  readonly program: TS_API.Program;
  readonly fileByName: Map<string, MutableFile>;
  readonly fileName: string;
}

interface ChangesParams {
  readonly baseText: string;
  readonly textChanges: readonly TS_API.TextChange[];
}

interface ShiftedStartParams {
  readonly changes: readonly TS_API.TextChange[];
  readonly targetStart: number;
}

interface TypeLiteralParams {
  readonly updatedFile: TS_API.SourceFile;
  readonly windowStart: number;
  readonly windowEnd: number;
}

interface InterfaceNameParams {
  readonly functionName: string;
  readonly typeSuffix: Readonly<Record<string, string>>;
  readonly existingNames: ReadonlySet<string>;
}

interface StatementNamesParams {
  readonly statement: TS_API.Statement;
  readonly names: Set<string>;
}

const DESTRUCTURE_REFACTOR = 'Convert parameters to destructured object';
const EXTRACT_REFACTOR = 'Extract type';
const EXTRACT_INTERFACE_ACTION = 'Extract to interface';
const EMPTY_PREFERENCES: TS_API.UserPreferences = {};

const heritageNamesByClassNode = new WeakMap<ClassNode, ReadonlySet<string>>();

function hasMultipleParameters(node: ParameterizedNode): boolean {
  const refactorableParameters = node.params.filter(
    (parameter: TSESTree.Parameter) => !(parameter.type === AST_NODE_TYPES.Identifier && parameter.name === 'this')
  );
  return refactorableParameters.length > 1;
}

function isTypeGuard(node: ParameterizedNode): boolean {
  return node.returnType?.typeAnnotation.type === AST_NODE_TYPES.TSTypePredicate;
}

function getKeyName(key: TSESTree.Node): string | undefined {
  if (key.type === AST_NODE_TYPES.Identifier) {
    return key.name;
  }
  if (key.type === AST_NODE_TYPES.Literal && typeof key.value === 'string') {
    return key.value;
  }
  return undefined;
}

function getHeritageMemberNames({ scope, classNode }: HeritageParams): ReadonlySet<string> {
  const { esTreeNodeToTSNodeMap, program } = scope.parserServices;
  const checker = program.getTypeChecker();
  const names = new Set<string>();

  (classNode.implements ?? []).forEach((implemented: TSESTree.TSClassImplements) => {
    const type = checker.getTypeAtLocation(esTreeNodeToTSNodeMap.get(implemented.expression));
    type.getProperties().forEach((symbol: TS_API.Symbol) => names.add(symbol.getName()));
  });

  if (classNode.superClass !== null) {
    const superType = checker.getTypeAtLocation(esTreeNodeToTSNodeMap.get(classNode.superClass));
    superType.getConstructSignatures().forEach((signature: TS_API.Signature) => {
      signature
        .getReturnType()
        .getProperties()
        .forEach((symbol: TS_API.Symbol) => names.add(symbol.getName()));
    });
  }

  return names;
}

function isClassMemberConstrained({ scope, member }: ClassMemberParams): boolean {
  if (member.type === AST_NODE_TYPES.MethodDefinition && member.kind === 'constructor') {
    return false;
  }
  const keyName = getKeyName(member.key);
  const classNode = member.parent.parent;
  if (
    keyName === undefined ||
    (classNode.type !== AST_NODE_TYPES.ClassDeclaration && classNode.type !== AST_NODE_TYPES.ClassExpression)
  ) {
    return false;
  }
  const names = heritageNamesByClassNode.get(classNode) ?? getHeritageMemberNames({ scope, classNode });
  heritageNamesByClassNode.set(classNode, names);
  return names.has(keyName);
}

function isContextuallyTyped({ scope, node }: ImplementationParams): boolean {
  const { esTreeNodeToTSNodeMap, program } = scope.parserServices;
  const tsNode = esTreeNodeToTSNodeMap.get(node);
  if (!TS_API.isFunctionExpression(tsNode) && !TS_API.isArrowFunction(tsNode)) {
    return false;
  }
  const checker = program.getTypeChecker();
  const contextualType = checker.getContextualType(tsNode);
  if (contextualType === undefined) {
    return false;
  }

  const stack: TS_API.Type[] = [checker.getNonNullableType(contextualType)];
  while (stack.length > 0) {
    const type = stack.pop();
    if (type === undefined) {
      break;
    }
    if (type.getCallSignatures().length > 0) {
      return true;
    }
    if (type.isUnion()) {
      stack.push(...type.types);
    }
  }
  return false;
}

function isConstrainedImplementation({ scope, node }: ImplementationParams): boolean {
  const { parent } = node;
  if (parent.type === AST_NODE_TYPES.MethodDefinition || parent.type === AST_NODE_TYPES.PropertyDefinition) {
    return isClassMemberConstrained({ scope, member: parent });
  }
  return isContextuallyTyped({ scope, node });
}

function getNameFromParent(parent: TSESTree.Node): string | undefined {
  if (parent.type === AST_NODE_TYPES.VariableDeclarator && parent.id.type === AST_NODE_TYPES.Identifier) {
    return parent.id.name;
  }
  if (parent.type === AST_NODE_TYPES.MethodDefinition && parent.kind === 'constructor') {
    const { id } = parent.parent.parent;
    return id === null ? undefined : id.name;
  }
  if (
    parent.type === AST_NODE_TYPES.MethodDefinition ||
    parent.type === AST_NODE_TYPES.PropertyDefinition ||
    parent.type === AST_NODE_TYPES.Property
  ) {
    return getKeyName(parent.key);
  }
  return undefined;
}

function getDeclaredName(node: FunctionLikeNode): string | undefined {
  if (node.type !== AST_NODE_TYPES.ArrowFunctionExpression && node.id !== null) {
    return node.id.name;
  }
  return getNameFromParent(node.parent);
}

function getInterfaceName({ functionName, typeSuffix, existingNames }: InterfaceNameParams): string {
  const matchedPattern = Object.keys(typeSuffix).find(
    (pattern: string) => pattern !== 'default' && getRegExp(pattern).test(functionName)
  );
  const suffix =
    (matchedPattern === undefined ? undefined : typeSuffix[matchedPattern]) ?? typeSuffix.default ?? 'Params';
  const proposedName = `${pascalCase(functionName)}${suffix}`;

  const candidates: string[] = [proposedName];
  while (existingNames.has(candidates.at(-1) ?? proposedName)) {
    candidates.push(`${proposedName}_${candidates.length}`);
  }
  return candidates.at(-1) ?? proposedName;
}

function addImportNames({ statement, names }: StatementNamesParams): void {
  if (!TS_API.isImportDeclaration(statement) || statement.importClause === undefined) {
    return;
  }
  const { name, namedBindings } = statement.importClause;
  if (name !== undefined) {
    names.add(name.text);
  }
  if (namedBindings === undefined) {
    return;
  }
  if (TS_API.isNamespaceImport(namedBindings)) {
    names.add(namedBindings.name.text);
    return;
  }
  namedBindings.elements.forEach((element: TS_API.ImportSpecifier) => names.add(element.name.text));
}

function addStatementNames({ statement, names }: StatementNamesParams): void {
  if (TS_API.isImportDeclaration(statement)) {
    addImportNames({ statement, names });
    return;
  }
  if (TS_API.isVariableStatement(statement)) {
    statement.declarationList.declarations
      .map((declaration: TS_API.VariableDeclaration) => declaration.name)
      .filter(TS_API.isIdentifier)
      .forEach((identifier: TS_API.Identifier) => names.add(identifier.text));
    return;
  }
  const isNamedDeclaration =
    TS_API.isInterfaceDeclaration(statement) ||
    TS_API.isTypeAliasDeclaration(statement) ||
    TS_API.isClassDeclaration(statement) ||
    TS_API.isFunctionDeclaration(statement) ||
    TS_API.isEnumDeclaration(statement);
  if (isNamedDeclaration && statement.name !== undefined) {
    names.add(statement.name.text);
  }
}

function getModuleLevelNames(updatedFile: TS_API.SourceFile): ReadonlySet<string> {
  const names = new Set<string>();
  updatedFile.statements.forEach((statement: TS_API.Statement) => {
    addStatementNames({ statement, names });
  });
  return names;
}

function getInterfaceInsertionOffset(updatedFile: TS_API.SourceFile): number {
  const lastImport = updatedFile.statements
    .filter(
      (statement: TS_API.Statement) =>
        TS_API.isImportDeclaration(statement) || TS_API.isImportEqualsDeclaration(statement)
    )
    .at(-1);
  return lastImport === undefined ? 0 : lastImport.getEnd();
}

function getSnapshot({ program, fileByName, fileName }: SnapshotParams): TS_API.IScriptSnapshot | undefined {
  const mutatedFile = fileByName.get(fileName);
  if (mutatedFile !== undefined) {
    return TS_API.ScriptSnapshot.fromString(mutatedFile.text);
  }
  const sourceFile = program.getSourceFile(fileName);
  if (sourceFile !== undefined) {
    return TS_API.ScriptSnapshot.fromString(sourceFile.text);
  }
  const diskText = TS_API.sys.readFile(fileName);
  return diskText === undefined ? undefined : TS_API.ScriptSnapshot.fromString(diskText);
}

function getLanguageServiceHost({ program, fileByName }: HostParams): TS_API.LanguageServiceHost {
  const compilerOptions = program.getCompilerOptions();
  const fileNames = program.getSourceFiles().map((sourceFile: TS_API.SourceFile) => sourceFile.fileName);

  return {
    getScriptFileNames: (): string[] => fileNames,
    getScriptVersion: (fileName: string): string => String(fileByName.get(fileName)?.version ?? 0),
    getScriptSnapshot: (fileName: string): TS_API.IScriptSnapshot | undefined =>
      getSnapshot({ program, fileByName, fileName }),
    getCompilationSettings: (): TS_API.CompilerOptions => compilerOptions,
    getCurrentDirectory: (): string => program.getCurrentDirectory(),
    getDefaultLibFileName: (options: TS_API.CompilerOptions): string => TS_API.getDefaultLibFilePath(options),
    fileExists: (fileName: string): boolean => fileByName.has(fileName) || TS_API.sys.fileExists(fileName),
    readFile: (fileName: string, encoding?: string): string | undefined =>
      fileByName.get(fileName)?.text ?? TS_API.sys.readFile(fileName, encoding)
  };
}

function getTextWithChanges({ baseText, textChanges }: ChangesParams): string {
  return [...textChanges]
    .sort((left: TS_API.TextChange, right: TS_API.TextChange) => right.span.start - left.span.start)
    .reduce(
      (accumulated: string, { span, newText }: TS_API.TextChange) =>
        accumulated.slice(0, span.start) + newText + accumulated.slice(span.start + span.length),
      baseText
    );
}

function getShiftedStart({ changes, targetStart }: ShiftedStartParams): number {
  return changes
    .filter((change: TS_API.TextChange) => change.span.start < targetStart)
    .reduce(
      (delta: number, change: TS_API.TextChange) => delta + (change.newText.length - change.span.length),
      targetStart
    );
}

function getGeneratedTypeLiteral({
  updatedFile,
  windowStart,
  windowEnd
}: TypeLiteralParams): TS_API.TypeLiteralNode | undefined {
  const stack: TS_API.Node[] = [updatedFile];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) {
      break;
    }
    TS_API.forEachChild(node, (child: TS_API.Node) => {
      stack.push(child);
    });
    if (
      TS_API.isParameter(node) &&
      TS_API.isObjectBindingPattern(node.name) &&
      node.type !== undefined &&
      TS_API.isTypeLiteralNode(node.type) &&
      node.type.getStart(updatedFile) >= windowStart &&
      node.type.getStart(updatedFile) <= windowEnd
    ) {
      return node.type;
    }
  }
  return undefined;
}

function getGeneratedInterface(sourceFile: TS_API.SourceFile): TS_API.InterfaceDeclaration | undefined {
  const stack: TS_API.Node[] = [sourceFile];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) {
      break;
    }
    if (TS_API.isInterfaceDeclaration(node)) {
      return node;
    }
    TS_API.forEachChild(node, (child: TS_API.Node) => {
      stack.push(child);
    });
  }
  return undefined;
}

function getInterfaceFix({
  scope,
  languageService,
  fileName,
  editorSettings,
  updatedFile,
  typeLiteral,
  name
}: InterfaceFixParams): string | undefined {
  const extraction = languageService.getEditsForRefactor(
    fileName,
    editorSettings,
    { pos: typeLiteral.getStart(updatedFile), end: typeLiteral.getEnd() },
    EXTRACT_REFACTOR,
    EXTRACT_INTERFACE_ACTION,
    EMPTY_PREFERENCES,
    undefined
  );
  if (extraction === undefined) {
    return undefined;
  }

  const changes = extraction.edits
    .filter((edit: TS_API.FileTextChanges) => edit.fileName === fileName)
    .flatMap((edit: TS_API.FileTextChanges) => edit.textChanges);
  const typeLiteralStart = typeLiteral.getStart(updatedFile);
  const referenceChange = changes.find(
    (change: TS_API.TextChange) =>
      change.span.start <= typeLiteralStart && typeLiteralStart <= change.span.start + change.span.length
  );
  const interfaceChange = changes.find((change: TS_API.TextChange) => change !== referenceChange);
  if (referenceChange === undefined || interfaceChange === undefined) {
    return undefined;
  }

  const snippet = TS_API.createSourceFile('extract.ts', interfaceChange.newText, TS_API.ScriptTarget.Latest, true);
  const declaration = getGeneratedInterface(snippet);
  if (declaration === undefined || !referenceChange.newText.startsWith(declaration.name.text)) {
    return undefined;
  }

  const interfaceName = getInterfaceName({
    functionName: name,
    typeSuffix: scope.typeSuffix,
    existingNames: getModuleLevelNames(updatedFile)
  });
  const declarationStart = declaration.getStart(snippet);
  const nameStart = declaration.name.getStart(snippet);
  const declarationText = interfaceChange.newText.slice(declarationStart, declaration.getEnd());
  const renamedInterface =
    declarationText.slice(0, nameStart - declarationStart) +
    interfaceName +
    declarationText.slice(declaration.name.getEnd() - declarationStart);

  return getTextWithChanges({
    baseText: updatedFile.text,
    textChanges: [
      {
        span: referenceChange.span,
        newText: interfaceName + referenceChange.newText.slice(declaration.name.text.length)
      },
      { span: { start: getInterfaceInsertionOffset(updatedFile), length: 0 }, newText: `\n\n${renamedInterface}\n` }
    ]
  });
}

function getFix({ scope, node, name }: FixParams): string | undefined {
  const { context, parserServices } = scope;
  const { program } = parserServices;
  const fileName = context.filename;
  const source = context.sourceCode.getText();
  const fileByName = new Map<string, MutableFile>([[fileName, { version: 0, text: source }]]);
  const languageService = TS_API.createLanguageService(getLanguageServiceHost({ program, fileByName }));
  const editorSettings = TS_API.getDefaultFormatCodeSettings('\n');

  const firstParameter = node.params.at(0);
  if (firstParameter === undefined) {
    return undefined;
  }
  const refactorPosition = firstParameter.range[0];

  const conversion = languageService.getEditsForRefactor(
    fileName,
    editorSettings,
    refactorPosition,
    DESTRUCTURE_REFACTOR,
    DESTRUCTURE_REFACTOR,
    EMPTY_PREFERENCES,
    undefined
  );
  if (conversion === undefined || conversion.edits.some((edit: TS_API.FileTextChanges) => edit.fileName !== fileName)) {
    return undefined;
  }
  const destructureChanges = conversion.edits.flatMap((edit: TS_API.FileTextChanges) => edit.textChanges);
  const signatureChange = destructureChanges.find(
    (change: TS_API.TextChange) =>
      refactorPosition >= change.span.start && refactorPosition < change.span.start + change.span.length
  );
  if (signatureChange === undefined) {
    return undefined;
  }

  const priorVersion = fileByName.get(fileName)?.version ?? 0;
  fileByName.set(fileName, {
    version: priorVersion + 1,
    text: getTextWithChanges({ baseText: source, textChanges: destructureChanges })
  });

  const updatedFile = languageService.getProgram()?.getSourceFile(fileName);
  if (updatedFile === undefined) {
    return undefined;
  }

  const windowStart = getShiftedStart({ changes: destructureChanges, targetStart: signatureChange.span.start });
  const typeLiteral = getGeneratedTypeLiteral({
    updatedFile,
    windowStart,
    windowEnd: windowStart + signatureChange.newText.length
  });
  if (typeLiteral === undefined) {
    return undefined;
  }

  return getInterfaceFix({ scope, languageService, fileName, editorSettings, updatedFile, typeLiteral, name });
}

function report({ scope, node, fixText }: ReportParams): void {
  const firstParameter = node.params.at(0);
  const lastParameter = node.params.at(-1);
  if (firstParameter === undefined || lastParameter === undefined) {
    return;
  }
  const loc = { start: firstParameter.loc.start, end: lastParameter.loc.end };
  if (fixText === undefined) {
    scope.context.report({ loc, messageId: MessageId.PreferParameterObject });
    return;
  }
  scope.context.report({
    loc,
    messageId: MessageId.PreferParameterObject,
    fix: (fixer: TSESLint.RuleFixer): TSESLint.RuleFix =>
      fixer.replaceTextRange([0, scope.context.sourceCode.getText().length], fixText)
  });
}

function checkImplementation({ scope, node }: ImplementationParams): void {
  if (!hasMultipleParameters(node)) {
    return;
  }
  if (isTypeGuard(node) && !scope.ignoreTypeGuards) {
    report({ scope, node, fixText: undefined });
    return;
  }
  if (isTypeGuard(node) || isConstrainedImplementation({ scope, node })) {
    return;
  }
  const name = getDeclaredName(node);
  if (name === undefined) {
    return;
  }
  report({ scope, node, fixText: getFix({ scope, node, name }) });
}

function checkSignature({ scope, node }: SignatureParams): void {
  if (!hasMultipleParameters(node)) {
    return;
  }
  if (isTypeGuard(node) && scope.ignoreTypeGuards) {
    return;
  }
  report({ scope, node, fixText: undefined });
}

export const preferParameterObject = getRule<readonly [Options], MessageId>({
  name: 'prefer-parameter-object',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'Require functions with more than one parameter to accept a single object parameter.'
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          ignoreTypeGuards: { type: 'boolean', default: true },
          typeSuffix: {
            type: 'object',
            additionalProperties: { type: 'string' },
            properties: { default: { type: 'string' } },
            required: ['default']
          }
        }
      }
    ],
    messages: {
      [MessageId.PreferParameterObject]:
        'This signature has more than one parameter. Use a single object parameter instead.'
    }
  },
  defaultOptions: [PREFER_PARAMETER_OBJECT_DEFAULT],
  create: (context: RuleContext, [rawOptions]: readonly [Options]) => {
    const options = rawOptions ?? {};
    const scope: RuleScope = {
      context,
      parserServices: ESLintUtils.getParserServices(context),
      ignoreTypeGuards: options.ignoreTypeGuards ?? true,
      typeSuffix: options.typeSuffix ?? {}
    };

    return {
      FunctionDeclaration: (node: TSESTree.FunctionDeclaration): void => {
        checkImplementation({ scope, node });
      },
      FunctionExpression: (node: TSESTree.FunctionExpression): void => {
        checkImplementation({ scope, node });
      },
      ArrowFunctionExpression: (node: TSESTree.ArrowFunctionExpression): void => {
        checkImplementation({ scope, node });
      },
      TSMethodSignature: (node: TSESTree.TSMethodSignature): void => {
        checkSignature({ scope, node });
      },
      TSCallSignatureDeclaration: (node: TSESTree.TSCallSignatureDeclaration): void => {
        checkSignature({ scope, node });
      },
      TSConstructSignatureDeclaration: (node: TSESTree.TSConstructSignatureDeclaration): void => {
        checkSignature({ scope, node });
      },
      TSFunctionType: (node: TSESTree.TSFunctionType): void => {
        checkSignature({ scope, node });
      }
    };
  }
});
