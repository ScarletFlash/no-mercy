import TS_API from 'typescript';

interface TypeInfo {
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

interface GetTypeInfoParams {
  readonly type: TS_API.Type;
  readonly checker: TS_API.TypeChecker;
}

export function getTypeInfo({ type, checker }: GetTypeInfoParams): TypeInfo {
  const callSignatures = checker.getNonNullableType(type).getCallSignatures();
  const isCallable = callSignatures.length > 0;
  const isReturningBoolean =
    isCallable && callSignatures.every((signature: TS_API.Signature) => isBooleanType(signature.getReturnType()));

  return { isBoolean: isBooleanType(type) || isReturningBoolean, isCallable };
}
