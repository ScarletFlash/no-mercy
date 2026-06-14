import { PART_OF_SPEECH } from '../../constants/part-of-speech.constant';
import { TYPE_CONDITION } from '../../constants/type-condition.constant';
import { type Options } from './parts-of-speech.options';

export const PARTS_OF_SPEECH_DEFAULT: Options = {
  globalPatterns: {
    verbs: ['^noop$'],
    nouns: ['^(manifest|message|target|model|binary|kind|package|prefix)(e?s)?$']
  },
  declarationPolicies: {
    variable: {
      [TYPE_CONDITION.Boolean]: { required: [PART_OF_SPEECH.Verb] },
      [TYPE_CONDITION.Function]: { required: [PART_OF_SPEECH.Verb] },
      default: { required: [PART_OF_SPEECH.Noun], restricted: [PART_OF_SPEECH.Verb] }
    },
    function: {
      default: { required: [PART_OF_SPEECH.Verb] }
    },
    class: {
      default: { required: [PART_OF_SPEECH.Noun] }
    },
    interface: {
      default: { required: [PART_OF_SPEECH.Noun] }
    },
    type: {
      default: { required: [PART_OF_SPEECH.Noun] }
    },
    enum: {
      default: { required: [PART_OF_SPEECH.Noun] }
    }
  }
};
