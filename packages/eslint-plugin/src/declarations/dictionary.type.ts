import { type PartOfSpeech } from './part-of-speech.type';

export type Dictionary = Partial<Readonly<Record<PartOfSpeech, readonly string[]>>>;
