import { isRecord } from './is-record.utility';

type DeepPartialValue<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { readonly [Key in keyof T]?: DeepPartialValue<T[Key]> }
    : T;

interface MergeFrame {
  readonly baseRecord: Readonly<Record<string, unknown>>;
  readonly overrideRecord: Readonly<Record<string, unknown>>;
  readonly target: Record<string, unknown>;
}

interface MergeOptionsParams<OptionsType extends object> {
  readonly base: OptionsType;
  readonly override: DeepPartialValue<OptionsType>;
}

export function getMergedOptions<OptionsType extends object>({
  base,
  override
}: MergeOptionsParams<OptionsType>): OptionsType {
  const mergedRecord: Record<string, unknown> = {};
  const frames: MergeFrame[] =
    isRecord(base) && isRecord(override) ? [{ baseRecord: base, overrideRecord: override, target: mergedRecord }] : [];
  while (frames.length > 0) {
    const frame = frames.pop();
    if (frame === undefined) {
      break;
    }
    const { baseRecord, overrideRecord, target } = frame;
    const keys = new Set(Object.keys(baseRecord).concat(Object.keys(overrideRecord)));
    keys.forEach((key: string) => {
      const baseValue = baseRecord[key];
      const overrideValue = overrideRecord[key];
      if (isRecord(baseValue) && isRecord(overrideValue)) {
        const childTarget: Record<string, unknown> = {};
        target[key] = childTarget;
        frames.push({ baseRecord: baseValue, overrideRecord: overrideValue, target: childTarget });
        return;
      }
      target[key] =
        Array.isArray(baseValue) && Array.isArray(overrideValue)
          ? baseValue.concat(overrideValue)
          : (overrideValue ?? baseValue);
    });
  }
  return { ...base, ...mergedRecord };
}
