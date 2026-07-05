import { type PART_OF_SPEECH } from '../constants/part-of-speech.constant';

export type PartOfSpeech = (typeof PART_OF_SPEECH)[keyof typeof PART_OF_SPEECH];
