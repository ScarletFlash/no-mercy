interface Target {
  readonly prefixes?: readonly string[];
  readonly ignore?: readonly string[];
}

export interface Options {
  readonly default?: Target;
  readonly variables?: Target;
  readonly functions?: Target;
}
