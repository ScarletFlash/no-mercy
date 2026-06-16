interface TypeSuffix {
  readonly [pattern: string]: string;
  readonly default: string;
}

export interface Options {
  readonly ignoreTypeGuards?: boolean;
  readonly typeSuffix?: TypeSuffix;
}
