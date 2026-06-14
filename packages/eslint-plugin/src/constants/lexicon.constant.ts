import nlp from 'compromise';
import { isRecord } from '../utilities/is-record.utility';

type Tag = Parameters<typeof nlp.addWords>[0][string];
type Lexicon = Readonly<Record<string, Tag | readonly Tag[]>>;

function isLexicon(value: unknown): value is Lexicon {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (tag: unknown) =>
        typeof tag === 'string' || (Array.isArray(tag) && tag.every((item: unknown) => typeof item === 'string'))
    )
  );
}

const model = nlp.model();

export const LEXICON: Lexicon =
  isRecord(model) && isRecord(model.one) && isLexicon(model.one.lexicon) ? model.one.lexicon : {};
