interface TypeSuffix {
  readonly [pattern: string]: string;
  readonly default: string;
}

export interface Options {
  readonly areTypeGuardsIgnored?: boolean;
  readonly typeSuffix?: TypeSuffix;
}
