export type DeepPartialValue<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { readonly [Key in keyof T]?: DeepPartialValue<T[Key]> }
    : T;
