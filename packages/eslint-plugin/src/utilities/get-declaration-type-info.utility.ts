import { type ParserServicesWithTypeInformation, type TSESTree } from '@typescript-eslint/utils';
import * as TS_API from 'typescript';

interface DeclarationTypeInfo {
  readonly isBoolean: boolean;
  readonly isCallable: boolean;
}

function isBooleanType(type: TS_API.Type): boolean {
  if (type.isUnion()) {
    const meaningfulParts = type.types.filter(
      ({ flags }: TS_API.Type) => flags !== TS_API.TypeFlags.Undefined && flags !== TS_API.TypeFlags.Null
    );
    return meaningfulParts.length > 0 && meaningfulParts.every((part: TS_API.Type) => isBooleanType(part));
  }

  return type.flags === TS_API.TypeFlags.BooleanLiteral || type.flags === TS_API.TypeFlags.Boolean;
}

interface GetDeclarationTypeInfoParams {
  readonly node: TSESTree.Node;
  readonly parserServices: ParserServicesWithTypeInformation;
}
export function getDeclarationTypeInfo({ node, parserServices }: GetDeclarationTypeInfoParams): DeclarationTypeInfo {
  const typeChecker = parserServices.program.getTypeChecker();
  const type = typeChecker.getTypeAtLocation(parserServices.esTreeNodeToTSNodeMap.get(node));
  const callSignatures = typeChecker.getNonNullableType(type).getCallSignatures();
  const isCallable = callSignatures.length > 0;
  const isReturningBoolean =
    isCallable && callSignatures.every((signature: TS_API.Signature) => isBooleanType(signature.getReturnType()));

  return { isBoolean: isBooleanType(type) || isReturningBoolean, isCallable };
}
