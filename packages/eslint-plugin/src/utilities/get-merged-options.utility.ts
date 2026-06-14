import { isRecord } from './is-record.utility';

type DeepPartialValue<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { readonly [Key in keyof T]?: DeepPartialValue<T[Key]> }
    : T;

interface MergeValuesParams {
  readonly baseValue: unknown;
  readonly overrideValue: unknown;
}

interface MergeOptionsParams<OptionsType extends object> {
  readonly base: OptionsType;
  readonly override: DeepPartialValue<OptionsType>;
}

function getMerged({ baseValue, overrideValue }: MergeValuesParams): unknown {
  if (Array.isArray(baseValue) && Array.isArray(overrideValue)) {
    return baseValue.concat(overrideValue);
  }

  if (isRecord(baseValue) && isRecord(overrideValue)) {
    const keys = [...new Set([...Object.keys(baseValue), ...Object.keys(overrideValue)])];
    return Object.fromEntries(
      keys.map((key: string) => [key, getMerged({ baseValue: baseValue[key], overrideValue: overrideValue[key] })])
    );
  }

  return overrideValue ?? baseValue;
}

export function getMergedOptions<OptionsType extends object>({
  base,
  override
}: MergeOptionsParams<OptionsType>): OptionsType {
  const mergedValue = getMerged({ baseValue: base, overrideValue: override });
  return { ...base, ...(isRecord(mergedValue) ? mergedValue : {}) };
}
