import { type Options } from './prefer-parameter-object.options';

export const PREFER_PARAMETER_OBJECT_DEFAULT: Options = {
  ignoreTypeGuards: true,
  typeSuffix: {
    default: 'Params'
  }
};
