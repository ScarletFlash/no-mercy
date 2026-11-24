import nlp from 'compromise';

const NOUN_CONTEXT = 'the';

const singularByWord = new Map<string, string>();

export function getSingular(word: string): string {
  const cachedSingularWord = singularByWord.get(word);
  if (cachedSingularWord !== undefined) {
    return cachedSingularWord;
  }

  const nounPhrase = nlp(`${NOUN_CONTEXT} ${word}`);
  const singularText = nounPhrase.has('#Plural')
    ? nounPhrase.nouns().toSingular().text().replace(`${NOUN_CONTEXT} `, '')
    : word;
  const singularWord = singularText === '' ? word : singularText;
  singularByWord.set(word, singularWord);
  return singularWord;
}
