const regExpBySource = new Map<string, RegExp>();

export function getRegExp(source: string): RegExp {
  const cachedRegExp = regExpBySource.get(source);
  if (cachedRegExp !== undefined) {
    return cachedRegExp;
  }

  const regExp = new RegExp(source);
  regExpBySource.set(source, regExp);
  return regExp;
}
